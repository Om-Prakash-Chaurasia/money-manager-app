import express from 'express';
import { exportController } from '../controllers/exportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  exportTransactionsSchema,
  exportAccountsSchema
} from '../validators/exportValidator.js';

const router = express.Router();

// All export endpoints require authentication
router.use(protect);

// Export transactions as CSV or JSON
router.get(
  '/transactions',
  validate(exportTransactionsSchema, 'query'),
  exportController.exportTransactions
);

// Export accounts as CSV or JSON
router.get(
  '/accounts',
  validate(exportAccountsSchema, 'query'),
  exportController.exportAccounts
);

// Export full database backup as JSON
router.get(
  '/full-backup',
  exportController.exportFullBackup
);

export default router;
