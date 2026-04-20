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
  // FIX: Replace ₹ with Rs. because most standard fonts in FFmpeg don't render it correctly
  let sanitized = (input || '').replace(/₹/g, 'Rs.');

  return sanitized
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

/**
 * Splits a single long line of text into multiple lines for FFmpeg drawtext.
 * Useful for portrait videos where vertical space is more abundant than horizontal.
 */
function wrapText(text: string, maxCharsPerLine: number = 22): string {
  if (!text) return "";
  const words = text.split(/\s+/);
  let lines: string[] = [];
  let currentLine = "";

  words.forEach(word => {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  });
  if (currentLine) lines.push(currentLine.trim());
  return lines.join('\n');
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
    '/usr/share/fonts/noto/NotoSans-Bold.ttf',
    '/usr/share/fonts/noto/NotoSansKannada-Bold.ttf', // Fallback from our find command
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  ];
  for (const fontPath of candidates) {
    if (fs.existsSync(fontPath)) return fontPath;
  }
  // Try to find ANY ttf if candidates fail
  try {
    const fallbackDir = '/usr/share/fonts';
    if (fs.existsSync(fallbackDir)) {
      const files = fs.readdirSync(fallbackDir, { recursive: true }) as string[];
      const firstTtf = files.find(f => f.endsWith('.ttf'));
      if (firstTtf) return path.join(fallbackDir, firstTtf);
    }
  } catch {}
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

  // Probe durations for precise xfade calc
  const durations = await Promise.all(localPaths.map(p => getVideoDurationSeconds(p)));
  console.log(`[VideoStitcher] Segment durations: ${durations.map(d => d.toFixed(1)).join(', ')}s`);

  let localLogoPath: string | null = null;
  if (coverImageUrl) {
    try {
      localLogoPath = path.join(UPLOADS_DIR, `${jobId}-logo`); 
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
  
  const filterGraph = [];
  const transDuration = 1.0; // 1 second crossfade

  // 1. Prepare each segment (scale, pad, and add dynamic captions)
  for (let i = 0; i < localPaths.length; i++) {
    const isFinalSegment = i === localPaths.length - 1;
    const duration = durations[i];
    const overlayRaw = script.segments?.[i]?.overlayText || '';
    let drawtextFilters: string[] = [];

    // Regular caption handling
    if (overlayRaw) {
      const overlayLines = overlayRaw.split('\n').filter(Boolean);
      overlayLines.forEach((text, lineIdx) => {
        const paddedText = `  ${text.trim()}  `;
        const escaped = escapeDrawtext(paddedText);
        const baseSize = 48;
        const fontSize = lineIdx === 0 ? baseSize + 6 : lineIdx === 2 ? baseSize - 10 : baseSize;
        const yPos = 1450 + (lineIdx * (fontSize + 30));
        
        // Hide regular caption in the last 2 seconds if it's the final segment
        const enableText = isFinalSegment ? `:enable='lt(t,${(duration - 2.0).toFixed(2)})'` : '';
        const fontfile = fontPath ? `:fontfile='${escapeDrawtext(fontPath)}'` : '';
        
        drawtextFilters.push(`drawtext=text='${escaped}'${fontfile}:x=(w-text_w)/2:y=${yPos}:fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=black@0.4:boxborderw=12:shadowcolor=black@0.2:shadowx=2:shadowy=2${enableText}`);
      });
    }

    // End Card handling for the final segment
    if (isFinalSegment) {
      console.log(`[VideoStitcher] Building End Card - Company: "${script.companyName}", Title: "${script.jobTitle}"`);      // Extract salary, location and work type from script/segments (refining extraction)
      const salaryBase = script.segments?.[i]?.overlayText?.split('|')[0] || 'Competitive Pay';
      const locBase = script.location || script.segments?.[0]?.caption?.split('@')?.[1]?.split('.')?.[0] || 'Remote';
      const workType = escapeDrawtext(script.workType || 'Remote');

      // End Card text wrapping - tighter limits for vertical
      const wrappedCompany = wrapText(script.companyName || 'This Company', 16);
      const wrappedTitle = wrapText(script.jobTitle || 'Career Opportunity', 18);
      const wrappedLocation = wrapText(locBase, 20);
      const wrappedSalary = wrapText(salaryBase, 15);
      
      const startTime = (duration - 2.0).toFixed(2);
      const fontfile = fontPath ? `:fontfile='${escapeDrawtext(fontPath)}'` : '';
      
      // Line 1: Company (White, Small, Bold)
      const companyLines = wrappedCompany.split('\n');
      companyLines.forEach((line, idx) => {
        const yCoord = 700 + (idx * 60);
        drawtextFilters.push(`drawtext=text='${escapeDrawtext(line)}'${fontfile}:x=(w-text_w)/2:y=${yCoord}:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=20:enable='gt(t,${startTime})'`);
      });

      // Line 2: Title / Role (Blue, Highlighted)
      const titleLines = wrappedTitle.split('\n');
      titleLines.forEach((line, idx) => {
        const yCoord = 880 + (idx * 65);
        drawtextFilters.push(`drawtext=text='${escapeDrawtext(line)}'${fontfile}:x=(w-text_w)/2:y=${yCoord}:fontsize=52:fontcolor=0x6366f1:box=1:boxcolor=black@0.6:boxborderw=20:enable='gt(t,${startTime})'`);
      });

      // Line 3: Location (Amber, Medium)
      const locationLines = wrappedLocation.split('\n');
      locationLines.forEach((line, idx) => {
        const yCoord = 1060 + (idx * 50);
        drawtextFilters.push(`drawtext=text='${escapeDrawtext(line)}'${fontfile}:x=(w-text_w)/2:y=${yCoord}:fontsize=40:fontcolor=0xF59E0B:box=1:boxcolor=black@0.6:boxborderw=20:enable='gt(t,${startTime})'`);
      });

      // Line 4: Salary (White, Semi-bold)
      const salaryLines = wrappedSalary.split('\n');
      salaryLines.forEach((line, idx) => {
        const yCoord = 1220 + (idx * 55);
        drawtextFilters.push(`drawtext=text='${escapeDrawtext(line)}'${fontfile}:x=(w-text_w)/2:y=${yCoord}:fontsize=42:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=20:enable='gt(t,${startTime})'`);
      });

      // Line 5: Call to Action (Blue Button)
      drawtextFilters.push(`drawtext=text='APPLY NOW'${fontfile}:x=(w-text_w)/2:y=1420:fontsize=48:fontcolor=white:box=1:boxcolor=0x4F46E5@0.9:boxborderw=20:enable='gt(t,${startTime})'`);
      
      console.log(`[VideoStitcher] Generated End Card FFmpeg logic for Segment ${i}`);
    }

    const drawtextJoined = drawtextFilters.length > 0 ? ',' + drawtextFilters.join(',') : '';

    // Scaling and padding to 1080x1920
    filterGraph.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p${drawtextJoined}[pre_v${i}]`);
    
    // Robust audio handling: Generate silence if input lacks audio
    const hasAudio = await checkHasAudio(localPaths[i]);
    if (hasAudio) {
      filterGraph.push(`[${i}:a]anull[pre_a${i}]`);
    } else {
      filterGraph.push(`aevalsrc=0:d=${durations[i]}[pre_a${i}]`);
    }
  }

  // 2. Blend segments like butter (xfade)
  let lastV = 'pre_v0';
  let lastA = 'pre_a0';
  let cumulativeOffset = durations[0] - transDuration;

  for (let i = 1; i < localPaths.length; i++) {
    const nextV = `v_blend_${i}`;
    const nextA = `a_blend_${i}`;
    
    // Video xfade
    filterGraph.push(`[${lastV}][pre_v${i}]xfade=transition=fade:duration=${transDuration}:offset=${cumulativeOffset.toFixed(2)}[${nextV}]`);
    // Audio acrossfade
    filterGraph.push(`[${lastA}][pre_a${i}]acrossfade=d=${transDuration}[${nextA}]`);
    
    lastV = nextV;
    lastA = nextA;
    cumulativeOffset += (durations[i] - transDuration);
  }

  const voutLabel = localLogoPath ? '[v_blended_all]' : '[vout]';
  
  if (localLogoPath) {
    const logoIdx = localPaths.length;
    filterGraph.push(`[${logoIdx}:v]scale=280:-1[logo_scaled];[${lastV}][logo_scaled]overlay=W-w-50:50[vout]`);
  } else {
    // If no logo, we need to map lastV to vout if names don't match
    if (lastV !== 'vout') {
       // Using 'copy' filter (format=yuv420p) to just rename the label
       filterGraph.push(`[${lastV}]format=yuv420p[vout]`); 
    }
  }

  await new Promise<void>((resolve, reject) => {
    command
      .complexFilter(filterGraph)
      .outputOptions([
        '-map [vout]',
        `-map [${lastA}]`,
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        '-c:a aac',
        '-b:a 192k',
        '-shortest'
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('[VideoStitcher] FFmpeg Error:', err.message);
        reject(err);
      })
      .save(outputPath);
  });

  try {
    await validateOutputHasVideoStream(outputPath);
  } catch (probeErr: any) {
    console.warn(`[VideoStitcher] Output validation failed: ${probeErr.message}`);
  }

  const finalDuration = await getVideoDurationSeconds(outputPath);
  console.log(`[VideoStitcher] Final duration: ${finalDuration.toFixed(2)}s (Butter-blended)`);

  // Cleanup
  for (const p of localPaths) {
    try { fs.unlinkSync(p); } catch {}
  }
  if (localLogoPath) {
    try { fs.unlinkSync(localLogoPath); } catch {}
  }

  const videoUrl = await uploadFinalVideo(outputPath, `job_${jobId}_premium`);
  return { videoUrl, duration: Math.round(finalDuration), clips: localPaths.length };
}

/**
 * Generate a video from a VideoScript.
 * Now generates 3 segments in parallel for faster turnaround.
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
    console.log(`\n[VideoStitcher] Starting 3-PART PARALLEL generation (job=${genJobId}, provider=${provider})`);
    onProgress?.('Launching parallel generation...', 0.05);

    // Use the segments provided in the script (up to 3 for the "3-part" style)
    const segments = script.segments.slice(0, 3);
    if (segments.length === 0) {
      segments.push({
        visualPrompt: 'Professional workplace documentary style, cinematic lighting',
        overlayText: 'Join Our Team',
        caption: 'Apply Now!'
      });
    }

    // Generate segments in PARALLEL
    const segmentResults = await Promise.all(
      segments.map((seg, idx) => {
        const segPrompt = `${seg.visualPrompt}. Cinematic, high-quality, vertical video.`;
        return generateJobVideo(
          {
            prompt: segPrompt,
            jobId: `${genJobId}_seg${idx}`,
            provider: provider as any,
          },
          (step, prog) => {
            // Aggregate progress for reporting
            if (idx === 0) onProgress?.(`Generating Segment 1: ${step}`, 0.1 + (prog * 0.7));
          }
        );
      })
    );

    const validResults = segmentResults.filter(r => !!r);
    if (validResults.length === 0) throw new Error(`All segment generations failed with ${provider}`);

    onProgress?.('Stitching segments and applying captions...', 0.85);

    const urls = validResults.map(r => r!.videoUrl);
    const finalResult = await stitchThreeSegments(urls, { ...script, segments }, genJobId, coverImageUrl);

    onProgress?.('Finalizing video... ✅', 0.95);

    return {
      videoUrl: finalResult.videoUrl,
      duration: finalResult.duration,
      clips: finalResult.clips,
      providers: validResults.map(r => r!.provider),
      captions: segments.map(s => s.overlayText),
    };

  } catch (error: any) {
    console.error('[VideoStitcher] Fatal error:', error);
    throw error;
  }
}

/**
 * Checks if a video file has an audio stream.
 */
async function checkHasAudio(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return resolve(false);
      const hasAudio = metadata.streams.some(s => s.codec_type === 'audio');
      resolve(hasAudio);
    });
  });
}
