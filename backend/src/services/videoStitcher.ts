/**
 * videoStitcher.ts — 3-Part Parallel Video Generation + FFmpeg Stitching
 *
 * Generates 3 separate ~8s videos in PARALLEL via VeoAiFree,
 * then stitches them with crossfade transitions, company logo overlay,
 * and Instagram-style timed captions using FFmpeg.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { v2 as cloudinary } from 'cloudinary';
import { VideoScript } from './promptBuilder';
import { generateVideoVeoAiFree } from './veoaifree';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'ai-videos');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Download a file from URL to local disk */
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

async function getVideoDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
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
      console.log(`[VideoStitcher] Uploaded final video to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (err: any) {
      console.warn(`[VideoStitcher] Cloudinary upload failed, serving local file: ${err.message}`);
      return localServedUrl;
    }
  }
  console.log(`[VideoStitcher] Cloudinary not configured, serving local file: ${localServedUrl}`);
  return localServedUrl;
}

// ── Company Logo Resolution ─────────────────────────────────────────────────

async function resolveCompanyLogo(
  companyName: string,
  uploadedLogoUrl?: string
): Promise<string | null> {
  const tempDir = path.join(process.cwd(), 'uploads', 'tmp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const logoPath = path.join(tempDir, `logo_${Date.now()}.png`);

  // Priority 1: Uploaded logo
  if (uploadedLogoUrl) {
    try {
      await downloadFile(uploadedLogoUrl, logoPath);
      console.log(`[VideoStitcher] ✅ Using uploaded company logo`);
      return logoPath;
    } catch (err: any) {
      console.warn(`[VideoStitcher] Failed to download uploaded logo: ${err.message}`);
    }
  }

  // Priority 2: Clearbit Logo API
  try {
    // Try common domain patterns
    const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const domains = [
      `${cleanName}.com`,
      `${cleanName}.io`,
      `${cleanName}.co`,
    ];

    for (const domain of domains) {
      try {
        const url = `https://logo.clearbit.com/${domain}?size=200`;
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 5000,
          validateStatus: (s) => s === 200,
        });
        fs.writeFileSync(logoPath, Buffer.from(response.data));
        const size = fs.statSync(logoPath).size;
        if (size > 500) { // Valid image (not a tiny error response)
          console.log(`[VideoStitcher] ✅ Fetched logo from Clearbit for ${domain}`);
          return logoPath;
        }
        try { fs.unlinkSync(logoPath); } catch {}
      } catch {
        // Try next domain
      }
    }
  } catch {
    // Clearbit failed
  }

  // Priority 3: Return null — caller will use drawtext fallback
  console.log(`[VideoStitcher] No logo found for "${companyName}", will use text fallback`);
  return null;
}

// ── Generate a single segment video ─────────────────────────────────────────

async function generateSegmentVideo(
  prompt: string,
  segmentIndex: number,
  onProgress?: (step: string, progress: number) => void
): Promise<string | null> {
  try {
    console.log(`[VideoStitcher] 🎬 Generating segment ${segmentIndex + 1}/3...`);
    onProgress?.(`Generating Part ${segmentIndex + 1}/3...`, 0.1 + segmentIndex * 0.25);

    const result = await generateVideoVeoAiFree(
      prompt,
      Number(process.env.VEOAIFREE_DURATION_SECONDS || '8'),
      (step, p) => {
        onProgress?.(`Part ${segmentIndex + 1}: ${step}`, 0.1 + segmentIndex * 0.25 + p * 0.2);
      }
    );

    if (!result?.localPath) {
      console.error(`[VideoStitcher] ❌ Segment ${segmentIndex + 1} generation failed`);
      return null;
    }

    console.log(`[VideoStitcher] ✅ Segment ${segmentIndex + 1} ready: ${result.localPath}`);
    return result.localPath;
  } catch (err: any) {
    console.error(`[VideoStitcher] Segment ${segmentIndex + 1} error:`, err.message);
    return null;
  }
}

// ── FFmpeg: Stitch 3 videos with crossfade + logo + captions ────────────────

