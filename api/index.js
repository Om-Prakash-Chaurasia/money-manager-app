import { createApp } from '../backend/src/app.js';
import { connectDB } from '../backend/src/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    // Ensure MongoDB is connected
    await connectDB();

    // Initialize Express application instance once
    if (!appInstance) {
      appInstance = createApp();
    }

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
