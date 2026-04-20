import { generateVideoMagicHour } from './magicHourVideo';
import { generateVideoVeoAiFree } from './veoaifree';
import { generateVideoWithBrowser as generateVideoMetaAi } from './puppeteerVideo';
import { generateVideoWaveSpeed } from './wavespeedVideo';
import { generateVideoTogether } from './togetherVideo';
import { generateVideoZSky } from './zskyVideo';
import { generateVideoGizAI } from './gizai';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

export interface VideoEngineInput {
  prompt: string;
  coverImageUrl?: string;   // Optional: used for image-to-video
  jobId?: string;           // Used for logging / naming the Cloudinary upload
  provider?: 'wavespeed' | 'together' | 'magichour' | 'veoaifree' | 'meta-ai' | 'zsky' | 'gizai' | 'auto';
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface VideoEngineResult {
  videoUrl: string;         // Final publicly accessible video URL (Cloudinary CDN)
  provider: string;         // Which provider generated it
  rawUrl: string;           // The original URL from the provider
}

type ProgressCallback = (step: string, progress: number) => void;

async function uploadToCloudinary(
  source: string, // Local path or URL
  publicId?: string
): Promise<string> {
  // Ensure Cloudinary is configured using latest env variables
  if (!process.env.CLOUDINARY_API_KEY) {
    console.warn('[VideoEngine] Cloudinary API Key missing, skipping upload.');
    return source;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

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
// Provider 1: ZSky (API based)
// ──────────────────────────────────────────────────────────────────────────────
async function tryZSky(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  if (!process.env.ZSKY_API_KEY) {
     console.warn('[VideoEngine] ZSKY_API_KEY missing, skipping ZSky.');
     return null;
  }
  console.log('[VideoEngine] ✈️ Trying ZSky...');
  try {
    const result = await generateVideoZSky(input.prompt, input.coverImageUrl, onProgress);
    if (!result?.localPath) return null;

    const cloudUrl = await uploadToCloudinary(
      result.localPath,
      input.jobId ? `job_${input.jobId}_zsky` : undefined
    );

    return {
      videoUrl: cloudUrl,
      rawUrl: result.localPath,
      provider: 'zsky',
    };
  } catch (err: any) {
    console.error('[VideoEngine] ZSky failed:', err.message);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Provider 2: Giz.ai (Web automation)
// ──────────────────────────────────────────────────────────────────────────────
async function tryGizAi(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  console.log('[VideoEngine] 🤖 Trying Giz.ai...');
  try {
    const result = await generateVideoGizAI(input.prompt, onProgress);
    if (!result?.localPath) return null;

    const cloudUrl = await uploadToCloudinary(
      result.localPath,
      input.jobId ? `job_${input.jobId}_gizai` : undefined
    );

    return {
      videoUrl: cloudUrl,
      rawUrl: result.localPath,
      provider: 'gizai',
    };
  } catch (err: any) {
    console.error('[VideoEngine] Giz.ai failed:', err.message);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Other Providers (Fallbacks / Specific)
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
    const cloudUrl = await uploadToCloudinary(result.videoUrl, input.jobId ? `job_${input.jobId}_mh` : undefined);
    return { videoUrl: cloudUrl, rawUrl: result.videoUrl, provider: 'magic-hour' };
  } catch (err: any) {
    console.error('[VideoEngine] Magic Hour failed:', err.message);
    return null;
  }
}

async function tryWaveSpeed(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  if (!process.env.WAVESPEED_API_KEY) return null;
  console.log('[VideoEngine] 🌊 Trying WaveSpeed...');
  try {
    const result = await generateVideoWaveSpeed(input.prompt, onProgress);
    if (!result?.videoUrl) return null;
    const cloudUrl = await uploadToCloudinary(result.videoUrl, input.jobId ? `job_${input.jobId}_qwen` : undefined);
    return { videoUrl: cloudUrl, rawUrl: result.videoUrl, provider: 'wavespeed' };
  } catch (err: any) {
    console.error('[VideoEngine] WaveSpeed failed:', err.message);
    return null;
  }
}

async function tryTogether(
  input: VideoEngineInput,
  onProgress?: ProgressCallback
): Promise<VideoEngineResult | null> {
  if (!process.env.TOGETHER_API_KEY) return null;
  console.log('[VideoEngine] 🤝 Trying Together...');
  try {
    const result = await generateVideoTogether(input.prompt, onProgress);
    if (!result?.videoUrl) return null;
    const cloudUrl = await uploadToCloudinary(result.videoUrl, input.jobId ? `job_${input.jobId}_together` : undefined);
    return { videoUrl: cloudUrl, rawUrl: result.videoUrl, provider: 'together' };
  } catch (err: any) {
    console.error('[VideoEngine] Together failed:', err.message);
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
  const { prompt, jobId, provider = 'veoaifree' } = input;
  console.log(`\n[VideoEngine] 🎬 Video generation for job=${jobId || 'unknown'} (mode=${provider})`);

  // Explicit provider selection
  if (provider === 'veoaifree') return await tryVeoAiFree(input, onProgress);
  if (provider === 'zsky') return await tryZSky(input, onProgress);
  if (provider === 'gizai') return await tryGizAi(input, onProgress);
  if (provider === 'wavespeed') return await tryWaveSpeed(input, onProgress);
  if (provider === 'together') return await tryTogether(input, onProgress);
  if (provider === 'magichour') return await tryMagicHour(input, onProgress);

  // Auto/Fallback chain:
  // VeoAIFree -> ZSky -> Giz.ai -> WaveSpeed -> Together -> Magic Hour
  const veoResult = await tryVeoAiFree(input, onProgress);
  if (veoResult) return veoResult;

  const zskyResult = await tryZSky(input, onProgress);
  if (zskyResult) return zskyResult;

  const gizResult = await tryGizAi(input, onProgress);
  if (gizResult) return gizResult;

  const qwenResult = await tryWaveSpeed(input, onProgress);
  if (qwenResult) return qwenResult;

  const togetherResult = await tryTogether(input, onProgress);
  if (togetherResult) return togetherResult;

  const mhResult = await tryMagicHour(input, onProgress);
  if (mhResult) return mhResult;

  console.error('[VideoEngine] ❌ All providers failed');
  return null;
}

export function getVideoProviderStatus(): Record<string, boolean> {
  return {
    'wavespeed': !!process.env.WAVESPEED_API_KEY,
    'together': !!process.env.TOGETHER_API_KEY,
    'magic-hour': !!process.env.MAGIC_HOUR_API_KEY,
    'veoaifree': true,
    'meta-ai': !!process.env.META_AI_COOKIE_DATR,
  };
}
