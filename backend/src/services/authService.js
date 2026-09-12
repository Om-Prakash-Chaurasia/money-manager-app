import { userRepository } from '../repositories/userRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { accountRepository } from '../repositories/accountRepository.js';
import { hashPassword, comparePassword } from '../utils/passwordHelper.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateCryptoToken
} from '../utils/tokenHelper.js';
import { runInTransaction } from '../utils/transactionRunner.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const authService = {
  /**
   * Register a new user and seed default financial environment
   */
  async register({ name, email, password, currency = 'INR', timezone = 'Asia/Kolkata', dateFormat = 'DD/MM/YYYY' }) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('An account with this email address already exists', 409);
    }

    const passwordHash = await hashPassword(password);

    // Run user creation and default seeding inside an atomic transaction
    const newUser = await runInTransaction(async (session) => {
      // 1. Create User
      const [createdUser] = await userRepository.create(
        [
          {
            name,
            email,
            passwordHash,
            currency,
            timezone,
            dateFormat,
            isActive: true
          }
        ],
        session ? { session } : {}
      );

      // 2. Seed Default Categories (Parent & Subcategories)
      await categoryRepository.seedDefaultCategoriesForUser(createdUser._id, session);

      // 3. Seed Default Account (Cash Wallet)
      await accountRepository.seedDefaultAccountForUser(createdUser._id, currency, session);

      return createdUser;
    });

    // Generate Tokens
    const tokenPayload = { id: newUser._id.toString(), email: newUser.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: newUser._id.toString() });

    // Store hashed refresh token
    const hashedRefreshToken = hashToken(refreshToken);
    await userRepository.updateRefreshToken(newUser._id, hashedRefreshToken);

    logger.info(`New user registered successfully: ${newUser.email}`);

    return {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        currency: newUser.currency,
        timezone: newUser.timezone,
        dateFormat: newUser.dateFormat
      },
      accessToken,
      refreshToken
    };
  },

  /**
   * Login user with email and password
   */
  async login({ email, password }) {
    const user = await userRepository.findByEmail(email, true);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate fresh tokens
    const tokenPayload = { id: user._id.toString(), email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user._id.toString() });

    // Store hashed refresh token
    const hashedRefreshToken = hashToken(refreshToken);
    await userRepository.updateRefreshToken(user._id, hashedRefreshToken);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        timezone: user.timezone,
        dateFormat: user.dateFormat
      },
      accessToken,
      refreshToken
    };
  },

  /**
   * Rotate access and refresh tokens
   */
  async refreshToken(rawRefreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await userRepository.findById(decoded.id, true);
    if (!user || !user.isActive) {
      throw new AppError('User not found or account deactivated', 401);
    }

    const candidateHash = hashToken(rawRefreshToken);
    if (user.refreshTokenHash !== candidateHash) {
      // Reuse detection or token revoked - invalidate completely
      await userRepository.updateRefreshToken(user._id, null);
      throw new AppError('Refresh token was revoked or already used', 401);
    }

    // Issue rotated tokens
    const tokenPayload = { id: user._id.toString(), email: user.email };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken({ id: user._id.toString() });

    // Store new hashed refresh token
    const newHashedRefreshToken = hashToken(newRefreshToken);
    await userRepository.updateRefreshToken(user._id, newHashedRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  },

  /**
   * Log out user and revoke active refresh token
   */
  async logout(userId) {
    await userRepository.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  },

  /**
   * Retrieve current authenticated user profile
   */
  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404);
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      timezone: user.timezone,
      dateFormat: user.dateFormat,
      avatar: user.avatar,
      createdAt: user.createdAt
    };
  },

  /**
   * Initiate password reset flow
   */
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      // Return ambiguous message to protect against email enumeration
      return {
        message: 'If an account exists with this email, password reset instructions have been generated'
      };
    }

    const { token, hashedToken } = generateCryptoToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await userRepository.updateById(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: expiresAt
    });

    logger.info(`Password reset requested for: ${user.email}`);

    // In dev / test environment, return token for verification
    const response = {
      message: 'If an account exists with this email, password reset instructions have been generated'
    };

    if (env.NODE_ENV !== 'production') {
      response.devResetToken = token;
    }

    return response;
  },

  /**
   * Reset password with valid reset token
   */
  async resetPassword({ token, password }) {
    const hashedToken = hashToken(token);
    const user = await userRepository.findByPasswordResetToken(hashedToken);

    if (!user) {
      throw new AppError('Password reset token is invalid or has expired', 400);
    }

    const newPasswordHash = await hashPassword(password);

    await userRepository.updateById(user._id, {
      passwordHash: newPasswordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      refreshTokenHash: null // Revoke existing sessions on password reset
    });

    logger.info(`Password successfully reset for: ${user.email}`);

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }
};
