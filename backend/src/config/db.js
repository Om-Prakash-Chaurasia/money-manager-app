import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let cachedConn = null;
let cachedPromise = null;

export const connectDB = async () => {
  // If already connected and connection is ready, reuse it
  if (cachedConn && mongoose.connection.readyState >= 1) {
    return cachedConn;
  }

  if (!cachedPromise) {
    const opts = {
      autoIndex: env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 5000,
      ...(env.MONGODB_URI?.includes('mongodb+srv://') ? { authSource: 'admin' } : {}),
    };

    cachedPromise = mongoose.connect(env.MONGODB_URI, opts).then((m) => {
      logger.info(`MongoDB Connected: ${m.connection.host}/${m.connection.name}`);
      return m;
    });
  }

  try {
    cachedConn = await cachedPromise;
    return cachedConn;
  } catch (error) {
    cachedPromise = null;
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    if (process.env.VERCEL) {
      throw error;
    }
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB Disconnected');
  } catch (error) {
    logger.error(`Error disconnecting MongoDB: ${error.message}`);
  }
};
