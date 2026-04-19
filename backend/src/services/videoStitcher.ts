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
  if (path.isAbsolute(url) && fs.existsSync(url)) {
    fs.copyFileSync(url, destPath);
    return;
  }

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

function buildVideoPrompt(script: VideoScript): string {
  const segments = script.segments || [];
  if (segments.length === 0) {
    return 'Create a 30-second ultra-realistic vertical job video, authentic workplace documentary style, natural lighting, true-to-life motion, clear hiring call-to-action.';
  }

  const visualElements = segments.map(s => s.visualPrompt).filter(Boolean);
  const allText = segments.map(s => s.overlayText).filter(Boolean).join(' • ');

  let prompt = visualElements.join(' ');
  if (allText) prompt += `. Job context and CTA: ${allText}.`;
  prompt += ' Generate an ultra-realistic, photorealistic, 30-second vertical (9:16) job recruiting video concept with natural camera motion, believable human behavior, practical lighting, and authentic workplace detail.';
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

async function stitchThreeSegments(
  sourceUrls: string[],
  script: VideoScript,
  jobId: string,
  coverImageUrl?: string
): Promise<{ videoUrl: string; duration: number; clips: number }> {
  const outputPath = path.join(UPLOADS_DIR, `${jobId}-final.mp4`);
  
  // Download segments
  const localPaths = await Promise.all(
    sourceUrls.map(async (url, idx) => {
      const dest = path.join(UPLOADS_DIR, `${jobId}-segment-${idx}.mp4`);
      await downloadFile(url, dest);
      return dest;
    })
  );

  let localLogoPath: string | null = null;
  if (coverImageUrl) {
    try {
      localLogoPath = path.join(UPLOADS_DIR, `${jobId}-logo`); // extension agnostic initially
      await downloadFile(coverImageUrl, localLogoPath);
    } catch (err) {
      console.warn('[VideoStitcher] Failed to download coverImage/logo:', err);
      localLogoPath = null;
    }
  }

  const command = ffmpeg();
  for (const p of localPaths) {
    command.addInput(p);
  }
  if (localLogoPath) {
    command.addInput(localLogoPath);
  }

  const fontPath = getPreferredFontPath();
  const fontArg = fontPath ? `:fontfile='${escapeDrawtext(fontPath)}'` : '';
  
  const voutNames = [];
  const filterGraph = [];

  for (let i = 0; i < localPaths.length; i++) {
    const cap = escapeDrawtext(getSegmentCaption(script, i, ''));
    let drawtextFilter = '';
    
    // First segment gets job details overlay at the top
    if (i === 0) {
      const titleText = escapeDrawtext(script.jobTitle || 'Exciting Role');
      const companyText = escapeDrawtext(script.companyName || 'Top Company');
      const locationText = escapeDrawtext(script.location || 'Remote');
      
      const topText = `🏢 ${companyText}\\n💼 ${titleText}\\n📍 ${locationText}`;
      
      // Top info panel
      drawtextFilter += `,drawtext=text='${topText}'${fontArg}:x=(w-text_w)/2:y=250:fontsize=48:line_spacing=24:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=32`;
    }

    if (cap) {
      drawtextFilter += `,drawtext=text='${cap}'${fontArg}:x=(w-text_w)/2:y=h-220:fontsize=56:line_spacing=18:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=24`;
    }
    
    filterGraph.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p${drawtextFilter}[v${i}]`);
    voutNames.push(`[v${i}]`);
  }

  const concatOutName = localLogoPath ? '[concat_out]' : '[vout]';
  filterGraph.push(`${voutNames.join('')}concat=n=${localPaths.length}:v=1:a=0${concatOutName}`);

  if (localLogoPath) {
    const logoIdx = localPaths.length;
    // Scale logo width to 280, overlay at top right 50px from edge
    filterGraph.push(`[${logoIdx}:v]scale=280:-1[logo_scaled];${concatOutName}[logo_scaled]overlay=W-w-50:50[vout]`);
  }

  await new Promise<void>((resolve, reject) => {
    command
      .complexFilter(filterGraph)
      .outputOptions([
        '-map [vout]',
        '-an',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
      ])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });

  try {
    await validateOutputHasVideoStream(outputPath);
  } catch (probeErr: any) {
    console.warn(`[VideoStitcher] Output validation failed: ${probeErr.message}`);
  }

  const finalDuration = await getVideoDurationSeconds(outputPath);
  console.log(`[VideoStitcher] Final duration: ${finalDuration.toFixed(2)}s (target: 24s)`);

  for (const p of localPaths) {
    try { fs.unlinkSync(p); } catch {}
  }

  const videoUrl = await uploadFinalVideo(outputPath, `job_${jobId}_3part`);
  return { videoUrl, duration: Math.round(finalDuration), clips: localPaths.length };
}

/**
 * Generate a video from a VideoScript.
 * Orchestrates calls to videoEngine which handles actual synthesis and fallback.
 */
export async function generateStitchedVideo(options: {
  script: VideoScript;
  onProgress?: (step: string, progress: number) => void;
  coverImageUrl?: string;
  companyLogoUrl?: string;
  companyName?: string;
  jobId?: string;
  aspectRatio?: string;
  provider?: string;
}): Promise<{
  videoUrl: string;
  duration: number;
  clips: number;
  providers: string[];
  captions?: string[];
}> {
  const { script, onProgress, coverImageUrl, jobId, provider = 'veoaifree' } = options;
  const genJobId = jobId || uuidv4();

  try {
    console.log(`\n[VideoStitcher] Starting 3-part generation (job=${genJobId}, provider=${provider})`);
    onProgress?.('Generating 3 parts sequentially...', 0.05);

    const segments = script.segments.slice(0, 3);
    const results = [];
    
    for (let i = 0; i < segments.length; i++) {
      onProgress?.(`Generating segment ${i+1}/${segments.length}...`, 0.1 + (i * 0.25));
      const res = await generateJobVideo(
        {
          prompt: segments[i].visualPrompt,
          coverImageUrl: i === 0 ? coverImageUrl : undefined,
          jobId: `${genJobId}_part${i}`,
          provider: (options.provider || 'veoaifree') as any,
        }
      );
      if (!res) throw new Error(`Segment ${i+1} failed to generate`);
      results.push(res);
      console.log(`[VideoStitcher] Segment ${i+1} generated successfully`);
    }

    onProgress?.('Stitching 3 parts with captions and logo...', 0.85);
    const sourceUrls = results.map(r => r.videoUrl);
    
    const final = await stitchThreeSegments(sourceUrls, script, genJobId, coverImageUrl);
    
    onProgress?.('Video ready! ✅', 1.0);
    return {
      videoUrl: final.videoUrl,
      duration: final.duration,
      clips: final.clips,
      providers: Array.from(new Set(results.map(r => r.provider).concat(['ffmpeg-stitch']))),
      captions: script.segments.map((s, i) => s.caption || s.overlayText || ''),
    };

  } catch (error: any) {
    console.error('[VideoStitcher] Fatal error:', error);
    throw error;
  }
}
