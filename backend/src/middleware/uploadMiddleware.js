import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload destination directory
const uploadDirectory = process.env.VERCEL
  ? path.join('/tmp', env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../', env.UPLOAD_DIR);

try {
  if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
  }
} catch (err) {
  // Fail-safe for read-only serverless filesystems
}

// Storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = crypto.randomUUID();
    const safeName = `${Date.now()}-${uniqueId}${ext}`;
    cb(null, safeName);
  }
});

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain'
]);

// File filter validation
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `File type ${file.mimetype} is not supported. Allowed formats: JPEG, PNG, WebP, GIF, PDF, TXT.`,
        400
      ),
      false
    );
  }
};

const maxFileSize = env.MAX_FILE_SIZE_MB * 1024 * 1024;

const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize
  }
});

/**
 * Middleware wrapper for single file upload with custom error handling
 */
export const uploadSingle = (fieldName = 'file') => {
  const upload = multerInstance.single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError(`File size exceeds the limit of ${env.MAX_FILE_SIZE_MB}MB`, 400));
          }
          return next(new AppError(`Upload error: ${err.message}`, 400));
        }
        return next(err);
      }
      next();
    });
  };
};

/**
 * Middleware wrapper for multiple file uploads
 */
export const uploadMultiple = (fieldName = 'files', maxCount = 5) => {
  const upload = multerInstance.array(fieldName, maxCount);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError(`One or more files exceed the limit of ${env.MAX_FILE_SIZE_MB}MB`, 400));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new AppError(`Too many files uploaded. Maximum allowed is ${maxCount}`, 400));
          }
          return next(new AppError(`Upload error: ${err.message}`, 400));
        }
        return next(err);
      }
      next();
    });
  };
};
