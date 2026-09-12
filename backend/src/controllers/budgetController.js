import { budgetService } from '../services/budgetService.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';

class BudgetController {
  /**
   * POST /api/budgets
   * Create a new monthly budget
   */
  async createBudget(req, res, next) {
    try {
      const budget = await budgetService.createBudget(
        req.user.id,
        req.body,
        req.user.currency
      );
      return successResponse(res, 201, 'Budget created successfully', budget);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budgets
   * Retrieve monthly budgets with spent calculation and summary
   */
  async getBudgets(req, res, next) {
    try {
      const { budgets, summary, pagination } = await budgetService.getBudgets(
        req.user.id,
        req.query,
        req.user.currency
      );
      return paginatedResponse(
        res,
        200,
        'Budgets retrieved successfully',
        budgets,
        pagination,
        { summary }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budgets/summary
   * Get comprehensive monthly budget and expense summary
   */
  async getBudgetSummary(req, res, next) {
    try {
      const summary = await budgetService.getMonthlySummary(
        req.user.id,
        req.query.month,
        req.user.currency
      );
      return successResponse(
        res,
        200,
        'Monthly budget summary retrieved successfully',
        summary
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/budgets/:id
   * Get single budget by ID
   */
  async getBudgetById(req, res, next) {
    try {
      const budget = await budgetService.getBudgetById(
        req.user.id,
        req.params.id,
        req.user.currency
      );
      return successResponse(res, 200, 'Budget retrieved successfully', budget);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/budgets/:id
   * Update budget amount, category, or month
   */
  async updateBudget(req, res, next) {
    try {
      const budget = await budgetService.updateBudget(
        req.user.id,
        req.params.id,
        req.body,
        req.user.currency
      );
      return successResponse(res, 200, 'Budget updated successfully', budget);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/budgets/:id
   * Delete a budget
   */
  async deleteBudget(req, res, next) {
    try {
      await budgetService.deleteBudget(req.user.id, req.params.id);
      return successResponse(res, 200, 'Budget deleted successfully', {
        id: req.params.id
      });
    } catch (error) {
      next(error);
    }
  }
}

export const budgetController = new BudgetController();
