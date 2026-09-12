import { z } from 'zod';
import {
  TRANSACTION_TYPE_LIST,
  TRANSACTION_STATUS_LIST
} from '../constants/transactionTypes.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createTransactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPE_LIST, {
      errorMap: () => ({ message: `Type must be one of: ${TRANSACTION_TYPE_LIST.join(', ')}` })
    }),
    // Accepts decimal major units (e.g., 250.50)
    amount: z
      .number({ required_error: 'Amount is required' })
      .positive('Amount must be greater than 0'),
    currency: z
      .string()
      .trim()
      .length(3, 'Currency code must be 3 characters')
      .toUpperCase()
      .optional()
      .default('INR'),
    date: z
      .string({ required_error: 'Transaction date is required' })
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description cannot be empty')
      .max(255, 'Description cannot exceed 255 characters'),
    note: z.string().trim().max(1000).optional().default(''),
    categoryId: z
      .string()
      .regex(objectIdRegex, 'Category ID must be a valid ObjectId')
      .nullable()
      .optional(),
    accountId: z
      .string()
      .regex(objectIdRegex, 'Account ID must be a valid ObjectId')
      .nullable()
      .optional(),
    fromAccountId: z
      .string()
      .regex(objectIdRegex, 'From Account ID must be a valid ObjectId')
      .nullable()
      .optional(),
    toAccountId: z
      .string()
      .regex(objectIdRegex, 'To Account ID must be a valid ObjectId')
      .nullable()
      .optional(),
    status: z.enum(TRANSACTION_STATUS_LIST).optional().default('COMPLETED')
  })
  .superRefine((data, ctx) => {
    if (data.type === 'INCOME' || data.type === 'EXPENSE') {
      if (!data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account is required for income and expense transactions',
          path: ['accountId']
        });
      }
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Category is required for income and expense transactions',
          path: ['categoryId']
        });
      }
    } else if (data.type === 'TRANSFER') {
      if (!data.fromAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Source account (fromAccountId) is required for transfer',
          path: ['fromAccountId']
        });
      }
      if (!data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Destination account (toAccountId) is required for transfer',
          path: ['toAccountId']
        });
      }
      if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Source and destination accounts cannot be the same',
          path: ['toAccountId']
        });
      }
    }
  });

export const updateTransactionSchema = z
  .object({
    amount: z.number().positive('Amount must be greater than 0').optional(),
    date: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
      .optional(),
    description: z.string().trim().min(1).max(255).optional(),
    note: z.string().trim().max(1000).optional(),
    categoryId: z.string().regex(objectIdRegex).nullable().optional(),
    accountId: z.string().regex(objectIdRegex).nullable().optional(),
    fromAccountId: z.string().regex(objectIdRegex).nullable().optional(),
    toAccountId: z.string().regex(objectIdRegex).nullable().optional(),
    status: z.enum(TRANSACTION_STATUS_LIST).optional()
  })
  .superRefine((data, ctx) => {
    if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Source and destination accounts cannot be the same',
        path: ['toAccountId']
      });
    }
  });

export const queryTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPE_LIST).optional(),
  accountId: z.string().regex(objectIdRegex).optional(),
  categoryId: z.string().regex(objectIdRegex).optional(),
  status: z.enum(TRANSACTION_STATUS_LIST).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  minAmount: z
    .string()
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v >= 0)
    .optional(),
  maxAmount: z
    .string()
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v >= 0)
    .optional(),
  search: z.string().trim().optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, 'Page must be a positive integer')
    .optional()
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
    .default('20'),
  sortBy: z.enum(['date', 'amount', 'createdAt']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});
