// Vercel serverless entry point
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';

// Load env
dotenv.config();

const app = express();

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

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// Import routes asynchronously
let routesInitialized = false;

async function loadRoutes() {
  if (routesInitialized) return;
  
  try {
    // Dynamic imports
    const [
      dbModule,
      passportConfigModule,
      authRoutesModule,
      projectRoutesModule,
      taskRoutesModule,
      sprintRoutesModule,
      aiRoutesModule,
      analyticsRoutesModule,
      notificationRoutesModule,
      errorHandlerModule
    ] = await Promise.all([
      import('../config/database.js'),
      import('../config/passport.js'),
      import('../routes/authRoutes.js'),
      import('../routes/projectRoutes.js'),
      import('../routes/taskRoutes.js'),
      import('../routes/sprintRoutes.js'),
      import('../routes/aiRoutes.js'),
      import('../routes/analyticsRoutes.js'),
      import('../routes/notificationRoutes.js'),
      import('../middleware/errorHandler.js')
    ]);

    // Connect DB
    dbModule.default().catch(err => console.error('DB error:', err.message));
    
    // Configure passport
    passportConfigModule.configurePassport();

    // Register routes
    app.use('/api/auth', authRoutesModule.default);
    app.use('/api/projects', projectRoutesModule.default);
    app.use('/api/tasks', taskRoutesModule.default);
    app.use('/api/sprints', sprintRoutesModule.default);
    app.use('/api/ai', aiRoutesModule.default);
    app.use('/api/analytics', analyticsRoutesModule.default);
    app.use('/api/notifications', notificationRoutesModule.default);
    
    // Error handler
    app.use(errorHandlerModule.default);
    
    routesInitialized = true;
    console.log('✅ Routes loaded');
  } catch (error) {
    console.error('❌ Route loading failed:', error.message);
  }
}

// Start loading routes
loadRoutes();

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    routesInitialized
  });
});

// Export handler for Vercel
export default app;
