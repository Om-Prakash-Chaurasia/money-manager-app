import { recurringRepository } from '../repositories/recurringRepository.js';
import { recurringService } from '../services/recurringService.js';
import { logger } from '../utils/logger.js';

let jobInterval = null;

/**
 * Process all recurring transactions that are due as of cutoffDate
 * @param {Date} [cutoffDate]
 * @returns {Promise<{ totalDue: number, processed: number, failed: number, errors: Array }>}
 */
export const processDueRecurringTransactions = async (cutoffDate = new Date()) => {
  try {
    const dueTemplates = await recurringRepository.findDueTemplates(cutoffDate);

    if (dueTemplates.length === 0) {
      return { totalDue: 0, processed: 0, failed: 0, errors: [] };
    }

    logger.info(`Found ${dueTemplates.length} due recurring transaction(s) to process.`);

    const results = [];
    const errors = [];

    for (const template of dueTemplates) {
      try {
        const result = await recurringService.executeTemplate(template._id, cutoffDate);
        results.push(result);
      } catch (err) {
        logger.error(`Failed to execute recurring template ID: ${template._id} ("${template.title}"): ${err.message}`);
        errors.push({ templateId: template._id, error: err.message });
      }
    }

    logger.info(
      `Recurring transaction job cycle completed. Processed: ${results.length}, Failed: ${errors.length}`
    );

    return {
      totalDue: dueTemplates.length,
      processed: results.length,
      failed: errors.length,
      results,
      errors
    };
  } catch (error) {
    logger.error(`Error during recurring transaction processing: ${error.message}`);
    throw error;
  }
};

/**
 * Start the recurring transaction scheduler
 * @param {number} [intervalMs] - Default 60,000ms (1 minute)
 */
export const startRecurringTransactionJob = (intervalMs = 60000) => {
  if (jobInterval) {
    logger.warn('Recurring transaction job is already running.');
    return jobInterval;
  }

  logger.info(`Starting recurring transaction background job (interval: ${intervalMs}ms)`);

  // Run initial cycle after small delay
  setTimeout(() => {
    processDueRecurringTransactions().catch((err) => {
      logger.error(`Error in initial recurring transaction cycle: ${err.message}`);
    });
  }, 5000);

  // Set recurring interval
  jobInterval = setInterval(() => {
    processDueRecurringTransactions().catch((err) => {
      logger.error(`Error in recurring transaction interval cycle: ${err.message}`);
    });
  }, intervalMs);

  return jobInterval;
};

/**
 * Stop the recurring transaction scheduler
 */
export const stopRecurringTransactionJob = () => {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
    logger.info('Recurring transaction background job stopped.');
  }
};
