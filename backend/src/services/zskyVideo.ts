import axios from 'axios';
import fs from 'fs';
import path from 'path';

function normalizeZskyUrls(): string[] {
  const envUrls = process.env.ZSKY_BASE_URLS;
  if (envUrls && envUrls.trim()) {
    return envUrls
      .split(',')
      .map(u => u.trim())
      .filter(Boolean);
  }
  return [
    'https://zsky.ai/api/v1/videos/generate',
    'https://zsky.ai/api/v1/video/generate',
    'https://api.zsky.ai/v1/video/generate',
  ];
}

function extractVideoUrl(payload: any): string | null {
  return (
    payload?.video_url ||
    payload?.url ||
    payload?.data?.video_url ||
    payload?.data?.url ||
    payload?.output?.url ||
    payload?.result?.video_url ||
    payload?.result?.url ||
    null
  );
}

function extractTaskId(payload: any): string | null {
  return (
    payload?.task_id ||
    payload?.id ||
    payload?.data?.task_id ||
    payload?.data?.id ||
    null
  );
}

async function downloadVideoToTemp(videoUrl: string): Promise<{ localPath: string; fileName: string }> {
  const fileName = `zsky_${Date.now()}.mp4`;
  const tempDir = path.join(process.cwd(), 'uploads', 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const localPath = path.join(tempDir, fileName);

  const videoRes = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 180000,
  });
  fs.writeFileSync(localPath, Buffer.from(videoRes.data));
  console.log('[ZSky] ✅ Saved to:', localPath);
  return { localPath, fileName };
}

export async function generateVideoZSky(
  prompt: string,
  imageUrl?: string,
  onProgress?: (step: string, progress: number) => void
): Promise<{ localPath: string; fileName: string } | null> {
  const tryUrls = normalizeZskyUrls();
  const apiKey = process.env.ZSKY_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const maxWaitMs = Math.max(60_000, Number(process.env.ZSKY_MAX_WAIT_MS || '900000')); // default 15m
  
  for (const baseUrl of tryUrls) {
    try {
      console.log(`[ZSky] Trying ${baseUrl}...`);
      onProgress?.(`ZSky: Generating video via ${baseUrl.split('/')[4] || 'free'}...`, 0.1);

      const payload: any = {
        prompt: prompt,
        duration: 5,
        audio: true
      };

      if (imageUrl) {
        payload.image_url = imageUrl;
      }

      const response = await axios.post(baseUrl, payload, {
        timeout: 180000,
        headers,
      });

      // Case 1: Direct video URL returned in JSON
      const directVideoUrl = extractVideoUrl(response.data);
      if (directVideoUrl) {
        return await downloadVideoToTemp(directVideoUrl);
      }

      // Case 2: Async task response, poll status endpoint(s)
      const taskId = extractTaskId(response.data);
      if (taskId) {
        const origin = new URL(baseUrl).origin;
        const pollUrls = [
          `${origin}/api/v1/videos/${taskId}`,
          `${origin}/api/v1/video/${taskId}`,
          `${origin}/api/v1/videos/status/${taskId}`,
          `${origin}/api/v1/video/status/${taskId}`,
        ];

        const startedAt = Date.now();
        while (Date.now() - startedAt < maxWaitMs) {
          for (const pollUrl of pollUrls) {
            try {
              const pollRes = await axios.get(pollUrl, { timeout: 20000, headers });
              const status = String(
                pollRes.data?.status || pollRes.data?.data?.status || ''
              ).toLowerCase();
              const pollVideoUrl = extractVideoUrl(pollRes.data);

              if ((status === 'completed' || status === 'success' || !status) && pollVideoUrl) {
                return await downloadVideoToTemp(pollVideoUrl);
              }
              if (status === 'failed' || status === 'error' || status === 'cancelled') {
                console.warn(`[ZSky] Task ${taskId} failed: ${JSON.stringify(pollRes.data)}`);
                break;
              }
            } catch {
              // try next poll URL
            }
          }

          await new Promise(r => setTimeout(r, 5000));
        }
      }
    } catch (err: any) {
      console.warn(`[ZSky] ${baseUrl} failed: ${err.message}`);
      // Continue to next URL
    }
  }

  console.error('[ZSky] All ZSky endpoints failed');
  return null;
}
