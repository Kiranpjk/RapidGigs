/**
 * videoStitcher.ts — Generate 30-second videos by stitching 3×10s clips
 *
 * Strategy:
 *   1. Text-to-video: Generate first 10s clip from prompt
 *   2. Image-to-video: Extract last frame, generate next 10s clip
 *   3. Image-to-video: Extract last frame, generate final 10s clip
 *   4. Concatenate all 3 clips with ffmpeg into one 30s video
 *
 * Multi-provider clip generation (failover order per clip):
 *   1. Pollinations.ai     — free tier (seedance / wan-fast / ltx-2)
 *   2. Replicate            — text-to-video models (minimax, wan2.1, cogvideox)
 *   3. HuggingFace Router   — via fal-ai / wavespeed-ai providers
 *   4. fal.ai direct        — Kling 3.0 / Hunyuan (pay-per-use)
 *
 * If a provider succeeds for clip 1, it is tried first for clips 2+3 (warm provider).
 */

import { fal } from '@fal-ai/client';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'ai-videos');
const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');

// Ensure directories exist
[UPLOADS_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

interface StitchResult {
  videoUrl: string;
  duration: number;
  clips: number;
  providers: string[];
}

interface ClipResult {
  localPath: string;
  provider: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Segment prompt builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build distinct cinematic scene prompts for each segment of a stitched video.
 *
 *   Scene 1 — ENVIRONMENT: Wide/aerial establishing shot of the workspace
 *   Scene 2 — ACTION: Close-up of the core work activity
 *   Scene 3 — CULTURE: The human element — team, achievement, impact
 */
function buildSegmentPrompts(basePrompt: string, numSegments: number): string[] {
  const sceneDirections = [
    `Cinematic wide establishing shot, slow dolly-in. ${basePrompt}. Golden hour lighting, shallow depth of field, photorealistic textures. The camera gradually reveals the full environment — architecture, equipment, ambient activity. Professional color grading with warm undertones, 4K clarity. No text, no overlays, no UI elements.`,

    `Smooth tracking shot transitioning to medium close-up. The focus shifts to the core work activity: hands operating tools, eyes scanning screens, precise skilled movements. ${basePrompt}. Rack focus between the person and their work — showing expertise and concentration. Natural ambient sound design, subtle motion blur on fast actions. Consistent lighting and color palette with the previous scene.`,

    `Dynamic shot capturing the human side of the work. ${basePrompt}. A colleague approaches, a brief exchange of ideas, a shared moment of achievement — a completed project, a satisfied client interaction, or a team celebrating a milestone. The camera pulls back slowly, revealing the broader impact. Warm, aspirational mood, lens flare from natural light. Cinematic ending with a sense of purpose and forward momentum.`,

    `Extreme close-up macro shot of the specialized tools, interfaces, or materials central to this work. ${basePrompt}. Ultra-sharp focus on textures — keyboard keys, surgical instruments, design mockups, engineering blueprints, or creative materials. The camera orbits slowly, revealing intricate details. Studio-quality lighting with dramatic shadows. Conveys mastery and precision.`,

    `Aerial or crane shot pulling out to reveal the broader context and impact of this work. ${basePrompt}. The environment transitions from the intimate workspace to the larger ecosystem — the city, the community, the industry being shaped. Time-lapse elements showing progress and growth. Epic orchestral mood, warm sunset lighting. Conveys ambition, scale, and the inspiring future this career path leads to.`,
  ];

  return sceneDirections.slice(0, numSegments);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────

/** Download a file from URL to local disk */
async function downloadFile(url: string, destPath: string): Promise<void> {
  // Handle base64 data URLs
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:[^;]+;base64,(.+)$/);
    if (matches) {
      fs.writeFileSync(destPath, Buffer.from(matches[1], 'base64'));
      return;
    }
    throw new Error('Invalid data URL');
  }

  const response = await axios.get(url, { responseType: 'stream', timeout: 120_000 });
  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

/** Extract the last frame of a video as a JPEG image */
async function extractLastFrame(videoPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const duration = metadata.format.duration || 10;
      const seekTime = Math.max(0, duration - 0.5);

      ffmpeg(videoPath)
        .seekInput(seekTime)
        .frames(1)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (e) => reject(e))
        .run();
    });
  });
}

