import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(1, 'Category name cannot be empty')
    .max(80, 'Category name cannot exceed 80 characters'),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'Category type must be either INCOME or EXPENSE' })
  }),
  parentId: z
    .string()
    .regex(objectIdRegex, 'Parent ID must be a valid MongoDB ObjectId')
    .nullable()
    .optional()
    .default(null),
  icon: z.string().trim().optional().default('folder'),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex code (e.g. #F59E0B)')
    .optional()
    .default('#64748B')
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name cannot be empty')
    .max(80, 'Category name cannot exceed 80 characters')
    .optional(),
  parentId: z
    .string()
    .regex(objectIdRegex, 'Parent ID must be a valid MongoDB ObjectId')
    .nullable()
    .optional(),
  icon: z.string().trim().optional(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex code')
    .optional(),
  isActive: z.boolean().optional()
});

export const queryCategorySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  format: z.enum(['tree', 'flat']).optional().default('tree'),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default('true'),
  search: z.string().trim().optional()
});
