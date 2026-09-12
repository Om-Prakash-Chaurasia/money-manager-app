import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createTransferSchema = z
  .object({
    fromAccountId: z
      .string({ required_error: 'Source account (fromAccountId) is required' })
      .regex(objectIdRegex, 'fromAccountId must be a valid ObjectId'),
    toAccountId: z
      .string({ required_error: 'Destination account (toAccountId) is required' })
      .regex(objectIdRegex, 'toAccountId must be a valid ObjectId'),
    amount: z
      .number({ required_error: 'Transfer amount is required' })
      .positive('Transfer amount must be greater than 0'),
    date: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
      .optional(),
    description: z.string().trim().max(255).optional(),
    note: z.string().trim().max(1000).optional().default('')
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Source and destination accounts cannot be identical',
    path: ['toAccountId']
  });

export const queryTransferSchema = z.object({
  accountId: z.string().regex(objectIdRegex).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
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
    .default('20')
});
