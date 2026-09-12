import mongoose from 'mongoose';
import { ACCOUNT_TYPE_LIST, ACCOUNT_TYPES } from '../constants/accountTypes.js';

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account must belong to a user'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [100, 'Account name cannot exceed 100 characters']
    },
    type: {
      type: String,
      required: [true, 'Account type is required'],
      enum: {
        values: ACCOUNT_TYPE_LIST,
        message: '{VALUE} is not a supported account type'
      },
      default: ACCOUNT_TYPES.BANK
    },
    subType: {
      type: String,
      trim: true,
      default: 'SAVINGS'
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true
    },
    // Balance stored in integer minor units (paise/cents)
    balance: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Balance must be an integer (minor units)'
      }
    },
    openingBalance: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Opening balance must be an integer (minor units)'
      }
    },
    openingBalanceDate: {
      type: Date,
      default: Date.now
    },
    color: {
      type: String,
      default: '#3B82F6',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color']
    },
    icon: {
      type: String,
      default: 'landmark',
      trim: true
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

accountSchema.index({ userId: 1, isActive: 1 });
accountSchema.index({ userId: 1, type: 1 });
accountSchema.index({ userId: 1, name: 1 });

export const Account = mongoose.model('Account', accountSchema);
