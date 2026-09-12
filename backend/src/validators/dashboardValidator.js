import { z } from 'zod';

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const dashboardQuerySchema = z.object({
  month: z
    .string()
    .regex(monthRegex, 'Month must be in YYYY-MM format (e.g., 2026-09)')
    .optional()
});

export const cashflowQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional().default(6),
  endMonth: z
    .string()
    .regex(monthRegex, 'endMonth must be in YYYY-MM format (e.g., 2026-09)')
    .optional()
});
