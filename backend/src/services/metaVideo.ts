import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

interface MetaCookies {
  datr: string;
  ecto: string;
}

/**
 * Generates a video using Meta AI (meta.ai/vibes) with session cookies.
 */
export async function generateMetaVideo(prompt: string, cookies: MetaCookies): Promise<string | null> {
  let browser;
  try {
    console.log('[MetaAI] Launching cookie-based scraper for Vibes...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    
    const page = await browser.newPage();
    
    // 1. Set Auth Cookies
    await page.setCookie(
      { name: 'datr', value: cookies.datr, domain: '.meta.ai' },
      { name: 'ecto_1_sess', value: cookies.ecto, domain: '.meta.ai' }
    );
    
    // 2. Navigate to Vibes (Longer timeout for heavy page)
    await page.goto('https://www.meta.ai/vibes', { waitUntil: 'networkidle2', timeout: 120000 });
    
    // 3. Type Prompt
    // Meta AI uses contenteditable or deep textareas. We use a resilient selector chain.
    const promptSelector = 'textarea, [contenteditable="true"], [placeholder*="Ask"], [data-testid="meta_input"]';
    await page.waitForSelector(promptSelector, { timeout: 60000 });
    await page.type(promptSelector, prompt);
    
    // 4. Submit
    await page.keyboard.press('Enter');
    
    console.log('[MetaAI] Video generating on Vibes feed...');
    
    // 5. Wait for video to appear (longer wait for generation)
    const videoSelector = 'video source, video';
    await page.waitForSelector(videoSelector, { timeout: 180000 });
    
    // 6. Extract URL
    const videoUrl = await page.evaluate(() => {
      // @ts-ignore
      const v = document.querySelector('video');
      return v ? v.src : null;
    });
    
    console.log(`✅ Meta AI Video generated: ${videoUrl}`);
    return videoUrl;
    
  } catch (error: any) {
    console.error('[MetaAI] Scraper failed:', error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
