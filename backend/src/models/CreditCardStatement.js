import mongoose from 'mongoose';
import { STATEMENT_STATUS_LIST, STATEMENT_STATUSES } from '../constants/transactionTypes.js';

const creditCardStatementSchema = new mongoose.Schema(
  {
    creditCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditCard',
      required: [true, 'Statement must belong to a credit card'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Statement must belong to a user'],
      index: true
    },
    statementDate: {
      type: Date,
      required: [true, 'Statement date is required']
    },
    dueDate: {
      type: Date,
      required: [true, 'Payment due date is required'],
      index: true
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total statement amount is required'],
      min: [0, 'Total amount cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Total amount must be an integer in minor units'
      }
    },
    minimumAmount: {
      type: Number,
      required: [true, 'Minimum amount is required'],
      min: [0, 'Minimum amount cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Minimum amount must be an integer in minor units'
      }
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Paid amount must be an integer in minor units'
      }
    },
    status: {
      type: String,
      enum: STATEMENT_STATUS_LIST,
      default: STATEMENT_STATUSES.UNPAID,
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

creditCardStatementSchema.index({ creditCardId: 1, dueDate: -1 });

export const CreditCardStatement = mongoose.model('CreditCardStatement', creditCardStatementSchema);
