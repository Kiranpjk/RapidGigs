import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: {
    secret: (() => {
      const s = process.env.JWT_SECRET;
      if (!s && process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_SECRET must be set in production');
      }
      return s || 'dev-only-secret-key';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  db: {
    uri:
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URL ||
      'mongodb://127.0.0.1:27017/rapidgig',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50 MB
  },

  huggingface: {
    token: process.env.HUGGINGFACE_TOKEN || '',
    textModel: process.env.HF_TEXT_MODEL || 'HuggingFaceH4/zephyr-7b-beta',
    videoModel: process.env.HF_VIDEO_MODEL || 'ali-vilab/text-to-video-ms-1.7b',
    enabled: !!process.env.HUGGINGFACE_TOKEN,
  },

  cors: {
    origin: (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []).concat([
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3001',
    ]).map(o => o.trim()),
  },

  cookie: {
    // httpOnly cookies are used in production; localStorage fallback in dev
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },

  helios: {
    serviceUrl: process.env.HELIOS_SERVICE_URL || 'http://localhost:8000',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173',
  },

  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@rapidgig.local',
  },
};

// Startup summary
const dbDisplay = config.db.uri.includes('@')
  ? config.db.uri.replace(/:\/\/.*@/, '://***@')   // hide password
  : config.db.uri;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🚀 RapidGigs Backend — ${config.nodeEnv.toUpperCase()}`);
console.log(`📦 DB    : ${dbDisplay}`);
console.log(`🤗 AI    : ${config.huggingface.enabled ? 'Hugging Face ✅' : 'No HF token ⚠️'}`);
console.log(`📁 Store : Local disk (${config.upload.dir})`);
console.log(`🔒 Cookie: secure=${config.cookie.secure}, httpOnly=${config.cookie.httpOnly}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
