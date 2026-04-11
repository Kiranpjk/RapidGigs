/**
 * videoStitcher.ts — Generate 30-second videos by stitching 3×10s clips
 *
 * Primary: Meta AI generates 30s+ videos natively (no stitching needed).
 * If Meta AI is unavailable, fall back to 3×10s stitching.
 *
 * Multi-provider clip generation (failover order per clip):
 *   1. Meta AI               — cookie-based, free, 30-60s videos
 *   2. Modal                 — Serverless GPU Fallback
 *
 * If a provider succeeds for clip 1, it is tried first for clips 2+3 (warm provider).
 */

import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VideoScript } from './promptBuilder'; // Import our new VideoScript interface

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

/** 
 * Standardize aspect ratio to 9:16 (720x1280) and optionally overlay custom text
 */
async function formatAndOverlayClip(inputPath: string, outputPath: string, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 1. Force all clips to be uniformly scaled and center-cropped to exactly 720x1280 
    // This prevents ffmpeg concatenation errors when providers output different resolutions
    let filter = `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280`;
    const textFile = path.join(TEMP_DIR, `overlay-text-${uuidv4()}.txt`);

    if (text) {
      fs.writeFileSync(textFile, text);
      // Filter: Bold white text, black box at 60% opacity with 20px padding (boxborderw)
      filter += `,drawtext=textfile='${textFile}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:boxborderw=20:x=(w-text_w)/2:y=h-text_h-100:line_spacing=10:text_align=C`;
    }

    ffmpeg(inputPath)
      .outputOptions(['-vf', filter, '-c:a', 'copy', '-preset', 'fast'])
      .output(outputPath)
      .on('end', () => {
        if (text) try { fs.unlinkSync(textFile); } catch {}
        resolve();
      })
      .on('error', (err) => {
        console.warn('  [Format/Overlay] ffmpeg failed, copying instead:', err.message);
        if (text) try { fs.unlinkSync(textFile); } catch {}
        try { fs.copyFileSync(inputPath, outputPath); } catch {}
        resolve(); // resolve to not break the pipeline
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
 */
const generateClipMetaAI: ClipProvider = async ({ prompt, duration, clipId, imageUrl }) => {
  const account1 = process.env.META_AI_COOKIE_DATR && process.env.META_AI_COOKIE_ECTO;
  const account2 = process.env.META_AI_COOKIE_DATR_2 && process.env.META_AI_COOKIE_ECTO_2;
  
  if (!account1 && !account2) {
    console.log('  [clip] Meta AI skipped — missing ALL META_AI cookies');
    return null;
  }

  const effectivePrompt = imageUrl
    ? `Seamless visual continuation. ${prompt}`
    : prompt;

  // ── Direct GraphQL (Load balancer picks account) ─────────────────────────────
  console.log(`  [clip] Generating Meta AI using internal GraphQL Library...`);
  console.log(`  [clip] Prompt: ${effectivePrompt}`);
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
 * Provider 2: Modal.com (serverless GPU fallback)
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
      height: 768, // Request vertical so the crop doesn't look bad
      width: 512,
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

const ALL_PROVIDERS: Array<{ name: string; fn: ClipProvider }> = [
  { name: 'Meta AI',      fn: generateClipMetaAI },
  { name: 'Modal',        fn: generateClipModal },
];

async function generateClipWithFallback(opts: {
  prompt: string;
  duration: number;
  clipIndex: number;
  totalClips: number;
  imageUrl?: string;
  preferredProvider?: string;
  onProgress?: (step: string, progress: number) => void;
}): Promise<ClipResult> {
  const { prompt, duration, clipIndex, totalClips, imageUrl, preferredProvider, onProgress } = opts;
  const clipId = `${uuidv4()}-${clipIndex}`;

  console.log(`\n[VideoStitcher] ── Generating clip ${clipIndex + 1}/${totalClips} ──`);
  if (imageUrl) console.log(`  Mode: image-to-video (continuation)`);
  else console.log(`  Mode: text-to-video (initial)`);

  let orderedProviders = [...ALL_PROVIDERS];
  if (preferredProvider) {
    const prefIdx = orderedProviders.findIndex(p => p.name === preferredProvider);
    if (prefIdx > 0) {
      const [pref] = orderedProviders.splice(prefIdx, 1);
      orderedProviders.unshift(pref);
      console.log(`  → Trying warm provider "${preferredProvider}" first`);
    }
  }

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
 * Generate a full 30-second video by stitching 3×10s clips, 
 * strictly adhering to the structured JSON Video Script.
 */
export async function generateStitchedVideo(options: {
  script: VideoScript; // Takes structured script now!
  segmentDuration?: number;
  onProgress?: (step: string, progress: number) => void;
}): Promise<StitchResult> {
  const { script, segmentDuration = 10, onProgress } = options;
  const segments = script.segments.length; // usually 3
  const jobId = uuidv4();
  const clipPaths: string[] = [];
  const usedProviders: string[] = [];

  try {
    let lastFrameUrl: string | undefined;
    let warmProvider: string | undefined;

    for (let i = 0; i < segments; i++) {
      onProgress?.(`Generating clip ${i + 1}/${segments}`, ((i) / segments) * 0.8);
      console.log(`\n[VideoStitcher] ═══ Clip ${i + 1}/${segments} ═══`);

      const segment = script.segments[i];

      // 1. Generate the raw visual video clip from the AI
      const clipResult = await generateClipWithFallback({
        prompt: segment.visualPrompt || "Cinematic shot.",
        duration: segmentDuration,
        clipIndex: i,
        totalClips: segments,
        imageUrl: lastFrameUrl,
        preferredProvider: warmProvider,
        onProgress,
      });

      usedProviders.push(clipResult.provider);
      warmProvider = ALL_PROVIDERS.find(p =>
        clipResult.provider.toLowerCase().includes(p.name.toLowerCase())
      )?.name;

      // 2. Extract last frame for next clip connection (image-to-video)
      if (i < segments - 1) {
        const framePath = path.join(TEMP_DIR, `frame-${jobId}-${i}.jpg`);
        try {
          await extractLastFrame(clipResult.localPath, framePath);
          lastFrameUrl = fileToDataUrl(framePath);
          try { fs.unlinkSync(framePath); } catch { /* ignore */ }
        } catch (frameErr: any) {
          console.warn(`  [VideoStitcher] Frame extraction failed:`, frameErr.message);
          lastFrameUrl = undefined;
        }
      }

      // 3. Immediately scale to 9:16 vertical and burn overlay text (if any)
      onProgress?.(`Formatting to 9:16 & adding text to clip ${i + 1}...`, ((i) / segments) * 0.8 + 0.05);
      if (segment.overlayText) {
        console.log(`  [VideoStitcher] Applying overlay text:\n${segment.overlayText}`);
      }
      
      const formattedClipPath = path.join(TEMP_DIR, `clip-${jobId}-${i}-formatted.mp4`);
      await formatAndOverlayClip(clipResult.localPath, formattedClipPath, segment.overlayText?.trim() || '');
      
      // Clean up the original raw clip
      try { fs.unlinkSync(clipResult.localPath); } catch {}
      
      // Push the perfectly rendered clip to our stitching array
      clipPaths.push(formattedClipPath);
    }

    // 4. Stitch the fully rendered clips together
    onProgress?.('Stitching clips together', 0.85);
    console.log(`\n[VideoStitcher] ═══ Stitching ${clipPaths.length} fully rendered clips ═══`);

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
