import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Check if Cloudinary is configured
export const isCloudinaryConfigured = (): boolean => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Configure Cloudinary (called once on startup)
export const initCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    console.log('⚠️  Cloudinary not configured — using local disk storage.');
    return;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('☁️  Cloudinary configured — uploads will go to cloud storage.');
};

/**
 * Upload a buffer directly to Cloudinary.
 * Works for both videos and files (resumes via raw upload).
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  options: {
    folder: string;
    resource_type?: 'video' | 'image' | 'raw' | 'auto';
    public_id?: string;
    format?: string;
  }
): Promise<{ url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resource_type || 'auto',
        public_id: options.public_id,
        format: options.format,
        // Video-specific optimisations
        ...(options.resource_type === 'video' && {
          eager: [{ quality: 'auto', fetch_format: 'mp4' }],
          eager_async: true,
        }),
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );

    // Pipe the buffer into the upload stream
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
};

/**
 * Delete an asset from Cloudinary by its public_id.
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'video' | 'image' | 'raw' = 'video'
): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
};
