import { accountService } from '../services/accountService.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';

export const accountController = {
  /**
   * POST /api/accounts
   */
  async createAccount(req, res, next) {
    try {
      const account = await accountService.createAccount(req.user.id, req.body);
      return successResponse(res, 201, 'Account created successfully', { account });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/accounts
   */
  async getAccounts(req, res, next) {
    try {
      const result = await accountService.getAccounts(req.user.id, req.query);
      return paginatedResponse(res, 200, 'Accounts retrieved successfully', result.accounts, {
        ...result.pagination,
        summary: result.summary
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/accounts/:id
   */
  async getAccountById(req, res, next) {
    try {
      const account = await accountService.getAccountById(req.user.id, req.params.id);
      return successResponse(res, 200, 'Account retrieved successfully', { account });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/accounts/:id
   */
  async updateAccount(req, res, next) {
    try {
      const account = await accountService.updateAccount(req.user.id, req.params.id, req.body);
      return successResponse(res, 200, 'Account updated successfully', { account });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/accounts/:id
   */
  async deleteAccount(req, res, next) {
    try {
      const result = await accountService.deleteAccount(req.user.id, req.params.id);
      return successResponse(res, 200, result.message, result.account);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/accounts/:id/balance
   */
  async getAccountBalance(req, res, next) {
    try {
      const balanceData = await accountService.getAccountBalance(req.user.id, req.params.id);
      return successResponse(res, 200, 'Account balance retrieved', balanceData);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/accounts/:id/balance-history
   */
  async getAccountBalanceHistory(req, res, next) {
    try {
      const historyData = await accountService.getAccountBalanceHistory(req.user.id, req.params.id);
      return successResponse(res, 200, 'Account balance history retrieved', historyData);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/accounts/:id/transactions
   */
  async getAccountTransactions(req, res, next) {
    try {
      const result = await accountService.getAccountTransactions(req.user.id, req.params.id, req.query);
      return paginatedResponse(res, 200, 'Account transactions retrieved', result.transactions, {
        ...result.pagination,
        account: result.account
      });
    } catch (error) {
      next(error);
    }
  }
};
