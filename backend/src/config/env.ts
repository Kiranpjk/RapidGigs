import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
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

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    // When all three are present, uploads go to Cloudinary
    enabled: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
  },

  cors: {
    origin: (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []).concat([
      'http://localhost:5173',
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
};

// Startup summary
const dbDisplay = config.db.uri.includes('@')
  ? config.db.uri.replace(/:\/\/.*@/, '://***@')   // hide password
  : config.db.uri;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🚀 RapidGigs Backend — ${config.nodeEnv.toUpperCase()}`);
console.log(`📦 DB    : ${dbDisplay}`);
console.log(`☁️  Cloud : ${config.cloudinary.enabled ? 'Cloudinary ✅' : 'Local disk ⚠️'}`);
console.log(`🔒 Cookie: secure=${config.cookie.secure}, httpOnly=${config.cookie.httpOnly}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
