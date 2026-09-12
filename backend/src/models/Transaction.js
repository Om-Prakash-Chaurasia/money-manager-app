import mongoose from 'mongoose';
import {
  TRANSACTION_TYPE_LIST,
  TRANSACTION_STATUS_LIST,
  TRANSACTION_STATUSES
} from '../constants/transactionTypes.js';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a user'],
      index: true
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: TRANSACTION_TYPE_LIST,
        message: '{VALUE} is not a valid transaction type'
      },
      index: true
    },
    // Amount in minor units (e.g., 200000 = ₹2,000.00)
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer in minor units'
      }
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true
    },
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [255, 'Description cannot exceed 255 characters']
    },
    note: {
      type: String,
      trim: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters'],
      default: ''
    },
    // Category is optional for TRANSFER, but typically required for INCOME and EXPENSE
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true
    },
    // Used for INCOME and EXPENSE
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      index: true
    },
    // Used for TRANSFER
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      index: true
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUS_LIST,
      default: TRANSACTION_STATUSES.COMPLETED,
      index: true
    },
    recurringTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringTransaction',
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// High performance compound indexes
transactionSchema.index({ userId: 1, isDeleted: 1, date: -1 });
transactionSchema.index({ userId: 1, isDeleted: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, isDeleted: 1, accountId: 1, date: -1 });
transactionSchema.index({ userId: 1, isDeleted: 1, categoryId: 1, date: -1 });
transactionSchema.index({ userId: 1, fromAccountId: 1, toAccountId: 1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
