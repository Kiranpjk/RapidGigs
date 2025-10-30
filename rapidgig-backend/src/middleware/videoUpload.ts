import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure video uploads directory exists
const videoUploadsDir = path.join(process.cwd(), 'uploads', 'videos');
const tempUploadsDir = path.join(process.cwd(), 'uploads', 'temp');

[videoUploadsDir, tempUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for video uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store in temp directory first for processing
    cb(null, tempUploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + extension);
  }
});

// File filter for videos
const videoFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define allowed video types
  const allowedVideoTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo', // .avi
    'video/x-ms-wmv'   // .wmv
  ];
  
  if (allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files (MP4, MPEG, QuickTime, WebM, AVI, WMV) are allowed'));
  }
};

// Configure multer for video uploads
export const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for raw uploads
    files: 1 // Only one video at a time
  }
});

// Middleware for handling video upload errors
export const handleVideoUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Video file is too large. Maximum size is 100MB.'
        }
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Only one video file can be uploaded at a time.'
        }
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNEXPECTED_FILE',
          message: 'Unexpected file field. Use "video" as the field name.'
        }
      });
    }
  }
  
  if (error.message.includes('Only video files')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message
      }
    });
  }
  
  // Generic upload error
  return res.status(500).json({
    success: false,
    error: {
      code: 'UPLOAD_FAILED',
      message: 'Video upload failed. Please try again.'
    }
  });
};