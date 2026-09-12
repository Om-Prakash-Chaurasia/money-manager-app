import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Budget must belong to a user'],
      index: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Budget must be assigned to a category'],
      index: true
    },
    // Format: 'YYYY-MM' (e.g. '2026-09')
    month: {
      type: String,
      required: [true, 'Month in YYYY-MM format is required'],
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format (e.g., 2026-09)'],
      index: true
    },
    // Amount in integer minor units
    amount: {
      type: Number,
      required: [true, 'Budget amount is required'],
      min: [1, 'Budget amount must be greater than 0'],
      validate: {
        validator: Number.isInteger,
        message: 'Budget amount must be an integer in minor units'
      }
    },
    // Cached / calculated spent amount
    spent: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Spent amount must be an integer in minor units'
      }
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

budgetSchema.index({ userId: 1, categoryId: 1, month: 1 }, { unique: true });
budgetSchema.index({ userId: 1, month: 1 });

export const Budget = mongoose.model('Budget', budgetSchema);
