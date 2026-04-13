import Together from 'together-ai';

function describeTogetherError(err: any): string {
  const status =
    err?.status ??
    err?.statusCode ??
    err?.response?.status ??
    err?.cause?.status ??
    undefined;
  const message =
    err?.message ||
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    'Unknown error';
  const type =
    err?.response?.data?.error?.type ||
    err?.response?.data?.type ||
    err?.name ||
    undefined;

  const bits = [
    status ? `status=${status}` : null,
    type ? `type=${type}` : null,
    message ? `message=${message}` : null,
  ].filter(Boolean);

  return bits.join(' ');
}

function getEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function getEnvString(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export async function generateVideoTogether(
  prompt: string,
  onProgress?: (step: string, progress: number) => void
): Promise<{ videoUrl: string } | null> {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.error('[TogetherAI] No TOGETHER_API_KEY found');
    return null;
  }

  const together = new Together({ apiKey });

  try {
    const modelsCsv =
      process.env.TOGETHER_VIDEO_MODELS ||
      process.env.TOGETHER_VIDEO_MODEL ||
      'Wan-AI/wan2.1-t2v-14b';

    const models = modelsCsv
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    let taskId: string | undefined;
    let usedModel: string | undefined;

    for (const model of models) {
      try {
        console.log(`[TogetherAI] Submitting task (model=${model})...`);
        onProgress?.(`TogetherAI: Submitting task (${model})...`, 0.1);

        // Together Video API supports duration/cost knobs.
        // Keep defaults short to maximize chance of success.
        const seconds = getEnvString('TOGETHER_VIDEO_SECONDS') || '2';
        const steps = getEnvInt('TOGETHER_VIDEO_STEPS', 10);
        const fps = getEnvInt('TOGETHER_VIDEO_FPS', 24);

        const response = await together.videos.create({
          model,
          prompt,
          // @ts-ignore
          width: 720,
          height: 1280,
          // @ts-ignore
          aspect_ratio: '9:16',
          // @ts-ignore
          seconds,
          // @ts-ignore
          steps,
          // @ts-ignore
          fps,
        });

        taskId = (response as any).id;
        usedModel = model;
        if (taskId) break;

        console.error('[TogetherAI] No task ID in response:', JSON.stringify(response));
      } catch (err: any) {
        const desc = describeTogetherError(err);
        console.error(`[TogetherAI] Submit failed (model=${model}):`, desc);
        const status = err?.status ?? err?.response?.status;
        if (status === 402) {
          console.error(
            '[TogetherAI] Billing error (402). Add credits or increase monthly spend limit in Together dashboard.'
          );
          onProgress?.('TogetherAI: Payment required (402). Please add credits.', 0.12);
          // No need to try other models: this is account-level.
          return null;
        }
        if (err?.response?.data) {
          try {
            console.error('[TogetherAI] Response Body:', JSON.stringify(err.response.data));
          } catch {
            // ignore
          }
        }
        // Try next model
      }
    }

    if (!taskId || !usedModel) return null;

    // Polling
    const maxAttempts = 60; // 5 mins
    for (let i = 0; i < maxAttempts; i++) {
        onProgress?.(
          `TogetherAI: Generating (${i + 1}/${maxAttempts})...`,
          0.2 + (i / maxAttempts) * 0.7
        );
        
        const pollRes = await together.videos.retrieve(taskId);
        const status = (pollRes as any).status;
        const videoUrl = (pollRes as any).output?.url || (pollRes as any).video_url;

        if (status === 'completed' && videoUrl) {
            console.log(`[TogetherAI] ✅ Generation complete (model=${usedModel}):`, videoUrl);
            return { videoUrl };
        }

        if (status === 'failed') {
            console.error('[TogetherAI] Task failed:', JSON.stringify(pollRes));
            return null;
        }

        await new Promise(r => setTimeout(r, 5000));
    }

    console.warn('[TogetherAI] Polling timed out');
    return null;
  } catch (err: any) {
    const desc = describeTogetherError(err);
    console.error('[TogetherAI] Error:', desc);
    if (err?.response?.data) {
      try {
        console.error('[TogetherAI] Response Body:', JSON.stringify(err.response.data));
      } catch {
        // ignore
      }
    }
    return null;
  }
}
