import { reportService } from '../services/reportService.js';
import { successResponse } from '../utils/apiResponse.js';

class ReportController {
  /**
   * GET /api/reports/income-expense
   * Returns income vs expense trends grouped by month, week, or day.
   */
  async getIncomeExpense(req, res, next) {
    try {
      const report = await reportService.getIncomeExpenseReport(
        req.user.id,
        req.query,
        req.user.currency
      );
      return successResponse(res, 200, 'Income vs Expense report retrieved successfully', report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/category-spending
   * Returns category and subcategory spending/income breakdown.
   */
  async getCategorySpending(req, res, next) {
    try {
      const report = await reportService.getCategorySpendingReport(
        req.user.id,
        req.query,
        req.user.currency
      );
      return successResponse(res, 200, 'Category spending report retrieved successfully', report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/cash-flow
   * Returns comprehensive cash flow statement with inflows, outflows, and account types.
   */
  async getCashFlow(req, res, next) {
    try {
      const report = await reportService.getCashFlowReport(
        req.user.id,
        req.query,
        req.user.currency
      );
      return successResponse(res, 200, 'Cash flow report retrieved successfully', report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/net-worth
   * Returns historical net worth trajectory across months.
   */
  async getNetWorthTrajectory(req, res, next) {
    try {
      const report = await reportService.getNetWorthTrajectory(
        req.user.id,
        req.query,
        req.user.currency
      );
      return successResponse(res, 200, 'Net worth trajectory report retrieved successfully', report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/account-growth
   * Returns balance progression over time for an account or all accounts.
   */
  async getAccountGrowth(req, res, next) {
    try {
      const report = await reportService.getAccountGrowthReport(
        req.user.id,
        req.query,
        req.user.currency
      );
      return successResponse(res, 200, 'Account growth report retrieved successfully', report);
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
