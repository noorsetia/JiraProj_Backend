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

const app = express();

// Connect to MongoDB
connectDB().catch(err => console.error('DB error:', err.message));

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
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

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
