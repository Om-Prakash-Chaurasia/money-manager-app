import { recurringRepository } from '../repositories/recurringRepository.js';
import { accountRepository } from '../repositories/accountRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { transactionRepository } from '../repositories/transactionRepository.js';
import { runInTransaction } from '../utils/transactionRunner.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/currencyHelper.js';
import { TRANSACTION_TYPES } from '../constants/transactionTypes.js';

export const calculateNextRunDate = (baseDate, frequency) => {
  const next = new Date(baseDate);
  switch (frequency) {
    case 'DAILY':
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case 'WEEKLY':
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case 'MONTHLY':
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case 'YEARLY':
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
    default:
      next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
};

class RecurringService {
  /**
   * Format recurring transaction document for client responses
   */
  formatRecurring(doc, userCurrency = 'INR') {
    const category = doc.categoryId && typeof doc.categoryId === 'object'
      ? {
          id: doc.categoryId._id || doc.categoryId.id,
          name: doc.categoryId.name,
          icon: doc.categoryId.icon,
          color: doc.categoryId.color,
          type: doc.categoryId.type,
          parentId: doc.categoryId.parentId
        }
      : null;

    const formatAcc = (acc) =>
      acc && typeof acc === 'object'
        ? {
            id: acc._id || acc.id,
            name: acc.name,
            type: acc.type,
            balance: toMajorUnits(acc.balance),
            balanceFormatted: formatCurrency(acc.balance, acc.currency || userCurrency),
            color: acc.color,
            icon: acc.icon
          }
        : null;

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      title: doc.title,
      type: doc.type,
      amount: toMajorUnits(doc.amount),
      amountMinor: doc.amount,
      amountFormatted: formatCurrency(doc.amount, doc.currency || userCurrency),
      currency: doc.currency || 'INR',
      frequency: doc.frequency,
      startDate: doc.startDate,
      endDate: doc.endDate,
      nextRunDate: doc.nextRunDate,
      lastRunDate: doc.lastRunDate,
      isActive: doc.isActive,
      category,
      account: formatAcc(doc.accountId),
      fromAccount: formatAcc(doc.fromAccountId),
      toAccount: formatAcc(doc.toAccountId),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Validate account and category ownership
   */
  async validateOwnershipAndEntities(userId, data) {
    if (data.type === TRANSACTION_TYPES.INCOME || data.type === TRANSACTION_TYPES.EXPENSE) {
      if (data.accountId) {
        const account = await accountRepository.findByIdAndUserId(data.accountId, userId);
        if (!account || !account.isActive) {
          throw new AppError('Account not found or inactive', 404);
        }
      }
      if (data.categoryId) {
        const category = await categoryRepository.findByIdAndUserId(data.categoryId, userId);
        if (!category || !category.isActive) {
          throw new AppError('Category not found or inactive', 404);
        }
        if (data.type === TRANSACTION_TYPES.EXPENSE && category.type !== 'EXPENSE') {
          throw new AppError('Category must be an EXPENSE category for expense recurring transactions', 400);
        }
        if (data.type === TRANSACTION_TYPES.INCOME && category.type !== 'INCOME') {
          throw new AppError('Category must be an INCOME category for income recurring transactions', 400);
        }
      }
    } else if (data.type === TRANSACTION_TYPES.TRANSFER) {
      if (data.fromAccountId) {
        const fromAccount = await accountRepository.findByIdAndUserId(data.fromAccountId, userId);
        if (!fromAccount || !fromAccount.isActive) {
          throw new AppError('Source account not found or inactive', 404);
        }
      }
      if (data.toAccountId) {
        const toAccount = await accountRepository.findByIdAndUserId(data.toAccountId, userId);
        if (!toAccount || !toAccount.isActive) {
          throw new AppError('Destination account not found or inactive', 404);
        }
      }
    }
  }

  /**
   * Create a new recurring transaction template
   */
  async createRecurring(userId, data, userCurrency = 'INR') {
    await this.validateOwnershipAndEntities(userId, data);

    const amountMinor = toMinorUnits(data.amount);
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;
    const nextRunDate = new Date(startDate);

    const recurring = await recurringRepository.create({
      userId,
      title: data.title,
      type: data.type,
      amount: amountMinor,
      currency: data.currency || userCurrency || 'INR',
      frequency: data.frequency,
      startDate,
      endDate,
      nextRunDate,
      categoryId: data.categoryId || null,
      accountId: data.accountId || null,
      fromAccountId: data.fromAccountId || null,
      toAccountId: data.toAccountId || null,
      isActive: data.isActive !== undefined ? data.isActive : true
    });

    const populated = await recurringRepository.findById(recurring._id);

    logger.info(
      `Recurring template created: "${recurring.title}" (${recurring.frequency}) - ₹${data.amount} for user: ${userId}`
    );

    return this.formatRecurring(populated, userCurrency);
  }

  /**
   * Get all recurring transaction templates for a user
   */
  async getRecurringTemplates(userId, query = {}, userCurrency = 'INR') {
    const filter = { userId };

    if (query.type) {
      filter.type = query.type;
    }
    if (query.frequency) {
      filter.frequency = query.frequency;
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    const { data, total, page, limit, totalPages } = await recurringRepository.find(filter, {
      page: query.page || 1,
      limit: query.limit || 50,
      sort: { nextRunDate: 1 }
    });

    const formattedList = data.map((item) => this.formatRecurring(item, userCurrency));

    return {
      templates: formattedList,
      pagination: { total, page, limit, totalPages }
    };
  }

  /**
   * Get recurring template by ID
   */
  async getRecurringById(userId, id, userCurrency = 'INR') {
    const template = await recurringRepository.findById(id);
    if (!template || template.userId.toString() !== userId.toString()) {
      throw new AppError('Recurring transaction template not found', 404);
    }

    return this.formatRecurring(template, userCurrency);
  }

  /**
   * Update recurring template
   */
  async updateRecurring(userId, id, updateData, userCurrency = 'INR') {
    const existing = await recurringRepository.findById(id, false);
    if (!existing || existing.userId.toString() !== userId.toString()) {
      throw new AppError('Recurring transaction template not found', 404);
    }

    const mergedData = { ...existing.toObject(), ...updateData };
    await this.validateOwnershipAndEntities(userId, mergedData);

    const updates = {};
    if (updateData.title !== undefined) updates.title = updateData.title;
    if (updateData.type !== undefined) updates.type = updateData.type;
    if (updateData.amount !== undefined) updates.amount = toMinorUnits(updateData.amount);
    if (updateData.currency !== undefined) updates.currency = updateData.currency;
    if (updateData.frequency !== undefined) updates.frequency = updateData.frequency;
    if (updateData.startDate !== undefined) {
      updates.startDate = new Date(updateData.startDate);
      // Recalculate nextRunDate if start date changed
      updates.nextRunDate = new Date(updateData.startDate);
    }
    if (updateData.endDate !== undefined) {
      updates.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    }
    if (updateData.categoryId !== undefined) updates.categoryId = updateData.categoryId;
    if (updateData.accountId !== undefined) updates.accountId = updateData.accountId;
    if (updateData.fromAccountId !== undefined) updates.fromAccountId = updateData.fromAccountId;
    if (updateData.toAccountId !== undefined) updates.toAccountId = updateData.toAccountId;
    if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;

    const updated = await recurringRepository.update(id, updates);

    logger.info(`Recurring template updated: ID ${id} for user: ${userId}`);

    return this.formatRecurring(updated, userCurrency);
  }

  /**
   * Delete recurring template
   */
  async deleteRecurring(userId, id) {
    const existing = await recurringRepository.findById(id, false);
    if (!existing || existing.userId.toString() !== userId.toString()) {
      throw new AppError('Recurring transaction template not found', 404);
    }

    await recurringRepository.delete(id);
    logger.info(`Recurring template deleted: ID ${id} for user: ${userId}`);
    return true;
  }

  /**
   * Execute single recurring template atomically
   * Creates a transaction, updates account balance(s), advances nextRunDate,
   * and deactivates if past endDate.
   */
  async executeTemplate(templateId, executionDate = new Date(), requestingUserId = null) {
    return runInTransaction(async (session) => {
      const template = await recurringRepository.findById(templateId, false);
      if (!template) {
        throw new AppError('Recurring transaction template not found', 404);
      }
      if (requestingUserId && template.userId.toString() !== requestingUserId.toString()) {
        throw new AppError('Recurring transaction template not found', 404);
      }
      if (!template.isActive) {
        throw new AppError('Cannot execute inactive recurring template', 400);
      }

      const userId = template.userId.toString();
      const amount = template.amount;

      // 1. Ledger Balance Updates
      if (template.type === TRANSACTION_TYPES.INCOME) {
        await accountRepository.adjustBalance(template.accountId, userId, amount, session);
      } else if (template.type === TRANSACTION_TYPES.EXPENSE) {
        await accountRepository.adjustBalance(template.accountId, userId, -amount, session);
      } else if (template.type === TRANSACTION_TYPES.TRANSFER) {
        await accountRepository.adjustBalance(template.fromAccountId, userId, -amount, session);
        await accountRepository.adjustBalance(template.toAccountId, userId, amount, session);
      }

      // 2. Create Transaction Document
      const transaction = await transactionRepository.create(
        {
          userId: template.userId,
          type: template.type,
          amount,
          currency: template.currency || 'INR',
          date: executionDate,
          description: template.title,
          note: `Generated from recurring template: ${template.title}`,
          categoryId: template.categoryId || null,
          accountId: template.accountId || null,
          fromAccountId: template.fromAccountId || null,
          toAccountId: template.toAccountId || null,
          recurringTransactionId: template._id,
          status: 'COMPLETED'
        },
        session
      );

      // 3. Advance nextRunDate and check endDate
      const nextRun = calculateNextRunDate(template.nextRunDate || executionDate, template.frequency);
      let isActive = true;
      if (template.endDate && (nextRun > template.endDate || executionDate >= template.endDate)) {
        isActive = false;
      }

      const updatedTemplate = await recurringRepository.update(
        template._id,
        {
          lastRunDate: executionDate,
          nextRunDate: nextRun,
          isActive
        },
        session
      );

      logger.info(
        `Executed recurring transaction "${template.title}" (Tx ID: ${transaction._id}). Next run: ${nextRun.toISOString()}`
      );

      return {
        transaction,
        recurring: this.formatRecurring(updatedTemplate, template.currency)
      };
    });
  }
}

export const recurringService = new RecurringService();