/** Concatenate multiple video files into one using ffmpeg */
async function concatenateVideos(videoPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const listPath = path.join(TEMP_DIR, `concat-${uuidv4()}.txt`);
    const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputPath)
      .on('end', () => {
        try { fs.unlinkSync(listPath); } catch { /* ignore */ }
        resolve();
      })
      .on('error', (err) => {
        try { fs.unlinkSync(listPath); } catch { /* ignore */ }
        reject(err);
      })
      .run();
  });
}

/** Convert a local file to a base64 data URL */
function fileToDataUrl(filePath: string, mimeType: string = 'image/jpeg'): string {
  const buffer = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/** Save arraybuffer response to a local file, return path */
function saveVideoBuffer(buffer: Buffer, clipId: string): string {
  const filename = `clip-${clipId}.mp4`;
  const filepath = path.join(TEMP_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual clip generation providers
// ─────────────────────────────────────────────────────────────────────────────

type ClipProvider = (opts: {
  prompt: string;
  duration: number;
  clipId: string;
  imageUrl?: string; // base64 data URL or remote URL for image-to-video
}) => Promise<ClipResult | null>;

/**
 * Provider 1: Pollinations.ai (free tier)
 * - Text-to-video only (no image-to-video support)
 * - For continuation clips, we append "continuing from the previous scene" to the prompt
 */
const generateClipPollinations: ClipProvider = async ({ prompt, duration, clipId, imageUrl }) => {
  const POLLINATIONS_KEY = process.env.POLLINATIONS_KEY;

  // Pollinations doesn't support image-to-video, so for continuation clips
  // we enhance the prompt to encourage visual continuity
  const effectivePrompt = imageUrl
    ? `Seamless visual continuation of the previous scene. ${prompt}`
    : prompt;

  const videoModels = ['seedance', 'wan-fast', 'ltx-2'];

  const authModes: Array<{ label: string; key?: string }> = [
    { label: 'free (no key)' },
    ...(POLLINATIONS_KEY ? [{ label: 'with key', key: POLLINATIONS_KEY }] : []),
  ];

  for (const auth of authModes) {
    for (const model of videoModels) {
      try {
        console.log(`  [clip] Trying Pollinations (${model}, ${auth.label})...`);
        const encodedPrompt = encodeURIComponent(effectivePrompt);
        const params = new URLSearchParams({
          model,
          duration: String(Math.min(duration, 10)), // Pollinations caps at 10s usually
          aspectRatio: '16:9',
        });
        if (auth.key) params.set('key', auth.key);

        const videoUrl = `https://gen.pollinations.ai/video/${encodedPrompt}?${params.toString()}`;

        const headers: Record<string, string> = {};
        if (auth.key) headers['Authorization'] = `Bearer ${auth.key}`;

        const res = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          timeout: 180_000,
          headers,
        });

        if (res.status === 200 && res.data.byteLength > 1000) {
          const localPath = saveVideoBuffer(Buffer.from(res.data), clipId);
          console.log(`  [clip] ✅ Pollinations (${model}) succeeded`);
          return { localPath, provider: `pollinations-${model}` };
        }
      } catch (e: any) {
        const status = e.response?.status || 'no response';
        console.warn(`  [clip] Pollinations (${model}, ${auth.label}) failed [${status}]`);
        if (status === 401 || status === 403) break;
      }
    }
  }
  return null;
};

/**
 * Provider 2: Replicate
 * - Text-to-video with polling
 * - No native image-to-video for most free models, so continuation uses prompt
 */
const generateClipReplicate: ClipProvider = async ({ prompt, duration, clipId, imageUrl }) => {
  const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_TOKEN) return null;

  const effectivePrompt = imageUrl
    ? `Seamless visual continuation of the previous scene. ${prompt}`
    : prompt;

  const models: Array<{ owner: string; name: string }> = [
    { owner: 'minimax',      name: 'video-01' },
    { owner: 'wavespeed-ai', name: 'wan-2.1-t2v-480p' },
    { owner: 'lucataco',     name: 'cogvideox-5b' },
  ];

  for (const model of models) {
    try {
      console.log(`  [clip] Trying Replicate (${model.owner}/${model.name})...`);

      const createRes = await axios.post(
        `https://api.replicate.com/v1/models/${model.owner}/${model.name}/predictions`,
        { input: { prompt: effectivePrompt } },
        {
          headers: {
            Authorization: `Token ${REPLICATE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 30_000,
        }
      );

      const predictionId = createRes.data.id;
      const pollUrl = createRes.data.urls?.get;
      if (!predictionId || !pollUrl) continue;

      // Poll until completed (max ~8 min per clip)
      let videoUrl: string | null = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 8_000));

        const pollRes = await axios.get(pollUrl, {
          headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
          timeout: 15_000,
        });

        const { status, output, error } = pollRes.data;
        if (i % 5 === 0) console.log(`  [clip] Replicate poll [${i + 1}/60]: ${status}`);

        if (status === 'succeeded') {
          videoUrl = Array.isArray(output) ? output[0] : output;
          break;
        }
        if (status === 'failed' || error) {
          throw new Error(`Replicate failed: ${error || 'unknown'}`);
        }
      }

      if (!videoUrl) continue;

      // Download
      const videoRes = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 120_000,
      });

      if (videoRes.data.byteLength > 1000) {
        const localPath = saveVideoBuffer(Buffer.from(videoRes.data), clipId);
        console.log(`  [clip] ✅ Replicate (${model.owner}/${model.name}) succeeded`);
        return { localPath, provider: `replicate-${model.owner}-${model.name}` };
      }
    } catch (e: any) {
      console.warn(`  [clip] Replicate (${model.owner}/${model.name}) failed:`, e.message);
      if (e.response?.status === 402) {
        console.warn('  [clip] → Replicate credits exhausted, skipping all models');
        break;
      }
    }
  }
  return null;
};

/**
 * Provider 3: HuggingFace Inference Router
 * - Routes through fal-ai / wavespeed-ai providers
 * - Text-to-video only (returns raw video bytes)
 */
const generateClipHuggingFace: ClipProvider = async ({ prompt, duration, clipId, imageUrl }) => {
  const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
  if (!HF_TOKEN) return null;

  const effectivePrompt = imageUrl
    ? `Seamless visual continuation of the previous scene. ${prompt}`
    : prompt;

  const hfModels: Array<[string, string, string]> = [
    ['fal-ai',       'fal-ai/fast-animatediff/text-to-video', 'AnimateDiff'],
    ['fal-ai',       'wan-ai/Wan2.1-T2V-14B',                 'Wan2.1-T2V'],
    ['wavespeed-ai', 'wan-ai/Wan2.1-T2V-14B',                 'Wan2.1-wavespeed'],
    ['fal-ai',       'tencent/HunyuanVideo',                   'HunyuanVideo'],
  ];

  for (const [providerSlug, modelId, label] of hfModels) {
    try {
      console.log(`  [clip] Trying HF Router → ${label}...`);
      const url = `https://router.huggingface.co/${providerSlug}/models/${modelId}`;
      const res = await axios.post(
        url,
        { inputs: effectivePrompt },
        {
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 300_000,
        }
      );

      if (res.status === 200 && res.data.byteLength > 1000) {
        const localPath = saveVideoBuffer(Buffer.from(res.data), clipId);
        console.log(`  [clip] ✅ HuggingFace (${label}) succeeded`);
        return { localPath, provider: `hf-${label}` };
      }
    } catch (e: any) {
      const status = e.response?.status || 'no response';
      console.warn(`  [clip] HF Router (${label}) failed [${status}]`);
      if (status === 402) break; // No credits
    }
  }
  return null;
};

/**
 * Provider 4: fal.ai direct (Kling 3.0 + Hunyuan)
 * - Supports BOTH text-to-video AND image-to-video (best for stitching)
 * - Pay-per-use (~$0.05/clip)
 */
const generateClipFalAI: ClipProvider = async ({ prompt, duration, clipId, imageUrl }) => {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return null;

  fal.config({ credentials: FAL_KEY });

  // fal.ai Kling 3.0 supports native image-to-video — best for seamless stitching
  try {
    if (imageUrl) {
      // Image-to-video mode (continuation clips)
      console.log(`  [clip] Trying fal.ai Kling i2v...`);
      const result: any = await fal.subscribe('fal-ai/kling-video/v3/standard/image-to-video', {
        input: {
          prompt,
          image_url: imageUrl,
          duration: String(duration),
          aspect_ratio: '16:9',
        },
      });

      const videoUrl = result?.data?.video?.url || result?.video?.url;
      if (videoUrl) {
        const localPath = path.join(TEMP_DIR, `clip-${clipId}.mp4`);
        await downloadFile(videoUrl, localPath);
        console.log(`  [clip] ✅ fal.ai Kling i2v succeeded`);
        return { localPath, provider: 'fal-kling-i2v' };
      }
    } else {
      // Text-to-video mode (first clip)
      console.log(`  [clip] Trying fal.ai Kling t2v...`);
      const result: any = await fal.subscribe('fal-ai/kling-video/v3/standard/text-to-video', {
        input: {
          prompt,
          duration: String(duration),
          aspect_ratio: '16:9',
        },
      });

      const videoUrl = result?.data?.video?.url || result?.video?.url;
      if (videoUrl) {
        const localPath = path.join(TEMP_DIR, `clip-${clipId}.mp4`);
        await downloadFile(videoUrl, localPath);
        console.log(`  [clip] ✅ fal.ai Kling t2v succeeded`);
        return { localPath, provider: 'fal-kling-t2v' };
      }
    }
  } catch (e: any) {
    console.warn(`  [clip] fal.ai Kling failed:`, e.message);
  }

  // Fallback: fal.ai Hunyuan (text-to-video only)
  try {
    const effectivePrompt = imageUrl
      ? `Seamless visual continuation of the previous scene. ${prompt}`
      : prompt;

    console.log(`  [clip] Trying fal.ai Hunyuan t2v...`);
    const { request_id } = await fal.queue.submit('fal-ai/hunyuan-video', {
      input: {
        prompt: effectivePrompt,
        num_frames: '85',
        resolution: '480p',
        aspect_ratio: '16:9',
      },
    });

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const status = await fal.queue.status('fal-ai/hunyuan-video', {
        requestId: request_id,
        logs: false,
      });

      if (status.status === 'COMPLETED') {
        const result = await fal.queue.result('fal-ai/hunyuan-video', {
          requestId: request_id,
        });
        const videoUrl = (result.data as any)?.video?.url;
        if (videoUrl) {
          const localPath = path.join(TEMP_DIR, `clip-${clipId}.mp4`);
          await downloadFile(videoUrl, localPath);
          console.log(`  [clip] ✅ fal.ai Hunyuan succeeded`);
          return { localPath, provider: 'fal-hunyuan' };
        }
      }
      if ((status as any).status === 'FAILED') break;
    }
  } catch (e: any) {
    console.warn(`  [clip] fal.ai Hunyuan failed:`, e.message);
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Multi-provider clip generation orchestrator
// ─────────────────────────────────────────────────────────────────────────────

// All providers in priority order
const ALL_PROVIDERS: Array<{ name: string; fn: ClipProvider }> = [
  { name: 'Pollinations', fn: generateClipPollinations },
  { name: 'Replicate',    fn: generateClipReplicate },
  { name: 'HuggingFace',  fn: generateClipHuggingFace },
  { name: 'fal.ai',       fn: generateClipFalAI },
];

/**
 * Generate a single clip, trying each provider in order.
 * Returns the provider name so subsequent clips can try the warm provider first.
 */
async function generateClipWithFallback(opts: {
  prompt: string;
  duration: number;
  clipIndex: number;
  totalClips: number;
  imageUrl?: string;
  preferredProvider?: string; // Try this provider first (warm from previous clip)
  onProgress?: (step: string, progress: number) => void;
}): Promise<ClipResult> {
  const { prompt, duration, clipIndex, totalClips, imageUrl, preferredProvider, onProgress } = opts;
  const clipId = `${uuidv4()}-${clipIndex}`;

  console.log(`\n[VideoStitcher] ── Generating clip ${clipIndex + 1}/${totalClips} ──`);
  if (imageUrl) console.log(`  Mode: image-to-video (continuation)`);
  else console.log(`  Mode: text-to-video (initial)`);

  // Build provider order: preferred first, then the rest
  let orderedProviders = [...ALL_PROVIDERS];
  if (preferredProvider) {
    const prefIdx = orderedProviders.findIndex(p => p.name === preferredProvider);
    if (prefIdx > 0) {
      const [pref] = orderedProviders.splice(prefIdx, 1);
      orderedProviders.unshift(pref);
      console.log(`  → Trying warm provider "${preferredProvider}" first`);
    }
  }

  // Try each provider
  for (const provider of orderedProviders) {
    try {
      onProgress?.(`Trying ${provider.name} for clip ${clipIndex + 1}...`, (clipIndex / totalClips) + 0.05);
      const result = await provider.fn({ prompt, duration, clipId, imageUrl });
      if (result) {
        return result;
      }
      onProgress?.(`${provider.name} skipped (nil)`, (clipIndex / totalClips) + 0.08);
    } catch (e: any) {
      const err = e.message || 'unknown error';
      onProgress?.(`${provider.name} failed: ${err}`, (clipIndex / totalClips) + 0.08);
      console.warn(`  [clip] ${provider.name} threw:`, err);
    }
  }

  throw new Error(`All providers failed for clip ${clipIndex + 1}/${totalClips}. No video generation provider is available.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export: generateStitchedVideo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a full 30-second video by stitching 3×10s clips.
 *
 * Each clip is generated via multi-provider fallback.
 * Clips 2+ use image-to-video (last frame of previous clip) when supported,
 * or fall back to text-to-video with continuation prompts.
 */
export async function generateStitchedVideo(options: {
  prompt: string;
  segments?: number;
  segmentDuration?: number;
  onProgress?: (step: string, progress: number) => void;
}): Promise<StitchResult> {
  const { prompt, segments = 3, segmentDuration = 10, onProgress } = options;
  const jobId = uuidv4();
  const clipPaths: string[] = [];
  const usedProviders: string[] = [];

  try {
    const segmentPrompts = buildSegmentPrompts(prompt, segments);
    let lastFrameUrl: string | undefined;
    let warmProvider: string | undefined; // Provider that succeeded for previous clip

    for (let i = 0; i < segments; i++) {
      onProgress?.(`Generating clip ${i + 1}/${segments}`, ((i) / segments) * 0.8);
      console.log(`\n[VideoStitcher] ═══ Clip ${i + 1}/${segments} ═══`);

      const clipResult = await generateClipWithFallback({
        prompt: segmentPrompts[i] || prompt,
        duration: segmentDuration,
        clipIndex: i,
        totalClips: segments,
        imageUrl: lastFrameUrl,
        preferredProvider: warmProvider,
        onProgress,
      });

      clipPaths.push(clipResult.localPath);
      usedProviders.push(clipResult.provider);
      warmProvider = ALL_PROVIDERS.find(p =>
        clipResult.provider.toLowerCase().includes(p.name.toLowerCase())
      )?.name;

      // Extract last frame for next clip's image-to-video
      if (i < segments - 1) {
        const framePath = path.join(TEMP_DIR, `frame-${jobId}-${i}.jpg`);
        try {
          await extractLastFrame(clipResult.localPath, framePath);
          lastFrameUrl = fileToDataUrl(framePath);
          try { fs.unlinkSync(framePath); } catch { /* ignore */ }
        } catch (frameErr: any) {
          console.warn(`  [VideoStitcher] Frame extraction failed, next clip will use text-to-video:`, frameErr.message);
          lastFrameUrl = undefined; // Fall back to text-to-video for next clip
        }
      }
    }

    onProgress?.('Stitching clips together', 0.85);
    console.log(`\n[VideoStitcher] ═══ Stitching ${clipPaths.length} clips ═══`);

    // Concatenate all clips
    const outputFilename = `stitched-${jobId}.mp4`;
    const outputPath = path.join(UPLOADS_DIR, outputFilename);
    await concatenateVideos(clipPaths, outputPath);

    onProgress?.('Complete', 1.0);

    // Clean up temp clips
    clipPaths.forEach(p => {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    });

    const relativePath = `/uploads/ai-videos/${outputFilename}`;
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

    console.log(`\n[VideoStitcher] ✅ DONE — ${segments} clips, ${segments * segmentDuration}s total`);
    console.log(`  Providers used: ${usedProviders.join(' → ')}`);
    console.log(`  Output: ${baseUrl}${relativePath}`);

    return {
      videoUrl: `${baseUrl}${relativePath}`,
      duration: segments * segmentDuration,
      clips: segments,
      providers: usedProviders,
    };
  } catch (error) {
    // Clean up any temp files on error
    clipPaths.forEach(p => {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    });
    throw error;
  }
}
