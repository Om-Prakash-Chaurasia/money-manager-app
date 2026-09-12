import { accountRepository } from '../repositories/accountRepository.js';
import { Transaction } from '../models/Transaction.js';
import { AccountBalance } from '../models/AccountBalance.js';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/currencyHelper.js';
import { ACCOUNT_TYPES } from '../constants/accountTypes.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

export const accountService = {
  /**
   * Create a new financial account
   */
  async createAccount(userId, data) {
    const { name, type, subType, currency = 'INR', openingBalance = 0, openingBalanceDate, color, icon } = data;

    // Check for duplicate account name for this user (case-insensitive)
    const existing = await accountRepository.findWithFilters(userId, {
      filter: { name: { $regex: `^${name.trim()}$`, $options: 'i' }, isActive: true }
    });
    if (existing && existing.length > 0) {
      throw new AppError(`An active account named "${name}" already exists`, 409);
    }

    // Convert opening balance to integer minor units (paise/cents)
    const openingBalanceMinorUnits = toMinorUnits(openingBalance);

    const account = await accountRepository.create({
      userId,
      name: name.trim(),
      type,
      subType: subType || (type === ACCOUNT_TYPES.BANK ? 'SAVINGS' : 'WALLET'),
      currency,
      balance: openingBalanceMinorUnits, // Initial balance equals opening balance
      openingBalance: openingBalanceMinorUnits,
      openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : new Date(),
      color: color || '#3B82F6',
      icon: icon || 'landmark',
      isActive: true
    });

    logger.info(`Account created: "${account.name}" (${account.type}) for user: ${userId}`);

    return {
      ...account.toJSON(),
      formattedBalance: formatCurrency(account.balance, account.currency),
      majorBalance: toMajorUnits(account.balance)
    };
  },

  /**
   * Get all accounts with filters, pagination, and net-worth summary
   */
  async getAccounts(userId, query) {
    const { type, isActive = true, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      accountRepository.findWithFilters(userId, { filter, sort, skip, limit }),
      accountRepository.count(userId, filter)
    ]);

    // Calculate aggregated assets and liabilities across active accounts
    const allActiveAccounts = await accountRepository.findWithFilters(userId, { filter: { isActive: true }, limit: 1000 });
    
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const acc of allActiveAccounts) {
      if (acc.type === ACCOUNT_TYPES.CREDIT_CARD) {
        // Outstanding balance on credit card is a liability
        if (acc.balance < 0) {
          totalLiabilities += Math.abs(acc.balance);
        } else {
          totalLiabilities += acc.balance; // depending on whether card balance is stored positive or negative
        }
      } else {
        if (acc.balance >= 0) {
          totalAssets += acc.balance;
        } else {
          totalLiabilities += Math.abs(acc.balance); // Overdrafts
        }
      }
    }

    const netWorth = totalAssets - totalLiabilities;

    const formattedAccounts = accounts.map((acc) => ({
      ...acc.toJSON(),
      formattedBalance: formatCurrency(acc.balance, acc.currency),
      majorBalance: toMajorUnits(acc.balance)
    }));

    return {
      accounts: formattedAccounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        totalAssets,
        totalLiabilities,
        netWorth,
        formattedTotalAssets: formatCurrency(totalAssets, 'INR'),
        formattedTotalLiabilities: formatCurrency(totalLiabilities, 'INR'),
        formattedNetWorth: formatCurrency(netWorth, 'INR')
      }
    };
  },

  /**
   * Get account details by ID
   */
  async getAccountById(userId, accountId) {
    const account = await accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new AppError('Account not found', 404);
    }

    return {
      ...account.toJSON(),
      formattedBalance: formatCurrency(account.balance, account.currency),
      majorBalance: toMajorUnits(account.balance)
    };
  },

  /**
   * Update account metadata (name, color, icon, subType)
   * Client is NEVER allowed to update balance directly.
   */
  async updateAccount(userId, accountId, updateData) {
    const account = await accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new AppError('Account not found', 404);
    }

    // Protect immutable financial fields
    delete updateData.balance;
    delete updateData.openingBalance;
    delete updateData.userId;
    delete updateData.currency;

    const updated = await accountRepository.update(accountId, userId, updateData);

    logger.info(`Account updated: "${updated.name}" (${updated._id})`);

    return {
      ...updated.toJSON(),
      formattedBalance: formatCurrency(updated.balance, updated.currency),
      majorBalance: toMajorUnits(updated.balance)
    };
  },

  /**
   * Soft delete account (marks isActive = false)
   */
  async deleteAccount(userId, accountId) {
    const account = await accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new AppError('Account not found', 404);
    }

    // Check if account has any non-deleted transactions
    const transactionCount = await Transaction.countDocuments({
      userId,
      isDeleted: false,
      $or: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }]
    });

    if (transactionCount > 0) {
      // Soft-delete: retain historical records
      await accountRepository.softDelete(accountId, userId);
      logger.info(`Account soft-deleted/deactivated: ${accountId} (has ${transactionCount} historical transactions)`);
      return {
        message: `Account deactivated successfully. Historical records preserved (${transactionCount} transactions retained).`,
        account: { id: account._id, isActive: false }
      };
    }

    // If no transactions exist, soft-delete as well for audit safety
    await accountRepository.softDelete(accountId, userId);
    return {
      message: 'Account deactivated successfully.',
      account: { id: account._id, isActive: false }
    };
  },

  /**
   * Get balance for a specific account
   */
  async getAccountBalance(userId, accountId) {
    const account = await accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new AppError('Account not found', 404);
    }

    return {
      accountId: account._id,
      name: account.name,
      currency: account.currency,
      balance: account.balance,
      majorBalance: toMajorUnits(account.balance),
      formattedBalance: formatCurrency(account.balance, account.currency)
    };
  },

  /**
   * Get historical balance snapshots for an account
   */
  async getAccountBalanceHistory(userId, accountId) {
    const account = await accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new AppError('Account not found', 404);
    }

    const history = await AccountBalance.find({ accountId, userId })
      .sort({ date: -1 })
      .limit(60)
      .exec();

    return {
      accountId: account._id,
      name: account.name,
      history: history.map((h) => ({
        id: h._id,
        date: h.date,
        balance: h.balance,
        majorBalance: toMajorUnits(h.balance),
        formattedBalance: formatCurrency(h.balance, account.currency)
      }))
    };
  },

  /**
   * Get transactions associated with an account
   */
  async getAccountTransactions(userId, accountId, query = {}) {
    const account = await accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new AppError('Account not found', 404);
    }

    const { page = 1, limit = 20 } = query;
    const filter = {
      userId,
      isDeleted: false,
      $or: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }]
    };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('categoryId', 'name icon color')
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Transaction.countDocuments(filter)
    ]);

    return {
      account: {
        id: account._id,
        name: account.name,
        currency: account.currency,
        balance: account.balance,
        formattedBalance: formatCurrency(account.balance, account.currency)
      },
      transactions: transactions.map((t) => ({
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
  }
};
