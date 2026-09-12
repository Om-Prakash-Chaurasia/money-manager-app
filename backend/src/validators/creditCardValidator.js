import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createCreditCardSchema = z.object({
  name: z
    .string({ required_error: 'Card/Account name is required' })
    .trim()
    .min(1, 'Card name cannot be empty')
    .max(100, 'Card name cannot exceed 100 characters'),
  creditLimit: z
    .number({ required_error: 'Credit limit is required' })
    .positive('Credit limit must be greater than 0'),
  billingCycleDay: z
    .number({ required_error: 'Billing cycle day is required (1-31)' })
    .int('Billing cycle day must be an integer')
    .min(1, 'Billing cycle day must be between 1 and 31')
    .max(31, 'Billing cycle day must be between 1 and 31'),
  dueDay: z
    .number({ required_error: 'Payment due day is required (1-31)' })
    .int('Payment due day must be an integer')
    .min(1, 'Payment due day must be between 1 and 31')
    .max(31, 'Payment due day must be between 1 and 31'),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex code')
    .optional()
    .default('#8B5CF6'),
  icon: z.string().trim().optional().default('credit-card'),
  accountId: z.string().regex(objectIdRegex).optional()
});

export const updateCreditCardSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  creditLimit: z.number().positive().optional(),
  billingCycleDay: z.number().int().min(1).max(31).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  icon: z.string().trim().optional(),
  isActive: z.boolean().optional()
});

export const createStatementSchema = z.object({
  statementDate: z
    .string({ required_error: 'Statement date is required' })
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  dueDate: z
    .string({ required_error: 'Due date is required' })
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  totalAmount: z
    .number({ required_error: 'Total amount is required' })
    .min(0, 'Total amount cannot be negative'),
  minimumAmount: z
    .number({ required_error: 'Minimum amount is required' })
    .min(0, 'Minimum amount cannot be negative')
});

export const creditCardPaymentSchema = z.object({
  fromAccountId: z
    .string({ required_error: 'Source bank account (fromAccountId) is required' })
    .regex(objectIdRegex, 'fromAccountId must be a valid ObjectId'),
  amount: z
    .number({ required_error: 'Payment amount is required' })
    .positive('Payment amount must be greater than 0'),
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
  note: z.string().trim().max(1000).optional().default('Credit card bill payment'),
  statementId: z.string().regex(objectIdRegex).optional()
});
