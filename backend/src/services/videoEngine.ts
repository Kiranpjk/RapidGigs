import { generateVideoFalAi } from './falAiVideo';
import { generateVideo as generateMetaAiVideo } from './metaAiVideo';
import { generateVideoMagicHour } from './magicHourVideo';
import { generateVideoZSky } from './zskyVideo';
import { generateVideoWaveSpeed } from './wavespeedVideo';
import { generateVideoTogether } from './togetherVideo';
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
  provider?: 'together' | 'magichour' | 'wavespeed' | 'zsky' | 'fal' | 'meta' | 'veoaifree' | 'auto';
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

// ──────────────────────────────────────────────────────────────────────────────
// Provider 0: Together AI (Direct, fast, high-quality)
// ──────────────────────────────────────────────────────────────────────────────
async function tryTogether(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  if (!process.env.TOGETHER_API_KEY) return null;

  console.log('[VideoEngine] 🚀 Trying Together AI...');
  try {
    const result = await generateVideoTogether(input.prompt, onProgress);
    if (!result?.videoUrl) return null;

    const cloudUrl = await uploadToCloudinary(
      result.videoUrl,
      input.jobId ? `job_${input.jobId}_tog` : undefined
    );

    return {
      videoUrl: cloudUrl,
      rawUrl: result.videoUrl,
      provider: 'together-ai',
    };
  } catch (err: any) {
    console.error('[VideoEngine] Together AI failed:', err.message);
    return null;
  }
}

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
      5, // 5 second video
      onProgress
    );

    if (!result?.localPath) return null;

    const cloudUrl = await uploadToCloudinary(
      result.localPath,
      input.jobId ? `job_${input.jobId}_veoaifree` : undefined
    );

    // Clean up temp file after upload
    try {
      if (result.localPath.includes('uploads/tmp')) {
        require('fs').unlinkSync(result.localPath);
      }
    } catch (e) { /* ignore cleanup errors */ }

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
      onProgress
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

// ──────────────────────────────────────────────────────────────────────────────
// Provider 2: WaveSpeed.ai (High Quality)
// ──────────────────────────────────────────────────────────────────────────────
async function tryWaveSpeed(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  if (!process.env.WAVESPEED_API_KEY) return null;

  console.log('[VideoEngine] 🌊 Trying WaveSpeed.ai...');
  try {
    const result = await generateVideoWaveSpeed(
      input.prompt,
      onProgress
    );

    if (!result?.videoUrl) return null;

    const cloudUrl = await uploadToCloudinary(
      result.videoUrl,
      input.jobId ? `job_${input.jobId}_ws` : undefined
    );

    return {
      videoUrl: cloudUrl,
      rawUrl: result.videoUrl,
      provider: 'wavespeed',
    };
  } catch (err: any) {
    console.error('[VideoEngine] WaveSpeed failed:', err.message);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Provider 3: fal.ai (SkyReels / WAN)
// ──────────────────────────────────────────────────────────────────────────────
async function tryFalAi(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  if (!process.env.FAL_AI_API_KEY) return null;

  console.log('[VideoEngine] 🟢 Trying fal.ai...');
  try {
    const result = await generateVideoFalAi(
      input.prompt,
      input.coverImageUrl,
      onProgress
    );

    if (!result?.videoUrl) return null;

    const cloudUrl = await uploadToCloudinary(
      result.videoUrl,
      input.jobId ? `job_${input.jobId}_fal` : undefined
    );

    return {
      videoUrl: cloudUrl,
      rawUrl: result.videoUrl,
      provider: `fal.ai/${result.model}`,
    };
  } catch (err: any) {
    console.error('[VideoEngine] fal.ai failed:', err.message);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Provider 4: ZSky AI (Free REST API)
// ──────────────────────────────────────────────────────────────────────────────
async function tryZSkyAi(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  console.log('[VideoEngine] 🚀 Trying ZSky AI (Free)...');
  try {
    const result = await generateVideoZSky(
      input.prompt,
      input.coverImageUrl,
      onProgress
    );

    if (!result?.localPath) return null;

    const cloudUrl = await uploadToCloudinary(
      result.localPath,
      input.jobId ? `job_${input.jobId}_zsky` : undefined
    );

    return {
      videoUrl: cloudUrl,
      rawUrl: 'local_binary',
      provider: 'zsky-ai',
    };
  } catch (err: any) {
    console.error('[VideoEngine] ZSky AI failed:', err.message);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Provider 5: Meta AI (Fallback)
// ──────────────────────────────────────────────────────────────────────────────
async function tryMetaAi(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  if (!process.env.META_AI_COOKIE_DATR) return null;

  console.log('[VideoEngine] 🟡 Trying Meta AI...');
  try {
    const result = await generateMetaAiVideo(input.prompt, onProgress);
    if (!result?.videoUrl) return null;

    const cloudUrl = await uploadToCloudinary(
      result.videoUrl,
      input.jobId ? `job_${input.jobId}_meta` : undefined
    );

    return {
      videoUrl: cloudUrl,
      rawUrl: result.videoUrl,
      provider: 'meta-ai',
    };
  } catch (err: any) {
    console.error('[VideoEngine] Meta AI failed:', err.message);
    return null;
  }
}

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
  if (provider === 'together') return togetherEnabled ? await tryTogether(input, onProgress) : null;
  if (provider === 'magichour') return await tryMagicHour(input, onProgress);
  if (provider === 'wavespeed') return await tryWaveSpeed(input, onProgress);
  if (provider === 'zsky') return await tryZSkyAi(input, onProgress);
  if (provider === 'fal') return await tryFalAi(input, onProgress);
  if (provider === 'meta') return await tryMetaAi(input, onProgress);

  // Auto/Fallback chain (tries VeoAIFree FIRST as it's free and reliable):
  // VeoAIFree -> Magic Hour -> WaveSpeed -> Fal.ai -> ZSky -> Meta -> Together(optional)
  const veoResult = await tryVeoAiFree(input, onProgress);
  if (veoResult) return veoResult;

  const mhResult = await tryMagicHour(input, onProgress);
  if (mhResult) return mhResult;

  const wsResult = await tryWaveSpeed(input, onProgress);
  if (wsResult) return wsResult;

  const falResult = await tryFalAi(input, onProgress);
  if (falResult) return falResult;

  const zskyResult = await tryZSkyAi(input, onProgress);
  if (zskyResult) return zskyResult;

  const metaResult = await tryMetaAi(input, onProgress);
  if (metaResult) return metaResult;

  if (togetherEnabled) {
    const togResult = await tryTogether(input, onProgress);
    if (togResult) return togResult;
  }

  console.error('[VideoEngine] ❌ All providers failed');
  return null;
}

export function getVideoProviderStatus(): Record<string, boolean> {
  return {
    'together-ai': !!process.env.TOGETHER_API_KEY && process.env.TOGETHER_ENABLED === 'true',
    'magic-hour': !!process.env.MAGIC_HOUR_API_KEY,
    'wavespeed': !!process.env.WAVESPEED_API_KEY,
    'fal.ai': !!process.env.FAL_AI_API_KEY,
    'zsky-ai': true, // Always available (free/no key)
    'meta-ai': !!process.env.META_AI_COOKIE_DATR,
  };
}
