import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address'
      ],
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never return passwordHash in normal queries
    },
    avatar: {
      type: String,
      default: null
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
      maxlength: 3
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      select: false
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const User = mongoose.model('User', userSchema);
