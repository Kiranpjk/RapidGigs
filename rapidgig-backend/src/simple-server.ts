import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'RapidGig Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Basic auth routes for testing
app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'Registration endpoint working',
    data: { id: '1', email: 'test@example.com', role: 'student' }
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login endpoint working',
    data: { 
      user: { id: '1', email: 'test@example.com', role: 'student', full_name: 'Test User' },
      token: 'test-jwt-token'
    }
  });
});

// 404 handler
// Use app.all for a catch-all handler compatible with Express/path-to-regexp
// Use a pathless middleware so path-to-regexp doesn't attempt to parse a lone '*'
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple RapidGig Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});