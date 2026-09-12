import express from 'express';
import { authController } from '../controllers/authController.js';
import { validate } from '../middleware/validateMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators/authValidator.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

export default router;
