/**
 * videoGenerationPipeline.ts — Coordinated video generation from crawled content
 *
 * Takes crawled content, generates video scripts using promptBuilder,
 * and generates videos using multiple services in parallel.
 * Videos are uploaded to Cloudinary and saved to database.
 */

import { buildVideoPrompt } from './promptBuilder';
import { generateVideoZSky } from './zskyVideo';
import { generateVideo as generateVideoMetaAi } from './metaAiVideo';
import { generateVideoVeoAiFree } from './veoaifree';
import { uploadToCloudinary } from './cloudinary';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { CrawledContent } from './websiteCrawler';

export interface VideoGenerationJob {
  contentId: string;
  title: string;
  description: string;
  videoScript?: any;
  generatedVideos: GeneratedVideo[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
}

export interface GeneratedVideo {
  serviceUsed: 'meta-ai' | 'zsky' | 'wavespeed' | 'magic-hour' | 'veoaifree';
  videoUrl: string;
  cloudinaryUrl: string;
  duration: number; // in seconds
  localPath?: string;
  generatedAt: Date;
}

interface PipelineConfig {
  maxParallelGeneration?: number;
  includeServices?: ('meta-ai' | 'zsky' | 'wavespeed' | 'magic-hour' | 'veoaifree')[];
  videoDuration?: number; // in seconds
  uploadToCloudinary?: boolean;
  onProgress?: (status: string, progress: number) => void;
}

class VideoGenerationPipeline {
  private activeJobs = new Map<string, VideoGenerationJob>();

  /**
   * Build a video script from job/content description using promptBuilder
   */
  async buildVideoScript(content: CrawledContent): Promise<any> {
    try {
      console.log(`[Pipeline] Building video script for: ${content.title}`);

      const script = await buildVideoPrompt(content.description || content.title);

      if (script) {
        console.log(`[Pipeline] ✅ Generated script with ${script.segments?.length || 0} segments`);
        return script;
      } else {
        console.warn(`[Pipeline] ⚠️ Failed to generate script for: ${content.title}`);
        return null;
      }
    } catch (error) {
      console.error('[Pipeline] Error building video script:', error);
      return null;
    }
  }

