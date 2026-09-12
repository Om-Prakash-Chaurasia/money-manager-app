import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';

export const transactionRepository = {
  /**
   * Create a new transaction
   * @param {object} transactionData
   * @param {mongoose.ClientSession} [session]
   */
  async create(transactionData, session = null) {
    const [tx] = await Transaction.create(
      [transactionData],
      session ? { session } : {}
    );
    return tx;
  },

  /**
   * Find transaction by ID and User ID with populated relations
   * @param {string} id
   * @param {string} userId
   * @param {mongoose.ClientSession} [session]
   */
  async findByIdAndUserId(id, userId, session = null) {
    let query = Transaction.findOne({ _id: id, userId, isDeleted: false });
    if (session) {
      query = query.session(session);
    }
    return query
      .populate('accountId', 'name type color icon currency')
      .populate('fromAccountId', 'name type color icon currency')
      .populate('toAccountId', 'name type color icon currency')
      .populate('categoryId', 'name type icon color parentId')
      .exec();
  },

  /**
   * Find transactions with filters, pagination, and sorting
   * @param {string} userId
   * @param {object} options
   */
  async findWithFilters(userId, { filter = {}, sort = { date: -1 }, skip = 0, limit = 20 } = {}) {
    const query = { userId, isDeleted: false, ...filter };
    return Transaction.find(query)
      .populate('accountId', 'name type color icon currency')
      .populate('fromAccountId', 'name type color icon currency')
      .populate('toAccountId', 'name type color icon currency')
      .populate('categoryId', 'name type icon color parentId')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  },

  /**
   * Count transactions matching filters
   * @param {string} userId
   * @param {object} filter
   */
  async count(userId, filter = {}) {
    const query = { userId, isDeleted: false, ...filter };
    return Transaction.countDocuments(query).exec();
  },

  /**
   * Update transaction
   * @param {string} id
   * @param {string} userId
   * @param {object} updateData
   * @param {mongoose.ClientSession} [session]
   */
  async update(id, userId, updateData, session = null) {
    let query = Transaction.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (session) {
      query = query.session(session);
    }
    return query
      .populate('accountId', 'name type color icon currency')
      .populate('fromAccountId', 'name type color icon currency')
      .populate('toAccountId', 'name type color icon currency')
      .populate('categoryId', 'name type icon color parentId')
      .exec();
  },

  /**
   * Soft delete transaction (sets isDeleted = true)
   * @param {string} id
   * @param {string} userId
   * @param {mongoose.ClientSession} [session]
   */
  async softDelete(id, userId, session = null) {
    let query = Transaction.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  },

  /**
   * Aggregate totals for matching transactions (excluding transfers from income/expense)
   * @param {string} userId
   * @param {object} matchFilter
   */
  async aggregateTotals(userId, matchFilter = {}) {
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const match = {
      userId: userObjectId,
      isDeleted: false,
      status: 'COMPLETED',
      ...matchFilter
    };

    const results = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;

    for (const item of results) {
      if (item._id === 'INCOME') totalIncome = item.totalAmount;
      if (item._id === 'EXPENSE') totalExpense = item.totalAmount;
      if (item._id === 'TRANSFER') totalTransfer = item.totalAmount;
    }

    return {
      totalIncome,
      totalExpense,
      totalTransfer,
      netSavings: totalIncome - totalExpense
    };
  }
};
