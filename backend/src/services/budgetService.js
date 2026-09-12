import { budgetRepository } from '../repositories/budgetRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { Category } from '../models/Category.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/currencyHelper.js';

class BudgetService {
  /**
   * Parse 'YYYY-MM' string into UTC start and end Date objects
   */
  getMonthDateRange(monthString) {
    const [yearStr, monthStr] = monthString.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    // Day 0 of next month is the last day of current month
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    return { startDate, endDate };
  }

  /**
   * Get current month in 'YYYY-MM' format
   */
  getCurrentMonth() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Retrieve category and all active subcategory IDs for rollup calculation
   */
  async getCategoryWithSubcategories(userId, categoryId) {
    const category = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category || !category.isActive) {
      throw new AppError('Category not found or inactive', 404);
    }

    if (category.type !== 'EXPENSE') {
      throw new AppError('Budgets can only be assigned to EXPENSE categories', 400);
    }

    // Find any direct subcategories under this parent
    const subcategories = await Category.find({
      userId,
      parentId: category._id,
      isActive: true
    }).select('_id name');

    const allCategoryIds = [category._id, ...subcategories.map((s) => s._id)];

    return { category, allCategoryIds };
  }

  /**
   * Calculate remaining amount, percentage used, and budget health status
   */
  calculateStatus(amount, spent) {
    const remaining = Math.max(0, amount - spent);
    const percentageUsed =
      amount > 0 ? Number(((spent / amount) * 100).toFixed(2)) : 0;

    let status = 'HEALTHY';
    if (percentageUsed > 100) {
      status = 'EXCEEDED';
    } else if (percentageUsed >= 80) {
      status = 'WARNING';
    }

    return { remaining, percentageUsed, status };
  }

  /**
   * Format budget object for user response
   */
  formatBudget(budget, spentMinorUnits, userCurrency = 'INR') {
    const amountMinor = budget.amount;
    const spentMinor = spentMinorUnits !== undefined ? spentMinorUnits : (budget.spent || 0);
    const { remaining, percentageUsed, status } = this.calculateStatus(amountMinor, spentMinor);

    const categoryObj = budget.categoryId && typeof budget.categoryId === 'object'
      ? {
          id: budget.categoryId._id || budget.categoryId.id,
          name: budget.categoryId.name,
          icon: budget.categoryId.icon,
          color: budget.categoryId.color,
          type: budget.categoryId.type,
          parentId: budget.categoryId.parentId
        }
      : null;

    return {
      id: budget._id.toString(),
      userId: budget.userId.toString(),
      categoryId: categoryObj ? categoryObj.id : budget.categoryId.toString(),
      category: categoryObj,
      month: budget.month,
      amount: toMajorUnits(amountMinor),
      amountMinor,
      amountFormatted: formatCurrency(amountMinor, userCurrency),
      spent: toMajorUnits(spentMinor),
      spentMinor,
      spentFormatted: formatCurrency(spentMinor, userCurrency),
      remaining: toMajorUnits(remaining),
      remainingMinor: remaining,
      remainingFormatted: formatCurrency(remaining, userCurrency),
      percentageUsed,
      status,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt
    };
  }

  /**
   * Create a monthly category budget
   */
  async createBudget(userId, data, userCurrency = 'INR') {
    const { categoryId, month, amount } = data;

    // 1. Verify category exists, is owned by user, and is an EXPENSE category
    const { category, allCategoryIds } = await this.getCategoryWithSubcategories(userId, categoryId);

    // 2. Check compound uniqueness { userId, categoryId, month }
    const existing = await budgetRepository.findOne({ userId, categoryId, month }, false);
    if (existing) {
      throw new AppError(
        `A budget for "${category.name}" in ${month} already exists. Please update the existing budget instead.`,
        409
      );
    }

    // 3. Convert major units amount to minor units
    const amountMinor = toMinorUnits(amount);

    // 4. Calculate current spent dynamically
    const { startDate, endDate } = this.getMonthDateRange(month);
    const spentMinor = await budgetRepository.aggregateCategoryExpenses(
      userId,
      allCategoryIds,
      startDate,
      endDate
    );

    // 5. Create budget document
    const budget = await budgetRepository.create({
      userId,
      categoryId,
      month,
      amount: amountMinor,
      spent: spentMinor
    });

    const populated = await budgetRepository.findById(budget._id);

    logger.info(
      `Budget created: "${category.name}" (${month}) - ₹${amount} (spent: ₹${toMajorUnits(spentMinor)}) for user: ${userId}`
    );

    return this.formatBudget(populated, spentMinor, userCurrency);
  }

  /**
   * Get all budgets for a user with optional month and category filtering
   */
  async getBudgets(userId, query = {}, userCurrency = 'INR') {
    const month = query.month || this.getCurrentMonth();
    const filter = { userId, month };

    if (query.categoryId) {
      filter.categoryId = query.categoryId;
    }

    const { data: budgets, total, page, limit, totalPages } = await budgetRepository.find(filter, {
      page: query.page || 1,
      limit: query.limit || 50,
      sort: { createdAt: 1 }
    });

    // Date range for this month
    const { startDate, endDate } = this.getMonthDateRange(month);

    // Find all subcategories for each budget category to rollup subcategory expenses accurately
    const formattedBudgets = await Promise.all(
      budgets.map(async (b) => {
        const catId = b.categoryId?._id || b.categoryId;
        const subcategories = await Category.find({
          userId,
          parentId: catId,
          isActive: true
        }).select('_id');

        const rollupIds = [catId, ...subcategories.map((s) => s._id)];
        const spentMinor = await budgetRepository.aggregateCategoryExpenses(
          userId,
          rollupIds,
          startDate,
          endDate
        );

        return this.formatBudget(b, spentMinor, userCurrency);
      })
    );

    // Calculate overall month summary
    const totalBudgetedMinor = formattedBudgets.reduce((sum, b) => sum + b.amountMinor, 0);
    const totalSpentMinor = formattedBudgets.reduce((sum, b) => sum + b.spentMinor, 0);
    const totalRemainingMinor = Math.max(0, totalBudgetedMinor - totalSpentMinor);
    const overallPercentage =
      totalBudgetedMinor > 0
        ? Number(((totalSpentMinor / totalBudgetedMinor) * 100).toFixed(2))
        : 0;

    const healthCounts = {
      healthy: formattedBudgets.filter((b) => b.status === 'HEALTHY').length,
      warning: formattedBudgets.filter((b) => b.status === 'WARNING').length,
      exceeded: formattedBudgets.filter((b) => b.status === 'EXCEEDED').length
    };

    const summary = {
      month,
      totalBudgeted: toMajorUnits(totalBudgetedMinor),
      totalBudgetedFormatted: formatCurrency(totalBudgetedMinor, userCurrency),
      totalSpent: toMajorUnits(totalSpentMinor),
      totalSpentFormatted: formatCurrency(totalSpentMinor, userCurrency),
      totalRemaining: toMajorUnits(totalRemainingMinor),
      totalRemainingFormatted: formatCurrency(totalRemainingMinor, userCurrency),
      overallPercentage,
      healthCounts,
      budgetCount: formattedBudgets.length
    };

    return {
      budgets: formattedBudgets,
      summary,
      pagination: { total, page, limit, totalPages }
    };
  }

  /**
   * Get single budget by ID
   */
  async getBudgetById(userId, id, userCurrency = 'INR') {
    const budget = await budgetRepository.findById(id);
    if (!budget || budget.userId.toString() !== userId.toString()) {
      throw new AppError('Budget not found', 404);
    }

    const { startDate, endDate } = this.getMonthDateRange(budget.month);
    const catId = budget.categoryId?._id || budget.categoryId;
    const subcategories = await Category.find({
      userId,
      parentId: catId,
      isActive: true
    }).select('_id');

    const rollupIds = [catId, ...subcategories.map((s) => s._id)];
    const spentMinor = await budgetRepository.aggregateCategoryExpenses(
      userId,
      rollupIds,
      startDate,
      endDate
    );

    return this.formatBudget(budget, spentMinor, userCurrency);
  }

  /**
   * Update budget amount, category, or month
   */
  async updateBudget(userId, id, updateData, userCurrency = 'INR') {
    const budget = await budgetRepository.findById(id, false);
    if (!budget || budget.userId.toString() !== userId.toString()) {
      throw new AppError('Budget not found', 404);
    }

    const updates = {};
    let targetMonth = budget.month;
    let targetCategoryId = budget.categoryId;

    if (updateData.month && updateData.month !== budget.month) {
      targetMonth = updateData.month;
      updates.month = targetMonth;
    }

    if (updateData.categoryId && updateData.categoryId.toString() !== budget.categoryId.toString()) {
      const { category } = await this.getCategoryWithSubcategories(userId, updateData.categoryId);
      targetCategoryId = category._id;
      updates.categoryId = targetCategoryId;
    }

    // If month or category changed, verify compound uniqueness
    if (updates.month || updates.categoryId) {
      const duplicate = await budgetRepository.findOne(
        {
          userId,
          categoryId: targetCategoryId,
          month: targetMonth,
          _id: { $ne: budget._id }
        },
        false
      );

      if (duplicate) {
        throw new AppError(
          `A budget for this category in ${targetMonth} already exists.`,
          409
        );
      }
    }

    if (updateData.amount !== undefined) {
      updates.amount = toMinorUnits(updateData.amount);
    }

    // Recalculate spent dynamically
    const { startDate, endDate } = this.getMonthDateRange(targetMonth);
    const subcategories = await Category.find({
      userId,
      parentId: targetCategoryId,
      isActive: true
    }).select('_id');
    const rollupIds = [targetCategoryId, ...subcategories.map((s) => s._id)];

    const spentMinor = await budgetRepository.aggregateCategoryExpenses(
      userId,
      rollupIds,
      startDate,
      endDate
    );
    updates.spent = spentMinor;

    const updated = await budgetRepository.update(id, updates);

    logger.info(
      `Budget updated: ID ${id} (amount: ₹${toMajorUnits(updated.amount)}) for user: ${userId}`
    );

    return this.formatBudget(updated, spentMinor, userCurrency);
  }

  /**
   * Delete a budget
   */
  async deleteBudget(userId, id) {
    const budget = await budgetRepository.findById(id, false);
    if (!budget || budget.userId.toString() !== userId.toString()) {
      throw new AppError('Budget not found', 404);
    }

    await budgetRepository.delete(id);
    logger.info(`Budget deleted: ID ${id} for user: ${userId}`);
    return true;
  }

  /**
   * Get comprehensive monthly summary including budgeted and unbudgeted expense breakdown
   */
  async getMonthlySummary(userId, month = null, userCurrency = 'INR') {
    const targetMonth = month || this.getCurrentMonth();
    const { startDate, endDate } = this.getMonthDateRange(targetMonth);

    // 1. Fetch all budgets for this month
    const { data: budgets } = await budgetRepository.find(
      { userId, month: targetMonth },
      { limit: 100, sort: { createdAt: 1 } }
    );

    // 2. Fetch all completed expenses for this month across all categories
    const { expenseMap, grandTotalSpent: totalExpenseMinor } =
      await budgetRepository.aggregateAllCategoryExpensesForMonth(userId, startDate, endDate);

    // 3. Track all category IDs covered by budgets (parents + child categories)
    const budgetedCategoryIds = new Set();
    let totalBudgetedMinor = 0;
    let totalBudgetedSpentMinor = 0;

    const budgetDetails = await Promise.all(
      budgets.map(async (b) => {
        const catId = b.categoryId?._id || b.categoryId;
        const catIdStr = catId.toString();
        budgetedCategoryIds.add(catIdStr);

        // Find child subcategories
        const subcategories = await Category.find({
          userId,
          parentId: catId,
          isActive: true
        }).select('_id');

        for (const sub of subcategories) {
          budgetedCategoryIds.add(sub._id.toString());
        }

        const rollupIds = [catId, ...subcategories.map((s) => s._id)];
        const spentMinor = await budgetRepository.aggregateCategoryExpenses(
          userId,
          rollupIds,
          startDate,
          endDate
        );

        totalBudgetedMinor += b.amount;
        totalBudgetedSpentMinor += spentMinor;

        return this.formatBudget(b, spentMinor, userCurrency);
      })
    );

    // 4. Calculate unbudgeted spending
    let unbudgetedSpentMinor = 0;
    for (const [catKey, amt] of expenseMap.entries()) {
      if (!budgetedCategoryIds.has(catKey)) {
        unbudgetedSpentMinor += amt;
      }
    }

    const totalRemainingMinor = Math.max(0, totalBudgetedMinor - totalBudgetedSpentMinor);
    const overallPercentage =
      totalBudgetedMinor > 0
        ? Number(((totalBudgetedSpentMinor / totalBudgetedMinor) * 100).toFixed(2))
        : 0;

    const healthCounts = {
      healthy: budgetDetails.filter((b) => b.status === 'HEALTHY').length,
      warning: budgetDetails.filter((b) => b.status === 'WARNING').length,
      exceeded: budgetDetails.filter((b) => b.status === 'EXCEEDED').length
    };

    return {
      month: targetMonth,
      totalBudgeted: toMajorUnits(totalBudgetedMinor),
      totalBudgetedFormatted: formatCurrency(totalBudgetedMinor, userCurrency),
      budgetedSpent: toMajorUnits(totalBudgetedSpentMinor),
      budgetedSpentFormatted: formatCurrency(totalBudgetedSpentMinor, userCurrency),
      unbudgetedSpent: toMajorUnits(unbudgetedSpentMinor),
      unbudgetedSpentFormatted: formatCurrency(unbudgetedSpentMinor, userCurrency),
      totalExpense: toMajorUnits(totalExpenseMinor),
      totalExpenseFormatted: formatCurrency(totalExpenseMinor, userCurrency),
      totalRemaining: toMajorUnits(totalRemainingMinor),
      totalRemainingFormatted: formatCurrency(totalRemainingMinor, userCurrency),
      overallPercentage,
      healthCounts,
      budgets: budgetDetails
    };
  }
}

export const budgetService = new BudgetService();
