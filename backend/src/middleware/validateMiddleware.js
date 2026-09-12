import { AppError } from '../utils/appError.js';

/**
 * Creates an Express middleware that validates request data against a Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema
 * @param {'body'|'query'|'params'} source - Request property to validate (default: 'body')
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // Replace with sanitized/transformed values
      next();
    } catch (error) {
      if (error.errors && Array.isArray(error.errors)) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        const primaryMessage = formattedErrors[0]?.message || 'Validation failed';
        return next(new AppError(primaryMessage, 400, formattedErrors));
      }
      return next(new AppError('Invalid input data', 400));
    }
  };
};
