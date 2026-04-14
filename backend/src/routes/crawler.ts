/**
 * crawler.ts — API routes for web crawling and video generation
 *
 * Endpoints:
 * - POST /api/crawler/crawl - Crawl website and generate videos
 * - GET /api/crawler/status/:jobId - Check generation status
 * - GET /api/crawler/jobs - List all active jobs
 */

import express, { Request, Response } from 'express';
import { websiteCrawler, CrawledContent } from '../services/websiteCrawler';
import { videoGenerationPipeline } from '../services/videoGenerationPipeline';
import cron from 'node-cron';

const router = express.Router();

interface CrawlRequest {
  targetUrl: string;
  pageCount?: number;
  maxScrolls?: number;
  videoDuration?: number;
  includeServices?: ('meta-ai' | 'zsky' | 'wavespeed' | 'magic-hour' | 'veoaifree')[];
}

interface GenerationStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  title: string;
  videoCount: number;
  progress: number;
  error?: string;
}

/**
 * POST /api/crawler/crawl
 * Start a crawl and video generation job
 */
router.post('/crawl', async (req: Request, res: Response) => {
  try {
    const { targetUrl, pageCount = 1, maxScrolls = 10, videoDuration = 10, includeServices } = req.body as CrawlRequest;

    if (!targetUrl) {
      return res.status(400).json({ error: 'targetUrl is required' });
    }

    console.log(`[CrawlerRoute] Starting crawl from: ${targetUrl}`);
    res.json({ message: 'Crawl started', targetUrl, pageCount });

    // Run crawl and video generation in background
    (async () => {
      try {
        // Step 1: Crawl
        let crawledContent: CrawledContent[] = [];

        if (pageCount > 1) {
          crawledContent = await websiteCrawler.crawlMultiplePages(targetUrl, pageCount);
        } else {
          crawledContent = await websiteCrawler.crawlWebsite({
            targetUrl,
            maxScrolls,
          });
        }

        if (crawledContent.length === 0) {
          console.warn('[CrawlerRoute] No content found during crawl');
          return;
        }

        console.log(`[CrawlerRoute] ✅ Crawled ${crawledContent.length} items`);

        // Step 2: Generate videos
        const jobs = await videoGenerationPipeline.processContent(crawledContent, {
          maxParallelGeneration: 3,
          includeServices: includeServices || ['veoaifree'],
          videoDuration,
          uploadToCloudinary: true,
          onProgress: (status, progress) => {
            console.log(`[CrawlerRoute] ${status} (${Math.round(progress * 100)}%)`);
          },
        });

        const completed = jobs.filter(j => j.status === 'completed');
        const failed = jobs.filter(j => j.status === 'failed');

        console.log(`[CrawlerRoute] ✅ COMPLETE - ${completed.length} succeeded, ${failed.length} failed`);
        console.log('[CrawlerRoute] Generated videos saved to Cloudinary');
      } catch (error) {
        console.error('[CrawlerRoute] Fatal error during crawl/generation:', error);
      }
    })();
  } catch (error) {
    console.error('[CrawlerRoute] Error starting crawl:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/crawler/status/:jobId
 * Get status of a generation job
 */
router.get('/status/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = videoGenerationPipeline.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const status: GenerationStatus = {
      jobId: job.contentId,
      status: job.status,
      title: job.title,
      videoCount: job.generatedVideos.length,
      progress: job.status === 'processing' ? 0.5 : job.status === 'completed' ? 1 : 0,
      error: job.error,
    };

    res.json({ ...status, videos: job.generatedVideos });
  } catch (error) {
    console.error('[CrawlerRoute] Error fetching status:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/crawler/jobs
 * List all active generation jobs
 */
router.get('/jobs', (req: Request, res: Response) => {
  try {
    const jobs = videoGenerationPipeline.getAllJobs();

    const summary = jobs.map(job => ({
      jobId: job.contentId,
      status: job.status,
      title: job.title,
      videoCount: job.generatedVideos.length,
      createdAt: job.createdAt,
    }));

    res.json({ totalJobs: jobs.length, jobs: summary });
  } catch (error) {
    console.error('[CrawlerRoute] Error listing jobs:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/crawler/schedule
 * Schedule recurring crawls (e.g., daily)
 * Body: { interval: '0 9 * * *' (cron format), targetUrl: string }
 */
router.post('/schedule', (req: Request, res: Response) => {
  try {
    const { interval = '0 9 * * *', targetUrl } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: 'targetUrl is required' });
    }

    console.log(`[CrawlerRoute] Scheduling crawl at interval: ${interval}`);

    const task = cron.schedule(interval, async () => {
      console.log('[CrawlerRoute] Running scheduled crawl...');

      try {
        let crawledContent = await websiteCrawler.crawlWebsite({
          targetUrl,
          maxScrolls: 5,
        });

        if (crawledContent.length > 0) {
          await videoGenerationPipeline.processContent(crawledContent, {
            maxParallelGeneration: 3,
            includeServices: ['veoaifree'],
            videoDuration: 10,
            uploadToCloudinary: true,
          });

          console.log('[CrawlerRoute] ✅ Scheduled crawl completed');
        }
      } catch (error) {
        console.error('[CrawlerRoute] Error in scheduled crawl:', error);
      }
    });

    res.json({
      message: 'Scheduled crawl created',
      interval,
      targetUrl,
      taskId: task.toString(),
    });
  } catch (error) {
    console.error('[CrawlerRoute] Error scheduling crawl:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/crawler/test-veoaifree
 * Quick test of VeoAiFree API configuration
 * Body: { prompt: string (optional) }
 */
router.post('/test-veoaifree', async (req: Request, res: Response) => {
  try {
    const { prompt = 'Professional working in a modern tech office, productive atmosphere' } = req.body;

    console.log(`[CrawlerRoute] Testing VeoAiFree with prompt: ${prompt.substring(0, 50)}...`);

    const apiKey = process.env.VEOAIFREE_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'VEOAIFREE_API_KEY not configured',
        help: 'Add VEOAIFREE_API_KEY to your .env file',
      });
    }

    res.json({ message: 'VeoAiFree test started', prompt });

    // Run test in background
    (async () => {
      try {
        const { generateVideoVeoAiFree } = require('../services/veoaifree');

        console.log('[CrawlerRoute] Generating 5-second test video with VeoAiFree...');

        const result = await generateVideoVeoAiFree(prompt, 5, (step, progress) => {
          console.log(`[VeoAiFree Test] ${step} (${Math.round(progress * 100)}%)`);
        });

        if (result?.localPath) {
          // Upload to Cloudinary
          const { uploadToCloudinary } = require('../services/cloudinary');
          const buffer = require('fs').readFileSync(result.localPath);
          const uploadResult = await uploadToCloudinary(
            buffer,
            'test-videos',
            `veoaifree-test-${Date.now()}.mp4`,
            'video'
          );

          console.log('[CrawlerRoute] ✅ VeoAiFree test successful!');
          console.log('[CrawlerRoute] Cloudinary URL:', uploadResult.url);

          // Clean up local file
          try {
            require('fs').unlinkSync(result.localPath);
          } catch (e) {
            console.warn('[CrawlerRoute] Could not delete temp file');
          }
        } else {
          console.error('[CrawlerRoute] VeoAiFree test failed - no video generated');
        }
      } catch (error) {
        console.error('[CrawlerRoute] VeoAiFree test error:', error);
      }
    })();
  } catch (error) {
    console.error('[CrawlerRoute] Error starting VeoAiFree test:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/crawler/quick-generate
 * Quick endpoint: just provide job description, get videos directly
 * Body: { jobDescription: string, videoServices?: string[], videoDuration?: number }
 */
router.post('/quick-generate', async (req: Request, res: Response) => {
  try {
    const { jobDescription, videoServices, videoDuration = 10 } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'jobDescription is required' });
    }

    console.log(`[CrawlerRoute] Quick generate request with services:`, videoServices || ['meta-ai', 'zsky']);

    // Create a fake content object
    const content: CrawledContent = {
      title: 'Generated Video',
      description: jobDescription,
      url: req.body.url || 'quick-generate',
      type: 'job',
    };

    res.json({ message: 'Video generation started', jobDescription });

    // Generate videos in background
    (async () => {
      try {
        const jobs = await videoGenerationPipeline.processContent([content], {
          maxParallelGeneration: 3,
          includeServices: videoServices || ['veoaifree'],
          videoDuration,
          uploadToCloudinary: true,
        });

        if (jobs[0]?.generatedVideos.length > 0) {
          console.log(`[CrawlerRoute] ✅ Generated ${jobs[0].generatedVideos.length} videos`);
          console.log('[CrawlerRoute] Videos:', jobs[0].generatedVideos.map(v => v.cloudinaryUrl));
        } else {
          console.log('[CrawlerRoute] No videos generated for this request');
        }
      } catch (error) {
        console.error('[CrawlerRoute] Error in quick-generate:', error);
      }
    })();
  } catch (error) {
    console.error('[CrawlerRoute] Error in quick-generate:', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
