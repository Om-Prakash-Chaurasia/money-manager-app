import express from 'express';
import { attachmentController } from '../controllers/attachmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSingle, uploadMultiple } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All attachment endpoints require authentication
router.use(protect);

// Upload single receipt/file
router.post('/upload', uploadSingle('file'), attachmentController.upload);

// Upload multiple receipts/files (max 5)
router.post('/upload-multiple', uploadMultiple('files', 5), attachmentController.upload);

// Retrieve attachments for a transaction
router.get('/transaction/:transactionId', attachmentController.getByTransaction);

// Retrieve single attachment by ID
router.get('/:id', attachmentController.getById);

// Delete attachment by ID (unlinks physical file)
router.delete('/:id', attachmentController.delete);

export default router;
