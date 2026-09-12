import { accountRepository } from '../repositories/accountRepository.js';
import { transactionRepository } from '../repositories/transactionRepository.js';
import { runInTransaction } from '../utils/transactionRunner.js';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/currencyHelper.js';
import { TRANSACTION_TYPES } from '../constants/transactionTypes.js';
import { ACCOUNT_TYPES } from '../constants/accountTypes.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

export const transferService = {
  /**
   * Execute an atomic transfer between two accounts belonging to the user
   */
  async executeTransfer(userId, data) {
    const { fromAccountId, toAccountId, amount, date, description, note } = data;

    if (fromAccountId === toAccountId) {
      throw new AppError('Source and destination accounts cannot be identical', 400);
    }

    const amountMinorUnits = toMinorUnits(amount);

    // 1. Validate both accounts and ownership
    const [fromAccount, toAccount] = await Promise.all([
      accountRepository.findByIdAndUserId(fromAccountId, userId),
      accountRepository.findByIdAndUserId(toAccountId, userId)
    ]);

    if (!fromAccount || !fromAccount.isActive) {
      throw new AppError('Source account not found or inactive', 404);
    }

    if (!toAccount || !toAccount.isActive) {
      throw new AppError('Destination account not found or inactive', 404);
    }

    // 2. Balance check (for bank, cash, and other asset accounts)
    if (fromAccount.type !== ACCOUNT_TYPES.CREDIT_CARD) {
      if (fromAccount.balance < amountMinorUnits) {
        throw new AppError(
          `Insufficient account balance. Available: ${formatCurrency(fromAccount.balance, fromAccount.currency)}, Required: ${formatCurrency(amountMinorUnits, fromAccount.currency)}`,
          400
        );
      }
    }

    const transferDescription =
      description || `Transfer from ${fromAccount.name} to ${toAccount.name}`;

    // 3. Execute atomic balance updates and transaction creation inside transaction session
    const createdTx = await runInTransaction(async (session) => {
      // Deduct from source
      await accountRepository.adjustBalance(fromAccountId, userId, -amountMinorUnits, session);

      // Add to destination
      await accountRepository.adjustBalance(toAccountId, userId, +amountMinorUnits, session);

      // Create ledger record (TRANSFER type)
      const tx = await transactionRepository.create(
        {
          userId,
          type: TRANSACTION_TYPES.TRANSFER,
          amount: amountMinorUnits,
          currency: fromAccount.currency,
          date: date ? new Date(date) : new Date(),
          description: transferDescription,
          note: note || '',
          fromAccountId: fromAccount._id,
          toAccountId: toAccount._id,
          categoryId: null, // Transfers do not require categoryId
          status: 'COMPLETED',
          isDeleted: false
        },
        session
      );

      return tx;
    });

    logger.info(
      `Transfer completed: ${formatCurrency(amountMinorUnits)} from "${fromAccount.name}" to "${toAccount.name}" (User: ${userId})`
    );

    // Fetch fresh balances
    const [updatedFrom, updatedTo, populatedTx] = await Promise.all([
      accountRepository.findByIdAndUserId(fromAccountId, userId),
      accountRepository.findByIdAndUserId(toAccountId, userId),
      transactionRepository.findByIdAndUserId(createdTx._id, userId)
    ]);

    return {
      transfer: {
        ...populatedTx.toJSON(),
        formattedAmount: formatCurrency(populatedTx.amount, populatedTx.currency),
        majorAmount: toMajorUnits(populatedTx.amount)
      },
      sourceAccount: {
        id: updatedFrom._id,
        name: updatedFrom.name,
        newBalance: updatedFrom.balance,
        formattedBalance: formatCurrency(updatedFrom.balance, updatedFrom.currency)
      },
      destinationAccount: {
        id: updatedTo._id,
        name: updatedTo.name,
        newBalance: updatedTo.balance,
        formattedBalance: formatCurrency(updatedTo.balance, updatedTo.currency)
      }
    };
  },

  /**
   * Retrieve paginated transfers for user
   */
  async getTransfers(userId, query = {}) {
    const { accountId, startDate, endDate, page = 1, limit = 20 } = query;

    const filter = {
      type: TRANSACTION_TYPES.TRANSFER
    };

    if (accountId) {
      filter.$or = [{ fromAccountId: accountId }, { toAccountId: accountId }];
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const sort = { date: -1 };
    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      transactionRepository.findWithFilters(userId, { filter, sort, skip, limit }),
      transactionRepository.count(userId, filter)
    ]);

    return {
      transfers: transfers.map((t) => ({
        ...t.toJSON(),
        formattedAmount: formatCurrency(t.amount, t.currency),
        majorAmount: toMajorUnits(t.amount)
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Retrieve single transfer by ID
   */
  async getTransferById(userId, transferId) {
    const transfer = await transactionRepository.findByIdAndUserId(transferId, userId);
    if (!transfer || transfer.type !== TRANSACTION_TYPES.TRANSFER) {
      throw new AppError('Transfer transaction not found', 404);
    }

    return {
      ...transfer.toJSON(),
      formattedAmount: formatCurrency(transfer.amount, transfer.currency),
      majorAmount: toMajorUnits(transfer.amount)
    };
  }
};
