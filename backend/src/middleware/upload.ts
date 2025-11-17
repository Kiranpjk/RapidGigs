import multer from 'multer';
import { config } from '../config/env';
import * as path from 'path';
import * as fs from 'fs';

// Use memory storage to avoid file system issues
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === 'video') {
    const allowedTypes = /mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only video files are allowed'));
  } else if (file.fieldname === 'resume') {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC, or DOCX files are allowed'));
  } else {
    cb(null, true);
  }
};

let uploadMiddleware: multer.Multer;

try {
  uploadMiddleware = multer({
    storage,
    limits: {
      fileSize: config.upload.maxFileSize,
    },
    fileFilter,
  });
} catch (error) {
  console.error('Error creating multer instance:', error);
  // Fallback to basic multer
  uploadMiddleware = multer({
    dest: './uploads',
  });
}

export const upload = uploadMiddleware;