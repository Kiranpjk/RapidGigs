/**
 * veoaifree.ts — VeoAiFree Web Automation video generation
 *
 * Integration with https://veoaifree.com/
 * Uses Puppeteer to automate the web interface
 * Generates 5-8 second videos using Google Veo 3.1
 *
 * Flow:
 *   1. Navigate to https://veoaifree.com/
 *   2. Type prompt into #videoPrompt textarea and click #video-submit-btn
 *   3. The site redirects to /veo-video-generator/ with the prompt pre-filled
 *   4. Click #generate_it button on the tool page
 *   5. Dismiss any Google Vignette ads
 *   6. Poll for the video download link (a.downloader-video-btn.only-video-download)
 *   7. Download the generated .mp4
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

puppeteer.use(StealthPlugin());

const VEOAIFREE_URL = 'https://veoaifree.com';
const TOOL_PAGE_URL = 'https://veoaifree.com/veo-video-generator/';

async function downloadVideoFromUrl(videoUrl: string, prefix: string = 'veoaifree'): Promise<{ localPath: string; fileName: string }> {
  const axios = require('axios');
  const fileName = `${prefix}_${Date.now()}.mp4`;
  const tempDir = path.join(process.cwd(), 'uploads', 'tmp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const localPath = path.join(tempDir, fileName);

  console.log(`[VeoAiFree] Downloading video from: ${videoUrl.substring(0, 120)}...`);
  
  const videoRes = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 180000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': VEOAIFREE_URL,
    }
  });
  
  fs.writeFileSync(localPath, Buffer.from(videoRes.data));
  const sizeMB = (Buffer.from(videoRes.data).length / (1024 * 1024)).toFixed(2);
  console.log(`[VeoAiFree] ✅ Saved to: ${localPath} (${sizeMB} MB)`);
  
  return { localPath, fileName };
}

/**
 * Dismiss Google Vignette overlay ads if present.
 */
async function dismissVignetteAds(page: any): Promise<void> {
  try {
    // Google vignette ad dismiss buttons / close icons
    const adDismissSelectors = [
      'div[id*="dismiss"]',
      'button[aria-label*="Close"]',
      'button[aria-label*="close"]',
      '[id*="vignette"] [id*="dismiss"]',
      'ins.adsbygoogle iframe',
      '#cbc-link',            // "close" link on some Google ads
      'div.ad-info-close',
    ];

    for (const sel of adDismissSelectors) {
      const el = await page.$(sel);
      if (el) {
        const box = await el.boundingBox();
        if (box) {
          await el.click();
          console.log(`[VeoAiFree] Dismissed ad overlay via: ${sel}`);
          await new Promise(r => setTimeout(r, 1000));
          return;
        }
      }
    }

    // Fallback: press Escape to close overlays
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
  } catch {
    // Ignore ad-dismissal errors.
  }
}

/**
 * Generate a video using VeoAiFree web automation
 * 
 * @param prompt - Description of video to generate (e.g., "a professional working at desk")
 * @param durationSeconds - Unused currently; VeoAiFree controls duration internally
 * @param onProgress - Progress callback for monitoring
 * @returns Local path to downloaded video or null if failed
 */
