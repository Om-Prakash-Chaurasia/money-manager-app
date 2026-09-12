import express from 'express';
import { accountController } from '../controllers/accountController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createAccountSchema,
  updateAccountSchema,
  queryAccountSchema
} from '../validators/accountValidator.js';

const router = express.Router();

// All account routes require authentication
router.use(protect);

router.post('/', validate(createAccountSchema), accountController.createAccount);
router.get('/', validate(queryAccountSchema, 'query'), accountController.getAccounts);
router.get('/:id', accountController.getAccountById);
router.patch('/:id', validate(updateAccountSchema), accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);

// Additional financial account endpoints
router.get('/:id/balance', accountController.getAccountBalance);
router.get('/:id/balance-history', accountController.getAccountBalanceHistory);
router.get('/:id/transactions', accountController.getAccountTransactions);

export default router;
