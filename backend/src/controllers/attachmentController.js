import { attachmentService } from '../services/attachmentService.js';
import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';

class AttachmentController {
  /**
   * POST /api/attachments/upload
   * Handles single file receipt upload
   */
  async upload(req, res, next) {
    try {
      if (!req.file && (!req.files || req.files.length === 0)) {
        return next(new AppError('Please provide a file to upload', 400));
      }

      const transactionId = req.body.transactionId || null;

      if (req.file) {
        const attachment = await attachmentService.uploadAttachment(
          req.user.id,
          req.file,
          transactionId
        );
        return successResponse(res, 201, 'Attachment uploaded successfully', { attachment });
      }

      const attachments = await attachmentService.uploadMultipleAttachments(
        req.user.id,
        req.files,
        transactionId
      );
      return successResponse(res, 201, 'Attachments uploaded successfully', { attachments });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/attachments/:id
   * Retrieves single attachment by ID
   */
  async getById(req, res, next) {
    try {
      const attachment = await attachmentService.getAttachmentById(req.user.id, req.params.id);
      return successResponse(res, 200, 'Attachment retrieved successfully', { attachment });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/attachments/transaction/:transactionId
   * Retrieves all attachments for a specific transaction
   */
  async getByTransaction(req, res, next) {
    try {
      const attachments = await attachmentService.getAttachmentsByTransaction(
        req.user.id,
        req.params.transactionId
      );
      return successResponse(res, 200, 'Attachments retrieved successfully', { attachments });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/attachments/:id
   * Removes attachment from database and unlinks physical file
   */
  async delete(req, res, next) {
    try {
      await attachmentService.deleteAttachment(req.user.id, req.params.id);
      return successResponse(res, 200, 'Attachment deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const attachmentController = new AttachmentController();
