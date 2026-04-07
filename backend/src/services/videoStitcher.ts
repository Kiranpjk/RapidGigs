/**
 * videoStitcher.ts — Generate 30-second videos by stitching 3×10s clips
 *
 * Primary: Meta AI generates 30s+ videos natively (no stitching needed).
 * If Meta AI is unavailable, fall back to 3×10s stitching.
 *
 * Multi-provider clip generation (failover order per clip):
 *   1. Meta AI               — cookie-based, free, 30-60s videos
 *   2. Pollinations.ai       — free tier (wan/veo/seedance via Vibe AI)
 *   3. Modal.com             — serverless GPU fallback
 *
 * If a provider succeeds for clip 1, it is tried first for clips 2+3 (warm provider).
 */

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

/** Overlay job details text on the video using ffmpeg drawtext filter */
export async function addJobTextOverlays(
  inputPath: string,
  outputPath: string,
  jobInfo: { title: string; company: string; location: string; pay: string; type?: string },
  onProgress?: (step: string) => void
): Promise<void> {
  onProgress?.('Adding job details to video...');

  // Build ffmpeg drawtext filters — overlay at bottom-left with semi-transparent bg
  const filters: string[] = [];

  // Title — bold white, 20px from bottom
  if (jobInfo.title) {
    const escapedTitle = jobInfo.title.replace(/'/g, "\\\\'");
    filters.push(`drawtext=text='${escapedTitle}':fontcolor=white:fontsize=24:box=1:boxcolor=rgba(0,0,0,0.6):x=20:y=h-th-60:boxborderw=8`);
  }

  // Company — smaller white text below title
  if (jobInfo.company) {
    const escapedCompany = jobInfo.company.replace(/'/g, "\\\\'");
    filters.push(`drawtext=text='${escapedCompany}':fontcolor=white:fontsize=18:box=1:boxcolor=rgba(0,0,0,0.5):x=20:y=h-th-30:boxborderw=8`);
  }

  // Location & Pay — top-right corner
  const topText = [jobInfo.location, jobInfo.type, jobInfo.pay]
    .filter(Boolean)
    .join(' · ');

  if (topText) {
    const escapedTop = topText.replace(/'/g, "\\\\'");
    filters.push(`drawtext=text='${escapedTop}':fontcolor=yellow:fontsize=16:box=1:boxcolor=rgba(0,0,0,0.5):x=w-tw-20:y=20:boxborderw=8`);
  }

  if (filters.length === 0) {
    // No text to add — just copy
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  return new Promise((resolve, reject) => {
    const filterStr = filters.join(',');

    ffmpeg(inputPath)
      .outputOptions([`-vf`, filterStr, '-c:a', 'copy', '-preset', 'fast'])
      .output(outputPath)
      .on('end', resolve)
      .on('error', (err) => {
        // If drawtext fails (e.g. no font), fall back to copy
        console.warn('  [TextOverlay] drawtext failed, copying original:', err.message);
        try {
          fs.copyFileSync(inputPath, outputPath);
          resolve();
        } catch (copyErr) {
          reject(copyErr);
        }
      })
      .run();
  });
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
 * Provider 1: Meta AI (cookie-based, free, 30-60s videos)
 * - Direct GraphQL call to meta.ai — no self-hosted server needed
 * - Uses META_AI_COOKIE_DATR and META_AI_COOKIE_ECTO from .env
 */
const generateClipMetaAI: ClipProvider = async ({ prompt, duration, clipId, imageUrl }) => {
  const datr = process.env.META_AI_COOKIE_DATR;
  const ecto1 = process.env.META_AI_COOKIE_ECTO;
  if (!datr || !ecto1) {
    console.log('  [clip] Meta AI skipped — missing META_AI_COOKIE_DATR or META_AI_COOKIE_ECTO');
    return null;
  }

  const effectivePrompt = imageUrl
    ? `Seamless visual continuation. ${prompt}`
    : prompt;

  // ── Try self-hosted API server first (if configured and reachable) ────────
  const META_SERVER_URL = process.env.META_AI_API_URL;
  if (META_SERVER_URL) {
    try {
      console.log(`  [clip] Trying Meta AI API server (${META_SERVER_URL})...`);
      const asyncRes = await axios.post(
        `${META_SERVER_URL}/video/async`,
        { prompt: effectivePrompt },
        { timeout: 30_000 }
      );
      const { job_id } = asyncRes.data;

      for (let i = 0; i < 36; i++) {
        await new Promise(r => setTimeout(r, 5_000));
        const statusRes = await axios.get(`${META_SERVER_URL}/video/jobs/${job_id}`, { timeout: 15_000 });
        if (statusRes.data.status === 'completed' || statusRes.data.status === 'succeeded') {
          const rawUrl = statusRes.data.result?.video_urls?.[0];
          if (rawUrl) {
            const localPath = path.join(TEMP_DIR, `clip-${clipId}-meta.mp4`);
            await downloadFile(rawUrl, localPath);
            console.log(`  [clip] ✅ Meta AI API server succeeded`);
            return { localPath, provider: 'metaai-api-server' };
          }
        }
        if (statusRes.data.status === 'failed') throw new Error(statusRes.data.error || 'failed');
      }
    } catch (e: any) {
      console.warn(`  [clip] Meta AI API server failed: ${e.message}, falling back to direct GraphQL`);
    }
  }

  // ── Direct GraphQL fallback (no server needed) ─────────────────────────────
  console.log(`  [clip] Trying Meta AI direct GraphQL...`);
  try {
    const { generateVideo } = await import('./metaAiVideo');
    const result = await generateVideo(effectivePrompt, (step, progress) => {
      console.log(`  [clip Meta AI] ${step} (${Math.round(progress * 100)}%)`);
    });

    if (result?.videoUrl) {
      const localPath = path.join(TEMP_DIR, `clip-${clipId}-meta.mp4`);
      await downloadFile(result.videoUrl, localPath);
      console.log(`  [clip] ✅ Meta AI direct GraphQL succeeded`);
      return { localPath, provider: 'metaai-graphql' };
    }
  } catch (e: any) {
    console.warn(`  [clip] Meta AI direct GraphQL failed: ${e.message}`);
  }

  return null;
};

/**
 * Provider 2: Pollinations.ai (free tier, used by Vibe AI)
 * - Text-to-video only (no image-to-video support)
 * - For continuation clips, we enhance the prompt for visual continuity
 */
const generateClipPollinations: ClipProvider = async ({ prompt, duration, clipId, imageUrl }) => {
  const effectivePrompt = imageUrl
    ? `Seamless visual continuation of the previous scene. ${prompt}`
    : prompt;

  const videoModels = ['wan', 'veo', 'seedance'];

  for (const model of videoModels) {
    try {
      console.log(`  [clip] Trying Pollinations (${model}, free)...`);
      const encodedPrompt = encodeURIComponent(effectivePrompt);
      const params = new URLSearchParams({
        model,
        duration: String(Math.min(duration, 10)),
        aspectRatio: '16:9',
      });

      const videoUrl = `https://gen.pollinations.ai/video/${encodedPrompt}?${params.toString()}`;

      const res = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 180_000,
      });

      if (res.status === 200 && res.data.byteLength > 1000) {
        const localPath = saveVideoBuffer(Buffer.from(res.data), clipId);
        console.log(`  [clip] ✅ Pollinations (${model}) succeeded`);
        return { localPath, provider: `pollinations-${model}` };
      }
    } catch (e: any) {
      console.warn(`  [clip] Pollinations (${model}) failed:`, e.message);
    }
  }
  return null;
};

/**
 * Provider 3: Modal.com (serverless GPU fallback)
 */
const generateClipModal: ClipProvider = async ({ prompt, duration, clipId, imageUrl }) => {
  const MODAL_URL = process.env.MODAL_ENDPOINT;
  if (!MODAL_URL) return null;

  const effectivePrompt = imageUrl
    ? `Seamless visual continuation of the previous scene. ${prompt}`
    : prompt;

  try {
    console.log(`  [clip] Trying Modal.com...`);
    const res = await axios.post(MODAL_URL, {
      prompt: effectivePrompt,
      num_frames: 73,
      height: 384,
      width: 640,
    }, { timeout: 660_000 });

    const rawUrl = res.data.video_url;
    if (rawUrl) {
      const localPath = path.join(TEMP_DIR, `clip-${clipId}.mp4`);
      if (rawUrl.startsWith('data:')) {
        const matches = rawUrl.match(/^data:[^;]+;base64,(.+)$/);
        if (matches) {
          fs.writeFileSync(localPath, Buffer.from(matches[1], 'base64'));
          console.log(`  [clip] ✅ Modal succeeded (dataurl)`);
          return { localPath, provider: 'modal' };
        }
      } else {
        await downloadFile(rawUrl, localPath);
        console.log(`  [clip] ✅ Modal succeeded`);
        return { localPath, provider: 'modal' };
      }
    }
  } catch (e: any) {
    console.warn(`  [clip] Modal failed:`, e.message);
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Multi-provider clip generation orchestrator
// ─────────────────────────────────────────────────────────────────────────────

// All providers in priority order (no rate-limit APIs)
const ALL_PROVIDERS: Array<{ name: string; fn: ClipProvider }> = [
  { name: 'Meta AI',      fn: generateClipMetaAI },
  { name: 'Pollinations', fn: generateClipPollinations },
  { name: 'Modal',        fn: generateClipModal },
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
