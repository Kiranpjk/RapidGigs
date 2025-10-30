import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import { createServer } from 'http';
import routes from './routes';
import { BackgroundJobService } from './services/backgroundJobs';
import { initializeSocket } from './config/socket';
import { createMessageTables } from './utils/messageMigrations';
import { createNotificationTables } from './utils/notificationMigrations';
import { initializeDatabase as initDB } from './utils/databaseInit';
import { EmailService } from './services/emailService';
import './config/passport'; // Initialize passport configuration

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware for passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport
import passport from './config/passport';
app.use(passport.initialize());
app.use(passport.session());

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api', routes);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'RapidGig Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    },
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize Socket.io
const socketManager = initializeSocket(server);

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // First ensure database exists
    await initDB();
    
    // Then create tables
    await createMessageTables();
    await createNotificationTables();
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
  }
};

// Initialize services
const initializeServices = async () => {
  try {
    await EmailService.initialize();
    console.log('✅ Services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
};

server.listen(PORT, async () => {
  console.log(`🚀 RapidGig Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Socket.io server initialized`);
  
  // Initialize database
  await initializeDatabase();
  
  // Initialize services
  await initializeServices();
  
  // Start background jobs in production
  if (process.env.NODE_ENV === 'production') {
    BackgroundJobService.startAll();
    EmailService.startEmailProcessor();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  BackgroundJobService.stopAll();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  BackgroundJobService.stopAll();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});