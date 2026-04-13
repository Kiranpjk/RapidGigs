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
import { VideoScript } from './promptBuilder';
import { generateJobVideo } from './videoEngine';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'ai-videos');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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
  prompt += `. Cinematic lighting, photorealistic, 4K, smooth motion, professional color grading.`;
  return prompt;
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
  provider?: 'together' | 'magichour' | 'zsky' | 'fal' | 'wavespeed' | 'meta' | 'auto';
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
      onProgress?.('Video ready! ✅', 1.0);
      return {
        videoUrl: result.videoUrl,
        duration: 5,
        clips: 1,
        providers: [result.provider],
      };
    }

    throw new Error('Video generation failed across all selected providers');
  } catch (error: any) {
    console.error('[VideoStitcher] Fatal error:', error);
    throw error;
  }
}
