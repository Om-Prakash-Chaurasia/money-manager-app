import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { Account } from '../models/Account.js';
import { Category } from '../models/Category.js';
import { budgetService } from './budgetService.js';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/currencyHelper.js';
import { ACCOUNT_TYPES } from '../constants/accountTypes.js';

class DashboardService {
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
   * Format month string to human-readable label (e.g. '2026-09' -> 'Sep 2026')
   */
  getMonthLabel(monthStr) {
    const [yearStr, monthNumStr] = monthStr.split('-');
    const date = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthNumStr, 10) - 1, 1));
    return date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  /**
   * Aggregate monthly cash flow for last N months ending at targetMonth
   */
  async getCashFlowTrend(userId, endMonthStr, monthCount = 6, userCurrency = 'INR') {
    const months = [];
    let current = endMonthStr;

    for (let i = 0; i < monthCount; i++) {
      months.unshift(current);
      current = this.getPreviousMonth(current);
    }

    const { startDate: rangeStart } = this.getMonthRange(months[0]);
    const { endDate: rangeEnd } = this.getMonthRange(months[months.length - 1]);

    const txAgg = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: { $ne: true },
          status: 'COMPLETED',
          type: { $in: ['INCOME', 'EXPENSE'] },
          date: { $gte: rangeStart, $lte: rangeEnd }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Map by 'YYYY-MM:TYPE'
    const flowMap = new Map();
    for (const item of txAgg) {
      const mStr = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      const key = `${mStr}:${item._id.type}`;
      flowMap.set(key, item.total);
    }

    const trend = months.map((m) => {
      const incMinor = flowMap.get(`${m}:INCOME`) || 0;
      const expMinor = flowMap.get(`${m}:EXPENSE`) || 0;
      const savingsMinor = incMinor - expMinor;

      return {
        month: m,
        label: this.getMonthLabel(m),
        income: toMajorUnits(incMinor),
        incomeMinor: incMinor,
        incomeFormatted: formatCurrency(incMinor, userCurrency),
        expense: toMajorUnits(expMinor),
        expenseMinor: expMinor,
        expenseFormatted: formatCurrency(expMinor, userCurrency),
        savings: toMajorUnits(savingsMinor),
        savingsMinor,
        savingsFormatted: formatCurrency(savingsMinor, userCurrency),
        netSavings: toMajorUnits(savingsMinor),
        netSavingsMinor: savingsMinor,
        netSavingsFormatted: formatCurrency(savingsMinor, userCurrency)
      };
    });

    return trend;
  }

  /**
   * Compile comprehensive dashboard summary
   */
  async getDashboardSummary(userId, month = null, userCurrency = 'INR') {
    const targetMonth = month || this.getCurrentMonth();
    const prevMonth = this.getPreviousMonth(targetMonth);

    const { startDate, endDate } = this.getMonthRange(targetMonth);
    const { startDate: prevStartDate, endDate: prevEndDate } = this.getMonthRange(prevMonth);

    // 1. Current Month & Previous Month Income / Expense Aggregations
    const [currentTotalsAgg, prevTotalsAgg] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            isDeleted: { $ne: true },
            status: 'COMPLETED',
            type: { $in: ['INCOME', 'EXPENSE'] },
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            isDeleted: { $ne: true },
            status: 'COMPLETED',
            type: { $in: ['INCOME', 'EXPENSE'] },
            date: { $gte: prevStartDate, $lte: prevEndDate }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const currentIncomeMinor = currentTotalsAgg.find((t) => t._id === 'INCOME')?.total || 0;
    const currentExpenseMinor = currentTotalsAgg.find((t) => t._id === 'EXPENSE')?.total || 0;
    const prevIncomeMinor = prevTotalsAgg.find((t) => t._id === 'INCOME')?.total || 0;
    const prevExpenseMinor = prevTotalsAgg.find((t) => t._id === 'EXPENSE')?.total || 0;

    const netSavingsMinor = currentIncomeMinor - currentExpenseMinor;
    const savingsRate =
      currentIncomeMinor > 0
        ? Number(((netSavingsMinor / currentIncomeMinor) * 100).toFixed(2))
        : 0;

    const incomeChangePercentage =
      prevIncomeMinor > 0
        ? Number((((currentIncomeMinor - prevIncomeMinor) / prevIncomeMinor) * 100).toFixed(1))
        : currentIncomeMinor > 0
        ? 100
        : 0;

    const expenseChangePercentage =
      prevExpenseMinor > 0
        ? Number((((currentExpenseMinor - prevExpenseMinor) / prevExpenseMinor) * 100).toFixed(1))
        : currentExpenseMinor > 0
        ? 100
        : 0;

    // 2. Active Accounts & Net Worth
    const accounts = await Account.find({ userId, isActive: true }).sort({ type: 1, name: 1 });

    let totalAssetsMinor = 0;
    let totalLiabilitiesMinor = 0;

    const formattedAccounts = accounts.map((acc) => {
      if (acc.type === ACCOUNT_TYPES.CREDIT_CARD) {
        totalLiabilitiesMinor += Math.abs(acc.balance);
      } else {
        if (acc.balance >= 0) {
          totalAssetsMinor += acc.balance;
        } else {
          totalLiabilitiesMinor += Math.abs(acc.balance);
        }
      }

      return {
        id: acc._id.toString(),
        name: acc.name,
        type: acc.type,
        subType: acc.subType,
        balance: toMajorUnits(acc.balance),
        balanceMinor: acc.balance,
        balanceFormatted: formatCurrency(acc.balance, acc.currency || userCurrency),
        color: acc.color,
        icon: acc.icon
      };
    });

    const netWorthMinor = totalAssetsMinor - totalLiabilitiesMinor;

    // 3. Category Spending Breakdown for current month
    const categorySpendingAgg = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: { $ne: true },
          status: 'COMPLETED',
          type: 'EXPENSE',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$categoryId',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Fetch category metadata
    const categoryIds = categorySpendingAgg
      .map((item) => item._id)
      .filter((id) => id !== null);

    const categories = await Category.find({ _id: { $in: categoryIds } });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

    const categorySpending = categorySpendingAgg.map((item) => {
      const cat = item._id ? categoryMap.get(item._id.toString()) : null;
      const amountMinor = item.totalAmount;
      const percentage =
        currentExpenseMinor > 0
          ? Number(((amountMinor / currentExpenseMinor) * 100).toFixed(2))
          : 0;

      return {
        categoryId: cat ? cat._id.toString() : null,
        name: cat ? cat.name : 'Uncategorized',
        color: cat ? cat.color : '#94A3B8',
        icon: cat ? cat.icon : 'folder',
        amount: toMajorUnits(amountMinor),
        amountMinor,
        amountFormatted: formatCurrency(amountMinor, userCurrency),
        percentage,
        count: item.count
      };
    });

    // 4. Budget Progress Highlights
    let budgetSummary = null;
    try {
      const budgetData = await budgetService.getBudgets(userId, { month: targetMonth }, userCurrency);
      budgetSummary = {
        summary: budgetData.summary,
        budgets: budgetData.budgets.slice(0, 5) // top 5 for dashboard card
      };
    } catch {
      budgetSummary = null;
    }

    // 5. Cash Flow Trend (Last 6 Months)
    const cashFlowTrend = await this.getCashFlowTrend(userId, targetMonth, 6, userCurrency);

    // 6. Recent Transactions (Last 10)
    const recentTxDocs = await Transaction.find({ userId, isDeleted: false })
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name type color icon currency')
      .populate('fromAccountId', 'name type color icon currency')
      .populate('toAccountId', 'name type color icon currency')
      .sort({ date: -1, createdAt: -1 })
      .limit(10);

    const recentTransactions = recentTxDocs.map((tx) => ({
      id: tx._id.toString(),
      type: tx.type,
      amount: toMajorUnits(tx.amount),
      amountMinor: tx.amount,
      amountFormatted: formatCurrency(tx.amount, tx.currency || userCurrency),
      currency: tx.currency,
      date: tx.date,
      description: tx.description,
      status: tx.status,
      category: tx.categoryId
        ? {
            id: tx.categoryId._id,
            name: tx.categoryId.name,
            icon: tx.categoryId.icon,
            color: tx.categoryId.color
          }
        : null,
      account: tx.accountId
        ? { id: tx.accountId._id, name: tx.accountId.name, type: tx.accountId.type }
        : null,
      fromAccount: tx.fromAccountId
        ? { id: tx.fromAccountId._id, name: tx.fromAccountId.name, type: tx.fromAccountId.type }
        : null,
      toAccount: tx.toAccountId
        ? { id: tx.toAccountId._id, name: tx.toAccountId.name, type: tx.toAccountId.type }
        : null
    }));

    return {
      month: targetMonth,
      kpis: {
        totalAssets: toMajorUnits(totalAssetsMinor),
        totalAssetsMinor,
        totalAssetsFormatted: formatCurrency(totalAssetsMinor, userCurrency),
        totalLiabilities: toMajorUnits(totalLiabilitiesMinor),
        totalLiabilitiesMinor,
        totalLiabilitiesFormatted: formatCurrency(totalLiabilitiesMinor, userCurrency),
        netWorth: toMajorUnits(netWorthMinor),
        netWorthMinor,
        netWorthFormatted: formatCurrency(netWorthMinor, userCurrency),
        monthlyIncome: toMajorUnits(currentIncomeMinor),
        monthlyIncomeMinor: currentIncomeMinor,
        monthlyIncomeFormatted: formatCurrency(currentIncomeMinor, userCurrency),
        monthlyExpense: toMajorUnits(currentExpenseMinor),
        monthlyExpenseMinor: currentExpenseMinor,
        monthlyExpenseFormatted: formatCurrency(currentExpenseMinor, userCurrency),
        netSavings: toMajorUnits(netSavingsMinor),
        netSavingsMinor,
        netSavingsFormatted: formatCurrency(netSavingsMinor, userCurrency),
        savingsRate
      },
      comparison: {
        previousMonth: prevMonth,
        previousIncome: toMajorUnits(prevIncomeMinor),
        previousExpense: toMajorUnits(prevExpenseMinor),
        incomeChangePercentage,
        expenseChangePercentage
      },
      accounts: formattedAccounts,
      categorySpending,
      cashFlowTrend,
      budgetProgress: budgetSummary,
      recentTransactions
    };
  }
}

export const dashboardService = new DashboardService();
