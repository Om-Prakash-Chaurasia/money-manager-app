import mongoose from 'mongoose';
import {
  User,
  Account,
  Category,
  Transaction,
  Budget,
  CreditCard,
  CreditCardStatement,
  RecurringTransaction,
  TransactionAttachment
} from '../models/index.js';
import { generateCsv } from '../utils/csvHelper.js';
import { toMajorUnits, formatCurrency } from '../utils/currencyHelper.js';

class ExportService {
  /**
   * Export transactions as CSV or JSON
   */
  async exportTransactions(userId, options = {}, userCurrency = 'INR') {
    const { format = 'csv', startDate, endDate, type, accountId, categoryId } = options;

    const filter = {
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: { $ne: true }
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setUTCHours(0, 0, 0, 0);
        filter.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = e;
      }
    }

    if (type) {
      filter.type = type;
    }

    if (accountId) {
      const accObjId = new mongoose.Types.ObjectId(accountId);
      filter.$or = [
        { accountId: accObjId },
        { fromAccountId: accObjId },
        { toAccountId: accObjId }
      ];
    }

    if (categoryId) {
      filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const txs = await Transaction.find(filter)
      .populate('categoryId', 'name icon color')
      .populate('accountId', 'name type')
      .populate('fromAccountId', 'name type')
      .populate('toAccountId', 'name type')
      .sort({ date: -1 });

    if (format === 'csv') {
      const columns = [
        {
          key: 'date',
          label: 'Date',
          formatter: (tx) => (tx.date ? tx.date.toISOString().split('T')[0] : '')
        },
        {
          key: 'time',
          label: 'Time (UTC)',
          formatter: (tx) =>
            tx.date
              ? tx.date.toISOString().split('T')[1].replace('Z', '')
              : ''
        },
        { key: 'type', label: 'Type' },
        {
          key: 'amount',
          label: 'Amount',
          formatter: (tx) => toMajorUnits(tx.amount).toFixed(2)
        },
        {
          key: 'amountMinor',
          label: 'Amount (Minor Units)',
          formatter: (tx) => tx.amount
        },
        { key: 'currency', label: 'Currency' },
        { key: 'description', label: 'Description' },
        {
          key: 'category',
          label: 'Category',
          formatter: (tx) => (tx.categoryId ? tx.categoryId.name : 'Uncategorized')
        },
        {
          key: 'account',
          label: 'Account',
          formatter: (tx) => (tx.accountId ? tx.accountId.name : '')
        },
        {
          key: 'fromAccount',
          label: 'From Account (Transfer)',
          formatter: (tx) => (tx.fromAccountId ? tx.fromAccountId.name : '')
        },
        {
          key: 'toAccount',
          label: 'To Account (Transfer)',
          formatter: (tx) => (tx.toAccountId ? tx.toAccountId.name : '')
        },
        { key: 'status', label: 'Status' },
        {
          key: 'note',
          label: 'Note',
          formatter: (tx) => tx.note || ''
        }
      ];

      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `transactions_${new Date().toISOString().split('T')[0]}.csv`,
        data: generateCsv(txs, columns)
      };
    }

    // JSON format
    const formattedData = txs.map((tx) => ({
      id: tx._id,
      date: tx.date,
      type: tx.type,
      amount: tx.amount,
      amountMajor: toMajorUnits(tx.amount),
      formattedAmount: formatCurrency(tx.amount, tx.currency || userCurrency),
      currency: tx.currency,
      description: tx.description,
      note: tx.note || '',
      category: tx.categoryId
        ? { id: tx.categoryId._id, name: tx.categoryId.name, color: tx.categoryId.color, icon: tx.categoryId.icon }
        : null,
      account: tx.accountId
        ? { id: tx.accountId._id, name: tx.accountId.name, type: tx.accountId.type }
        : null,
      fromAccount: tx.fromAccountId
        ? { id: tx.fromAccountId._id, name: tx.fromAccountId.name, type: tx.fromAccountId.type }
        : null,
      toAccount: tx.toAccountId
        ? { id: tx.toAccountId._id, name: tx.toAccountId.name, type: tx.toAccountId.type }
        : null,
      status: tx.status,
      createdAt: tx.createdAt
    }));

