/**
 * videoStitcher.ts — Generate videos using available providers
 *
 * This service orchestrates the high-level video generation flow.
 * It primarily relies on videoEngine.ts for provider-specific logic and fallback chains.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { v2 as cloudinary } from 'cloudinary';
import { VideoScript } from './promptBuilder';
import { generateJobVideo } from './videoEngine';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'ai-videos');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Download a file from URL to local disk (fallback for non-Cloudinary flows) */
async function downloadFile(url: string, destPath: string): Promise<void> {
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

/**
 * Build a comprehensive video prompt from a VideoScript
 */
function buildVideoPrompt(script: VideoScript): string {
  const segments = script.segments || [];
  if (segments.length === 0) return 'Cinematic professional workspace scene, 4k';

  const visualElements = segments.map(s => s.visualPrompt).filter(Boolean);
  const allText = segments.map(s => s.overlayText).filter(Boolean).join(' • ');

  let prompt = visualElements.join(' Then, ');
  if (allText) prompt += `. Context: ${allText}`;
  prompt += `. Natural smartphone-style footage, authentic workplace realism, documentary feel, realistic lighting and skin tones, minimal stylization unless explicitly required by role context.`;
  return prompt;
}

function escapeDrawtext(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%')
    .replace(/;/g, '\\;')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function getSegmentCaption(script: VideoScript, idx: number, fallback: string): string {
  return (script.segments?.[idx]?.overlayText || fallback).trim();
}

async function getVideoDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

async function validateOutputHasVideoStream(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const hasVideo = (metadata.streams || []).some(s => s.codec_type === 'video');
      if (!hasVideo) return reject(new Error('No video stream found in output'));
      resolve();
    });
  });
}