  /**
   * Generate a single video from a visual prompt
   */
  private async generateSingleVideo(
    prompt: string,
    service: 'meta-ai' | 'zsky' | 'wavespeed' | 'magic-hour' | 'veoaifree'
  ): Promise<{ success: boolean; videoUrl?: string; localPath?: string; error?: string }> {
    try {
      console.log(`[Pipeline] Generating video with ${service}: ${prompt.substring(0, 50)}...`);

      let result: any;

      switch (service) {
        case 'zsky':
          result = await generateVideoZSky(prompt, undefined, (step, progress) => {
            console.log(`[${service}] ${step} (${Math.round(progress * 100)}%)`);
          });
          if (result?.localPath) {
            return { success: true, localPath: result.localPath };
          }
          break;

        case 'meta-ai':
          // Use the existing metaAiVideo function
          const metaResult = await generateVideoMetaAi(prompt);
          if (metaResult?.videoUrl) {
            return { success: true, videoUrl: metaResult.videoUrl };
          }
          break;

        case 'veoaifree':
          // Use VeoAiFree for 5-second videos
          result = await generateVideoVeoAiFree(prompt, 5, (step, progress) => {
            console.log(`[${service}] ${step} (${Math.round(progress * 100)}%)`);
          });
          if (result?.localPath) {
            return { success: true, localPath: result.localPath };
          }
          break;

        default:
          return { success: false, error: `Service ${service} not yet implemented` };
      }

      return { success: false, error: `${service} generation failed` };
    } catch (error) {
      console.error(`[Pipeline] Error generating with ${service}:`, error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Download video from URL to local file
   */
  private async downloadVideo(videoUrl: string): Promise<{ localPath: string; fileName: string }> {
    const fileName = `gen_${Date.now()}.mp4`;
    const tempDir = path.join(process.cwd(), 'uploads', 'tmp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const localPath = path.join(tempDir, fileName);

    console.log(`[Pipeline] Downloading video: ${videoUrl.substring(0, 50)}...`);

    const response = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 180000,
    });

    fs.writeFileSync(localPath, Buffer.from(response.data));
    console.log(`[Pipeline] ✅ Downloaded to: ${localPath}`);

    return { localPath, fileName };
  }

  /**
   * Upload local video to Cloudinary
   */
  private async uploadVideoDirect(
    localPath: string,
    contentTitle: string
  ): Promise<string> {
    try {
      console.log(`[Pipeline] Uploading to Cloudinary: ${localPath}`);

      const videoBuffer = fs.readFileSync(localPath);
      const result = await uploadToCloudinary(
        videoBuffer,
        'generated-videos',
        `${contentTitle}-${Date.now()}.mp4`,
        'video'
      );

      console.log(`[Pipeline] ✅ Uploaded to Cloudinary: ${result.url}`);
      return result.url;
    } catch (error) {
      console.error('[Pipeline] Error uploading to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Generate videos in parallel from video script segments
   */
  async generateVideosFromScript(
    content: CrawledContent,
    script: any,
    config: PipelineConfig = {}
  ): Promise<GeneratedVideo[]> {
    const services = config.includeServices || ['veoaifree'];
    const maxParallel = Math.min(config.maxParallelGeneration || 3, services.length);
    const uploadToCloud = config.uploadToCloudinary !== false;

    const generatedVideos: GeneratedVideo[] = [];

    if (!script?.segments || script.segments.length === 0) {
      console.warn('[Pipeline] No video segments in script');
      return [];
    }

    // Generate 3 videos in parallel (one per segment, using different services)
    const generationPromises: Promise<void>[] = [];

    for (let i = 0; i < Math.min(script.segments.length, services.length); i++) {
      const segment = script.segments[i];
      const service = services[i % services.length] as 'meta-ai' | 'zsky' | 'wavespeed' | 'magic-hour';

      const promise = (async () => {
        try {
          config.onProgress?.(`Generating with ${service}...`, (i + 1) / services.length);

          const result = await this.generateSingleVideo(segment.visualPrompt, service);

          if (result.success) {
            let cloudinaryUrl = result.videoUrl;

            // If we got a local file, upload it to Cloudinary
            if (result.localPath && uploadToCloud) {
              cloudinaryUrl = await this.uploadVideoDirect(result.localPath, content.title);

              // Clean up local file
              try {
                fs.unlinkSync(result.localPath);
              } catch (e) {
                console.warn('[Pipeline] Could not delete temp file:', result.localPath);
              }
            }

            generatedVideos.push({
              serviceUsed: service,
              videoUrl: result.videoUrl || cloudinaryUrl,
              cloudinaryUrl: cloudinaryUrl || '',
              duration: config.videoDuration || 10,
              generatedAt: new Date(),
            });

            console.log(`[Pipeline] ✅ ${service} video generated successfully`);
          } else {
            console.warn(`[Pipeline] ⚠️ ${service} generation failed: ${result.error}`);
          }
        } catch (error) {
          console.error(`[Pipeline] Error in parallel generation (${service}):`, error);
        }
      })();

      generationPromises.push(promise);

      // Ensure we don't exceed maxParallel concurrent requests
      if (generationPromises.length >= maxParallel) {
        await Promise.race(generationPromises);
      }
    }

    // Wait for all to complete
    await Promise.allSettled(generationPromises);

    console.log(`[Pipeline] ✅ Generated ${generatedVideos.length} videos`);
    return generatedVideos;
  }

  /**
   * Full pipeline: content -> script -> videos -> cloudinary
   */
  async processContent(
    contentList: CrawledContent[],
    config: PipelineConfig = {}
  ): Promise<VideoGenerationJob[]> {
    const jobs: VideoGenerationJob[] = [];

    for (const content of contentList) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const job: VideoGenerationJob = {
        contentId: jobId,
        title: content.title,
        description: content.description,
        generatedVideos: [],
        status: 'pending',
        createdAt: new Date(),
      };

      this.activeJobs.set(jobId, job);
      jobs.push(job);

      try {
        // Update status
        job.status = 'processing';
        config.onProgress?.(`Processing: ${content.title}`, 0.2);

        // Build script from content
        const script = await this.buildVideoScript(content);
        if (!script) {
          job.status = 'failed';
          job.error = 'Failed to build video script';
          continue;
        }

        job.videoScript = script;
        config.onProgress?.(`Generating videos for: ${content.title}`, 0.5);

        // Generate videos
        const videos = await this.generateVideosFromScript(content, script, config);
        job.generatedVideos = videos;

        job.status = videos.length > 0 ? 'completed' : 'failed';
        if (videos.length === 0) {
          job.error = 'No videos were generated';
        }

        config.onProgress?.(`Completed: ${content.title}`, (contentList.indexOf(content) + 1) / contentList.length);
      } catch (error) {
        job.status = 'failed';
        job.error = String(error);
        console.error(`[Pipeline] Fatal error processing ${content.title}:`, error);
      }
    }

    return jobs;
  }

  /**
   * Get job status and details
   */
  getJobStatus(jobId: string): VideoGenerationJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Get all active jobs
   */
  getAllJobs(): VideoGenerationJob[] {
    return Array.from(this.activeJobs.values());
  }
}

export const videoGenerationPipeline = new VideoGenerationPipeline();
