import MagicHour from 'magic-hour';
import fs from 'fs';
import path from 'path';

export async function generateVideoMagicHour(
  prompt: string,
  coverImageUrl?: string,
  onProgress?: (step: string, progress: number) => void
): Promise<{ videoUrl: string; creditsUsed?: number } | null> {
  // Support up to 3 API keys with fallback
  const apiKeys = [
    process.env.MAGIC_HOUR_API_KEY,
    process.env.MAGIC_HOUR_API_KEY_2,
    process.env.MAGIC_HOUR_API_KEY_3,
  ].filter(Boolean) as string[];

  if (apiKeys.length === 0) {
    console.error('[MagicHour] No API keys found');
    return null;
  }

  console.log(`[MagicHour] Using ${apiKeys.length} API key(s)`);

  try {
    console.log('[MagicHour] Starting generation with prompt:', prompt);
    onProgress?.('Magic Hour: Submitting task...', 0.1);

    // Use a longer source clip by default so 30s composition has better variation.
    const endSecondsRaw = Number(process.env.MAGIC_HOUR_END_SECONDS || '8');
    const normalizedEndSeconds = Number.isFinite(endSecondsRaw) ? endSecondsRaw : 8;
    const endSeconds = Math.min(10, Math.max(2, normalizedEndSeconds));

    const preferredResolution = process.env.MAGIC_HOUR_RESOLUTION || '480p';
    const orientation = process.env.MAGIC_HOUR_ORIENTATION || 'portrait';
    const preferredAspectRatio = process.env.MAGIC_HOUR_ASPECT_RATIO; // optional
    const preferredModel = process.env.MAGIC_HOUR_MODEL; // optional
    const audioRaw = process.env.MAGIC_HOUR_AUDIO;
    const audio = audioRaw ? audioRaw.toLowerCase() === 'true' : undefined;

    // Try each API key
    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
      const apiKey = apiKeys[keyIndex];
      console.log(`[MagicHour] Using API key ${keyIndex + 1}/${apiKeys.length}`);
      
      const client = new MagicHour({ token: apiKey });
      
      // Try different configurations with this API key
      const attempts = [
        { resolution: preferredResolution, aspectRatio: preferredAspectRatio, model: preferredModel },
        { resolution: '720p', aspectRatio: preferredAspectRatio, model: preferredModel },
        { resolution: '480p', aspectRatio: preferredAspectRatio, model: undefined as string | undefined },
        { resolution: '480p', aspectRatio: undefined as string | undefined, model: undefined as string | undefined },
      ];

      let result: any = null;
      let lastError: any = null;

      for (let i = 0; i < attempts.length; i++) {
        const cfg = attempts[i];
        try {
          if (coverImageUrl) {
            console.log(`[MagicHour] Using Image-to-Video mode (attempt ${i + 1}/${attempts.length})`);
            const requestPayload: any = {
              name: `RapidGigs_${Date.now()}`,
              assets: { imageFilePath: coverImageUrl },
              style: { prompt: prompt },
              orientation,
              resolution: cfg.resolution,
              endSeconds,
            };
            if (cfg.aspectRatio) requestPayload.aspectRatio = cfg.aspectRatio;
            if (typeof audio === 'boolean') requestPayload.audio = audio;
            if (cfg.model) requestPayload.model = cfg.model;
            console.log('[MagicHour] Request payload:', JSON.stringify(requestPayload));

            result = await client.v1.imageToVideo.generate(requestPayload, {
              waitForCompletion: true,
              downloadOutputs: false,
            });
          } else {
            console.log(`[MagicHour] Using Text-to-Video mode (attempt ${i + 1}/${attempts.length})`);
            const requestPayload: any = {
              name: `RapidGigs_${Date.now()}`,
              style: { prompt: prompt },
              orientation,
              resolution: cfg.resolution,
              endSeconds,
            };
            if (cfg.aspectRatio) requestPayload.aspectRatio = cfg.aspectRatio;
            if (typeof audio === 'boolean') requestPayload.audio = audio;
            if (cfg.model) requestPayload.model = cfg.model;
            console.log('[MagicHour] Request payload:', JSON.stringify(requestPayload));

            result = await client.v1.textToVideo.generate(requestPayload, {
              waitForCompletion: true,
              downloadOutputs: false,
            });
          }

          if (result) break;
        } catch (err: any) {
          lastError = err;
          const status = err?.response?.status;
          const details = err?.data ?? err?.response?.data;
          console.warn(`[MagicHour] Attempt ${i + 1} failed${status ? ` (${status})` : ''}: ${err?.message || 'Unknown error'}`);
          if (details) {
            console.warn('[MagicHour] Attempt error details:', JSON.stringify(details));
          }
        }
      }

      if (result) {
        // Success with this API key!
        const videoUrl =
          result?.download_url ||
          result?.video_url ||
          result?.assets?.video_url ||
          result?.download?.url ||
          result?.downloads?.[0]?.url ||
          result?.outputs?.[0]?.url ||
          undefined;

        const localPath =
          Array.isArray(result?.downloadedPaths) && result.downloadedPaths.length > 0
            ? result.downloadedPaths[0]
            : undefined;

        const final = videoUrl || localPath;
        console.log(`[MagicHour] ✅ Generation complete with API key ${keyIndex + 1}:`, final);
        return {
          videoUrl: final,
          creditsUsed: result.credits_used || result.creditsCharged || 0
        };
      }

      // This API key failed, continue to the next one
      if (lastError) {
        console.warn(`[MagicHour] API key ${keyIndex + 1} failed: ${lastError.message}`);
        if (keyIndex < apiKeys.length - 1) {
          console.log(`[MagicHour] Trying next API key...`);
        }
      }
    }

    // All API keys failed
    console.error('[MagicHour] All API keys failed to generate video');
    return null;
  } catch (err: any) {
    console.error('[MagicHour] Error:', err.message);
    const details = err?.data ?? err?.response?.data;
    if (details) {
       console.error('[MagicHour] Validation Details:', JSON.stringify(details, null, 2));
    }
    console.error('[MagicHour] Error keys:', Object.keys(err || {}).join(',') || '(none)');
    if (err.message.toLocaleLowerCase().includes('credits')) {
      throw new Error('Magic Hour: Insufficient credits');
    }
    throw err;
  }
}
