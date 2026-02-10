// Vercel serverless entry point
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();

// CORS
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Import and setup routes with error handling
let routesLoaded = false;

(async () => {
  try {
    console.log('Loading database...');
    const dbModule = await import('../config/database.js');
    await dbModule.default().catch(err => console.error('DB error:', err.message));
    
    console.log('Loading passport...');
    const passportModule = await import('passport');
    const sessionModule = await import('express-session');
    const passportConfigModule = await import('../config/passport.js');
    
    app.use(sessionModule.default({
      secret: process.env.JWT_SECRET || 'fallback',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 86400000 }
    }));
    
    app.use(passportModule.default.initialize());
    app.use(passportModule.default.session());
    passportConfigModule.configurePassport();
    
    console.log('Loading routes...');
    const authRoutes = await import('../routes/authRoutes.js');
    const projectRoutes = await import('../routes/projectRoutes.js');
    const taskRoutes = await import('../routes/taskRoutes.js');
    const sprintRoutes = await import('../routes/sprintRoutes.js');
    const aiRoutes = await import('../routes/aiRoutes.js');
    const analyticsRoutes = await import('../routes/analyticsRoutes.js');
    const notificationRoutes = await import('../routes/notificationRoutes.js');
    
    app.use('/api/auth', authRoutes.default);
    app.use('/api/projects', projectRoutes.default);
    app.use('/api/tasks', taskRoutes.default);
    app.use('/api/sprints', sprintRoutes.default);
    app.use('/api/ai', aiRoutes.default);
    app.use('/api/analytics', analyticsRoutes.default);
    app.use('/api/notifications', notificationRoutes.default);
    
    console.log('✅ All routes loaded');
    
    const errorHandlerModule = await import('../middleware/errorHandler.js');
    app.use(errorHandlerModule.default);
    
    routesLoaded = true;
  } catch (error) {
    console.error('❌ Startup error:', error.message);
    console.error('Stack:', error.stack);
  }
})();

// 404 handler
app.use((req, res) => {
  if (!routesLoaded) {
    return res.status(503).json({
      success: false,
      message: 'Server is still initializing, please try again',
      routesLoaded
    });
  }
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

export default app;

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
