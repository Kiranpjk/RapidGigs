import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';

// @ts-ignore
puppeteer.use(StealthPlugin());

interface BrowserResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

/**
 * Robust Browser-based Video Generator for Meta AI
 * Bypasses GraphQL blocking by acting like a real user
 */
export async function generateVideoWithBrowser(prompt: string): Promise<BrowserResult> {
  console.log('[Puppeteer] Starting browser bridge...');
  
  const browser = await puppeteer.launch({
    headless: true, // Use false for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Set Authentication Cookies
    const cookies = [];
    if (process.env.META_AI_COOKIE_DATR) {
      cookies.push({ name: 'datr', value: process.env.META_AI_COOKIE_DATR, domain: '.meta.ai', path: '/' });
    }
    if (process.env.META_AI_ECTO_1_SESS) {
      cookies.push({ name: 'ecto_1_sess', value: process.env.META_AI_ECTO_1_SESS, domain: '.meta.ai', path: '/' });
    }
    if (process.env.META_AI_RD_CHALLENGE) {
      cookies.push({ name: 'rd_challenge', value: process.env.META_AI_RD_CHALLENGE, domain: '.meta.ai', path: '/' });
    }
    
    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    // 2. Navigate to Meta AI
    console.log('[Puppeteer] Navigating to meta.ai...');
    await page.goto('https://www.meta.ai', { waitUntil: 'networkidle2', timeout: 120000 });

    // 3. Wait for the input box
    const inputSelector = 'textarea[placeholder*="Ask Meta AI"]';
    await page.waitForSelector(inputSelector, { timeout: 60000 });

    // 4. Type the prompt
    console.log(`[Puppeteer] Typing prompt: ${prompt.substring(0, 50)}...`);
    await page.type(inputSelector, prompt);
    await page.keyboard.press('Enter');

    // 5. Wait for video to generate (usually 30-60s)
    console.log('[Puppeteer] Waiting for video generation (polling DOM)...');
    
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 * 5s = 5 mins (Higher patience!)

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      
      // Look for <video> tag or <a> tag with .mp4
      const result = await page.evaluate(`() => {
        const video = document.querySelector('video source');
        if (video) return video.src;
        
        const videoTag = document.querySelector('video');
        if (videoTag) return videoTag.src;

        const links = Array.from(document.querySelectorAll('a'));
        const videoLink = links.find(l => (l.href || '').includes('.mp4') || (l.href || '').includes('video'));
        return videoLink ? videoLink.href : null;
      }`) as string | null;

      if (result && result.startsWith('http')) {
        videoUrl = result;
        break;
      }
      
      attempts++;
      console.log(`[Puppeteer] Polling attempt ${attempts}/${maxAttempts}...`);
    }

    if (videoUrl) {
      console.log(`[Puppeteer] ✅ Success! Grabbed video URL: ${videoUrl.substring(0, 50)}...`);
      return { success: true, videoUrl };
    } else {
      // Take a screenshot for debugging if it fails
      const debugPath = path.join(process.cwd(), 'uploads', 'temp', `failed-gen-${Date.now()}.png`);
      await page.screenshot({ path: debugPath });
      console.warn(`[Puppeteer] ❌ Generation failed. Screenshot saved to ${debugPath}`);
      return { success: false, error: 'Timed out waiting for video' };
    }

  } catch (error: any) {
    console.error('[Puppeteer] 💥 Critical Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}
