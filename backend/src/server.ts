import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/env';
import { errorHandler } from './middleware/errorhandling';
import { connectDatabase } from './config/database';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { verifyToken } from './utils/jwt';
import mongoose from 'mongoose';

// Routes
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import applicationRoutes from './routes/application';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import videoRoutes from './routes/videos';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import roleRoutes from './routes/roles';
import imageRoutes from './routes/images';
import adminRoutes from './routes/admin';
import shortsRoutes from './routes/shorts';
import aiRoutes from './routes/ai';
import webhookRoutes from './routes/webhooks';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,           // Allow cookies cross-origin
}));
app.use(cookieParser());       // Parse httpOnly cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Rate limiting for auth endpoints (SEC-03)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);

// Rate limit expensive AI generation endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: { error: 'AI generation rate limit exceeded. Try again later.' },
});
app.use('/api/shorts/generate', aiLimiter);
app.use('/api/ai', aiLimiter);

// Health check endpoint (OPS-02)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Fix Cross-Origin-Opener-Policy for Google OAuth popup/redirect
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shorts', shortsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handling middleware - must be LAST middleware after all routes
app.use(errorHandler);

// WebSocket for real-time messaging
// SEC-05: Verify JWT on socket connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const payload = verifyToken(token);
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  if (userId) {
    socket.join(`user-${userId}`);
  }

  socket.on('send-message', async (data: { receiverId: string; message: string }) => {
    io.to(`user-${data.receiverId}`).emit('new-message', {
      senderId: userId,
      message: data.message,
      timestamp: new Date().toISOString(),
      isRead: false,
    });
  });

  socket.on('mark-read', (data: { threadId: string; senderId: string }) => {
    io.to(`user-${data.senderId}`).emit('message-read', {
      threadId: data.threadId,
      readerId: userId,
    });
  });

  socket.on('disconnect', () => {
    // cleanup if needed
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    app.get('/api/debug-config', (req, res) => {
      const pin = req.query.pin;
      if (pin !== '1234') return res.status(403).json({ error: 'forbidden' });
      
      res.json({
        cwd: process.cwd(),
        dirname: __dirname,
        envPath: path.resolve(process.cwd(), '.env'),
        envExists: fs.existsSync(path.resolve(process.cwd(), '.env')),
        env: {
          HUGGINGFACE_TOKEN: !!process.env.HUGGINGFACE_TOKEN,
          HF_LEN: process.env.HUGGINGFACE_TOKEN?.length || 0,
          FAL_KEY: !!process.env.FAL_KEY,
          REPLICATE_API_TOKEN: !!process.env.REPLICATE_API_TOKEN,
          MODAL_ENDPOINT: !!process.env.MODAL_ENDPOINT,
          HELIOS_SERVICE_URL: !!process.env.HELIOS_SERVICE_URL,
          POLLINATIONS_KEY: !!process.env.POLLINATIONS_KEY,
        }
      });
    });

    const PORT = config.port;
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown (OPS-03)
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  httpServer.close(() => {
    mongoose.disconnect().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);