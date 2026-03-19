import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config/env';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

export const localStorageService = {
  /**
   * Save a buffer to local disk and return the relative URL path.
   */
  saveFile(buffer: Buffer, subdir: string, originalName: string): string {
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
   * Delete a file by its relative URL path.
   */
  deleteFile(relativePath: string): boolean {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  },

  /**
   * Convert a relative path to an absolute URL using the server's port.
   */
  getAbsoluteUrl(relativePath: string): string {
    return `http://localhost:${config.port}${relativePath}`;
  },
};
