/**
 * cloudinary.ts — Cloudinary file storage service
 *
 * Replaces localStorageService for persistent cloud file storage.
 * Files uploaded to Render will no longer be lost on redeploy.
 */

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Initialize Cloudinary with credentials from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadResult {
  url: string;
  publicId: string;
  resourceType: string;
}

/**
 * Upload a buffer (file) to Cloudinary.
 * Returns the secure URL to the uploaded file.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  filename: string,
  resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto'
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `rapidgig/${folder}`,
        public_id: `${Date.now()}-${Buffer.from(filename, 'utf8').toString('base64url')}`,
        resource_type: resourceType,
      },
      (error: Error | undefined, result: UploadApiResponse | undefined) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload returned no result'));

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete a file from Cloudinary by its public ID.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto'
): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result.result === 'ok';
  } catch {
    return false;
  }
}
