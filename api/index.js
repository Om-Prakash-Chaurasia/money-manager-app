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
    let targetPath = req.url || '/';
    
    // Check if path is passed via Vercel query rewrite or catch-all param
    if (req.query && req.query.path) {
      const subpath = Array.isArray(req.query.path)
        ? req.query.path.join('/')
        : req.query.path;
      const cleanSubpath = subpath.split('?')[0];
      targetPath = `/api/${cleanSubpath}`;
    } else if (!targetPath.startsWith('/api')) {
      targetPath = `/api${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`;
    }

    req.url = targetPath;
    req.originalUrl = targetPath;

    console.log(`[Vercel Serverless] ${req.method} ${req.url}`);

    // Forward request and response to Express
    return appInstance(req, res);
  } catch (error) {
    console.error('Serverless Handler Error:', error);
    const rawUri = process.env.MONGODB_URI || '';
    const sanitizedUri = rawUri ? rawUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : 'NOT_SET';
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
      uri: sanitizedUri
    });
  }
}
