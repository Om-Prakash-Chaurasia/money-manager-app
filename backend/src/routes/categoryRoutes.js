import express from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  queryCategorySchema
} from '../validators/categoryValidator.js';

const router = express.Router();

// All category routes require authentication
router.use(protect);

router.post('/', validate(createCategorySchema), categoryController.createCategory);
router.get('/', validate(queryCategorySchema, 'query'), categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.patch('/:id', validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
