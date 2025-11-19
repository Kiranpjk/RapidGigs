import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: (process.env.JWT_SECRET || 'your-secret-key') as string,
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  },
  db: {
    uri: process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/rapidgig',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
  },
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'https://rapid-gigs.vercel.app'],
  },
};

console.log('--- DEBUG ENV VARS ---');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not Set');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not Set');
console.log('MONGO_URL:', process.env.MONGO_URL ? 'Set' : 'Not Set');
console.log('Resolved URI:', config.db.uri.startsWith('mongodb://localhost') ? 'LOCALHOST' : 'REMOTE');
console.log('----------------------');