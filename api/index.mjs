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
      { default: connectDB },
      { configurePassport },
      { default: authRoutes },
      { default: projectRoutes },
      { default: taskRoutes },
      { default: sprintRoutes },
      { default: aiRoutes },
      { default: analyticsRoutes },
      { default: notificationRoutes },
      { default: errorHandler }
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
    connectDB().catch(err => console.error('DB error:', err.message));
    
    // Configure passport
    configurePassport();

    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/sprints', sprintRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/notifications', notificationRoutes);
    
    // Error handler
    app.use(errorHandler);
    
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
