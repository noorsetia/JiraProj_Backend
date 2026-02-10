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

// Initialize routes immediately (not on first request)
let routesInitialized = false;
let initializationPromise = null;

async function initializeRoutes() {
  if (routesInitialized) return;
  if (initializationPromise) return initializationPromise;
  
  initializationPromise = (async () => {
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
      
      console.log('Importing routes...');
      
      // Import routes dynamically
      const { default: authRoutes } = await import('../routes/authRoutes.js');
      const { default: projectRoutes } = await import('../routes/projectRoutes.js');
      const { default: taskRoutes } = await import('../routes/taskRoutes.js');
      const { default: sprintRoutes } = await import('../routes/sprintRoutes.js');
      const { default: aiRoutes } = await import('../routes/aiRoutes.js');
      const { default: analyticsRoutes } = await import('../routes/analyticsRoutes.js');
      const { default: notificationRoutes } = await import('../routes/notificationRoutes.js');
      
      console.log('Registering routes...');
      
      // Register routes
      app.use('/api/auth', authRoutes);
      console.log('✅ Auth routes registered');
      app.use('/api/projects', projectRoutes);
      console.log('✅ Project routes registered');
      app.use('/api/tasks', taskRoutes);
      console.log('✅ Task routes registered');
      app.use('/api/sprints', sprintRoutes);
      console.log('✅ Sprint routes registered');
      app.use('/api/ai', aiRoutes);
      console.log('✅ AI routes registered');
      app.use('/api/analytics', analyticsRoutes);
      console.log('✅ Analytics routes registered');
      app.use('/api/notifications', notificationRoutes);
      console.log('✅ Notification routes registered');
      
      // Import error handler
      const { default: errorHandler } = await import('../middleware/errorHandler.js');
      app.use(errorHandler);
      
      routesInitialized = true;
      console.log('✅ All routes initialized successfully');
    } catch (error) {
      console.error('❌ Route initialization failed:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  })();
  
  return initializationPromise;
}

// Start initialization immediately
initializeRoutes();

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
    hasMongoUri: !!process.env.MONGODB_URI,
    hasJwtSecret: !!process.env.JWT_SECRET,
    routesInitialized
  });
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
