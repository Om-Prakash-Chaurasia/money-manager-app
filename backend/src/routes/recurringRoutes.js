import { Router } from 'express';
import { recurringController } from '../controllers/recurringController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createRecurringSchema,
  updateRecurringSchema,
  recurringQuerySchema
} from '../validators/recurringValidator.js';

const router = Router();

// All routes require authentication
router.use(protect);

router
  .route('/')
  .post(validate(createRecurringSchema), recurringController.createRecurring)
  .get(validate(recurringQuerySchema, 'query'), recurringController.getRecurringTemplates);

router
  .route('/:id')
  .get(recurringController.getRecurringById)
  .patch(validate(updateRecurringSchema), recurringController.updateRecurring)
  .delete(recurringController.deleteRecurring);

router.post('/:id/execute', recurringController.executeRecurring);

export default router;
