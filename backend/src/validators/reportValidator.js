import { z } from 'zod';

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const incomeExpenseReportSchema = z.object({
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid startDate format' })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid endDate format' })
    .optional(),
  groupBy: z.enum(['month', 'week', 'day']).optional().default('month')
});

export const categorySpendingReportSchema = z.object({
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid startDate format' })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid endDate format' })
    .optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional().default('EXPENSE'),
  parentId: z
    .string()
    .regex(objectIdRegex, 'parentId must be a valid ObjectId')
    .optional()
});

export const cashFlowReportSchema = z.object({
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid startDate format' })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid endDate format' })
    .optional()
});

export const netWorthReportSchema = z.object({
  months: z.coerce.number().int().min(1).max(36).optional().default(12),
  endMonth: z
    .string()
    .regex(monthRegex, 'endMonth must be in YYYY-MM format (e.g. 2026-09)')
    .optional()
});

export const accountGrowthReportSchema = z.object({
  accountId: z
    .string()
    .regex(objectIdRegex, 'accountId must be a valid ObjectId')
    .optional(),
  months: z.coerce.number().int().min(1).max(24).optional().default(6),
  endMonth: z
    .string()
    .regex(monthRegex, 'endMonth must be in YYYY-MM format (e.g. 2026-09)')
    .optional()
});
