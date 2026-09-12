import mongoose from 'mongoose';

const userSettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Setting must belong to a user'],
      index: true
    },
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      trim: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Setting value is required']
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

userSettingSchema.index({ userId: 1, key: 1 }, { unique: true });

export const UserSetting = mongoose.model('UserSetting', userSettingSchema);
