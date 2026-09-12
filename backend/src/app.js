import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { AppError } from './utils/appError.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import creditCardRoutes from './routes/creditCardRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import recurringRoutes from './routes/recurringRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import attachmentRoutes from './routes/attachmentRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  // Trust reverse proxy (e.g. Render, Railway, Nginx)
  app.set('trust proxy', 1);

  // Security Headers with relaxed CSP for Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        if (env.NODE_ENV === 'development') return callback(null, true);
        if (origin === env.CLIENT_URL) return callback(null, true);
        // Allow Vercel preview & production deployments
        if (origin.endsWith('.vercel.app') || process.env.VERCEL) return callback(null, true);
        return callback(new AppError('Blocked by CORS policy', 403));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // HTTP Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(
      morgan('dev', {
        stream: {
          write: (message) => logger.info(message.trim())
        }
      })
    );
  }

  // Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Create uploads directory if not exists (safe for serverless read-only filesystems)
  const uploadPath = process.env.VERCEL
    ? path.join('/tmp', env.UPLOAD_DIR)
    : path.resolve(__dirname, '../', env.UPLOAD_DIR);
  try {
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
  } catch (err) {
    logger.warn(`Uploads directory creation skipped: ${err.message}`);
  }

  // Static Assets for uploads
  app.use('/uploads', express.static(uploadPath));

  // Global Rate Limiter
  app.use('/api', generalLimiter);

  // Health Check Endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Money Manager API is operational',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV
    });
  });

  // OpenAPI / Swagger Documentation
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'Money Manager API Documentation',
      customCss: '.swagger-ui .topbar { display: none }'
    })
  );

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/transfers', transferRoutes);
  app.use('/api/credit-cards', creditCardRoutes);
  app.use('/api/budgets', budgetRoutes);
  app.use('/api/recurring-transactions', recurringRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/attachments', attachmentRoutes);
  app.use('/api/export', exportRoutes);

  // 404 Route Handler
  app.all('*', (req, res, next) => {
    next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
