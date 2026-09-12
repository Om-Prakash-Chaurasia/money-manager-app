import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for resource identifier: ${err.value}`;
    errors = [{ field: err.path, message: `Resource identifier is invalid` }];
  }

  // Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A resource with this ${field} already exists`;
    errors = [{ field, message: `${field} must be unique` }];
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    message = errors[0]?.message || 'Validation error';
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - ${err.stack || message}`);
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} - Status: ${statusCode} - ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
    ...(env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: err.stack } : {})
  });
};
