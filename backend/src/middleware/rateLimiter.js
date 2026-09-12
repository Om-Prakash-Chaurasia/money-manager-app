import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const isTest = env.NODE_ENV === 'test';

export const generalLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.',
        errors: []
      }
    });

export const authLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
        errors: []
      }
    });
