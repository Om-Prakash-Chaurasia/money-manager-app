import mongoose from 'mongoose';
import { AUDIT_ACTION_LIST } from '../constants/transactionTypes.js';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Audit log must reference a user'],
      index: true
    },
    entity: {
      type: String,
      required: [true, 'Entity type is required'],
      trim: true,
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: AUDIT_ACTION_LIST,
      index: true
    },
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    afterState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
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

auditLogSchema.index({ userId: 1, entity: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
