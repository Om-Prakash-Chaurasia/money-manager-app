import { categoryService } from '../services/categoryService.js';
import { successResponse } from '../utils/apiResponse.js';

export const categoryController = {
  /**
   * POST /api/categories
   */
  async createCategory(req, res, next) {
    try {
      const category = await categoryService.createCategory(req.user.id, req.body);
      return successResponse(res, 201, 'Category created successfully', { category });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/categories
   */
  async getCategories(req, res, next) {
    try {
      const result = await categoryService.getCategories(req.user.id, req.query);
      return successResponse(res, 200, 'Categories retrieved successfully', result.categories, {
        count: result.count
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/categories/:id
   */
  async getCategoryById(req, res, next) {
    try {
      const category = await categoryService.getCategoryById(req.user.id, req.params.id);
      return successResponse(res, 200, 'Category retrieved successfully', { category });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/categories/:id
   */
  async updateCategory(req, res, next) {
    try {
      const category = await categoryService.updateCategory(req.user.id, req.params.id, req.body);
      return successResponse(res, 200, 'Category updated successfully', { category });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/categories/:id
   */
  async deleteCategory(req, res, next) {
    try {
      const result = await categoryService.deleteCategory(req.user.id, req.params.id);
      return successResponse(res, 200, result.message, result.category);
    } catch (error) {
      next(error);
    }
  }
};
