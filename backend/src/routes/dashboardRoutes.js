import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  dashboardQuerySchema,
  cashflowQuerySchema
} from '../validators/dashboardValidator.js';

const router = Router();

// Dashboard routes require authentication
router.use(protect);

router.get(
  '/summary',
  validate(dashboardQuerySchema, 'query'),
  dashboardController.getSummary
);

router.get(
  '/cashflow',
  validate(cashflowQuerySchema, 'query'),
  dashboardController.getCashFlow
);

export default router;
