import { z } from 'zod';
import {
  TRANSACTION_TYPE_LIST,
  RECURRING_FREQUENCY_LIST
} from '../constants/transactionTypes.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createRecurringSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title cannot be empty')
      .max(150, 'Title cannot exceed 150 characters'),
    type: z.enum(TRANSACTION_TYPE_LIST, {
      errorMap: () => ({
        message: `Type must be one of: ${TRANSACTION_TYPE_LIST.join(', ')}`
      })
    }),
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
    frequency: z.enum(RECURRING_FREQUENCY_LIST, {
      errorMap: () => ({
        message: `Frequency must be one of: ${RECURRING_FREQUENCY_LIST.join(', ')}`
      })
    }),
    startDate: z
      .string({ required_error: 'Start date is required' })
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Start date must be YYYY-MM-DD or ISO string')),
    endDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'End date must be YYYY-MM-DD or ISO string'))
      .nullable()
      .optional(),
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
    isActive: z.boolean().optional().default(true)
  })
  .superRefine((data, ctx) => {
    if (data.type === 'INCOME' || data.type === 'EXPENSE') {
      if (!data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account is required for income and expense recurring transactions',
          path: ['accountId']
        });
      }
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Category is required for income and expense recurring transactions',
          path: ['categoryId']
        });
      }
    } else if (data.type === 'TRANSFER') {
      if (!data.fromAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'From Account is required for recurring transfer',
          path: ['fromAccountId']
        });
      }
      if (!data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'To Account is required for recurring transfer',
          path: ['toAccountId']
        });
      }
      if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'From Account and To Account cannot be the same',
          path: ['toAccountId']
        });
      }
    }

    if (data.endDate && data.startDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date cannot be earlier than start date',
          path: ['endDate']
        });
      }
    }
  });

export const updateRecurringSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    amount: z.number().positive().optional(),
    frequency: z.enum(RECURRING_FREQUENCY_LIST).optional(),
    startDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
      .optional(),
    endDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
      .nullable()
      .optional(),
    categoryId: z.string().regex(objectIdRegex).nullable().optional(),
    accountId: z.string().regex(objectIdRegex).nullable().optional(),
    fromAccountId: z.string().regex(objectIdRegex).nullable().optional(),
    toAccountId: z.string().regex(objectIdRegex).nullable().optional(),
    isActive: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'From Account and To Account cannot be the same',
        path: ['toAccountId']
      });
    }
  });

export const recurringQuerySchema = z.object({
  type: z.enum(TRANSACTION_TYPE_LIST).optional(),
  frequency: z.enum(RECURRING_FREQUENCY_LIST).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50)
});
