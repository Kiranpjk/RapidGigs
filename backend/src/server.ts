import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/env';
import { errorHandler } from './middleware/errorhandling';
import { connectDatabase } from './config/database';

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
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (userId: string) => {
    socket.join(`user-${userId}`);
  });

  socket.on('send-message', async (data: { receiverId: string; message: string; senderId: string }) => {
    // Broadcast to receiver
    io.to(`user-${data.receiverId}`).emit('new-message', {
      senderId: data.senderId,
      message: data.message,
      timestamp: new Date().toISOString(),
      isRead: false,
    });
  });

  // Receiver opened the thread — tell sender their messages were read
  socket.on('mark-read', (data: { threadId: string; senderId: string; readerId: string }) => {
    io.to(`user-${data.senderId}`).emit('message-read', {
      threadId: data.threadId,
      readerId: data.readerId,
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    httpServer.listen(config.port, () => {
      console.log(`✅ Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();