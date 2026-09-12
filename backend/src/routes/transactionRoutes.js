import express from 'express';
import { transactionController } from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
  queryTransactionSchema
} from '../validators/transactionValidator.js';

const router = express.Router();

// All transaction routes require authentication
router.use(protect);

router.post('/', validate(createTransactionSchema), transactionController.createTransaction);
router.get('/', validate(queryTransactionSchema, 'query'), transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);
router.patch('/:id', validate(updateTransactionSchema), transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

export default router;
