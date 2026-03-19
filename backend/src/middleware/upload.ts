import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config/env';

// ─── File type filter ───────────────────────────────────────────────────────
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === 'video') {
    const allowed = /mp4|mov|avi|webm/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Only video files (MP4, MOV, AVI, WEBM) are allowed'));
  }

  if (file.fieldname === 'resume') {
    const allowed = /pdf|doc|docx/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      return cb(null, true);
    }
    return cb(new Error('Only PDF, DOC, or DOCX resumes are allowed'));
  }

  // Images and anything else
  cb(null, true);
};

// ─── Always use memory storage ───────────────────────────────────────────────
// We read req.file.buffer in the route and write to local disk via localStorageService.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter,
});

// ─── Local-disk fallback helper ──────────────────────────────────────────────
export const saveToLocalDisk = (
  buffer: Buffer,
  subdir: string,         // e.g. 'videos' | 'resumes'
  originalName: string
): string => {
  const uploadsRoot = path.join(process.cwd(), 'uploads', subdir);
  if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });

  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalName)}`;
  const filePath = path.join(uploadsRoot, uniqueName);
  fs.writeFileSync(filePath, buffer);

  return `/uploads/${subdir}/${uniqueName}`;  // relative URL served by Express static
};