import MagicHour from 'magic-hour';
import fs from 'fs';
import path from 'path';

export async function generateVideoMagicHour(
  prompt: string,
  coverImageUrl?: string,
  onProgress?: (step: string, progress: number) => void
): Promise<{ videoUrl: string; creditsUsed?: number } | null> {
  const apiKey = process.env.MAGIC_HOUR_API_KEY;
  if (!apiKey) {
    console.error('[MagicHour] No API key found');
    return null;
  }

  const client = new MagicHour({ token: apiKey });

  try {
    console.log('[MagicHour] Starting generation with prompt:', prompt);
    onProgress?.('Magic Hour: Submitting task...', 0.1);

    const endSecondsRaw = Number(process.env.MAGIC_HOUR_END_SECONDS || '2');
    const endSeconds = Number.isFinite(endSecondsRaw) ? endSecondsRaw : 2;

    // Keep defaults compatible with free tiers.
    // Docs note free users can be limited in resolution and default model is ltx-2.
    const resolution = process.env.MAGIC_HOUR_RESOLUTION || '480p';
    const orientation = process.env.MAGIC_HOUR_ORIENTATION || 'portrait';
    const aspectRatio = process.env.MAGIC_HOUR_ASPECT_RATIO; // optional
    const model = process.env.MAGIC_HOUR_MODEL; // optional
    const audioRaw = process.env.MAGIC_HOUR_AUDIO;
    const audio = audioRaw ? audioRaw.toLowerCase() === 'true' : undefined;

    let result: any;
    if (coverImageUrl) {
      console.log('[MagicHour] Using Image-to-Video mode');
      // @ts-ignore
      const requestPayload: any = {
        name: `RapidGigs_${Date.now()}`,
        assets: { imageFilePath: coverImageUrl },
        style: { prompt: prompt },
        orientation,
        resolution,
        endSeconds,
      };
      if (aspectRatio) requestPayload.aspectRatio = aspectRatio;
      if (typeof audio === 'boolean') requestPayload.audio = audio;
      if (model) requestPayload.model = model;
      console.log('[MagicHour] Request payload:', JSON.stringify(requestPayload));

      result = await client.v1.imageToVideo.generate(requestPayload, {
        waitForCompletion: true,
        downloadOutputs: false,
      });
    } else {
      console.log('[MagicHour] Using Text-to-Video mode');
      const requestPayload: any = {
        name: `RapidGigs_${Date.now()}`,
        style: { prompt: prompt },
        orientation,
        resolution,
        endSeconds,
      };
      if (aspectRatio) requestPayload.aspectRatio = aspectRatio;
      if (typeof audio === 'boolean') requestPayload.audio = audio;
      if (model) requestPayload.model = model;
      console.log('[MagicHour] Request payload:', JSON.stringify(requestPayload));

      result = await client.v1.textToVideo.generate(requestPayload, {
        waitForCompletion: true,
        downloadOutputs: false,
      });
    }

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

    if (!videoUrl && !localPath) {
      console.error('[MagicHour] No video URL/path in response:', JSON.stringify(result));
      return null;
    }

    const final = videoUrl || localPath;
    console.log('[MagicHour] ✅ Generation complete:', final);
    return {
      // Can be a remote URL OR a local path; videoEngine will upload if needed.
      videoUrl: final,
      creditsUsed: result.credits_used || result.creditsCharged || 0
    };
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
