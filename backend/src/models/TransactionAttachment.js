import mongoose from 'mongoose';
import { ATTACHMENT_TYPE_LIST, ATTACHMENT_TYPES } from '../constants/transactionTypes.js';

const transactionAttachmentSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Attachment must belong to a user'],
      index: true
    },
    url: {
      type: String,
      required: [true, 'Attachment URL/path is required']
    },
    type: {
      type: String,
      enum: ATTACHMENT_TYPE_LIST,
      default: ATTACHMENT_TYPES.IMAGE
    },
    name: {
      type: String,
      required: [true, 'Original file name is required']
    },
    size: {
      type: Number,
      required: [true, 'File size is required']
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const TransactionAttachment = mongoose.model(
  'TransactionAttachment',
  transactionAttachmentSchema
);
