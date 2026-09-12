import mongoose from 'mongoose';

const creditCardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Credit card must belong to a user'],
      index: true
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Credit card must be linked to an account'],
      unique: true,
      index: true
    },
    creditLimit: {
      type: Number,
      required: [true, 'Credit limit is required'],
      min: [0, 'Credit limit cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Credit limit must be an integer in minor units'
      }
    },
    billingCycleDay: {
      type: Number,
      required: [true, 'Billing cycle day is required (1-31)'],
      min: [1, 'Billing cycle day must be between 1 and 31'],
      max: [31, 'Billing cycle day must be between 1 and 31']
    },
    dueDay: {
      type: Number,
      required: [true, 'Due day is required (1-31)'],
      min: [1, 'Due day must be between 1 and 31'],
      max: [31, 'Due day must be between 1 and 31']
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

export const CreditCard = mongoose.model('CreditCard', creditCardSchema);
