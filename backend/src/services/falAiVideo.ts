/**
 * falAiVideo.ts — fal.ai hosted video generation service
 *
 * Uses the fal.ai queue API (no SDK needed, pure HTTP).
 * Primary model: fal-ai/skyreels-i2v (SkyReels V1 Image-to-Video)
 * Text-only fallback: fal-ai/wan/t2v or fal-ai/hunyuan-video
 *
 * Sign up at https://fal.ai and set FAL_AI_API_KEY in .env
 * You get free signup credits to test!
 */

import axios from 'axios';

const FAL_API_BASE = 'https://queue.fal.run';
const FAL_RESULT_BASE = 'https://queue.fal.run';

// Model endpoints
const SKYREELS_I2V_MODEL = 'fal-ai/skyreels-i2v';
const WAN_T2V_MODEL = 'fal-ai/wan/t2v'; // fallback T2V

function getApiKey(): string | null {
  const key = process.env.FAL_AI_API_KEY;
  if (!key) {
    console.warn('[FalAi] FAL_AI_API_KEY not set — skipping fal.ai provider');
    return null;
  }
  return key;
}

function buildHeaders(apiKey: string) {
  return {
    'Authorization': `Key ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

interface FalVideoResult {
  videoUrl: string;
  seed?: number;
  model: string;
}

/**
 * Submit a job to the fal.ai queue and return the request_id.
 */
async function submitJob(
  model: string,
  input: Record<string, unknown>,
  apiKey: string
): Promise<string | null> {
  try {
    const url = `${FAL_API_BASE}/${model}`;
    const resp = await axios.post(url, input, {
      headers: buildHeaders(apiKey),
      timeout: 30_000,
    });
    const requestId = resp.data?.request_id;
    if (!requestId) {
      console.error(`[FalAi] No request_id in submit response:`, JSON.stringify(resp.data).slice(0, 200));
      return null;
    }
    console.log(`[FalAi] ✅ Job submitted to ${model}, request_id=${requestId}`);
    return requestId;
  } catch (e: any) {
    const errBody = e.response?.data;
    console.error(`[FalAi] Submit failed (${model}):`, errBody ? JSON.stringify(errBody).slice(0, 300) : e.message);
    return null;
  }
}

/**
 * Poll fal.ai queue until the job is complete, then fetch result.
 * Max ~5 minutes of polling.
 */
async function pollForResult(
  model: string,
  requestId: string,
  apiKey: string,
  onProgress?: (step: string, progress: number) => void
): Promise<FalVideoResult | null> {
  const statusUrl = `${FAL_RESULT_BASE}/${model}/requests/${requestId}/status`;
  const resultUrl = `${FAL_RESULT_BASE}/${model}/requests/${requestId}`;
  const maxAttempts = 60; // 5 minutes at 5s intervals
  const pollIntervalMs = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, pollIntervalMs));
    const progress = 0.1 + (attempt / maxAttempts) * 0.85;
    onProgress?.(`Generating video... (${attempt + 1}/${maxAttempts})`, progress);

    try {
      const statusResp = await axios.get(statusUrl, {
        headers: buildHeaders(apiKey),
        timeout: 15_000,
      });
      const status = statusResp.data?.status;

      if (attempt % 5 === 0) {
        console.log(`[FalAi] Poll attempt ${attempt + 1}: status=${status}`);
      }

      if (status === 'COMPLETED') {
        // Fetch the actual result
        const resultResp = await axios.get(resultUrl, {
          headers: buildHeaders(apiKey),
          timeout: 15_000,
        });
        const data = resultResp.data;
        const videoUrl = data?.video?.url || data?.output?.video?.url;
        if (!videoUrl) {
          console.error('[FalAi] COMPLETED but no video URL:', JSON.stringify(data).slice(0, 300));
          return null;
        }
        onProgress?.('Video ready!', 1.0);
        console.log(`[FalAi] ✅ Video URL: ${videoUrl}`);
        return { videoUrl, seed: data?.seed, model };
      }

      if (status === 'FAILED') {
        const errDetail = statusResp.data?.error;
        console.error('[FalAi] Job FAILED:', errDetail);
        return null;
      }

      // IN_QUEUE or IN_PROGRESS — keep polling
    } catch (e: any) {
      console.warn(`[FalAi] Poll attempt ${attempt + 1} error: ${e.message}`);
    }
  }

  console.warn('[FalAi] ⚠️ Timed out waiting for video result');
  return null;
}

/**
 * Generate a video using SkyReels I2V (image-to-video).
 * Requires an image URL. Great for turning job cover images into marketing videos.
 *
 * @param prompt      Text description of the motion/video
 * @param imageUrl    URL of the starting image (optional — falls back to T2V if not provided)
 * @param onProgress  Progress callback
 */
export async function generateVideoFalAi(
  prompt: string,
  imageUrl?: string,
  onProgress?: (step: string, progress: number) => void
): Promise<FalVideoResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  // Choose model based on whether we have an image
  const model = imageUrl ? SKYREELS_I2V_MODEL : WAN_T2V_MODEL;

  // Build input based on model
  const input: Record<string, unknown> = imageUrl
    ? {
        prompt,
        image_url: imageUrl,
        guidance_scale: 6,
        num_inference_steps: 30,
        aspect_ratio: '16:9',
      }
    : {
        prompt,
        guidance_scale: 6,
        num_inference_steps: 30,
        resolution: '540p',
        num_frames: 97,
      };

  onProgress?.('Submitting to fal.ai (SkyReels)...', 0.05);
  console.log(`[FalAi] Submitting to ${model} with prompt: "${prompt.slice(0, 80)}..."`);

  const requestId = await submitJob(model, input, apiKey);
  if (!requestId) return null;

  onProgress?.('Job queued at fal.ai...', 0.10);
  return pollForResult(model, requestId, apiKey, onProgress);
}

/**
 * Generate a text-to-video using fal.ai WAN model (no image needed).
 */
export async function generateTextToVideoFalAi(
  prompt: string,
  onProgress?: (step: string, progress: number) => void
): Promise<FalVideoResult | null> {
  return generateVideoFalAi(prompt, undefined, onProgress);
}
