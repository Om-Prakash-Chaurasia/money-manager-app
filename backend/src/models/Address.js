import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Address must belong to a user'],
      index: true
    },
    label: {
      type: String,
      required: [true, 'Label is required (e.g. Home, Office)'],
      trim: true
    },
    addressLine: {
      type: String,
      required: [true, 'Address line is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'India'
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
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

export const Address = mongoose.model('Address', addressSchema);
