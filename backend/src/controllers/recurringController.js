import { recurringService } from '../services/recurringService.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';

class RecurringController {
  /**
   * POST /api/recurring-transactions
   */
  async createRecurring(req, res, next) {
    try {
      const template = await recurringService.createRecurring(
        req.user.id,
        req.body,
        req.user.currency
      );
      return successResponse(res, 201, 'Recurring transaction created successfully', template);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/recurring-transactions
   */
  async getRecurringTemplates(req, res, next) {
    try {
      const { templates, pagination } = await recurringService.getRecurringTemplates(
        req.user.id,
        req.query,
        req.user.currency
      );
      return paginatedResponse(
        res,
        200,
        'Recurring transactions retrieved successfully',
        templates,
        pagination
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/recurring-transactions/:id
   */
  async getRecurringById(req, res, next) {
    try {
      const template = await recurringService.getRecurringById(
        req.user.id,
        req.params.id,
        req.user.currency
      );
      return successResponse(res, 200, 'Recurring transaction retrieved successfully', template);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/recurring-transactions/:id
   */
  async updateRecurring(req, res, next) {
    try {
      const template = await recurringService.updateRecurring(
        req.user.id,
        req.params.id,
        req.body,
        req.user.currency
      );
      return successResponse(res, 200, 'Recurring transaction updated successfully', template);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/recurring-transactions/:id
   */
  async deleteRecurring(req, res, next) {
    try {
      await recurringService.deleteRecurring(req.user.id, req.params.id);
      return successResponse(res, 200, 'Recurring transaction deleted successfully', {
        id: req.params.id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/recurring-transactions/:id/execute
   * Manual trigger to execute a template immediately
   */
  async executeRecurring(req, res, next) {
    try {
      const result = await recurringService.executeTemplate(
        req.params.id,
        new Date(),
        req.user.id
      );
      return successResponse(res, 200, 'Recurring transaction executed successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export const recurringController = new RecurringController();
