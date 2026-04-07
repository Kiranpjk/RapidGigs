/**
 * localStorage.ts — File upload helper (now uses Cloudinary when configured)
 *
 * When CLOUDINARY_CLOUD_NAME is set, files go to Cloudinary (persistent).
 * Otherwise falls back to local Render disk (ephemeral — files lost on redeploy).
 */

import * as path from 'path';
import { config } from '../config/env';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinary';

const useCloudinary = !!process.env.CLOUDINARY_CLOUD_NAME;

export const localStorageService = {
  /**
   * Save a buffer and return the URL path.
   * Uses Cloudinary when configured, otherwise local disk.
   */
  async saveFile(buffer: Buffer, subdir: string, originalName: string): Promise<string> {
    if (useCloudinary) {
      // Determine resource type for Cloudinary
      const ext = path.extname(originalName).toLowerCase();
      let resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto';
      if (/mp4|mov|avi|webm/.test(ext)) resourceType = 'video';
      else if (/pdf|doc|docx/.test(ext)) resourceType = 'raw';
      else if (/jpg|jpeg|png|gif|webp|svg/.test(ext)) resourceType = 'image';

      const result = await uploadToCloudinary(buffer, subdir, originalName, resourceType);
      return result.url;
    }

    // Fallback: local disk (ephemeral on Render)
    const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
    const fs = await import('fs');
    const dir = path.join(UPLOAD_ROOT, subdir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const ext = path.extname(originalName) || '.mp4';
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(dir, uniqueName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${subdir}/${uniqueName}`;
  },

  /**
   * Delete a file by its URL path or Cloudinary URL.
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    if (!fileUrl) return false;

    // If it's a Cloudinary URL, extract public_id and delete
    if (fileUrl.includes('cloudinary.com')) {
      try {
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Cloudinary video URLs: /video/upload/v123456789/folder/file.ext
        // The public ID is after the resource type
        const resIdx = pathParts.findIndex(p => p === 'upload');
        if (resIdx !== -1) {
          const publicIdParts = pathParts.slice(resIdx + 1);
          // Remove version prefix if present
          const publicId = publicIdParts.join('/').replace(/^v\d+\//, '');
          const ext = path.extname(publicId);
          const publicIdWithoutExt = ext ? publicId.slice(0, -ext.length) : publicId;
          const resourceType = pathParts[resIdx - 1] || 'auto';
          return await deleteFromCloudinary(publicIdWithoutExt, resourceType as any);
        }
      } catch {
        // Fall through
      }
    }

    // Local file delete fallback
    if (fileUrl.startsWith('/uploads/') || fileUrl.includes('/uploads/')) {
      const fs = await import('fs');
      const fullPath = path.join(process.cwd(), fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
    }
    return false;
  },

  /**
   * Convert a relative path to an absolute URL.
   */
  getAbsoluteUrl(relativePath: string): string {
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${config.port}`;
    return `${baseUrl}${relativePath}`;
  },
};
