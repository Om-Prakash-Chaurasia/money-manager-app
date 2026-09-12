import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import {
  startRecurringTransactionJob,
  stopRecurringTransactionJob
} from './jobs/recurringTransactionJob.js';

const startServer = async () => {
  // Connect to Database
  await connectDB();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Money Manager Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    logger.info(`Health check available at: http://localhost:${env.PORT}/api/health`);

    // Start background jobs in non-test environment
    if (env.NODE_ENV !== 'test') {
      startRecurringTransactionJob(60000); // Check every 60s
    }
  });

  // Graceful Shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    stopRecurringTransactionJob();
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      logger.info('Database connection closed. Exiting process.');
      process.exit(0);
    });

    // Force close after 10s if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forcefully terminating process after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

startServer();
