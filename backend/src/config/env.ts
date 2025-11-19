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
    console.log('MONGO_URL:', process.env.MONGO_URL ? 'Set' : 'Not Set');
    console.log('Resolved URI:', config.db.uri.startsWith('mongodb://localhost') ? 'LOCALHOST' : 'REMOTE');
    console.log('----------------------');