async function uploadFinalVideo(localPath: string, publicId: string): Promise<string> {
  const baseUrlRaw = process.env.API_BASE_URL || 'http://localhost:3001';
  const baseUrl = baseUrlRaw.replace(/\/api\/?$/, '');
  const localServedUrl = `${baseUrl}/uploads/ai-videos/${path.basename(localPath)}`;

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const result = await cloudinary.uploader.upload(localPath, {
        resource_type: 'video',
        public_id: `rapidgigs/videos/${publicId}`,
        overwrite: true,
        format: 'mp4',
      });
      try { fs.unlinkSync(localPath); } catch {}
      console.log(`[VideoStitcher] Uploaded final 30s video to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (err: any) {
      console.warn(`[VideoStitcher] Cloudinary upload failed for final video, serving local file instead: ${err.message}`);
      return localServedUrl;
    }
  }
  console.log(`[VideoStitcher] Cloudinary not configured for final video, serving local file: ${localServedUrl}`);
  return localServedUrl;
}

function getPreferredFontPath(): string | null {
  const candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
  ];
  for (const fontPath of candidates) {
    if (fs.existsSync(fontPath)) return fontPath;
  }
  return null;
}

async function composeThirtySecondBaseVideo(
  sourceUrl: string,
  script: VideoScript,
  jobId: string
): Promise<{ videoUrl: string; duration: number; clips: number }> {
  const sourcePath = path.join(UPLOADS_DIR, `${jobId}-source.mp4`);
  const basePath = path.join(UPLOADS_DIR, `${jobId}-base30.mp4`);
  const outputPath = path.join(UPLOADS_DIR, `${jobId}-final.mp4`);

  await downloadFile(sourceUrl, sourcePath);
  const sourceDuration = Math.max(1, await getVideoDurationSeconds(sourcePath));
  const repeats = Math.max(1, Math.ceil(30 / sourceDuration));

  const command = ffmpeg();
  for (let i = 0; i < repeats; i++) {
    command.addInput(sourcePath);
  }

  const concatInputs = Array.from({ length: repeats }, (_, i) => `[${i}:v]`).join('');
  const filterGraph = [
    `${concatInputs}concat=n=${repeats}:v=1:a=0[cat]`,
    '[cat]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p[vout]',
  ];

  await new Promise<void>((resolve, reject) => {
    command
      .complexFilter(filterGraph)
      .outputOptions([
        '-map [vout]',
        '-an',
        '-t 30',
        '-r 30',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
      ])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(basePath);
  });

  const fontPath = getPreferredFontPath();
  const cap1 = escapeDrawtext(getSegmentCaption(script, 0, 'Job Opportunity'));
  const cap2 = escapeDrawtext(getSegmentCaption(script, 1, 'Day-to-day tasks'));
  const cap3 = escapeDrawtext(getSegmentCaption(script, 2, 'Apply now'));
  const fontArg = fontPath ? `:fontfile='${escapeDrawtext(fontPath)}'` : '';

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(basePath)
        .videoFilters([
          `drawtext=text='${cap1}'${fontArg}:x=(w-text_w)/2:y=h-220:fontsize=56:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=24:enable='between(t,0,10)'`,
          `drawtext=text='${cap2}'${fontArg}:x=(w-text_w)/2:y=h-220:fontsize=56:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=24:enable='between(t,10,20)'`,
          `drawtext=text='${cap3}'${fontArg}:x=(w-text_w)/2:y=h-220:fontsize=56:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=24:enable='between(t,20,30)'`,
        ])
        .outputOptions(['-an', '-t 30', '-r 30', '-pix_fmt yuv420p', '-movflags +faststart'])
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
  } catch (captionErr: any) {
    console.warn(`[VideoStitcher] Caption overlay failed, using base 30s video: ${captionErr.message}`);
    fs.copyFileSync(basePath, outputPath);
  }

  // Note: these captions are burned-in (drawtext), not a subtitle track.
  try {
    await validateOutputHasVideoStream(outputPath);
  } catch (probeErr: any) {
    console.warn(`[VideoStitcher] Output validation failed: ${probeErr.message}`);
  }

  const finalDuration = await getVideoDurationSeconds(outputPath);
  console.log(`[VideoStitcher] Final duration: ${finalDuration.toFixed(2)}s (target: 30s, 1080x1920)`);

  try { fs.unlinkSync(sourcePath); } catch {}
  try { fs.unlinkSync(basePath); } catch {}

  const videoUrl = await uploadFinalVideo(outputPath, `job_${jobId}_30s_captioned`);
  return { videoUrl, duration: Math.round(finalDuration), clips: repeats };
}

/**
 * Generate a video from a VideoScript.
 * Orchestrates calls to videoEngine which handles actual synthesis and fallback.
 */
export async function generateStitchedVideo(options: {
  script: VideoScript;
  onProgress?: (step: string, progress: number) => void;
  coverImageUrl?: string;
  jobId?: string;
  provider?: 'together' | 'magichour' | 'zsky' | 'fal' | 'wavespeed' | 'meta' | 'veoaifree' | 'auto';
}): Promise<{
  videoUrl: string;
  duration: number;
  clips: number;
  providers: string[];
}> {
  const { script, onProgress, coverImageUrl, jobId, provider = 'auto' } = options;
  const genJobId = jobId || uuidv4();

  try {
    const fullPrompt = buildVideoPrompt(script);
    console.log(`\n[VideoStitcher] Starting video generation (job=${genJobId}, provider=${provider})`);
    onProgress?.('Initializing AI video engine...', 0.03);

    const result = await generateJobVideo(
      {
        prompt: fullPrompt,
        coverImageUrl,
        jobId: genJobId,
        provider,
      },
      (step, p) => {
        onProgress?.(step, 0.05 + p * 0.9);
      }
    );

    if (result) {
      try {
        onProgress?.('Composing 30s video + captions with FFmpeg...', 0.93);
        const final = await composeThirtySecondBaseVideo(result.videoUrl, script, genJobId);
        onProgress?.('Video ready! ✅', 1.0);
        return {
          videoUrl: final.videoUrl,
          duration: final.duration,
          clips: final.clips,
          providers: [result.provider, 'ffmpeg-caption'],
        };
      } catch (ffmpegErr: any) {
        console.warn('[VideoStitcher] FFmpeg compose failed, returning provider video:', ffmpegErr.message);
        onProgress?.('Video ready! ✅', 1.0);
        return {
          videoUrl: result.videoUrl,
          duration: 8,
          clips: 1,
          providers: [result.provider],
        };
      }
    }

    throw new Error('Video generation failed across all selected providers');
  } catch (error: any) {
    console.error('[VideoStitcher] Fatal error:', error);
    throw error;
  }
}
