import express from 'express';
import { transferController } from '../controllers/transferController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createTransferSchema,
  queryTransferSchema
} from '../validators/transferValidator.js';

const router = express.Router();

// All transfer routes require authentication
router.use(protect);

router.post('/', validate(createTransferSchema), transferController.executeTransfer);
router.get('/', validate(queryTransferSchema, 'query'), transferController.getTransfers);
router.get('/:id', transferController.getTransferById);

export default router;
