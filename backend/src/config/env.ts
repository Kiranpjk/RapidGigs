import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: (process.env.JWT_SECRET as string) || 'your-secret-key',
    expiresIn: (process.env.JWT_EXPIRES_IN as string) || '7d',
  },
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rapidgig',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};
