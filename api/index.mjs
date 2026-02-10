// Vercel serverless entry point - minimal version for debugging
import express from 'express';

const app = express();

app.use(express.json());

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Basic server works',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint works',
    env: {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found - routes not loaded yet',
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
