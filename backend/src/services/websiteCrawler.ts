/**
 * websiteCrawler.ts — Puppeteer-based website crawler
 *
 * Crawls the RapidGigs website, scrolls through content,
 * and extracts job descriptions or other content for video generation.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface CrawledContent {
  title: string;
  description: string;
  url: string;
  type: 'job' | 'profile' | 'content';
  metadata?: Record<string, any>;
}

interface CrawlConfig {
  targetUrl: string;
  scrollDelay?: number;
  maxScrolls?: number;
  selectors?: {
    jobCard?: string;
    jobTitle?: string;
    jobDescription?: string;
    pagination?: string;
  };
}

class WebsiteCrawler {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (this.browser) return;

    console.log('[Crawler] Initializing Puppeteer browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--single-process', // For constrained environments
      ],
    });
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async crawlWebsite(config: CrawlConfig): Promise<CrawledContent[]> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();
    const content: CrawledContent[] = [];

    try {
      console.log(`[Crawler] Navigating to ${config.targetUrl}`);
      await page.goto(config.targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      const scrollDelay = config.scrollDelay || 2000;
      const maxScrolls = config.maxScrolls || 10;

      // Scroll through the page and collect content
      for (let i = 0; i < maxScrolls; i++) {
        console.log(`[Crawler] Scroll ${i + 1}/${maxScrolls}...`);

        // Extract job listings (generic selectors - adjust based on actual markup)
        // @ts-ignore - document available in page.evaluate context
        const jobCards = await page.evaluate(() => {
          // @ts-ignore
          const items: CrawledContent[] = [];

          // Look for common job card patterns
          // @ts-ignore
          const jobElements = document.querySelectorAll(
            '[data-testid="job-card"], .job-card, [class*="job-listing"], .position-card, .gig-card'
          );

          jobElements.forEach((el, idx) => {
            const titleEl = el.querySelector('h2, h3, [class*="title"], [class*="heading"]');
            const descEl = el.querySelector('p, [class*="description"]');
            const linkEl = el.querySelector('a');

            if (titleEl || descEl) {
              items.push({
                title: titleEl?.textContent?.trim() || `Job ${idx}`,
                description: descEl?.textContent?.trim() || '',
                // @ts-ignore
                url: linkEl?.getAttribute('href') || window.location.href,
                type: 'job',
                metadata: {
                  extractedAt: new Date().toISOString(),
                },
              });
            }
          });

          return items;
        });

        content.push(...jobCards);

        // Scroll down
        // @ts-ignore
        await page.evaluate(() => {
          // @ts-ignore
          window.scrollBy(0, window.innerHeight);
        });

        // Wait before next scroll
        await new Promise(r => setTimeout(r, scrollDelay));

        // Check if we've reached the bottom
        // @ts-ignore
        const isAtBottom = await page.evaluate(() => {
          // @ts-ignore
          return window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
        });

        if (isAtBottom && i > 2) {
          console.log('[Crawler] Reached bottom of page');
          break;
        }
      }

      console.log(`[Crawler] ✅ Crawled ${content.length} items`);
      return content;
    } catch (error) {
      console.error('[Crawler] Error during crawl:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async crawlMultiplePages(baseUrl: string, pageCount: number = 3): Promise<CrawledContent[]> {
    if (!this.browser) await this.initialize();

    const allContent: CrawledContent[] = [];

    for (let page = 1; page <= pageCount; page++) {
      const url = `${baseUrl}?page=${page}`;
      console.log(`[Crawler] Crawling page ${page}...`);

      try {
        const content = await this.crawlWebsite({
          targetUrl: url,
          maxScrolls: 5,
        });

        allContent.push(...content);

        // Delay between pages to avoid rate limiting
        await new Promise(r => setTimeout(r, 3000));
      } catch (error) {
        console.error(`[Crawler] Failed to crawl page ${page}:`, error);
      }
    }

    return allContent;
  }

  /**
   * Crawl for specific job listings with detailed extraction
   */
  async crawlJobListings(jobsPageUrl: string): Promise<CrawledContent[]> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();
    const jobs: CrawledContent[] = [];

    try {
      console.log(`[Crawler] Crawling job listings from ${jobsPageUrl}`);
      await page.goto(jobsPageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Keep scrolling and loading more jobs if there's infinite scroll
      let previousHeight = 0;
      let noChangeCount = 0;

      while (noChangeCount < 3) {
        // Scroll to bottom
        // @ts-ignore
        await page.evaluate(() => {
          // @ts-ignore
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for new content to load
        await new Promise(r => setTimeout(r, 2000));

        // @ts-ignore
        const currentHeight = await page.evaluate(() => {
          // @ts-ignore
          return document.body.scrollHeight;
        });
        if (currentHeight === previousHeight) {
          noChangeCount++;
        } else {
          noChangeCount = 0;
        }
        previousHeight = currentHeight;
      }

      // Extract all job info
      // @ts-ignore - document available in page.evaluate context
      const jobData = await page.evaluate(() => {
        const results: CrawledContent[] = [];

        // Adjust selectors based on your actual website markup
        // @ts-ignore
        const jobElements = document.querySelectorAll(
          '[data-testid="job-item"], .job-listing-item, [class*="job-card"], .position'
        );

        // @ts-ignore
        jobElements.forEach((job: any) => {
          // @ts-ignore
          const titleEl = job.querySelector('h2, h3, .job-title, [class*="title"]');
          // @ts-ignore
          const companyEl = job.querySelector('[class*="company"], .employer-name, .organization');
          // @ts-ignore
          const descEl = job.querySelector('[class*="description"], .job-summary, p');
          // @ts-ignore
          const salaryEl = job.querySelector('[class*="salary"], .compensation, [class*="budget"]');
          // @ts-ignore
          const linkEl = job.querySelector('a[href]');

          if (titleEl) {
            results.push({
              title: titleEl.textContent?.trim() || '',
              description: descEl?.textContent?.trim() || '',
              url: linkEl?.getAttribute('href') || '',
              type: 'job',
              metadata: {
                company: companyEl?.textContent?.trim(),
                salary: salaryEl?.textContent?.trim(),
                postedAt: new Date().toISOString(),
              },
            });
          }
        });

        return results;
      });

      jobs.push(...jobData);
      console.log(`[Crawler] ✅ Found ${jobs.length} job listings`);

      return jobs;
    } catch (error) {
      console.error('[Crawler] Error crawling job listings:', error);
      throw error;
    } finally {
      await page.close();
    }
  }
}

export const websiteCrawler = new WebsiteCrawler();
