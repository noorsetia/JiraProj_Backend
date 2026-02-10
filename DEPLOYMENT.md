# Vercel Deployment Guide

## Backend Deployment Steps

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Environment Variables (REQUIRED)
Set these in Vercel Project Settings → Environment Variables:

```
MONGODB_URI=mongodb+srv://noor:noor7890s@cluster0.l1vpd3x.mongodb.net/?appName=Cluster0
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-123456789
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=1045367437197-kmajusvaocl6u3id7ccj4vihnon7dvnh.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://YOUR-BACKEND.vercel.app/api/auth/google/callback
GEMINI_API_KEY=AIzaSyAat2VhlFQ6fLUFQfYQQuk2SL5kXx4dtBE
AI_PROVIDER=gemini
FRONTEND_URL=https://YOUR-FRONTEND.vercel.app
NODE_ENV=production
```

**IMPORTANT:** Replace `YOUR-BACKEND` and `YOUR-FRONTEND` with your actual Vercel deployment URLs.

### 3. Vercel Configuration
The project includes `vercel.json` which configures:
- Entry point: `index.js` (serverless-compatible)
- All routes directed to the Express app

### 4. Test Deployment
After deployment, test these endpoints:

- Health check: `https://YOUR-BACKEND.vercel.app/api/health`
- Root: `https://YOUR-BACKEND.vercel.app/`

Expected response from health check:
```json
{
  "success": true,
  "message": "Server is running on Vercel",
  "timestamp": "2026-02-10T..."
}
```

### 5. Common Issues

#### 404 Errors
- **Cause**: Environment variables not set or missing `index.js`
- **Fix**: 
  1. Check Vercel build logs
  2. Ensure all environment variables are set
  3. Redeploy after setting env vars

#### Database Connection Errors
- **Cause**: MONGODB_URI not set or incorrect
- **Fix**: Verify the MongoDB URI is correct and accessible

#### CORS Errors
- **Cause**: FRONTEND_URL not set correctly
- **Fix**: Update FRONTEND_URL to match your actual frontend deployment URL

### 6. Frontend Configuration
Update frontend environment variable:
```
VITE_API_URL=https://YOUR-BACKEND.vercel.app/api
```

## Troubleshooting

### Check Vercel Logs
1. Go to Vercel dashboard
2. Select your project
3. Click on the latest deployment
4. View Function Logs

### Local Testing
To test the serverless entry point locally:
```bash
node -e "import('./index.js').then(m => console.log('Module loaded:', typeof m.default))"
```

Should output: `Module loaded: function`
