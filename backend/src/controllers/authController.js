import { authService } from '../services/authService.js';
import { successResponse } from '../utils/apiResponse.js';

export const authController = {
  /**
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return successResponse(res, 201, 'User registered successfully', result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return successResponse(res, 200, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return successResponse(res, 200, 'Token refreshed successfully', result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const result = await authService.logout(req.user.id);
      return successResponse(res, 200, 'Logged out successfully', result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      return successResponse(res, 200, 'User profile retrieved', { user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      return successResponse(res, 200, result.message, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body);
      return successResponse(res, 200, result.message, null);
    } catch (error) {
      next(error);
    }
  }
};
