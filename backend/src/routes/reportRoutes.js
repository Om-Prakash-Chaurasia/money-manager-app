import express from 'express';
import { reportController } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  incomeExpenseReportSchema,
  categorySpendingReportSchema,
  cashFlowReportSchema,
  netWorthReportSchema,
  accountGrowthReportSchema
} from '../validators/reportValidator.js';

const router = express.Router();

// All reporting endpoints require authentication
router.use(protect);

router.get(
  '/income-expense',
  validate(incomeExpenseReportSchema, 'query'),
  reportController.getIncomeExpense
);

router.get(
  '/category-spending',
  validate(categorySpendingReportSchema, 'query'),
  reportController.getCategorySpending
);

router.get(
  '/cash-flow',
  validate(cashFlowReportSchema, 'query'),
  reportController.getCashFlow
);

router.get(
  '/net-worth',
  validate(netWorthReportSchema, 'query'),
  reportController.getNetWorthTrajectory
);

router.get(
  '/account-growth',
  validate(accountGrowthReportSchema, 'query'),
  reportController.getAccountGrowth
);

export default router;