export async function generateVideoVeoAiFree(
  prompt: string,
  durationSeconds: number = 5,
  onProgress?: (step: string, progress: number) => void
): Promise<{ localPath: string; fileName: string } | null> {
  let browser = null;
  const networkVideoUrls = new Map<string, number>();
  let generationStartedAt = 0;
  
  try {
    console.log(`[VeoAiFree] Starting web automation... prompt: "${prompt.substring(0, 80)}..."`);
    onProgress?.('VeoAiFree: Launching browser...', 0.05);

    // Launch Puppeteer
    const headless = process.env.VEO_HEADLESS === 'false' ? false : true;
    browser = await puppeteer.launch({
      headless: headless as any,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,900',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Capture media/video URLs from network as a fallback to DOM scraping.
    page.on('response', async (resp: any) => {
      try {
        const url = resp.url();
        const ct = (resp.headers()['content-type'] || '').toLowerCase();

        if (/\.(mp4|webm|m3u8)(\?|$)/i.test(url) || ct.includes('video/') || ct.includes('media/')) {
          networkVideoUrls.set(url, Date.now());
          return;
        }

        if (ct.includes('application/json') || ct.includes('text/plain')) {
          const body = await resp.text();
          const matches = body.match(/https?:\/\/[^\s"'\\]+\.(mp4|webm|m3u8)(\?[^\s"'\\]*)?/gi);
          if (matches) {
            matches.forEach((m: string) => {
               if (!m.includes('demo') && !m.includes('sample')) {
                 networkVideoUrls.set(m, Date.now());
               }
            });
          }
        }
      } catch {
        // Ignore response parsing issues.
      }
    });

    // ───────────────────────────────────────────────────────────
    // Step 1: Navigate to VeoAiFree homepage
    // ───────────────────────────────────────────────────────────
    console.log(`[VeoAiFree] Navigating to ${VEOAIFREE_URL}...`);
    onProgress?.('VeoAiFree: Loading website...', 0.1);
    
    await page.goto(VEOAIFREE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await dismissVignetteAds(page);
    await new Promise(r => setTimeout(r, 2000));

    // ───────────────────────────────────────────────────────────
    // Step 2: Type prompt on the homepage
    // ───────────────────────────────────────────────────────────
    console.log(`[VeoAiFree] Looking for prompt input on homepage...`);
    onProgress?.('VeoAiFree: Entering prompt...', 0.15);

    // The homepage has #videoPrompt textarea and #video-submit-btn
    const homepagePromptSelectors = [
      '#videoPrompt',
      'textarea#videoPrompt',
      'textarea[name="videoPrompt"]',
      'textarea[placeholder*="Prompt"]',
      'textarea',
    ];

    let homepagePromptSel = 'textarea';
    for (const sel of homepagePromptSelectors) {
      const el = await page.$(sel);
      if (el) {
        homepagePromptSel = sel;
        console.log(`[VeoAiFree] Found homepage prompt input: ${sel}`);
        break;
      }
    }

    // Clear any existing text and type our prompt
    await page.click(homepagePromptSel);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type(homepagePromptSel, prompt, { delay: 15 });
    console.log(`[VeoAiFree] Typed prompt: "${prompt.substring(0, 60)}..."`);

    // ───────────────────────────────────────────────────────────
    // Step 3: Click the "Generate a Video" button on homepage
    // ───────────────────────────────────────────────────────────
    console.log(`[VeoAiFree] Looking for homepage generate button...`);
    onProgress?.('VeoAiFree: Submitting prompt...', 0.2);

    const homepageBtnSelectors = [
      '#video-submit-btn',
      'button#video-submit-btn',
      'button:has-text("Generate")',
    ];

    let clickedHomepageBtn = false;
    for (const sel of homepageBtnSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          clickedHomepageBtn = true;
          console.log(`[VeoAiFree] Clicked homepage button: ${sel}`);
          break;
        }
      } catch { /* try next selector */ }
    }

    if (!clickedHomepageBtn) {
      // Fallback: click any button with "Generate" text
      await page.evaluate(() => {
        const doc = (globalThis as any).document;
        const buttons = Array.from(doc.querySelectorAll('button, [role="button"], a.btn'));
        const genBtn = buttons.find((el: any) => /generate/i.test(el.textContent || ''));
        if (genBtn) (genBtn as any).click();
      });
      console.log('[VeoAiFree] Used fallback button click');
    }

    // Wait for navigation to the tool page
    console.log('[VeoAiFree] Waiting for redirect to video generator page...');
    onProgress?.('VeoAiFree: Loading generator...', 0.25);
    
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    } catch {
      // May already have navigated
    }

    await new Promise(r => setTimeout(r, 3000));
    await dismissVignetteAds(page);

    const currentUrl = page.url();
    console.log(`[VeoAiFree] Current URL: ${currentUrl}`);

    // ───────────────────────────────────────────────────────────
    // Step 4: On the tool page, find and click #generate_it
    // ───────────────────────────────────────────────────────────
    console.log(`[VeoAiFree] Looking for tool-page generate button...`);
    onProgress?.('VeoAiFree: Starting generation...', 0.3);

    // The tool page has #fn__include_textarea and #generate_it
    // The prompt should already be pre-filled from the homepage redirect
    const toolPagePromptSel = '#fn__include_textarea';
    const toolPagePrompt = await page.$(toolPagePromptSel);
    if (toolPagePrompt) {
      // Check if prompt is already filled in
      const existingVal = await page.evaluate(
        (sel: string) => ((globalThis as any).document.querySelector(sel) as any)?.value || '',
        toolPagePromptSel
      );
      if (!existingVal || existingVal.trim().length < 5) {
        // Re-type the prompt if it wasn't carried over
        console.log('[VeoAiFree] Re-typing prompt on tool page...');
        await page.click(toolPagePromptSel);
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.type(toolPagePromptSel, prompt, { delay: 15 });
      } else {
        console.log(`[VeoAiFree] Prompt already pre-filled: "${existingVal.substring(0, 50)}..."`);
      }
    }

    // Click the Generate button
    const toolBtnSelectors = [
      '#generate_it',
      'button#generate_it',
      'button.generate-btn',
    ];

    let clickedToolBtn = false;
    for (const sel of toolBtnSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          clickedToolBtn = true;
          console.log(`[VeoAiFree] Clicked tool-page generate: ${sel}`);
          break;
        }
      } catch { /* try next */ }
    }

    if (!clickedToolBtn) {
      // Fallback: any button with "Generate" text
      await page.evaluate(() => {
        const doc = (globalThis as any).document;
        const buttons = Array.from(doc.querySelectorAll('button, [role="button"]'));
        const genBtn = buttons.find((el: any) => /generate/i.test(el.textContent || ''));
        if (genBtn) (genBtn as any).click();
      });
      console.log('[VeoAiFree] Used fallback tool page generate click');
    }

    // Mark when generation started so we only trust fresh network URLs
    generationStartedAt = Date.now();

    // Dismiss any vignette ads that appear after generation click
    await new Promise(r => setTimeout(r, 3000));
    await dismissVignetteAds(page);
    await new Promise(r => setTimeout(r, 2000));
    await dismissVignetteAds(page);

    // ───────────────────────────────────────────────────────────
    // Step 5: Poll for the generated video
    // ───────────────────────────────────────────────────────────
    console.log(`[VeoAiFree] Waiting for video generation (this may take 30-120 seconds)...`);
    onProgress?.('VeoAiFree: Generating video...', 0.35);

    let videoUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 120; // 120 * 5s = 10 minutes max wait (Veo sometimes takes a while)

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      // Dismiss any ads that reappear
      if (attempts % 4 === 0) {
        await dismissVignetteAds(page);
      }

      // Priority 1: Check for the download link that VeoAiFree shows
      const downloadUrl = await page.evaluate(() => {
        const doc = (globalThis as any).document;
        // The site uses: a.downloader-video-btn.only-video-download
        const downloadLink = doc.querySelector('a.downloader-video-btn.only-video-download') as any;
        if (downloadLink?.href && /\.(mp4|webm)/i.test(downloadLink.href)) {
          return downloadLink.href;
        }

        // Also check any download link with mp4 in href
        const allDownloads = doc.querySelectorAll('a[href*=".mp4"], a[download], a.download-btn, a.downloader-video-btn');
        for (const link of Array.from(allDownloads)) {
          const href = (link as any).href || (link as any).getAttribute('href') || '';
          if (href && /\.(mp4|webm)/i.test(href) && !href.startsWith('blob:')) {
            return href;
          }
        }

        return null;
      });

      if (downloadUrl) {
        videoUrl = downloadUrl;
        console.log(`[VeoAiFree] ✅ Found download link: ${videoUrl.substring(0, 100)}...`);
        break;
      }

      // Priority 2: Network-captured media URLs (fresh ones only)
      if (networkVideoUrls.size > 0) {
        const freshCandidates = Array.from(networkVideoUrls.entries())
          .filter(([, seenAt]) => seenAt >= generationStartedAt)
          .map(([url]) => url)
          .filter((u) => !/demo|sample|placeholder|ad/i.test(u));

        const fromNetwork =
          freshCandidates.reverse().find((u) => /\.(mp4|webm|m3u8)(\?|$)/i.test(u)) ||
          freshCandidates[freshCandidates.length - 1];

        if (fromNetwork) {
          videoUrl = fromNetwork;
          console.log(`[VeoAiFree] ✅ Found video URL from network: ${videoUrl.substring(0, 100)}...`);
          break;
        }
      }

      // Priority 3: Look for video element or download button in DOM
      const domResult = await page.evaluate(() => {
        const doc = (globalThis as any).document;
        // Check video elements
        const videoElements = doc.querySelectorAll('video, video source');
        for (const el of Array.from(videoElements)) {
          const src = (el as any).src || (el as any).currentSrc || (el as any).getAttribute('src');
          if (src && /\.(mp4|webm)/i.test(src) && !src.startsWith('blob:')) {
            return src;
          }
        }

        // Check data attributes
        const dataEls = doc.querySelectorAll('[data-src*="mp4"], [data-video*="mp4"], [data-url*="mp4"]');
        for (const el of Array.from(dataEls)) {
          const src = (el as any).getAttribute('data-src') || (el as any).getAttribute('data-video') || (el as any).getAttribute('data-url');
          if (src && !src.startsWith('blob:')) return src;
        }

        return null;
      });

      if (domResult) {
        videoUrl = domResult;
        console.log(`[VeoAiFree] ✅ Found video in DOM: ${videoUrl.substring(0, 100)}...`);
        break;
      }

      // Also scan iframes
      for (const frame of page.frames()) {
        try {
          if (!frame.url().startsWith('http')) continue;
          const frameResult = await frame.evaluate(() => {
            const doc = (globalThis as any).document;
            const els = doc.querySelectorAll('video, source, a[href*=".mp4"]');
            for (const el of Array.from(els)) {
              const src = (el as any).currentSrc || (el as any).src || (el as any).getAttribute('href') || (el as any).getAttribute('src');
              if (src && /\.(mp4|webm|m3u8)(\?|$)/i.test(src) && !src.startsWith('blob:')) return src;
            }
            return null;
          });
          if (frameResult) {
            videoUrl = frameResult;
            console.log(`[VeoAiFree] ✅ Found video in iframe: ${videoUrl.substring(0, 100)}...`);
            break;
          }
        } catch {
          // Cross-origin frame or inaccessible frame.
        }
      }
      if (videoUrl) break;

      const elapsedSeconds = attempts * 5;
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = elapsedSeconds % 60;
      const progress = 0.35 + (attempts / maxAttempts) * 0.55;
      onProgress?.(`VeoAiFree: Generating... (${minutes}m ${seconds}s)`, progress);
      console.log(`[VeoAiFree] Poll ${attempts}/${maxAttempts} (${elapsedSeconds}s elapsed)...`);
    }

    if (!videoUrl) {
      // Take screenshot for debugging
      const debugDir = path.join(process.cwd(), 'uploads', 'tmp');
      if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
      const debugPath = path.join(debugDir, `veoaifree-error-${Date.now()}.png`);
      await page.screenshot({ path: debugPath, fullPage: true });
      console.error(`[VeoAiFree] ❌ Generation timed out after ${maxAttempts * 5}s. Screenshot: ${debugPath}`);
      
      // Log debug info
      // @ts-ignore
      const pageInfo = await page.evaluate(function () {
        const gt = (globalThis as any);
        return {
          title: gt.document.title,
          url: gt.window.location.href,
          downloadLinks: Array.from(gt.document.querySelectorAll('a[href*="mp4"], a[download], a.downloader-video-btn')).map((a: any) => ({
            href: a.href,
            text: (a.textContent || '').trim().substring(0, 50),
            classes: a.className
          })),
          videoCount: gt.document.querySelectorAll('video').length,
          buttons: Array.from(gt.document.querySelectorAll('button')).map((b: any) => (b.textContent || '').trim()).filter(Boolean).slice(0, 15)
        };
      });
      const networkSamples = Array.from(networkVideoUrls.keys()).slice(0, 10);
      
      console.error('[VeoAiFree] Page debug:', JSON.stringify(pageInfo, null, 2));
      if (networkSamples.length > 0) {
        console.error('[VeoAiFree] Network URLs captured:', JSON.stringify(networkSamples, null, 2));
      }
      throw new Error('Video URL not found after timeout. Check screenshot for debugging.');
    }

    // ───────────────────────────────────────────────────────────
    // Step 6: Download the video
    // ───────────────────────────────────────────────────────────
    onProgress?.('VeoAiFree: Downloading video...', 0.92);
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
