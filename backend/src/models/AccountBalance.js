import mongoose from 'mongoose';

const accountBalanceSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account reference is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    date: {
      type: Date,
      required: [true, 'Snapshot date is required'],
      index: true
    },
    balance: {
      type: Number,
      required: [true, 'Snapshot balance is required'],
      validate: {
        validator: Number.isInteger,
        message: 'Balance must be an integer in minor units'
      }
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

accountBalanceSchema.index({ accountId: 1, date: -1 });
accountBalanceSchema.index({ userId: 1, date: -1 });

export const AccountBalance = mongoose.model('AccountBalance', accountBalanceSchema);
