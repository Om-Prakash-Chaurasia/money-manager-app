import { transactionService } from '../services/transactionService.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';

export const transactionController = {
  /**
   * POST /api/transactions
   */
  async createTransaction(req, res, next) {
    try {
      const transaction = await transactionService.createTransaction(req.user.id, req.body);
      return successResponse(res, 201, 'Transaction recorded successfully', { transaction });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/transactions
   */
  async getTransactions(req, res, next) {
    try {
      const result = await transactionService.getTransactions(req.user.id, req.query);
      return paginatedResponse(res, 200, 'Transactions retrieved successfully', result.transactions, {
        ...result.pagination,
        summary: result.summary
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/transactions/:id
   */
  async getTransactionById(req, res, next) {
    try {
      const transaction = await transactionService.getTransactionById(req.user.id, req.params.id);
      return successResponse(res, 200, 'Transaction retrieved successfully', { transaction });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/transactions/:id
   */
  async updateTransaction(req, res, next) {
    try {
      const transaction = await transactionService.updateTransaction(
        req.user.id,
        req.params.id,
        req.body
      );
      return successResponse(res, 200, 'Transaction updated and balance adjusted successfully', {
        transaction
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/transactions/:id
   */
  async deleteTransaction(req, res, next) {
    try {
      const result = await transactionService.deleteTransaction(req.user.id, req.params.id);
      return successResponse(res, 200, result.message, { transactionId: result.transactionId });
    } catch (error) {
      next(error);
    }
  }
};
