import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function generateVideoZSky(
  prompt: string,
  imageUrl?: string,
  onProgress?: (step: string, progress: number) => void
): Promise<{ localPath: string; fileName: string } | null> {
  const tryUrls = [
    'https://zsky.ai/api/v1/videos/generate',
    'https://zsky.ai/api/v1/video/generate',
    'https://api.zsky.ai/v1/video/generate'
  ];
  
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
        responseType: 'arraybuffer',
        timeout: 180000, 
      });

      if (response.status === 200) {
        const fileName = `zsky_${Date.now()}.mp4`;
        const tempDir = path.join(process.cwd(), 'uploads', 'tmp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const localPath = path.join(tempDir, fileName);

        fs.writeFileSync(localPath, Buffer.from(response.data));
        
        console.log('[ZSky] ✅ Saved to:', localPath);
        return { localPath, fileName };
      }
    } catch (err: any) {
      console.warn(`[ZSky] ${baseUrl} failed: ${err.message}`);
      // Continue to next URL
    }
  }

  console.error('[ZSky] All ZSky endpoints failed');
  return null;
}
