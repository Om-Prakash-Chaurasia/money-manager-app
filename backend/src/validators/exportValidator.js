import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const exportTransactionsSchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv'),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid startDate format' })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid endDate format' })
    .optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  accountId: z.string().regex(objectIdRegex, 'accountId must be a valid ObjectId').optional(),
  categoryId: z.string().regex(objectIdRegex, 'categoryId must be a valid ObjectId').optional()
});

export const exportAccountsSchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv')
});
