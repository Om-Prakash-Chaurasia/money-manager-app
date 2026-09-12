import mongoose from 'mongoose';
import {
  TRANSACTION_TYPE_LIST,
  RECURRING_FREQUENCY_LIST,
  RECURRING_FREQUENCIES
} from '../constants/transactionTypes.js';

const recurringTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recurring transaction must belong to a user'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: TRANSACTION_TYPE_LIST
    },
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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      enum: RECURRING_FREQUENCY_LIST,
      default: RECURRING_FREQUENCIES.MONTHLY
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      default: null
    },
    nextRunDate: {
      type: Date,
      required: [true, 'Next run date is required'],
      index: true
    },
    lastRunDate: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true,
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

recurringTransactionSchema.index({ isActive: 1, nextRunDate: 1 });
recurringTransactionSchema.index({ userId: 1, isActive: 1 });

export const RecurringTransaction = mongoose.model(
  'RecurringTransaction',
  recurringTransactionSchema
);
