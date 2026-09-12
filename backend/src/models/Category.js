import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Category must belong to a user'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [80, 'Category name cannot exceed 80 characters']
    },
    type: {
      type: String,
      required: [true, 'Category type is required'],
      enum: {
        values: ['INCOME', 'EXPENSE'],
        message: '{VALUE} must be either INCOME or EXPENSE'
      },
      index: true
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true
    },
    icon: {
      type: String,
      default: 'folder',
      trim: true
    },
    color: {
      type: String,
      default: '#64748B',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color']
    },
    isDefault: {
      type: Boolean,
      default: false
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

categorySchema.index({ userId: 1, type: 1, parentId: 1, isActive: 1 });
categorySchema.index({ userId: 1, name: 1 });

export const Category = mongoose.model('Category', categorySchema);
