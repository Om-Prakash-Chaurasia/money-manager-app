import { Router } from 'express';
import { budgetController } from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetQuerySchema
} from '../validators/budgetValidator.js';

const router = Router();

// All budget operations require authentication
router.use(protect);

// Specific paths before parameterized /:id
router.get('/summary', budgetController.getBudgetSummary);

router
  .route('/')
  .post(validate(createBudgetSchema), budgetController.createBudget)
  .get(validate(budgetQuerySchema, 'query'), budgetController.getBudgets);

router
  .route('/:id')
  .get(budgetController.getBudgetById)
  .patch(validate(updateBudgetSchema), budgetController.updateBudget)
  .delete(budgetController.deleteBudget);

export default router;
