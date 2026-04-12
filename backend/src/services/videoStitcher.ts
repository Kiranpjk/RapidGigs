import { generateMetaVideo } from './metaVideo';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

const TEMP_DIR = path.join(process.cwd(), 'temp_clips');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

export interface ClipResult {
  localPath: string;
  provider: string;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await axios({ method: 'GET', url, responseType: 'stream' });
  const writer = fs.createWriteStream(dest);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

/**
 * Meta-Only Fallback Chain (Switches between different accounts)
 */
async function generateWithMetaFallback(
  prompt: string,
  clipId: string,
  accountPriority: number[]
): Promise<ClipResult | null> {
  for (const accNum of accountPriority) {
    try {
      console.log(`  [clip ${clipId}] Trying Meta AI Account ${accNum}...`);
      
      const cookies = accNum === 1 
        ? { datr: process.env.META_AI_COOKIE_DATR || '', ecto: process.env.META_AI_COOKIE_ECTO || '' }
        : { datr: process.env.META_AI_COOKIE_DATR_2 || '', ecto: process.env.META_AI_COOKIE_ECTO_2 || '' };

      const rawUrl = await generateMetaVideo(prompt, cookies);
      
      if (rawUrl) {
        const localPath = path.join(TEMP_DIR, `clip-${clipId}-meta${accNum}.mp4`);
        await downloadFile(rawUrl, localPath);
        return { localPath, provider: `MetaAI-Acc${accNum}` };
      }
    } catch (e: any) {
      console.warn(`  [clip ${clipId}] ⚠️ Meta Account ${accNum} failed: ${e.message}`);
    }
  }
  return null;
}

export async function generateStitchedVideo(params: {
  script: { segments: Array<{ visualPrompt: string, overlayText: string }> },
  onProgress?: (step: string, progress: number) => void,
  segmentDuration?: number
}): Promise<{ videoUrl: string, providers: string[], clips: number, duration: number }> {
  const { script, onProgress } = params;
  const jobId = `vj_${Date.now()}`;
  const outputDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const finalPath = path.join(outputDir, `video-${jobId}.mp4`);

  onProgress?.('Generating clips using Meta AI...', 20);
  
  // Parallel generation using split Meta accounts
  const tasks = [
    generateWithMetaFallback(script.segments[0].visualPrompt, `${jobId}_1`, [1, 2]),
    generateWithMetaFallback(script.segments[1].visualPrompt, `${jobId}_2`, [2, 1]),
    generateWithMetaFallback(script.segments[2].visualPrompt, `${jobId}_3`, [1, 2])
  ];
  
  const results = await Promise.all(tasks);
  const validClips = results.filter((r): r is ClipResult => r !== null);
  if (validClips.length === 0) throw new Error('Meta AI failed on all accounts.');

  onProgress?.('Stitching segments...', 70);
  
  await new Promise((resolve, reject) => {
    let command = ffmpeg();
    validClips.forEach(clip => command = command.input(clip.localPath));
    command
      .on('error', reject)
      .on('end', resolve)
      .mergeToFile(finalPath, TEMP_DIR);
  });

  return {
    videoUrl: `/uploads/video-${jobId}.mp4`,
    providers: validClips.map(c => c.provider),
    clips: validClips.length,
    duration: validClips.length * (params.segmentDuration || 10)
  };
}

export const createStitchedVideo = generateStitchedVideo;
