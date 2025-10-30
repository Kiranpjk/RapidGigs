import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  size: number;
}

export class VideoProcessor {
  static async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    try {
      // Use ffprobe to get video metadata
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
      const { stdout } = await execAsync(command);
      const metadata = JSON.parse(stdout);
      
      const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
      
      if (!videoStream) {
        throw new Error('No video stream found');
      }
      
      return {
        duration: Math.round(parseFloat(metadata.format.duration)),
        width: videoStream.width,
        height: videoStream.height,
        format: metadata.format.format_name,
        size: parseInt(metadata.format.size)
      };
    } catch (error) {
      console.error('Error getting video metadata:', error);
      throw new Error('Failed to process video metadata');
    }
  }

  static async generateThumbnail(videoPath: string, outputPath: string, timeOffset: number = 1): Promise<string> {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate thumbnail using ffmpeg
      const command = `ffmpeg -i "${videoPath}" -ss ${timeOffset} -vframes 1 -q:v 2 -y "${outputPath}"`;
      await execAsync(command);
      
      if (!fs.existsSync(outputPath)) {
        throw new Error('Thumbnail generation failed');
      }
      
      return outputPath;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error('Failed to generate video thumbnail');
    }
  }

  static async compressVideo(inputPath: string, outputPath: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Define compression settings based on quality
      let compressionSettings = '';
      switch (quality) {
        case 'low':
          compressionSettings = '-crf 28 -preset fast';
          break;
        case 'medium':
          compressionSettings = '-crf 23 -preset medium';
          break;
        case 'high':
          compressionSettings = '-crf 18 -preset slow';
          break;
      }

      // Compress video using ffmpeg
      const command = `ffmpeg -i "${inputPath}" ${compressionSettings} -c:a aac -b:a 128k -movflags +faststart -y "${outputPath}"`;
      await execAsync(command);
      
      if (!fs.existsSync(outputPath)) {
        throw new Error('Video compression failed');
      }
      
      return outputPath;
    } catch (error) {
      console.error('Error compressing video:', error);
      throw new Error('Failed to compress video');
    }
  }

  static async validateVideo(filePath: string): Promise<boolean> {
    try {
      const metadata = await this.getVideoMetadata(filePath);
      
      // Validation rules
      const maxDuration = 60; // 60 seconds max for intro videos
      const maxSize = 50 * 1024 * 1024; // 50MB max
      const minDuration = 5; // 5 seconds minimum
      
      if (metadata.duration > maxDuration) {
        throw new Error(`Video too long. Maximum duration is ${maxDuration} seconds`);
      }
      
      if (metadata.duration < minDuration) {
        throw new Error(`Video too short. Minimum duration is ${minDuration} seconds`);
      }
      
      if (metadata.size > maxSize) {
        throw new Error(`Video file too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
      }
      
      return true;
    } catch (error) {
      console.error('Video validation failed:', error);
      throw error;
    }
  }

  static async processVideo(inputPath: string, outputDir: string, filename: string): Promise<{
    videoPath: string;
    thumbnailPath: string;
    metadata: VideoMetadata;
  }> {
    try {
      // Validate video first
      await this.validateVideo(inputPath);
      
      // Get metadata
      const metadata = await this.getVideoMetadata(inputPath);
      
      // Define output paths
      const videoOutputPath = path.join(outputDir, `${filename}.mp4`);
      const thumbnailOutputPath = path.join(outputDir, `${filename}_thumb.jpg`);
      
      // Compress video (if needed)
      let finalVideoPath = inputPath;
      if (metadata.size > 10 * 1024 * 1024) { // Compress if larger than 10MB
        finalVideoPath = await this.compressVideo(inputPath, videoOutputPath, 'medium');
      } else {
        // Just copy the file if it's already small enough
        fs.copyFileSync(inputPath, videoOutputPath);
        finalVideoPath = videoOutputPath;
      }
      
      // Generate thumbnail
      const thumbnailPath = await this.generateThumbnail(finalVideoPath, thumbnailOutputPath);
      
      return {
        videoPath: finalVideoPath,
        thumbnailPath,
        metadata
      };
    } catch (error) {
      console.error('Video processing failed:', error);
      throw error;
    }
  }

  static async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Failed to cleanup file ${filePath}:`, error);
      }
    }
  }
}