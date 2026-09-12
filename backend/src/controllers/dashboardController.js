import { dashboardService } from '../services/dashboardService.js';
import { successResponse } from '../utils/apiResponse.js';

class DashboardController {
  /**
   * GET /api/dashboard/summary
   * Aggregates total balance, monthly income/expense, net savings, net worth,
   * category spending, cash flow trend, budgets, and recent transactions.
   */
  async getSummary(req, res, next) {
    try {
      const summary = await dashboardService.getDashboardSummary(
        req.user.id,
        req.query.month,
        req.user.currency
      );
      return successResponse(res, 200, 'Dashboard summary retrieved successfully', summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/cashflow
   * Returns multi-month historical cash flow trend
   */
  async getCashFlow(req, res, next) {
    try {
      const endMonth = req.query.endMonth || dashboardService.getCurrentMonth();
      const months = req.query.months ? parseInt(req.query.months, 10) : 6;
      const trend = await dashboardService.getCashFlowTrend(
        req.user.id,
        endMonth,
        months,
        req.user.currency
      );
      return successResponse(res, 200, 'Cash flow trend retrieved successfully', trend);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