async function stitchVideosWithCrossfade(
  videoPaths: string[],
  script: VideoScript,
  jobId: string,
  companyLogoPath: string | null,
  companyName: string,
  aspectRatio: '9:16' | '16:9' | '1:1' = '9:16'
): Promise<{ outputPath: string; duration: number }> {
  const dimensions = {
    '9:16': { w: 1080, h: 1920 },
    '16:9': { w: 1920, h: 1080 },
    '1:1': { w: 1080, h: 1080 },
  }[aspectRatio] || { w: 1080, h: 1920 };

  const fontPath = getPreferredFontPath();
  const fontArg = fontPath ? `fontfile='${escapeDrawtext(fontPath)}'` : '';
  const outputPath = path.join(UPLOADS_DIR, `${jobId}-final.mp4`);

  // Get durations of each clip
  const durations: number[] = [];
  for (const vp of videoPaths) {
    const d = await getVideoDurationSeconds(vp);
    durations.push(Math.max(1, d));
  }

  const crossfadeDuration = 1; // 1 second crossfade between clips

  // Build FFmpeg filter graph
  const filterParts: string[] = [];

  // Scale all inputs to target dimensions
  for (let i = 0; i < videoPaths.length; i++) {
    filterParts.push(
      `[${i}:v]scale=${dimensions.w}:${dimensions.h}:force_original_aspect_ratio=decrease,` +
      `pad=${dimensions.w}:${dimensions.h}:(ow-iw)/2:(oh-ih)/2,` +
      `setsar=1,format=yuv420p,fps=30[v${i}]`
    );
  }

  // Apply crossfade transitions between clips
  if (videoPaths.length === 3) {
    // Crossfade v0 + v1
    filterParts.push(
      `[v0][v1]xfade=transition=fade:duration=${crossfadeDuration}:offset=${durations[0] - crossfadeDuration}[xf01]`
    );
    // Crossfade (v0+v1) + v2
    const offset2 = durations[0] + durations[1] - 2 * crossfadeDuration;
    filterParts.push(
      `[xf01][v2]xfade=transition=fade:duration=${crossfadeDuration}:offset=${offset2}[stitched]`
    );
  } else if (videoPaths.length === 2) {
    filterParts.push(
      `[v0][v1]xfade=transition=fade:duration=${crossfadeDuration}:offset=${durations[0] - crossfadeDuration}[stitched]`
    );
  } else {
    // Single video
    filterParts.push(`[v0]copy[stitched]`);
  }

  // Calculate timed caption positions
  let currentTime = 0;
  const captionFilters: string[] = [];
  const captionFontSize = Math.round(dimensions.w * 0.04); // ~43px at 1080w
  const captionBoxBorder = Math.round(captionFontSize * 0.35);
  const captionY = Math.round(dimensions.h * 0.55); // Center-ish position (55% height)

  for (let i = 0; i < Math.min(videoPaths.length, script.segments.length); i++) {
    const segment = script.segments[i];
    const captionText = escapeDrawtext(segment.caption || segment.overlayText || '');
    if (!captionText) continue;

    const startTime = currentTime + 0.5; // Slight delay after segment start
    const endTime = currentTime + durations[i] - (i < videoPaths.length - 1 ? crossfadeDuration : 0) - 0.5;

    if (fontArg) {
      captionFilters.push(
        `drawtext=text='${captionText}':${fontArg}:x=(w-text_w)/2:y=${captionY}:` +
        `fontsize=${captionFontSize}:fontcolor=white:` +
        `box=1:boxcolor=black@0.55:boxborderw=${captionBoxBorder}:` +
        `enable='between(t,${startTime.toFixed(1)},${endTime.toFixed(1)})'`
      );
    }

    currentTime += durations[i] - (i < videoPaths.length - 1 ? crossfadeDuration : 0);
  }

  // Company logo/name overlay (top-left, entire duration)
  const totalDuration = durations.reduce((a, b) => a + b, 0) - crossfadeDuration * (videoPaths.length - 1);
  let logoFilter = '';

  if (companyLogoPath && fs.existsSync(companyLogoPath)) {
    // Use image overlay
    const logoInputIndex = videoPaths.length;
    const logoSize = Math.round(dimensions.w * 0.12); // ~130px at 1080w
    const logoPad = Math.round(dimensions.w * 0.03); // ~30px padding

    filterParts.push(
      `[${logoInputIndex}:v]scale=${logoSize}:${logoSize}:force_original_aspect_ratio=decrease,format=rgba[logo]`
    );
    filterParts.push(
      `[stitched][logo]overlay=${logoPad}:${logoPad}:enable='between(t,0,${totalDuration})'[withlogo]`
    );
  } else {
    // Text fallback for company name
    const nameText = escapeDrawtext(companyName || 'RapidGig');
    const nameFontSize = Math.round(dimensions.w * 0.035);
    const namePad = Math.round(dimensions.w * 0.03);

    if (fontArg) {
      filterParts.push(
        `[stitched]drawtext=text='${nameText}':${fontArg}:x=${namePad}:y=${namePad}:` +
        `fontsize=${nameFontSize}:fontcolor=white@0.85:` +
        `box=1:boxcolor=black@0.4:boxborderw=8:` +
        `enable='between(t,0,${totalDuration})'[withlogo]`
      );
    } else {
      filterParts.push(`[stitched]copy[withlogo]`);
    }
  }

  // Apply captions on top of logo layer
  if (captionFilters.length > 0) {
    const lastCaptionIndex = captionFilters.length - 1;
    captionFilters.forEach((cf, idx) => {
      const inputLabel = idx === 0 ? 'withlogo' : `cap${idx - 1}`;
      const outputLabel = idx === lastCaptionIndex ? 'vout' : `cap${idx}`;
      filterParts.push(`[${inputLabel}]${cf}[${outputLabel}]`);
    });
  } else {
    filterParts.push(`[withlogo]copy[vout]`);
  }

  // Build and run FFmpeg command
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    // Add video inputs
    for (const vp of videoPaths) {
      cmd.addInput(vp);
    }

    // Add logo input if exists
    if (companyLogoPath && fs.existsSync(companyLogoPath)) {
      cmd.addInput(companyLogoPath);
    }

    cmd
      .complexFilter(filterParts.join(';'))
      .outputOptions([
        '-map [vout]',
        '-an',
        `-t ${Math.ceil(totalDuration)}`,
        '-r 30',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
      ])
      .on('start', (cmdLine) => {
        console.log(`[VideoStitcher] FFmpeg command: ${cmdLine.substring(0, 200)}...`);
      })
      .on('progress', (progress) => {
        console.log(`[VideoStitcher] FFmpeg progress: ${progress.percent?.toFixed(1)}%`);
      })
      .on('end', async () => {
        console.log(`[VideoStitcher] ✅ FFmpeg stitching complete: ${outputPath}`);
        const finalDuration = await getVideoDurationSeconds(outputPath);

        // Cleanup temp source files
        for (const vp of videoPaths) {
          try { fs.unlinkSync(vp); } catch {}
        }
        if (companyLogoPath) {
          try { fs.unlinkSync(companyLogoPath); } catch {}
        }

        resolve({ outputPath, duration: Math.round(finalDuration) });
      })
      .on('error', (err) => {
        console.error(`[VideoStitcher] FFmpeg error: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Generate a stitched video from a 3-part VideoScript.
 * Generates all 3 segments in PARALLEL, then stitches with FFmpeg.
 */
export async function generateStitchedVideo(options: {
  script: VideoScript;
  onProgress?: (step: string, progress: number) => void;
  coverImageUrl?: string;
  jobId?: string;
  provider?: 'magichour' | 'veoaifree' | 'auto';
  aspectRatio?: '9:16' | '16:9' | '1:1';
  companyLogoUrl?: string;
  companyName?: string;
}): Promise<{
  videoUrl: string;
  duration: number;
  clips: number;
  providers: string[];
  captions: { text: string; startTime: number; endTime: number }[];
}> {
  const {
    script,
    onProgress,
    jobId,
    aspectRatio = '9:16',
    companyLogoUrl,
  } = options;
  const genJobId = jobId || uuidv4();
  const companyName = options.companyName || script.companyName || 'RapidGig';

  try {
    console.log(`\n[VideoStitcher] 🎬 Starting 3-part PARALLEL video generation (job=${genJobId})`);
    onProgress?.('Preparing 3-part video generation...', 0.02);

    // Ensure we have 3 segments
    while (script.segments.length < 3) {
      script.segments.push({
        visualPrompt: script.segments[script.segments.length - 1]?.visualPrompt || 'Professional workplace cinematic footage',
        overlayText: 'Apply Now',
        caption: '💰 Apply Now on RapidGig!',
      });
    }

    // ── Step 1: Resolve company logo ─────────────────────────────────────
    onProgress?.('Resolving company logo...', 0.03);
    const logoPath = await resolveCompanyLogo(companyName, companyLogoUrl);

    // ── Step 2: Generate all 3 segments in PARALLEL ──────────────────────
    onProgress?.('Launching 3 parallel video generators...', 0.05);
    console.log(`[VideoStitcher] 🚀 Launching 3 VeoAiFree instances in parallel!`);

    const segmentPromises = script.segments.slice(0, 3).map((segment, index) => {
      const enrichedPrompt = `${segment.visualPrompt}. ` +
        `Aspect Ratio: vertical (9:16). Ultra-realistic, 8K, cinematic lighting, smooth camera motion. ` +
        `Professional workplace documentary style. Part ${index + 1} of 3.`;

      return generateSegmentVideo(enrichedPrompt, index, onProgress);
    });

    const segmentResults = await Promise.allSettled(segmentPromises);
    const videoPaths: string[] = [];
    const successfulSegments: number[] = [];

    segmentResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        videoPaths.push(result.value);
        successfulSegments.push(index);
        console.log(`[VideoStitcher] ✅ Segment ${index + 1} generated successfully`);
      } else {
        console.error(`[VideoStitcher] ❌ Segment ${index + 1} failed`);
      }
    });

    if (videoPaths.length === 0) {
      throw new Error('All 3 video segments failed to generate');
    }

    console.log(`[VideoStitcher] ${videoPaths.length}/3 segments generated successfully`);

    // If only 1-2 segments succeeded, build limited script for captions
    const limitedScript: VideoScript = {
      companyName: script.companyName,
      segments: successfulSegments.map(i => script.segments[i]),
    };

    // ── Step 3: Stitch with FFmpeg ───────────────────────────────────────
    onProgress?.('Stitching videos with crossfade + logo + captions...', 0.85);

    const { outputPath, duration } = await stitchVideosWithCrossfade(
      videoPaths,
      limitedScript,
      genJobId,
      logoPath,
      companyName,
      aspectRatio
    );

    // ── Step 4: Upload to Cloudinary ─────────────────────────────────────
    onProgress?.('Uploading final video...', 0.95);
    const videoUrl = await uploadFinalVideo(outputPath, `job_${genJobId}_3part`);

    // Build captions metadata for database storage
    let currentTime = 0;
    const captions: { text: string; startTime: number; endTime: number }[] = [];
    for (let i = 0; i < limitedScript.segments.length; i++) {
      const segment = limitedScript.segments[i];
      const segDuration = 8; // approximate
      captions.push({
        text: segment.caption || segment.overlayText || '',
        startTime: currentTime,
        endTime: currentTime + segDuration,
      });
      currentTime += segDuration - 1; // account for crossfade
    }

    onProgress?.('Video ready! ✅', 1.0);
    console.log(`[VideoStitcher] ✅ Final ${duration}s video ready with ${videoPaths.length} clips!`);

    return {
      videoUrl,
      duration,
      clips: videoPaths.length,
      providers: Array(videoPaths.length).fill('veoaifree').concat(['ffmpeg-stitch']),
      captions,
    };

  } catch (error: any) {
    console.error('[VideoStitcher] Fatal error:', error);
    throw error;
  }
}
