import axios from 'axios';

export async function generateVideoWaveSpeed(
  prompt: string,
  onProgress?: (step: string, progress: number) => void
): Promise<{ videoUrl: string } | null> {
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) return null;

  try {
    console.log('[WaveSpeed] Submitting task...');
    onProgress?.('WaveSpeed: Submitting task...', 0.1);

    // Use a model endpoint that exists in the account catalog.
    // Old hardcoded kling-video endpoint often returns "model not found".
    const modelId = (process.env.WAVESPEED_MODEL_ID || 'alibaba/wan-2.5/text-to-video').trim();
    const baseUrl = `https://api.wavespeed.ai/api/v3/${modelId}`;
    const size = process.env.WAVESPEED_SIZE || '720*1280';
    const durationRaw = Number(process.env.WAVESPEED_DURATION || '5');
    const duration = [5, 10].includes(durationRaw) ? durationRaw : 5;

    const response = await axios.post(
      baseUrl,
      {
        prompt,
        duration,
        size,
        enable_prompt_expansion: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const taskData = response.data?.data || response.data;
    const taskId = taskData?.id || taskData?.request_id || response.data?.request_id;
    if (!taskId) {
      console.error('[WaveSpeed] No task ID in response:', JSON.stringify(response.data));
      return null;
    }

    const pollUrl = taskData.urls?.get || `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`;
    const disableTimeout = String(process.env.WAVESPEED_DISABLE_TIMEOUT || '').toLowerCase() === 'true';
    const maxWaitMsDefault = 6 * 60 * 60 * 1000; // 6h (safe "no-expire" default)
    const maxWaitMs = Math.max(60_000, Number(process.env.WAVESPEED_MAX_WAIT_MS || String(maxWaitMsDefault)));
    const startedAt = Date.now();
    let attempt = 0;
    let loggedCompletedNoUrl = false;

    // Adaptive polling based on provider-reported ETA/status.
    while (disableTimeout || Date.now() - startedAt < maxWaitMs) {
      attempt += 1;
      const pollRes = await axios.get(pollUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      const data = pollRes.data?.data || pollRes.data;
      const status = String(data?.status || '').toLowerCase();
      const videoUrl =
        data?.urls?.mp4 ||
        data?.urls?.url ||
        data?.output_url ||
        data?.download_url ||
        data?.video_url ||
        data?.output?.url ||
        data?.output?.video?.url ||
        data?.output?.mp4 ||
        data?.result?.video_url;

      const elapsed = Date.now() - startedAt;
      const progressPct = disableTimeout
        ? Math.min(0.95, 0.2 + Math.log10(1 + elapsed / 1000) / 10)
        : Math.min(0.95, 0.2 + (elapsed / maxWaitMs) * 0.75);
      onProgress?.(
        `WaveSpeed: ${status || 'processing'} (attempt ${attempt}, ${(elapsed / 1000).toFixed(0)}s)...`,
        progressPct
      );

      if ((status === 'completed' || status === 'succeeded' || status === 'success') && videoUrl) {
        console.log('[WaveSpeed] ✅ Generation complete:', videoUrl);
        return { videoUrl };
      }

      // We are seeing "completed" status but not capturing a URL; log once so we can adjust parsing.
      if ((status === 'completed' || status === 'succeeded' || status === 'success') && !videoUrl && !loggedCompletedNoUrl) {
        loggedCompletedNoUrl = true;
        try {
          console.warn('[WaveSpeed] Status completed but no video URL found. Raw response (truncated):');
          const raw = JSON.stringify(pollRes.data);
          console.warn(raw.length > 2000 ? `${raw.slice(0, 2000)}…` : raw);
        } catch {
          // ignore
        }
      }

      if (status === 'failed' || status === 'error' || status === 'canceled' || status === 'cancelled') {
        console.error('[WaveSpeed] Generation failed:', JSON.stringify(pollRes.data));
        return null;
      }

      // Prefer provider ETA/retry hints if present; otherwise poll every 5s.
      const etaSeconds =
        Number(data?.eta_seconds) ||
        Number(data?.eta) ||
        Number(pollRes.data?.eta_seconds) ||
        Number(pollRes.data?.eta) ||
        Number(pollRes.headers?.['retry-after']) ||
        5;
      // When provider reports completed but URL isn't ready yet, poll a bit faster.
      const minDelay = (status === 'completed' || status === 'succeeded' || status === 'success') ? 2_000 : 3_000;
      const nextDelayMs = Math.min(20_000, Math.max(minDelay, Math.round(etaSeconds * 1000)));
      await new Promise(r => setTimeout(r, nextDelayMs));
    }

    // Final one-shot check after timeout in case provider finished right on boundary.
    try {
      const finalRes = await axios.get(pollUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const finalData = finalRes.data?.data || finalRes.data;
      const finalUrl =
        finalData?.urls?.mp4 ||
        finalData?.urls?.url ||
        finalData?.output_url ||
        finalData?.download_url ||
        finalData?.video_url ||
        finalData?.output?.url ||
        finalData?.output?.video?.url ||
        finalData?.output?.mp4 ||
        finalData?.result?.video_url;
      if (finalUrl) {
        console.log('[WaveSpeed] ✅ Generation complete on final check:', finalUrl);
        return { videoUrl: finalUrl };
      }
    } catch {
      // ignore and return null below
    }

    console.warn('[WaveSpeed] Polling timed out before completion');
    return null;
  } catch (err: any) {
    console.error('[WaveSpeed] Error:', err.message);
    if (err.response?.data) {
       console.error('[WaveSpeed] Response Body:', JSON.stringify(err.response.data));
    }
    return null;
  }
}
