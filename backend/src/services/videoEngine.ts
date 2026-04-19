import { generateVideoMagicHour } from './magicHourVideo';
import { generateVideoVeoAiFree } from './veoaifree';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Initialize Cloudinary (same config as cloudinary.ts service)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface VideoEngineInput {
  prompt: string;
  coverImageUrl?: string;   // Optional: used for image-to-video
  jobId?: string;           // Used for logging / naming the Cloudinary upload
  provider?: 'magichour' | 'veoaifree' | 'auto';
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface VideoEngineResult {
  videoUrl: string;         // Final publicly accessible video URL (Cloudinary CDN)
  provider: string;         // Which provider generated it
  rawUrl: string;           // The original URL from the provider
}

type ProgressCallback = (step: string, progress: number) => void;

// ──────────────────────────────────────────────────────────────────────────────
// Upload a file (local path or remote URL) to Cloudinary
// ──────────────────────────────────────────────────────────────────────────────
async function uploadToCloudinary(
  source: string, // Local path or URL
  publicId?: string
): Promise<string> {
  try {
    console.log(`[VideoEngine] Uploading to Cloudinary: ${source.slice(0, 80)}...`);
    const result = await cloudinary.uploader.upload(source, {
      resource_type: 'video',
      public_id: publicId ? `rapidgigs/videos/${publicId}` : `rapidgigs/videos/${Date.now()}`,
      overwrite: true,
      format: 'mp4',
    });
    console.log(`[VideoEngine] ✅ Uploaded to Cloudinary: ${result.secure_url}`);
    
    // If it was a local temp file, clean it up after upload
    if (source.startsWith('/') || source.includes('uploads/tmp')) {
       try { fs.unlinkSync(source); } catch(e) {}
    }
    
    return result.secure_url;
  } catch (err: any) {
    console.warn('[VideoEngine] Cloudinary upload failed, returning original source:', err.message);
    return source; 
  }
}

// Providers removed: Together, WaveSpeed, Fal.ai, ZSky, Meta AI.
// Focused only on Veo (Free) and Magic Hour (Paid).

// ──────────────────────────────────────────────────────────────────────────────
// Provider 1: Magic Hour (Official SDK)
// ──────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────
// Provider 0: VeoAIFree (Free web automation)
// ──────────────────────────────────────────────────────────────────────────────
async function tryVeoAiFree(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  console.log('[VideoEngine] 🎨 Trying VeoAIFree...');
  try {
    const result = await generateVideoVeoAiFree(
      input.prompt,
      Number(process.env.VEOAIFREE_DURATION_SECONDS || '8'),
      onProgress
    );

    if (!result?.localPath) return null;

    const cloudUrl = await uploadToCloudinary(
      result.localPath,
      input.jobId ? `job_${input.jobId}_veoaifree` : undefined
    );

    return {
      videoUrl: cloudUrl,
      rawUrl: result.localPath,
      provider: 'veoaifree',
    };
  } catch (err: any) {
    console.error('[VideoEngine] VeoAIFree failed:', err.message);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Provider 1: Magic Hour (Paid)
// ──────────────────────────────────────────────────────────────────────────────
async function tryMagicHour(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  if (!process.env.MAGIC_HOUR_API_KEY) return null;

  console.log('[VideoEngine] 🌟 Trying Magic Hour...');
  try {
    const result = await generateVideoMagicHour(
      input.prompt,
      input.coverImageUrl,
      onProgress,
      input.aspectRatio
    );

    if (!result?.videoUrl) return null;

    const cloudUrl = await uploadToCloudinary(
      result.videoUrl,
      input.jobId ? `job_${input.jobId}_mh` : undefined
    );

    return {
      videoUrl: cloudUrl,
      rawUrl: result.videoUrl,
      provider: 'magic-hour',
    };
  } catch (err: any) {
    console.error('[VideoEngine] Magic Hour failed:', err.message);
    return null;
  }
}

// Other providers (WaveSpeed, Fal, ZSky, Meta) removed per user request.

// ──────────────────────────────────────────────────────────────────────────────
// Main export: orchestrate providers with fallback
// ──────────────────────────────────────────────────────────────────────────────
export async function generateJobVideo(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  const { prompt, jobId, provider = 'auto' } = input;
  const togetherEnabled = process.env.TOGETHER_ENABLED === 'true';
  console.log(`\n[VideoEngine] 🎬 Video generation for job=${jobId || 'unknown'} (mode=${provider})`);

  // Explicit provider selection
  if (provider === 'veoaifree') return await tryVeoAiFree(input, onProgress);
  if (provider === 'magichour') return await tryMagicHour(input, onProgress);

  // Auto/Fallback chain:
  // VeoAIFree -> Magic Hour
  const veoResult = await tryVeoAiFree(input, onProgress);
  if (veoResult) return veoResult;

  const mhResult = await tryMagicHour(input, onProgress);
  if (mhResult) return mhResult;

  console.error('[VideoEngine] ❌ All providers failed');
  return null;
}

export function getVideoProviderStatus(): Record<string, boolean> {
  return {
    'magic-hour': !!process.env.MAGIC_HOUR_API_KEY,
    'veoaifree': true,
  };
}
