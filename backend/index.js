import { createApp } from './src/app.js';
import { connectDB } from './src/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    // Ensure MongoDB connection is established / reused
    await connectDB();

    if (!appInstance) {
      appInstance = createApp();
    }

    // Normalize URL so /api routes match
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

    return appInstance(req, res);
  } catch (error) {
    console.error('Backend serverless error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'production' ? 'Database or server configuration error' : error.message
    });
  }
}
