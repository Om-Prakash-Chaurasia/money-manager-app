import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const createBudgetSchema = z.object({
  categoryId: z
    .string({ required_error: 'Category ID is required' })
    .regex(objectIdRegex, 'Category ID must be a valid ObjectId'),
  month: z
    .string({ required_error: 'Month is required' })
    .regex(monthRegex, 'Month must be in YYYY-MM format (e.g., 2026-09)'),
  // Major units (e.g. 15000 or 15000.50)
  amount: z
    .number({ required_error: 'Budget amount is required' })
    .positive('Budget amount must be greater than 0')
});

export const updateBudgetSchema = z.object({
  categoryId: z
    .string()
    .regex(objectIdRegex, 'Category ID must be a valid ObjectId')
    .optional(),
  month: z
    .string()
    .regex(monthRegex, 'Month must be in YYYY-MM format (e.g., 2026-09)')
    .optional(),
  amount: z
    .number()
    .positive('Budget amount must be greater than 0')
    .optional()
});

export const budgetQuerySchema = z.object({
  month: z
    .string()
    .regex(monthRegex, 'Month must be in YYYY-MM format (e.g., 2026-09)')
    .optional(),
  categoryId: z
    .string()
    .regex(objectIdRegex, 'Category ID must be a valid ObjectId')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50)
});
