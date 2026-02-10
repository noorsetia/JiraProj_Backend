// Vercel serverless entry point
// This file exports the Express app without calling .listen()
// Vercel's @vercel/node runtime handles the HTTP server automatically

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import connectDB from './config/database.js';
import { configurePassport } from './config/passport.js';
import errorHandler from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import sprintRoutes from './routes/sprintRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB - don't await, let it connect in background
// The connection will be cached and reused across invocations
connectDB().catch(err => {
  console.error('MongoDB connection failed:', err.message);
  // Continue anyway - some routes might work without DB
});

// Configure Passport
configurePassport();

// Middleware - CORS must allow credentials and specific origin
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174'
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, restrict later
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (required for passport)
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes - Make sure these are registered
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✓ Auth routes registered');
app.use('/api/projects', projectRoutes);
console.log('✓ Project routes registered');
app.use('/api/tasks', taskRoutes);
console.log('✓ Task routes registered');
app.use('/api/sprints', sprintRoutes);
console.log('✓ Sprint routes registered');
app.use('/api/ai', aiRoutes);
console.log('✓ AI routes registered');
app.use('/api/analytics', analyticsRoutes);
console.log('✓ Analytics routes registered');
app.use('/api/notifications', notificationRoutes);
console.log('✓ Notification routes registered');

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running on Vercel',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
    hasMongoUri: !!process.env.MONGODB_URI,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

// Test route to verify routing works
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test route works',
    registeredRoutes: app._router.stack
      .filter(r => r.route)
      .map(r => Object.keys(r.route.methods)[0].toUpperCase() + ' ' + r.route.path)
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Project Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      projects: '/api/projects',
      tasks: '/api/tasks',
      sprints: '/api/sprints',
      ai: '/api/ai',
      analytics: '/api/analytics',
      notifications: '/api/notifications'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Export for Vercel serverless
export default app;
