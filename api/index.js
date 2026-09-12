import { createApp } from '../backend/src/app.js';
import { connectDB } from '../backend/src/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    // Ensure MongoDB connection is established / reused
    await connectDB();

    // Lazy load Express app singleton
    if (!appInstance) {
      appInstance = createApp();
    }

    // Normalize URL for Express routing
    let originalUrl = req.url || '/';
    
    // If Vercel passed catch-all path params
    if (req.query && req.query.path) {
      const subpath = Array.isArray(req.query.path)
        ? req.query.path.join('/')
        : req.query.path;
      originalUrl = `/api/${subpath}`;
    } else if (!originalUrl.startsWith('/api')) {
      originalUrl = `/api${originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl}`;
    }

    req.url = originalUrl;

    console.log(`[Vercel Serverless] ${req.method} ${req.url}`);

    // Forward request and response to Express
    return appInstance(req, res);
  } catch (error) {
    console.error('Serverless Handler Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'production' ? 'Server configuration or database error' : error.message
    });
  }
}