    return {
      contentType: 'application/json',
      filename: `transactions_${new Date().toISOString().split('T')[0]}.json`,
      data: formattedData
    };
  }

  /**
   * Export accounts as CSV or JSON
   */
  async exportAccounts(userId, options = {}, userCurrency = 'INR') {
    const { format = 'csv' } = options;

    const accounts = await Account.find({
      userId,
      isDeleted: { $ne: true }
    }).sort({ name: 1 });

    if (format === 'csv') {
      const columns = [
        { key: 'name', label: 'Account Name' },
        { key: 'type', label: 'Type' },
        {
          key: 'subType',
          label: 'Sub-Type',
          formatter: (acc) => acc.subType || ''
        },
        { key: 'currency', label: 'Currency' },
        {
          key: 'balance',
          label: 'Current Balance',
          formatter: (acc) => toMajorUnits(acc.balance).toFixed(2)
        },
        {
          key: 'balanceMinor',
          label: 'Balance (Minor Units)',
          formatter: (acc) => acc.balance
        },
        {
          key: 'openingBalance',
          label: 'Opening Balance',
          formatter: (acc) => toMajorUnits(acc.openingBalance || 0).toFixed(2)
        },
        {
          key: 'isActive',
          label: 'Active',
          formatter: (acc) => (acc.isActive ? 'Yes' : 'No')
        },
        {
          key: 'createdAt',
          label: 'Created At',
          formatter: (acc) => (acc.createdAt ? acc.createdAt.toISOString() : '')
        }
      ];

      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `accounts_${new Date().toISOString().split('T')[0]}.csv`,
        data: generateCsv(accounts, columns)
      };
    }

    // JSON format
    const formattedData = accounts.map((acc) => ({
      id: acc._id,
      name: acc.name,
      type: acc.type,
      subType: acc.subType,
      currency: acc.currency,
      balance: acc.balance,
      balanceMajor: toMajorUnits(acc.balance),
      formattedBalance: formatCurrency(acc.balance, acc.currency || userCurrency),
      openingBalance: acc.openingBalance,
      openingBalanceMajor: toMajorUnits(acc.openingBalance || 0),
      color: acc.color,
      icon: acc.icon,
      isActive: acc.isActive,
      createdAt: acc.createdAt
    }));

    return {
      contentType: 'application/json',
      filename: `accounts_${new Date().toISOString().split('T')[0]}.json`,
      data: formattedData
    };
  }

  /**
   * Export comprehensive user financial backup (JSON)
   */
  async exportFullBackup(userId) {
    const [
      user,
      accounts,
      categories,
      transactions,
      budgets,
      creditCards,
      creditCardStatements,
      recurringTransactions,
      attachments
    ] = await Promise.all([
      User.findById(userId).select('-passwordHash'),
      Account.find({ userId, isDeleted: { $ne: true } }),
      Category.find({ userId, isDeleted: { $ne: true } }),
      Transaction.find({ userId, isDeleted: { $ne: true } }),
      Budget.find({ userId }),
      CreditCard.find({ userId, isDeleted: { $ne: true } }),
      CreditCardStatement.find({ userId }),
      RecurringTransaction.find({ userId }),
      TransactionAttachment.find({ userId })
    ]);

    const backupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        timezone: user.timezone,
        dateFormat: user.dateFormat
      },
      counts: {
        accounts: accounts.length,
        categories: categories.length,
        transactions: transactions.length,
        budgets: budgets.length,
        creditCards: creditCards.length,
        statements: creditCardStatements.length,
        recurringTransactions: recurringTransactions.length,
        attachments: attachments.length
      },
      data: {
        accounts,
        categories,
        transactions,
        budgets,
        creditCards,
        creditCardStatements,
        recurringTransactions,
        attachments
      }
    };

    return {
      contentType: 'application/json',
      filename: `money_manager_backup_${new Date().toISOString().split('T')[0]}.json`,
      data: backupPayload
    };
  }
}

export const exportService = new ExportService();
