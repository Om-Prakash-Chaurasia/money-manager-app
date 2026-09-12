import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import {
  User,
  Account,
  Category,
  Transaction,
  RecurringTransaction,
  Budget,
  CreditCard,
  CreditCardStatement
} from '../src/models/index.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 11: Dashboard API Integration Tests', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let bankAccountId;
  let cashAccountId;
  let creditCardAccountId;
  let rentCategoryId;
  let groceriesCategoryId;
  let salaryCategoryId;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
    app = createApp();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await Account.deleteMany({});
      await Category.deleteMany({});
      await Transaction.deleteMany({});
      await RecurringTransaction.deleteMany({});
      await Budget.deleteMany({});
      await CreditCard.deleteMany({});
      await CreditCardStatement.deleteMany({});
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});
    await RecurringTransaction.deleteMany({});
    await Budget.deleteMany({});
    await CreditCard.deleteMany({});
    await CreditCardStatement.deleteMany({});

    // 1. Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123'
    });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user.id;

    // 2. Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password123'
    });
    userBToken = resB.body.data.accessToken;
    userBId = resB.body.data.user.id;

    // 3. User A Accounts: Bank (₹100,000), Cash (₹5,000), Credit Card (limit ₹100,000, debt ₹10,000)
    const bankRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'HDFC Salary Bank', type: 'BANK', openingBalance: 100000 });
    bankAccountId = bankRes.body.data.account._id;

    const cashRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Pocket Cash', type: 'CASH', openingBalance: 5000 });
    cashAccountId = cashRes.body.data.account._id;

    // Credit Card (debt ₹10,000)
    const ccRes = await request(app)
      .post('/api/credit-cards')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Regalia Gold Card',
        creditLimit: 100000,
        billingCycleDay: 15,
        dueDay: 5
      });
    const cardAcc = ccRes.body.data.card.accountId;
    creditCardAccountId = cardAcc._id || cardAcc;

    // 4. Fetch User A categories
    const catsRes = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userAToken}`);

    const cats = catsRes.body.data;
    const rentCat = cats.find((c) => c.name === 'Housing & Rent');
    const grocCat = cats.find((c) => c.name === 'Groceries');
    const salCat = cats.find((c) => c.name === 'Salary');

    rentCategoryId = rentCat ? rentCat._id : cats.find((c) => c.type === 'EXPENSE')._id;
    groceriesCategoryId = grocCat ? grocCat._id : cats.find((c) => c.type === 'EXPENSE')._id;
    salaryCategoryId = salCat ? salCat._id : cats.find((c) => c.type === 'INCOME')._id;

    // Spend ₹10,000 on credit card
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'EXPENSE',
        amount: 10000,
        accountId: creditCardAccountId,
        categoryId: rentCategoryId,
        date: '2026-09-02T10:00:00.000Z',
        description: 'Flight tickets'
      });
  });

  describe('GET /api/dashboard/summary', () => {
    it('should compute net worth, monthly income, expense, net savings, and category spending', async () => {
      // 1. Current Month (September 2026) Transactions for User A:
      // Income: ₹80,000 (Salary)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'INCOME',
          amount: 80000,
          accountId: bankAccountId,
          categoryId: salaryCategoryId,
          date: '2026-09-01T09:00:00.000Z',
          description: 'September Monthly Salary'
        });

      // Expense: ₹25,000 (Rent)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 25000,
          accountId: bankAccountId,
          categoryId: rentCategoryId,
          date: '2026-09-05T12:00:00.000Z',
          description: 'Monthly Apartment Rent'
        });

      // Expense: ₹5,000 (Groceries)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 5000,
          accountId: bankAccountId,
          categoryId: groceriesCategoryId,
          date: '2026-09-10T15:00:00.000Z',
          description: 'Weekly grocery basket'
        });

      // Transfer: ₹4,000 (Bank -> Cash) - Must NOT affect income or expense!
      await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: bankAccountId,
          toAccountId: cashAccountId,
          amount: 4000,
          date: '2026-09-12T10:00:00.000Z',
          description: 'ATM Cash Withdrawal'
        });

      // 2. Previous Month (August 2026) Transactions for User A:
      // Income: ₹70,000
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'INCOME',
          amount: 70000,
          accountId: bankAccountId,
          categoryId: salaryCategoryId,
          date: '2026-08-01T09:00:00.000Z',
          description: 'August Monthly Salary'
        });

      // Expense: ₹20,000
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 20000,
          accountId: bankAccountId,
          categoryId: rentCategoryId,
          date: '2026-08-05T12:00:00.000Z',
          description: 'August Rent'
        });

      // 3. Create Budget for September 2026
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: rentCategoryId,
          month: '2026-09',
          amount: 40000
        });

      // 4. Request Dashboard Summary for September 2026
      const res = await request(app)
        .get('/api/dashboard/summary?month=2026-09')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { kpis, comparison, categorySpending, cashFlowTrend, budgetProgress, recentTransactions } =
        res.body.data;

      // KPI Checks:
      // Income: ₹80,000
      expect(kpis.monthlyIncome).toBe(80000);
      // Total Expense: ₹10,000 (credit card spend) + ₹25,000 (rent) + ₹5,000 (groceries) = ₹40,000
      expect(kpis.monthlyExpense).toBe(40000);
      // Net Savings: 80,000 - 40,000 = ₹40,000
      expect(kpis.netSavings).toBe(40000);
      // Savings Rate: (40,000 / 80,000) * 100 = 50.0%
      expect(kpis.savingsRate).toBe(50);

      // Comparison Checks (vs August 2026):
      // Previous Income = ₹70,000. Change: (80k - 70k) / 70k * 100 = +14.3%
      expect(comparison.previousMonth).toBe('2026-08');
      expect(comparison.previousIncome).toBe(70000);
      expect(comparison.incomeChangePercentage).toBe(14.3);

      // Previous Expense = ₹20,000. Change: (40k - 20k) / 20k * 100 = +100.0%
      expect(comparison.previousExpense).toBe(20000);
      expect(comparison.expenseChangePercentage).toBe(100);

      // Category Spending Breakdown:
      // Rent Category: 10,000 (card) + 25,000 (bank) = ₹35,000 (87.5%)
      // Groceries: ₹5,000 (12.5%)
      expect(categorySpending.length).toBe(2);
      expect(categorySpending[0].amount).toBe(35000);
      expect(categorySpending[0].percentage).toBe(87.5);
      expect(categorySpending[1].amount).toBe(5000);
      expect(categorySpending[1].percentage).toBe(12.5);

      // Cash Flow Trend:
      expect(cashFlowTrend.length).toBe(6);
      const sepTrend = cashFlowTrend.find((c) => c.month === '2026-09');
      expect(sepTrend).toBeTruthy();
      expect(sepTrend.income).toBe(80000);
      expect(sepTrend.expense).toBe(40000);

      // Budget Progress:
      expect(budgetProgress).toBeTruthy();
      expect(budgetProgress.summary.totalBudgeted).toBe(40000);

      // Recent Transactions:
      expect(recentTransactions.length).toBeGreaterThanOrEqual(5);
      // Must be ordered descending by date
      expect(new Date(recentTransactions[0].date).getTime()).toBeGreaterThanOrEqual(
        new Date(recentTransactions[recentTransactions.length - 1].date).getTime()
      );
    });
  });

  describe('GET /api/dashboard/cashflow', () => {
    it('should return requested number of months trend', async () => {
      const res = await request(app)
        .get('/api/dashboard/cashflow?months=3&endMonth=2026-09')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.data[2].month).toBe('2026-09');
      expect(res.body.data[1].month).toBe('2026-08');
      expect(res.body.data[0].month).toBe('2026-07');
    });
  });

  describe('Multi-Tenancy Isolation', () => {
    it('should return clean zero-state dashboard for User B without any User A data', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary?month=2026-09')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      const { kpis, categorySpending, recentTransactions } = res.body.data;

      expect(kpis.monthlyIncome).toBe(0);
      expect(kpis.monthlyExpense).toBe(0);
      expect(kpis.netSavings).toBe(0);
      expect(categorySpending.length).toBe(0);
      expect(recentTransactions.length).toBe(0);
    });
  });
});
