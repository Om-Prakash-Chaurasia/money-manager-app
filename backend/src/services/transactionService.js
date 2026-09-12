import { transactionRepository } from '../repositories/transactionRepository.js';
import { accountRepository } from '../repositories/accountRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { runInTransaction } from '../utils/transactionRunner.js';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/currencyHelper.js';
import { TRANSACTION_TYPES } from '../constants/transactionTypes.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

export const transactionService = {
  /**
   * Create transaction and atomically update account balance
   */
  async createTransaction(userId, data) {
    const {
      type,
      amount,
      currency = 'INR',
      date,
      description,
      note,
      categoryId,
      accountId,
      fromAccountId,
      toAccountId,
      status = 'COMPLETED'
    } = data;

    const amountMinorUnits = toMinorUnits(amount);

    // Validate relationships based on flow type
    let verifiedAccount = null;
    let verifiedFromAccount = null;
    let verifiedToAccount = null;
    let verifiedCategory = null;

    if (type === TRANSACTION_TYPES.INCOME || type === TRANSACTION_TYPES.EXPENSE) {
      verifiedAccount = await accountRepository.findByIdAndUserId(accountId, userId);
      if (!verifiedAccount || !verifiedAccount.isActive) {
        throw new AppError('Account not found or inactive', 404);
      }

      verifiedCategory = await categoryRepository.findByIdAndUserId(categoryId, userId);
      if (!verifiedCategory || !verifiedCategory.isActive) {
        throw new AppError('Category not found or inactive', 404);
      }

      if (verifiedCategory.type !== type) {
        throw new AppError(
          `Category type (${verifiedCategory.type}) does not match transaction type (${type})`,
          400
        );
      }
    } else if (type === TRANSACTION_TYPES.TRANSFER) {
      if (fromAccountId === toAccountId) {
        throw new AppError('Source and destination accounts cannot be the same', 400);
      }

      verifiedFromAccount = await accountRepository.findByIdAndUserId(fromAccountId, userId);
      if (!verifiedFromAccount || !verifiedFromAccount.isActive) {
        throw new AppError('Source account not found or inactive', 404);
      }

      verifiedToAccount = await accountRepository.findByIdAndUserId(toAccountId, userId);
      if (!verifiedToAccount || !verifiedToAccount.isActive) {
        throw new AppError('Destination account not found or inactive', 404);
      }
    }

    // Execute atomic balance adjustments and transaction creation
    const createdTransaction = await runInTransaction(async (session) => {
      // 1. Balance adjustments
      if (status === 'COMPLETED') {
        if (type === TRANSACTION_TYPES.INCOME) {
          await accountRepository.adjustBalance(accountId, userId, +amountMinorUnits, session);
        } else if (type === TRANSACTION_TYPES.EXPENSE) {
          await accountRepository.adjustBalance(accountId, userId, -amountMinorUnits, session);
        } else if (type === TRANSACTION_TYPES.TRANSFER) {
          await accountRepository.adjustBalance(fromAccountId, userId, -amountMinorUnits, session);
          await accountRepository.adjustBalance(toAccountId, userId, +amountMinorUnits, session);
        }
      }

      // 2. Persist transaction record
      const tx = await transactionRepository.create(
        {
          userId,
          type,
          amount: amountMinorUnits,
          currency: verifiedAccount ? verifiedAccount.currency : currency,
          date: new Date(date),
          description: description.trim(),
          note: note ? note.trim() : '',
          categoryId: verifiedCategory ? verifiedCategory._id : null,
          accountId: verifiedAccount ? verifiedAccount._id : null,
          fromAccountId: verifiedFromAccount ? verifiedFromAccount._id : null,
          toAccountId: verifiedToAccount ? verifiedToAccount._id : null,
          status,
          isDeleted: false
        },
        session
      );

      return tx;
    });

    logger.info(`Transaction created: [${type}] ${formatCurrency(amountMinorUnits)} for user: ${userId}`);

    // Populate relations for response
    return transactionRepository.findByIdAndUserId(createdTransaction._id, userId);
  },

  /**
   * Get transactions with filtering, date range, pagination, and financial totals
   */
  async getTransactions(userId, query = {}) {
    const {
      type,
      accountId,
      categoryId,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = query;

    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (categoryId) filter.categoryId = categoryId;

    if (accountId) {
      filter.$or = [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }];
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.amount = {};
      if (minAmount !== undefined) filter.amount.$gte = toMinorUnits(minAmount);
      if (maxAmount !== undefined) filter.amount.$lte = toMinorUnits(maxAmount);
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [transactions, total, summary] = await Promise.all([
      transactionRepository.findWithFilters(userId, { filter, sort, skip, limit }),
      transactionRepository.count(userId, filter),
      transactionRepository.aggregateTotals(userId, filter)
    ]);

    const formattedTransactions = transactions.map((t) => ({
      ...t.toJSON(),
      formattedAmount: formatCurrency(t.amount, t.currency),
      majorAmount: toMajorUnits(t.amount)
    }));

    return {
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        ...summary,
        formattedIncome: formatCurrency(summary.totalIncome),
        formattedExpense: formatCurrency(summary.totalExpense),
        formattedTransfer: formatCurrency(summary.totalTransfer),
        formattedNetSavings: formatCurrency(summary.netSavings)
      }
    };
  },

  /**
   * Get single transaction by ID
   */
  async getTransactionById(userId, transactionId) {
    const transaction = await transactionRepository.findByIdAndUserId(transactionId, userId);
    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    return {
      ...transaction.toJSON(),
      formattedAmount: formatCurrency(transaction.amount, transaction.currency),
      majorAmount: toMajorUnits(transaction.amount)
    };
  },

  /**
   * Update transaction with atomic two-phase balance reversal and re-application
   */
  async updateTransaction(userId, transactionId, updateData) {
    const existing = await transactionRepository.findByIdAndUserId(transactionId, userId);
    if (!existing) {
      throw new AppError('Transaction not found', 404);
    }

    // Determine target values
    const newAmount = updateData.amount !== undefined ? toMinorUnits(updateData.amount) : existing.amount;
    const newAccountId = updateData.accountId !== undefined ? updateData.accountId : existing.accountId?._id?.toString();
    const newFromAccountId = updateData.fromAccountId !== undefined ? updateData.fromAccountId : existing.fromAccountId?._id?.toString();
    const newToAccountId = updateData.toAccountId !== undefined ? updateData.toAccountId : existing.toAccountId?._id?.toString();
    const newCategoryId = updateData.categoryId !== undefined ? updateData.categoryId : existing.categoryId?._id?.toString();
    const newStatus = updateData.status !== undefined ? updateData.status : existing.status;

    // Validate relationships if changed
    if (existing.type === TRANSACTION_TYPES.INCOME || existing.type === TRANSACTION_TYPES.EXPENSE) {
      if (newAccountId) {
        const acc = await accountRepository.findByIdAndUserId(newAccountId, userId);
        if (!acc || !acc.isActive) throw new AppError('Target account not found or inactive', 404);
      }
      if (newCategoryId) {
        const cat = await categoryRepository.findByIdAndUserId(newCategoryId, userId);
        if (!cat || !cat.isActive) throw new AppError('Target category not found or inactive', 404);
        if (cat.type !== existing.type) throw new AppError('Category type does not match transaction type', 400);
      }
    } else if (existing.type === TRANSACTION_TYPES.TRANSFER) {
      if (newFromAccountId && newToAccountId && newFromAccountId === newToAccountId) {
        throw new AppError('Source and destination accounts cannot be the same', 400);
      }
    }

    // Atomic Two-Phase Reversal and Application
    const updated = await runInTransaction(async (session) => {
      // ----------------------------------------------------
      // PHASE 1: Reverse Old Financial Effect
      // ----------------------------------------------------
      if (existing.status === 'COMPLETED') {
        const oldAccId = existing.accountId?._id || existing.accountId;
        const oldFromId = existing.fromAccountId?._id || existing.fromAccountId;
        const oldToId = existing.toAccountId?._id || existing.toAccountId;

        if (existing.type === TRANSACTION_TYPES.INCOME) {
          await accountRepository.adjustBalance(oldAccId, userId, -existing.amount, session);
        } else if (existing.type === TRANSACTION_TYPES.EXPENSE) {
          await accountRepository.adjustBalance(oldAccId, userId, +existing.amount, session);
        } else if (existing.type === TRANSACTION_TYPES.TRANSFER) {
          await accountRepository.adjustBalance(oldFromId, userId, +existing.amount, session);
          await accountRepository.adjustBalance(oldToId, userId, -existing.amount, session);
        }
      }

      // ----------------------------------------------------
      // PHASE 2: Apply New Financial Effect
      // ----------------------------------------------------
      if (newStatus === 'COMPLETED') {
        if (existing.type === TRANSACTION_TYPES.INCOME) {
          await accountRepository.adjustBalance(newAccountId, userId, +newAmount, session);
        } else if (existing.type === TRANSACTION_TYPES.EXPENSE) {
          await accountRepository.adjustBalance(newAccountId, userId, -newAmount, session);
        } else if (existing.type === TRANSACTION_TYPES.TRANSFER) {
          await accountRepository.adjustBalance(newFromAccountId, userId, -newAmount, session);
          await accountRepository.adjustBalance(newToAccountId, userId, +newAmount, session);
        }
      }

      // ----------------------------------------------------
      // PHASE 3: Update Document
      // ----------------------------------------------------
      const payload = { ...updateData };
      if (updateData.amount !== undefined) payload.amount = newAmount;
      if (updateData.date) payload.date = new Date(updateData.date);
      if (updateData.description) payload.description = updateData.description.trim();
      if (updateData.note !== undefined) payload.note = updateData.note.trim();

      const tx = await transactionRepository.update(transactionId, userId, payload, session);
      return tx;
    });

    logger.info(`Transaction updated: ${transactionId} (Old: ${existing.amount} -> New: ${newAmount})`);

    return transactionRepository.findByIdAndUserId(updated._id, userId);
  },

  /**
   * Soft-delete transaction and reverse financial impact on account balances
   */
  async deleteTransaction(userId, transactionId) {
    const existing = await transactionRepository.findByIdAndUserId(transactionId, userId);
    if (!existing) {
      throw new AppError('Transaction not found', 404);
    }

    await runInTransaction(async (session) => {
      // Reverse balance if transaction was completed
      if (existing.status === 'COMPLETED') {
        const accId = existing.accountId?._id || existing.accountId;
        const fromId = existing.fromAccountId?._id || existing.fromAccountId;
        const toId = existing.toAccountId?._id || existing.toAccountId;

        if (existing.type === TRANSACTION_TYPES.INCOME) {
          await accountRepository.adjustBalance(accId, userId, -existing.amount, session);
        } else if (existing.type === TRANSACTION_TYPES.EXPENSE) {
          await accountRepository.adjustBalance(accId, userId, +existing.amount, session);
        } else if (existing.type === TRANSACTION_TYPES.TRANSFER) {
          await accountRepository.adjustBalance(fromId, userId, +existing.amount, session);
          await accountRepository.adjustBalance(toId, userId, -existing.amount, session);
        }
      }

      // Soft delete transaction
      await transactionRepository.softDelete(transactionId, userId, session);
    });

    logger.info(`Transaction deleted: ${transactionId}, financial impact reversed`);

    return {
      message: 'Transaction deleted and account balance reversed successfully',
      transactionId
    };
  }
};
