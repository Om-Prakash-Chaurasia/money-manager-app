import mongoose from 'mongoose';
import { Budget } from '../models/Budget.js';
import { Transaction } from '../models/Transaction.js';

class BudgetRepository {
  /**
   * Create a new budget document
   */
  async create(budgetData, session = null) {
    const options = session ? { session } : {};
    const [budget] = await Budget.create([budgetData], options);
    return budget;
  }

  /**
   * Find budget by primary ID
   */
  async findById(id, populateCategory = true) {
    let query = Budget.findById(id);
    if (populateCategory) {
      query = query.populate('categoryId', 'name icon color type parentId isDefault');
    }
    return query.exec();
  }

  /**
   * Find a single budget matching criteria
   */
  async findOne(filter, populateCategory = true) {
    let query = Budget.findOne(filter);
    if (populateCategory) {
      query = query.populate('categoryId', 'name icon color type parentId isDefault');
    }
    return query.exec();
  }

  /**
   * Find multiple budgets matching query with pagination and population
   */
  async find(filter = {}, options = {}) {
    const { page = 1, limit = 50, sort = { month: -1, createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Budget.find(filter)
        .populate('categoryId', 'name icon color type parentId isDefault')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      Budget.countDocuments(filter).exec()
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update budget by ID
   */
  async update(id, updateData, session = null) {
    const options = { new: true, runValidators: true, ...(session && { session }) };
    return Budget.findByIdAndUpdate(id, updateData, options)
      .populate('categoryId', 'name icon color type parentId isDefault')
      .exec();
  }

  /**
   * Delete budget by ID
   */
  async delete(id, session = null) {
    const options = session ? { session } : {};
    return Budget.findByIdAndDelete(id, options).exec();
  }

  /**
   * Aggregate total expenses for a set of category IDs within a date range
   * Returns sum of amounts in minor units
   */
  async aggregateCategoryExpenses(userId, categoryIds, startDate, endDate) {
    if (!categoryIds || categoryIds.length === 0) return 0;

    const objectCategoryIds = categoryIds.map((id) =>
      typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
    );

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'EXPENSE',
          status: 'COMPLETED',
          isDeleted: { $ne: true },
          categoryId: { $in: objectCategoryIds },
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    return result[0]?.totalSpent || 0;
  }

  /**
   * Aggregate all completed expenses grouped by category for a user within a date range
   */
  async aggregateAllCategoryExpensesForMonth(userId, startDate, endDate) {
    const results = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'EXPENSE',
          status: 'COMPLETED',
          isDeleted: { $ne: true },
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$categoryId',
          totalSpent: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Map by categoryId string (null key for transactions without category)
    const expenseMap = new Map();
    let grandTotalSpent = 0;

    for (const item of results) {
      const key = item._id ? item._id.toString() : 'uncategorized';
      expenseMap.set(key, item.totalSpent);
      grandTotalSpent += item.totalSpent;
    }

    return { expenseMap, grandTotalSpent };
  }
}

export const budgetRepository = new BudgetRepository();
