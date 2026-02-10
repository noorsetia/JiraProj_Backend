// Vercel serverless entry point
// This file uses dynamic imports to avoid module loading issues

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables first
dotenv.config();

const app = express();

// Basic middleware
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'https://jira-proj-frontend.vercel.app'
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check (no imports needed)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
    hasMongoUri: !!process.env.MONGODB_URI,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

// Initialize routes asynchronously
let routesInitialized = false;

async function initializeRoutes() {
  if (routesInitialized) return;
  
  try {
    console.log('Starting route initialization...');
    
    // Import database connection
    const { default: connectDB } = await import('../config/database.js');
    connectDB().catch(err => console.error('DB connection error:', err));
    
    // Import and configure passport
    const { configurePassport } = await import('../config/passport.js');
    const passport = await import('passport');
    const session = await import('express-session');
    
    app.use(session.default({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
      }
    }));
    
    app.use(passport.default.initialize());
    app.use(passport.default.session());
    configurePassport();
    
    // Import routes dynamically
    const { default: authRoutes } = await import('../routes/authRoutes.js');
    const { default: projectRoutes } = await import('../routes/projectRoutes.js');
    const { default: taskRoutes } = await import('../routes/taskRoutes.js');
    const { default: sprintRoutes } = await import('../routes/sprintRoutes.js');
    const { default: aiRoutes } = await import('../routes/aiRoutes.js');
    const { default: analyticsRoutes } = await import('../routes/analyticsRoutes.js');
    const { default: notificationRoutes } = await import('../routes/notificationRoutes.js');
    
    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/sprints', sprintRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/notifications', notificationRoutes);
    
    console.log('✅ All routes registered successfully');
    
    // Import error handler
    const { default: errorHandler } = await import('../middleware/errorHandler.js');
    app.use(errorHandler);
    
    routesInitialized = true;
  } catch (error) {
    console.error('❌ Route initialization failed:', error);
    throw error;
  }
}

// Initialize routes on first request
app.use(async (req, res, next) => {
  if (!routesInitialized) {
    try {
      await initializeRoutes();
    } catch (error) {
      console.error('Failed to initialize routes:', error);
      return res.status(500).json({
        success: false,
        message: 'Server initialization failed',
        error: error.message
      });
    }
  }
  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    routesInitialized
  });
});

export default app;
