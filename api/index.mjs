// Vercel serverless entry point
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import connectDB from '../config/database.js';
import { configurePassport } from '../config/passport.js';
import errorHandler from '../middleware/errorHandler.js';

// Import routes synchronously
import authRoutes from '../routes/authRoutes.js';
import projectRoutes from '../routes/projectRoutes.js';
import taskRoutes from '../routes/taskRoutes.js';
import sprintRoutes from '../routes/sprintRoutes.js';
import aiRoutes from '../routes/aiRoutes.js';
import analyticsRoutes from '../routes/analyticsRoutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';

// Load env
dotenv.config();

console.log('🚀 Starting Vercel serverless function...');
console.log('Routes imported:', {
  auth: !!authRoutes,
  projects: !!projectRoutes,
  tasks: !!taskRoutes,
  sprints: !!sprintRoutes,
  ai: !!aiRoutes,
  analytics: !!analyticsRoutes,
  notifications: !!notificationRoutes
});

const app = express();

// Connect to MongoDB and wait for it
let dbConnectionPromise = null;

async function ensureDbConnection() {
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectDB();
  }
  return dbConnectionPromise;
}

// Initialize connection
ensureDbConnection()
  .then(() => console.log('✅ MongoDB ready'))
  .catch(err => console.error('❌ MongoDB failed:', err.message));

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection unavailable',
      error: error.message
    });
  }
});

// Configure Passport
configurePassport();

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Jira Project Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
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

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// Debug endpoint to list all routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const path = middleware.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/');
          routes.push({
            path: path + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ success: true, routes });
});

// Register API routes
console.log('Registering API routes...');
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
console.log('✅ All routes registered successfully');

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use(errorHandler);

// Export for Vercel
export default app;
