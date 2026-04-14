/**
 * veoaifree.ts — VeoAiFree Web Automation video generation
 *
 * Integration with https://veoaifree.com/
 * Uses Puppeteer to automate the web interface
 * Generates 5-8 second videos using Google Veo 3.1
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const VEOAIFREE_URL = 'https://veoaifree.com';

async function downloadVideoFromUrl(videoUrl: string, prefix: string = 'veoaifree'): Promise<{ localPath: string; fileName: string }> {
  const axios = require('axios');
  const fileName = `${prefix}_${Date.now()}.mp4`;
  const tempDir = path.join(process.cwd(), 'uploads', 'tmp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const localPath = path.join(tempDir, fileName);

  console.log(`[VeoAiFree] Downloading video from: ${videoUrl.substring(0, 80)}...`);
  
  const videoRes = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 180000,
  });
  
  fs.writeFileSync(localPath, Buffer.from(videoRes.data));
  console.log(`[VeoAiFree] ✅ Saved to: ${localPath}`);
  
  return { localPath, fileName };
}

/**
 * Generate a video using VeoAiFree web automation
 * 
 * @param prompt - Description of video to generate (e.g., "a professional working at desk")
 * @param onProgress - Progress callback for monitoring
 * @returns Local path to downloaded video or null if failed
 */
export async function generateVideoVeoAiFree(
  prompt: string,
  durationSeconds: number = 5,
  onProgress?: (step: string, progress: number) => void
): Promise<{ localPath: string; fileName: string } | null> {
  let browser = null;
  
  try {
    console.log(`[VeoAiFree] Starting web automation... prompt: "${prompt.substring(0, 50)}..."`);
    onProgress?.('VeoAiFree: Launching browser...', 0.05);

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to VeoAIFree
    console.log(`[VeoAiFree] Navigating to ${VEOAIFREE_URL}...`);
    onProgress?.('VeoAiFree: Loading website...', 0.1);
    
    await page.goto(VEOAIFREE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for prompt input
    console.log(`[VeoAiFree] Waiting for prompt input field...`);
    onProgress?.('VeoAiFree: Finding input field...', 0.15);
    
    await page.waitForSelector('#videoPrompt', { timeout: 30000 }).catch(() => {
      console.warn('[VeoAiFree] Could not find #videoPrompt, trying generic selector...');
    });

    // Type the prompt in the textarea
    console.log(`[VeoAiFree] Typing prompt: "${prompt}"`);
    onProgress?.('VeoAiFree: Entering prompt...', 0.2);
    
    await page.type('#videoPrompt', prompt, { delay: 50 });

    // Find and click generate button
    console.log(`[VeoAiFree] Looking for generate button...`);
    onProgress?.('VeoAiFree: Clicking generate...', 0.25);
    
    // Wait for the "Generate a Video" button
    // @ts-ignore
    const generateButtonFound = await page.evaluate(() => {
      // @ts-ignore
      const buttons = Array.from(document.querySelectorAll('button'));
      // @ts-ignore
      const generateBtn = buttons.find((btn: any) => btn.textContent?.includes('Generate'));
      if (generateBtn) {
        // @ts-ignore
        (generateBtn as any).click();
        return true;
      }
      return false;
    });

    if (!generateButtonFound) {
      throw new Error('Could not find or click "Generate a Video" button');
    }

    console.log(`[VeoAiFree] Clicked generate button`);

    // Wait for video generation
    console.log(`[VeoAiFree] Waiting for video generation (this may take 30-90 seconds)...`);
    onProgress?.('VeoAiFree: Generating video...', 0.3);

    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 * 5s = 5 minutes max wait

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds between checks
      attempts++;

      // Look for video element or download button
      const result = await page.evaluate(() => {
        // @ts-ignore
        // Strategy 1: Look for download links with mp4
        const downloadLinks = Array.from(document.querySelectorAll('a[href*=".mp4"], a[href*="download"], a[download]'));
        for (const link of downloadLinks) {
          // @ts-ignore
          const href = link.href || link.getAttribute('href');
          if (href && (href.includes('.mp4') || href.includes('download'))) {
            return href;
          }
        }

        // @ts-ignore
        // Strategy 2: Look for video elements
        const videoElement: any = document.querySelector('video source, video');
        if (videoElement) {
          const src = videoElement.src || videoElement.srcset;
          if (src && src.includes('.mp4')) {
            return src;
          }
        }

        // @ts-ignore
        // Strategy 3: Look for data attributes containing video URLs
        const allElements = document.querySelectorAll('[data-src], [data-video], [data-url]');
        for (const el of allElements) {
          // @ts-ignore
          const src = el.getAttribute('data-src') || el.getAttribute('data-video') || el.getAttribute('data-url');
          if (src && (src.includes('.mp4') || src.includes('http'))) {
            return src;
          }
        }

        // @ts-ignore
        // Strategy 4: Look for any elements with src/href attributes pointing to videos
        const allElements2 = document.querySelectorAll('[src*="mp4"], [href*="mp4"]');
        for (const el of allElements2) {
          // @ts-ignore
          const src = el.src || el.getAttribute('src') || el.getAttribute('href');
          if (src && src.includes('.mp4')) {
            return src;
          }
        }

        return null;
      }) as string | null;

      if (result) {
        videoUrl = result;
        console.log(`[VeoAiFree] Found video URL: ${videoUrl.substring(0, 80)}...`);
        break;
      }

      const elapsedSeconds = attempts * 5;
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      const progress = 0.3 + (attempts / maxAttempts) * 0.6;
      onProgress?.(`VeoAiFree: Generating... (${minutes}m ${seconds}s)`, progress);
      console.log(`[VeoAiFree] Poll attempt ${attempts}/${maxAttempts} (${elapsedSeconds}s elapsed)...`);
    }

    if (!videoUrl) {
      // Take screenshot for debugging
      const debugPath = path.join(process.cwd(), 'uploads', 'temp', `veoaifree-error-${Date.now()}.png`);
      await page.screenshot({ path: debugPath });
      console.error(`[VeoAiFree] ❌ Generation timed out after ${maxAttempts * 5}s. Screenshot saved to ${debugPath}`);
      
      // Extract page content for debugging
      // @ts-ignore
      const pageContent = await page.evaluate(() => {
        // @ts-ignore
        return {
          // @ts-ignore
          title: document.title,
          // @ts-ignore
          allLinks: Array.from(document.querySelectorAll('a[href*="mp4"], a[download]')).map((a: any) => ({
            href: a.href,
            text: a.textContent
          })),
          // @ts-ignore
          videoElements: Array.from(document.querySelectorAll('video, [class*="video"]')).length,
          // @ts-ignore
          buttonCount: document.querySelectorAll('button').length
        };
      });
      
      console.error('[VeoAiFree] Page analysis:', JSON.stringify(pageContent, null, 2));
      throw new Error('Video URL not found after 5-minute timeout. Check screenshot for debugging.');
    }

    // Download the video
    onProgress?.('VeoAiFree: Downloading video...', 0.9);
    const downloadResult = await downloadVideoFromUrl(videoUrl);

    onProgress?.('VeoAiFree: Complete!', 1.0);
    console.log(`[VeoAiFree] ✅ Video generation complete!`);

    return downloadResult;

  } catch (error) {
    console.error('[VeoAiFree] Error during generation:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
      console.log('[VeoAiFree] Browser closed');
    }
  }
}
