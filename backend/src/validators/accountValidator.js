import { z } from 'zod';
import { ACCOUNT_TYPE_LIST, ACCOUNT_TYPES } from '../constants/accountTypes.js';

export const createAccountSchema = z.object({
  name: z
    .string({ required_error: 'Account name is required' })
    .trim()
    .min(1, 'Account name cannot be empty')
    .max(100, 'Account name cannot exceed 100 characters'),
  type: z.enum(ACCOUNT_TYPE_LIST, {
    errorMap: () => ({ message: `Account type must be one of: ${ACCOUNT_TYPE_LIST.join(', ')}` })
  }),
  subType: z.string().trim().optional().default('SAVINGS'),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency code must be 3 characters')
    .toUpperCase()
    .optional()
    .default('INR'),
  // Client can send decimal major units (e.g. 5000.50) or minor units
  openingBalance: z
    .number()
    .optional()
    .default(0),
  openingBalanceDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex code (e.g. #3B82F6)')
    .optional()
    .default('#3B82F6'),
  icon: z.string().trim().optional().default('landmark')
});

export const updateAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Account name cannot be empty')
    .max(100, 'Account name cannot exceed 100 characters')
    .optional(),
  subType: z.string().trim().optional(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex code')
    .optional(),
  icon: z.string().trim().optional(),
  isActive: z.boolean().optional()
  // Explicitly disallows updating balance directly!
});

export const queryAccountSchema = z.object({
  type: z.enum(ACCOUNT_TYPE_LIST).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
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
  sortBy: z.enum(['name', 'balance', 'createdAt', 'type']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});
