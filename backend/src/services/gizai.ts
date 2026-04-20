/**
 * gizai.ts — Giz AI Web Automation video generation
 * 
 * Integration with https://app.giz.ai/
 * Uses Puppeteer to automate the assistant interface.
 * 
 * Flow:
 *   1. Navigate to https://app.giz.ai/assistant?mode=video-generation&baseModel=hv15-rapid&prompt=[ENCODED_PROMPT]&withAudio=false
 *   2. Wait for the generation to complete by monitoring status messages or network requests.
 *   3. Extract the final .mp4 URL from the network responses or DOM.
 *   4. Download the generated video.
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

puppeteer.use(StealthPlugin());

const GIZ_BASE_URL = 'https://app.giz.ai/assistant?mode=video-generation&baseModel=hv15-rapid';

async function downloadVideoFromUrl(videoUrl: string, prefix: string = 'gizai'): Promise<{ localPath: string; fileName: string }> {
  const fileName = `${prefix}_${Date.now()}.mp4`;
  const tempDir = path.join(process.cwd(), 'uploads', 'tmp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const localPath = path.join(tempDir, fileName);

  console.log(`[GizAI] Downloading video from: ${videoUrl.substring(0, 100)}...`);
  
  const videoRes = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 180000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  
  fs.writeFileSync(localPath, Buffer.from(videoRes.data));
  const sizeMB = (Buffer.from(videoRes.data).length / (1024 * 1024)).toFixed(2);
  console.log(`[GizAI] ✅ Saved to: ${localPath} (${sizeMB} MB)`);
  
  return { localPath, fileName };
}

export async function generateVideoGizAI(
  prompt: string,
  onProgress?: (step: string, progress: number) => void
): Promise<{ localPath: string; fileName: string } | null> {
  let browser = null;
  let videoUrl: string | null = null;

  try {
    console.log(`[GizAI] Starting web automation... prompt: "${prompt.substring(0, 80)}..."`);
    onProgress?.('GizAI: Launching browser...', 0.05);

    const encodedPrompt = encodeURIComponent(prompt);
    const targetUrl = `${GIZ_BASE_URL}&prompt=${encodedPrompt}&withAudio=false`;

    const headless = process.env.VEO_HEADLESS === 'false' ? false : true;
    browser = await puppeteer.launch({
      headless: headless as any,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,1000',
        '--incognito',
      ],
    });

    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    
    await page.setViewport({ width: 1280, height: 1000 });
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Monitor network requests for the .mp4 file
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/tempFiles/') && url.endsWith('.mp4')) {
        videoUrl = url;
        console.log(`[GizAI] Found video URL via network: ${url}`);
      }
    });

    console.log(`[GizAI] Navigating to Giz AI...`);
    onProgress?.('GizAI: Loading page...', 0.1);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Sometimes the prompt doesn't auto-submit or needs a click
    // Based on the URL params it should start, but let's wait and see
    
    console.log(`[GizAI] Waiting for generation to complete (this may take 1-3 minutes)...`);
    onProgress?.('GizAI: Generating video...', 0.2);

    let attempts = 0;
    const maxAttempts = 40; // 40 * 5s = 200s
    while (attempts < maxAttempts && !videoUrl) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      // Fallback: Check for video element in DOM
      videoUrl = await page.evaluate(() => {
        const doc = (globalThis as any).document;
        const video = doc.querySelector('video');
        if (video && video.src && video.src.startsWith('http') && !video.src.includes('blob:')) {
          return video.src;
        }
        const source = doc.querySelector('video source');
        if (source && (source as any).src && (source as any).src.startsWith('http')) {
          return (source as any).src;
        }
        return null;
      });

      if (videoUrl) break;

      const progress = 0.2 + (attempts / maxAttempts) * 0.7;
      onProgress?.(`GizAI: Generating... (${attempts * 5}s)`, progress);
      console.log(`[GizAI] Poll ${attempts}/${maxAttempts}...`);
    }

    if (!videoUrl) {
       // Debug screenshot
       const debugPath = path.join(process.cwd(), 'uploads', 'tmp', `gizai-error-${Date.now()}.png`);
       await page.screenshot({ path: debugPath, fullPage: true });
       throw new Error(`GizAI timed out. Screenshot saved to ${debugPath}`);
    }

    onProgress?.('GizAI: Downloading...', 0.95);
    const result = await downloadVideoFromUrl(videoUrl);
    
    onProgress?.('GizAI: Complete! ✅', 1.0);
    return result;

  } catch (error: any) {
    console.error('[GizAI] Error:', error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
