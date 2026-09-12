import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true, // Build indexes automatically in development
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
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
