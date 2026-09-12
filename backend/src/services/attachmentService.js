import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { TransactionAttachment } from '../models/TransactionAttachment.js';
import { Transaction } from '../models/Transaction.js';
import { ATTACHMENT_TYPES } from '../constants/transactionTypes.js';
import { AppError } from '../utils/appError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.resolve(__dirname, '../../', env.UPLOAD_DIR);

class AttachmentService {
  /**
   * Determine attachment classification type
   */
  classifyType(mimetype) {
    if (mimetype && mimetype.startsWith('image/')) {
      return ATTACHMENT_TYPES.IMAGE;
    }
    if (mimetype === 'application/pdf') {
      return ATTACHMENT_TYPES.PDF;
    }
    return ATTACHMENT_TYPES.OTHER;
  }

  /**
   * Upload single attachment and link to transaction if provided
   */
  async uploadAttachment(userId, file, transactionId = null) {
    let validTransactionId = null;

    if (transactionId) {
      if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        throw new AppError('Invalid transactionId format', 400);
      }

      const tx = await Transaction.findOne({
        _id: transactionId,
        userId,
        isDeleted: { $ne: true }
      });

      if (!tx) {
        throw new AppError('Transaction not found or not accessible', 404);
      }
      validTransactionId = tx._id;
    }

    const type = this.classifyType(file.mimetype);
    const relativeUrl = `/uploads/${file.filename}`;

    const attachment = await TransactionAttachment.create({
      userId,
      transactionId: validTransactionId,
      url: relativeUrl,
      name: file.originalname,
      size: file.size,
      type
    });

    logger.info(`Attachment uploaded: "${attachment.name}" (${type}, ${attachment.size} bytes) for user ${userId}`);

    return attachment;
  }

  /**
   * Upload multiple attachments at once
   */
  async uploadMultipleAttachments(userId, files, transactionId = null) {
    let validTransactionId = null;

    if (transactionId) {
      if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        throw new AppError('Invalid transactionId format', 400);
      }

      const tx = await Transaction.findOne({
        _id: transactionId,
        userId,
        isDeleted: { $ne: true }
      });

      if (!tx) {
        throw new AppError('Transaction not found or not accessible', 404);
      }
      validTransactionId = tx._id;
    }

    const attachments = [];
    for (const file of files) {
      const type = this.classifyType(file.mimetype);
      const relativeUrl = `/uploads/${file.filename}`;

      const att = await TransactionAttachment.create({
        userId,
        transactionId: validTransactionId,
        url: relativeUrl,
        name: file.originalname,
        size: file.size,
        type
      });
      attachments.push(att);
    }

    return attachments;
  }

  /**
   * Retrieve attachment by ID with ownership verification
   */
  async getAttachmentById(userId, attachmentId) {
    if (!mongoose.Types.ObjectId.isValid(attachmentId)) {
      throw new AppError('Invalid attachment ID format', 400);
    }

    const attachment = await TransactionAttachment.findOne({
      _id: attachmentId,
      userId
    });

    if (!attachment) {
      throw new AppError('Attachment not found', 404);
    }

    return attachment;
  }

  /**
   * Retrieve all attachments for a specific transaction
   */
  async getAttachmentsByTransaction(userId, transactionId) {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      throw new AppError('Invalid transaction ID format', 400);
    }

    const tx = await Transaction.findOne({
      _id: transactionId,
      userId,
      isDeleted: { $ne: true }
    });

    if (!tx) {
      throw new AppError('Transaction not found', 404);
    }

    return TransactionAttachment.find({
      transactionId,
      userId
    }).sort({ createdAt: -1 });
  }

  /**
   * Delete attachment record and unlink file from disk
   */
  async deleteAttachment(userId, attachmentId) {
    if (!mongoose.Types.ObjectId.isValid(attachmentId)) {
      throw new AppError('Invalid attachment ID format', 400);
    }

    const attachment = await TransactionAttachment.findOne({
      _id: attachmentId,
      userId
    });

    if (!attachment) {
      throw new AppError('Attachment not found', 404);
    }

    // Try unlinking file from filesystem
    const filename = path.basename(attachment.url);
    const filePath = path.resolve(uploadDirectory, filename);

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      logger.warn(`Could not delete physical file ${filePath}: ${err.message}`);
    }

    await TransactionAttachment.findByIdAndDelete(attachmentId);

    logger.info(`Attachment deleted: ${attachmentId} (User: ${userId})`);

    return { success: true, message: 'Attachment deleted successfully' };
  }

  /**
   * Link existing unlinked attachments to a newly created transaction
   */
  async linkAttachmentsToTransaction(userId, transactionId, attachmentIds = []) {
    if (!attachmentIds || attachmentIds.length === 0) return;

    const validIds = attachmentIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length > 0) {
      await TransactionAttachment.updateMany(
        {
          _id: { $in: validIds },
          userId,
          transactionId: null
        },
        {
          $set: { transactionId }
        }
      );
    }
  }
}

export const attachmentService = new AttachmentService();
