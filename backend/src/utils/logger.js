import winston from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    env.NODE_ENV === 'production' ? json() : combine(colorize(), consoleFormat)
  ),
  transports: [
    new winston.transports.Console()
  ]
});
