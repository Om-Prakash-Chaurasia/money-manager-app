import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { Account } from '../models/Account.js';
import { Category } from '../models/Category.js';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/currencyHelper.js';
import { ACCOUNT_TYPES } from '../constants/accountTypes.js';

class ReportService {
  /**
   * Helper to parse month 'YYYY-MM' into UTC Date boundaries
   */
  getMonthRange(monthStr) {
    const [yearStr, monthNumStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);

    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    return { startDate, endDate, year, monthNum };
  }

  /**
   * Helper to get current month 'YYYY-MM'
   */
  getCurrentMonth() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Helper to get previous month string 'YYYY-MM'
   */
  getPreviousMonth(monthStr) {
    const [yearStr, monthNumStr] = monthStr.split('-');
    let year = parseInt(yearStr, 10);
    let monthNum = parseInt(monthNumStr, 10);

    if (monthNum === 1) {
      year -= 1;
      monthNum = 12;
    } else {
      monthNum -= 1;
    }

    return `${year}-${String(monthNum).padStart(2, '0')}`;
  }

  /**
   * Helper to format month to readable label (e.g. '2026-09' -> 'Sep 2026')
   */
  getMonthLabel(monthStr) {
    const [yearStr, monthNumStr] = monthStr.split('-');
    const date = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthNumStr, 10) - 1, 1));
    return date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  /**
   * 1. Income vs Expense Trend Report
   */
  async getIncomeExpenseReport(userId, { startDate, endDate, groupBy = 'month' } = {}, userCurrency = 'INR') {
    const now = new Date();
    let start, end;

    if (startDate) {
      start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
    } else {
      // Default to 6 months ago (start of month)
      const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0));
      start = sixMonthsAgo;
    }

    if (endDate) {
      end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
    } else {
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    // Build aggregation group expression based on groupBy
    let groupExpression;
    if (groupBy === 'week') {
      groupExpression = {
        year: { $isoWeekYear: '$date' },
        week: { $isoWeek: '$date' },
        type: '$type'
      };
    } else if (groupBy === 'day') {
      groupExpression = {
        year: { $year: '$date' },
        month: { $month: '$date' },
        day: { $dayOfMonth: '$date' },
        type: '$type'
      };
    } else {
      // default: month
      groupExpression = {
        year: { $year: '$date' },
        month: { $month: '$date' },
        type: '$type'
      };
    }

    const txAgg = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: { $ne: true },
          status: 'COMPLETED',
          type: { $in: ['INCOME', 'EXPENSE'] },
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: groupExpression,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Map aggregated results by period key
    const periodMap = new Map();

    for (const item of txAgg) {
      let periodKey = '';
      let label = '';

      if (groupBy === 'week') {
        periodKey = `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`;
        label = `W${item._id.week}, ${item._id.year}`;
      } else if (groupBy === 'day') {
        const m = String(item._id.month).padStart(2, '0');
        const d = String(item._id.day).padStart(2, '0');
        periodKey = `${item._id.year}-${m}-${d}`;
        const dt = new Date(Date.UTC(item._id.year, item._id.month - 1, item._id.day));
        label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
      } else {
        periodKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        label = this.getMonthLabel(periodKey);
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          period: periodKey,
          label,
          income: 0,
          expense: 0
        });
      }

      const rec = periodMap.get(periodKey);
      if (item._id.type === 'INCOME') {
        rec.income = item.total;
      } else if (item._id.type === 'EXPENSE') {
        rec.expense = item.total;
      }
    }

    // Sort periods chronologically
    const sortedPeriods = Array.from(periodMap.keys()).sort();

    let totalIncome = 0;
    let totalExpense = 0;

    const trends = sortedPeriods.map((key) => {
      const p = periodMap.get(key);
      const income = p.income;
      const expense = p.expense;
      const netSavings = income - expense;
      const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 10000) / 100 : 0;

      totalIncome += income;
      totalExpense += expense;

      return {
        period: p.period,
        label: p.label,
        income,
        incomeMajor: toMajorUnits(income),
        incomeFormatted: formatCurrency(income, userCurrency),
        expense,
        expenseMajor: toMajorUnits(expense),
        expenseFormatted: formatCurrency(expense, userCurrency),
        netSavings,
        netSavingsMajor: toMajorUnits(netSavings),
        netSavingsFormatted: formatCurrency(netSavings, userCurrency),
        savingsRate
      };
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 10000) / 100 : 0;
    const periodCount = trends.length || 1;

    return {
      groupBy,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      summary: {
        totalIncome,
        totalIncomeMajor: toMajorUnits(totalIncome),
        totalIncomeFormatted: formatCurrency(totalIncome, userCurrency),
        totalExpense,
        totalExpenseMajor: toMajorUnits(totalExpense),
        totalExpenseFormatted: formatCurrency(totalExpense, userCurrency),
        netSavings,
        netSavingsMajor: toMajorUnits(netSavings),
        netSavingsFormatted: formatCurrency(netSavings, userCurrency),
        savingsRate,
        averageIncome: Math.round(totalIncome / periodCount),
        averageIncomeMajor: toMajorUnits(Math.round(totalIncome / periodCount)),
        averageIncomeFormatted: formatCurrency(Math.round(totalIncome / periodCount), userCurrency),
        averageExpense: Math.round(totalExpense / periodCount),
        averageExpenseMajor: toMajorUnits(Math.round(totalExpense / periodCount)),
        averageExpenseFormatted: formatCurrency(Math.round(totalExpense / periodCount), userCurrency),
        periodCount: trends.length
      },
      trends
    };
  }

  /**
   * 2. Category Spending Breakdown Report
   */
  async getCategorySpendingReport(userId, { startDate, endDate, type = 'EXPENSE', parentId } = {}, userCurrency = 'INR') {
    const now = new Date();
    let start, end;

    if (startDate) {
      start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
    } else {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    }

    if (endDate) {
      end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
    } else {
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    const matchQuery = {
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: { $ne: true },
      status: 'COMPLETED',
      type,
      date: { $gte: start, $lte: end }
    };

    // If parentId is provided, restrict to subcategories of parent or parent itself
    if (parentId) {
      const childCategories = await Category.find({
        userId,
        parentCategory: parentId,
        isDeleted: { $ne: true }
      }).select('_id');
      const allowedCategoryIds = [new mongoose.Types.ObjectId(parentId), ...childCategories.map((c) => c._id)];
      matchQuery.categoryId = { $in: allowedCategoryIds };
    }

    const categoryAgg = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$categoryId',
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    let totalAmount = 0;
    let totalTransactions = 0;

    for (const item of categoryAgg) {
      totalAmount += item.totalAmount;
      totalTransactions += item.transactionCount;
    }

    // Lookup parent categories to roll up or structure child categories
    const categories = categoryAgg.map((item) => {
      const percentage = totalAmount > 0 ? Math.round((item.totalAmount / totalAmount) * 10000) / 100 : 0;
      return {
        categoryId: item._id,
        name: item.category?.name || 'Uncategorized',
        icon: item.category?.icon || 'tag',
        color: item.category?.color || '#9E9E9E',
        parentCategory: item.category?.parentCategory || null,
        amount: item.totalAmount,
        amountMajor: toMajorUnits(item.totalAmount),
        formattedAmount: formatCurrency(item.totalAmount, userCurrency),
        percentage,
        transactionCount: item.transactionCount
      };
    });

    return {
      type,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      totalAmount,
      totalAmountMajor: toMajorUnits(totalAmount),
      formattedTotalAmount: formatCurrency(totalAmount, userCurrency),
      totalTransactions,
      categories
    };
  }

  /**
   * 3. Cash Flow Statement Report
   */
  async getCashFlowReport(userId, { startDate, endDate } = {}, userCurrency = 'INR') {
    const now = new Date();
    let start, end;

    if (startDate) {
      start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
    } else {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    }

    if (endDate) {
      end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
    } else {
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    const txs = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: { $ne: true },
          status: 'COMPLETED',
          type: { $in: ['INCOME', 'EXPENSE'] },
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            categoryId: '$categoryId',
            accountId: '$accountId'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id.categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'accounts',
          localField: '_id.accountId',
          foreignField: '_id',
          as: 'account'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$account',
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    let totalInflow = 0;
    let totalOutflow = 0;

    const inflowCategoryMap = new Map();
    const outflowCategoryMap = new Map();
    const accountTypeMap = new Map();

    for (const item of txs) {
      const isIncome = item._id.type === 'INCOME';
      const amt = item.total;
      const catId = item._id.categoryId ? item._id.categoryId.toString() : 'uncategorized';
      const catName = item.category?.name || 'Uncategorized';
      const catIcon = item.category?.icon || 'tag';
      const catColor = item.category?.color || '#9E9E9E';

      const accType = item.account?.type || 'OTHER';

      if (isIncome) {
        totalInflow += amt;
        if (!inflowCategoryMap.has(catId)) {
          inflowCategoryMap.set(catId, {
            categoryId: item._id.categoryId,
            name: catName,
            icon: catIcon,
            color: catColor,
            total: 0,
            count: 0
          });
        }
        const cRec = inflowCategoryMap.get(catId);
        cRec.total += amt;
        cRec.count += item.count;
      } else {
        totalOutflow += amt;
        if (!outflowCategoryMap.has(catId)) {
          outflowCategoryMap.set(catId, {
            categoryId: item._id.categoryId,
            name: catName,
            icon: catIcon,
            color: catColor,
            total: 0,
            count: 0
          });
        }
        const cRec = outflowCategoryMap.get(catId);
        cRec.total += amt;
        cRec.count += item.count;
      }

      // Account type flow mapping
      if (!accountTypeMap.has(accType)) {
        accountTypeMap.set(accType, {
          accountType: accType,
          inflow: 0,
          outflow: 0
        });
      }
      const aRec = accountTypeMap.get(accType);
      if (isIncome) {
        aRec.inflow += amt;
      } else {
        aRec.outflow += amt;
      }
    }

    const netCashFlow = totalInflow - totalOutflow;

    const inflowsBreakdown = Array.from(inflowCategoryMap.values())
      .map((c) => ({
        ...c,
        amountMajor: toMajorUnits(c.total),
        formattedAmount: formatCurrency(c.total, userCurrency),
        percentage: totalInflow > 0 ? Math.round((c.total / totalInflow) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    const outflowsBreakdown = Array.from(outflowCategoryMap.values())
      .map((c) => ({
        ...c,
        amountMajor: toMajorUnits(c.total),
        formattedAmount: formatCurrency(c.total, userCurrency),
        percentage: totalOutflow > 0 ? Math.round((c.total / totalOutflow) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    const byAccountType = Array.from(accountTypeMap.values()).map((a) => ({
      accountType: a.accountType,
      inflow: a.inflow,
      inflowMajor: toMajorUnits(a.inflow),
      inflowFormatted: formatCurrency(a.inflow, userCurrency),
      outflow: a.outflow,
      outflowMajor: toMajorUnits(a.outflow),
      outflowFormatted: formatCurrency(a.outflow, userCurrency),
      net: a.inflow - a.outflow,
      netMajor: toMajorUnits(a.inflow - a.outflow),
      netFormatted: formatCurrency(a.inflow - a.outflow, userCurrency)
    }));

    return {
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      netCashFlow,
      netCashFlowMajor: toMajorUnits(netCashFlow),
      formattedNetCashFlow: formatCurrency(netCashFlow, userCurrency),
      inflows: {
        total: totalInflow,
        totalMajor: toMajorUnits(totalInflow),
        formattedTotal: formatCurrency(totalInflow, userCurrency),
        categories: inflowsBreakdown
      },
      outflows: {
        total: totalOutflow,
        totalMajor: toMajorUnits(totalOutflow),
        formattedTotal: formatCurrency(totalOutflow, userCurrency),
        categories: outflowsBreakdown
      },
      byAccountType
    };
  }

  /**
   * 4. Net Worth Trajectory Report
   * Evaluates historical assets, liabilities, and net worth across N months.
   */
  async getNetWorthTrajectory(userId, { months = 12, endMonth } = {}, userCurrency = 'INR') {
    const targetEndMonth = endMonth || this.getCurrentMonth();
    const monthList = [];
    let curr = targetEndMonth;

    for (let i = 0; i < months; i++) {
      monthList.unshift(curr);
      curr = this.getPreviousMonth(curr);
    }

    // Get all user active accounts
    const accounts = await Account.find({
      userId,
      isDeleted: { $ne: true }
    });

    // Current net worth calculation
    let currentAssets = 0;
    let currentLiabilities = 0;

    for (const acc of accounts) {
      if (acc.type === ACCOUNT_TYPES.CREDIT_CARD) {
        if (acc.balance < 0) {
          currentLiabilities += Math.abs(acc.balance);
        } else {
          currentAssets += acc.balance;
        }
      } else {
        if (acc.balance >= 0) {
          currentAssets += acc.balance;
        } else {
          currentLiabilities += Math.abs(acc.balance);
        }
      }
    }
    const currentNetWorth = currentAssets - currentLiabilities;

    // Build timeline for each month end
    const history = [];

    for (const mStr of monthList) {
      const { endDate: monthEnd } = this.getMonthRange(mStr);

      // Aggregate all transactions that occurred strictly after monthEnd
      const laterTxs = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            isDeleted: { $ne: true },
            status: 'COMPLETED',
            date: { $gt: monthEnd }
          }
        },
        {
          $project: {
            type: 1,
            amount: 1,
            accountId: 1,
            fromAccountId: 1,
            toAccountId: 1
          }
        }
      ]);

      // Calculate net change after monthEnd for each account
      const netDeltaMap = new Map();
      for (const acc of accounts) {
        netDeltaMap.set(acc._id.toString(), 0);
      }

      for (const tx of laterTxs) {
        const amt = tx.amount;
        if (tx.type === 'INCOME' && tx.accountId) {
          const accId = tx.accountId.toString();
          netDeltaMap.set(accId, (netDeltaMap.get(accId) || 0) + amt);
        } else if (tx.type === 'EXPENSE' && tx.accountId) {
          const accId = tx.accountId.toString();
          netDeltaMap.set(accId, (netDeltaMap.get(accId) || 0) - amt);
        } else if (tx.type === 'TRANSFER') {
          if (tx.fromAccountId) {
            const fromId = tx.fromAccountId.toString();
            netDeltaMap.set(fromId, (netDeltaMap.get(fromId) || 0) - amt);
          }
          if (tx.toAccountId) {
            const toId = tx.toAccountId.toString();
            netDeltaMap.set(toId, (netDeltaMap.get(toId) || 0) + amt);
          }
        }
      }

      // Compute balance at monthEnd for each account
      let monthAssets = 0;
      let monthLiabilities = 0;

      for (const acc of accounts) {
        const delta = netDeltaMap.get(acc._id.toString()) || 0;
        const balanceAtDate = acc.balance - delta;

        if (acc.type === ACCOUNT_TYPES.CREDIT_CARD) {
          if (balanceAtDate < 0) {
            monthLiabilities += Math.abs(balanceAtDate);
          } else {
            monthAssets += balanceAtDate;
          }
        } else {
          if (balanceAtDate >= 0) {
            monthAssets += balanceAtDate;
          } else {
            monthLiabilities += Math.abs(balanceAtDate);
          }
        }
      }

      const monthNetWorth = monthAssets - monthLiabilities;

      history.push({
        month: mStr,
        label: this.getMonthLabel(mStr),
        assets: monthAssets,
        assetsMajor: toMajorUnits(monthAssets),
        assetsFormatted: formatCurrency(monthAssets, userCurrency),
        liabilities: monthLiabilities,
        liabilitiesMajor: toMajorUnits(monthLiabilities),
        liabilitiesFormatted: formatCurrency(monthLiabilities, userCurrency),
        netWorth: monthNetWorth,
        netWorthMajor: toMajorUnits(monthNetWorth),
        netWorthFormatted: formatCurrency(monthNetWorth, userCurrency)
      });
    }

    const oldest = history[0];
    const latest = history[history.length - 1];
    const changeAmount = latest.netWorth - oldest.netWorth;
    const changePercentage = oldest.netWorth !== 0
      ? Math.round((changeAmount / Math.abs(oldest.netWorth)) * 10000) / 100
      : 0;

    return {
      currentNetWorth,
      currentNetWorthMajor: toMajorUnits(currentNetWorth),
      currentNetWorthFormatted: formatCurrency(currentNetWorth, userCurrency),
      currentAssets,
      currentAssetsMajor: toMajorUnits(currentAssets),
      currentAssetsFormatted: formatCurrency(currentAssets, userCurrency),
      currentLiabilities,
      currentLiabilitiesMajor: toMajorUnits(currentLiabilities),
      currentLiabilitiesFormatted: formatCurrency(currentLiabilities, userCurrency),
      changeAmount,
      changeAmountMajor: toMajorUnits(changeAmount),
      changeAmountFormatted: formatCurrency(changeAmount, userCurrency),
      changePercentage,
      history
    };
  }

  /**
   * 5. Account Growth Report
   */
  async getAccountGrowthReport(userId, { accountId, months = 6, endMonth } = {}, userCurrency = 'INR') {
    const targetEndMonth = endMonth || this.getCurrentMonth();
    const monthList = [];
    let curr = targetEndMonth;

    for (let i = 0; i < months; i++) {
      monthList.unshift(curr);
      curr = this.getPreviousMonth(curr);
    }

    let accountFilter = { userId, isDeleted: { $ne: true } };
    if (accountId) {
      accountFilter._id = accountId;
    }

    const accounts = await Account.find(accountFilter);
    if (!accounts || accounts.length === 0) {
      return {
        account: null,
        history: []
      };
    }

    const history = [];

    for (const mStr of monthList) {
      const { endDate: monthEnd } = this.getMonthRange(mStr);

      const laterTxs = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            isDeleted: { $ne: true },
            status: 'COMPLETED',
            date: { $gt: monthEnd },
            $or: [
              { accountId: { $in: accounts.map((a) => a._id) } },
              { fromAccountId: { $in: accounts.map((a) => a._id) } },
              { toAccountId: { $in: accounts.map((a) => a._id) } }
            ]
          }
        }
      ]);

      let totalBalanceAtDate = 0;

      for (const acc of accounts) {
        let delta = 0;
        for (const tx of laterTxs) {
          const amt = tx.amount;
          if (tx.accountId && tx.accountId.toString() === acc._id.toString()) {
            if (tx.type === 'INCOME') delta += amt;
            if (tx.type === 'EXPENSE') delta -= amt;
          }
          if (tx.type === 'TRANSFER') {
            if (tx.fromAccountId && tx.fromAccountId.toString() === acc._id.toString()) {
              delta -= amt;
            }
            if (tx.toAccountId && tx.toAccountId.toString() === acc._id.toString()) {
              delta += amt;
            }
          }
        }
        totalBalanceAtDate += (acc.balance - delta);
      }

      history.push({
        month: mStr,
        label: this.getMonthLabel(mStr),
        balance: totalBalanceAtDate,
        balanceMajor: toMajorUnits(totalBalanceAtDate),
        balanceFormatted: formatCurrency(totalBalanceAtDate, userCurrency)
      });
    }

    return {
      account: accountId ? { id: accounts[0]._id, name: accounts[0].name, type: accounts[0].type } : null,
      history
    };
  }
}

export const reportService = new ReportService();
