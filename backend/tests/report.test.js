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

describe('Phase 12: Comprehensive Financial Reports API Integration Tests', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let bankAccountId;
  let cashAccountId;
  let creditCardAccountId;
  let housingCategoryId;
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

    // 3. User A Accounts: Bank (₹50,000 = 5,000,000 minor units), Cash (₹10,000 = 1,000,000 minor units)
    const bankRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'HDFC Salary Bank', type: 'BANK', openingBalance: 50000 });
    bankAccountId = bankRes.body.data.account._id;

    const cashRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Wallet Cash', type: 'CASH', openingBalance: 10000 });
    cashAccountId = cashRes.body.data.account._id;

    // Credit Card (limit ₹100,000)
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

    // 4. Fetch seeded categories for User A
    const catsRes = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userAToken}`);

    const cats = catsRes.body.data;
    const houseCat = cats.find((c) => c.name === 'Housing & Rent');
    const grocCat = cats.find((c) => c.name === 'Groceries');
    const salCat = cats.find((c) => c.name === 'Salary');

    housingCategoryId = houseCat ? houseCat._id : cats.find((c) => c.type === 'EXPENSE')._id;
    groceriesCategoryId = grocCat ? grocCat._id : cats.find((c) => c.type === 'EXPENSE')._id;
    salaryCategoryId = salCat ? salCat._id : cats.find((c) => c.type === 'INCOME')._id;

    // 5. Populate Historical Transactions for User A across months
    // Aug 2026: Income ₹80,000 (8000000), Expense ₹25,000 (2500000)
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'INCOME',
        amount: 80000,
        accountId: bankAccountId,
        categoryId: salaryCategoryId,
        date: '2026-08-01T10:00:00.000Z',
        description: 'Aug Salary'
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'EXPENSE',
        amount: 25000,
        accountId: bankAccountId,
        categoryId: housingCategoryId,
        date: '2026-08-05T12:00:00.000Z',
        description: 'Aug House Rent'
      });

    // Sep 2026: Income ₹90,000 (9000000), Expense ₹15,000 (Rent) + ₹5,000 (Groceries on Card)
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'INCOME',
        amount: 90000,
        accountId: bankAccountId,
        categoryId: salaryCategoryId,
        date: '2026-09-01T10:00:00.000Z',
        description: 'Sep Salary'
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'EXPENSE',
        amount: 15000,
        accountId: bankAccountId,
        categoryId: housingCategoryId,
        date: '2026-09-03T10:00:00.000Z',
        description: 'Sep Rent'
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'EXPENSE',
        amount: 5000,
        accountId: creditCardAccountId,
        categoryId: groceriesCategoryId,
        date: '2026-09-05T15:00:00.000Z',
        description: 'Sep Groceries on Card'
      });

    // Transfer: Bank -> Cash ₹2,000 (must NEVER count as income or expense)
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        fromAccountId: bankAccountId,
        toAccountId: cashAccountId,
        amount: 2000,
        date: '2026-09-06T10:00:00.000Z',
        description: 'ATM Cash Withdrawal'
      });

    // 6. User B Setup (Tenant Isolation Check)
    const userBBank = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: 'User B Bank', type: 'BANK', openingBalance: 200000 });

    const userBCats = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userBToken}`);
    const userBSalaryCat = userBCats.body.data.find((c) => c.type === 'INCOME')._id;

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        type: 'INCOME',
        amount: 500000,
        accountId: userBBank.body.data.account._id,
        categoryId: userBSalaryCat,
        date: '2026-09-01T10:00:00.000Z',
        description: 'User B Huge Salary'
      });
  });

  describe('1. Income vs Expense Trend Report (GET /api/reports/income-expense)', () => {
    it('should aggregate income and expenses across months with minor unit precision and correct savings rate', async () => {
      const res = await request(app)
        .get('/api/reports/income-expense?startDate=2026-08-01&endDate=2026-09-30&groupBy=month')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { summary, trends } = res.body.data;
      expect(summary).toBeDefined();
      expect(trends).toBeInstanceOf(Array);
      expect(trends.length).toBe(2);

      // Verify August (2026-08): Income ₹80,000 (8000000), Expense ₹25,000 (2500000)
      const augTrend = trends.find((t) => t.period === '2026-08');
      expect(augTrend).toBeDefined();
      expect(augTrend.income).toBe(8000000);
      expect(augTrend.expense).toBe(2500000);
      expect(augTrend.netSavings).toBe(5500000);
      expect(augTrend.savingsRate).toBe(68.75); // (55000/80000)*100 = 68.75%

      // Verify September (2026-09): Income ₹90,000 (9000000), Expense ₹15,000 + ₹5,000 = ₹20,000 (2000000)
      // Transfer of ₹2,000 must NOT be counted
      const sepTrend = trends.find((t) => t.period === '2026-09');
      expect(sepTrend).toBeDefined();
      expect(sepTrend.income).toBe(9000000);
      expect(sepTrend.expense).toBe(2000000);
      expect(sepTrend.netSavings).toBe(7000000);
      expect(sepTrend.savingsRate).toBe(77.78); // (70000/90000)*100 = 77.78%

      // Verify summary totals
      expect(summary.totalIncome).toBe(17000000); // ₹170,000
      expect(summary.totalExpense).toBe(4500000);  // ₹45,000
      expect(summary.netSavings).toBe(12500000);  // ₹125,000
      expect(summary.savingsRate).toBe(73.53);   // (125000/170000)*100 = 73.53%
      expect(summary.averageIncome).toBe(8500000); // 17000000 / 2 = 8500000
      expect(summary.averageExpense).toBe(2250000); // 4500000 / 2 = 2250000
    });

    it('should support weekly and daily grouping without crashing', async () => {
      const resWeek = await request(app)
        .get('/api/reports/income-expense?startDate=2026-09-01&endDate=2026-09-10&groupBy=week')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(resWeek.status).toBe(200);
      expect(resWeek.body.data.groupBy).toBe('week');
      expect(resWeek.body.data.trends.length).toBeGreaterThanOrEqual(1);

      const resDay = await request(app)
        .get('/api/reports/income-expense?startDate=2026-09-01&endDate=2026-09-05&groupBy=day')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(resDay.status).toBe(200);
      expect(resDay.body.data.groupBy).toBe('day');
      expect(resDay.body.data.trends.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. Category Spending Breakdown Report (GET /api/reports/category-spending)', () => {
    it('should return spending distribution by category with percentage shares', async () => {
      const res = await request(app)
        .get('/api/reports/category-spending?startDate=2026-09-01&endDate=2026-09-30&type=EXPENSE')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.type).toBe('EXPENSE');
      expect(data.totalAmount).toBe(2000000); // ₹15,000 + ₹5,000 = ₹20,000
      expect(data.totalTransactions).toBe(2);

      const rentItem = data.categories.find((c) => c.categoryId.toString() === housingCategoryId.toString());
      expect(rentItem).toBeDefined();
      expect(rentItem.amount).toBe(1500000);
      expect(rentItem.percentage).toBe(75); // 15,000 / 20,000 = 75%

      const grocItem = data.categories.find((c) => c.categoryId.toString() === groceriesCategoryId.toString());
      expect(grocItem).toBeDefined();
      expect(grocItem.amount).toBe(500000);
      expect(grocItem.percentage).toBe(25); // 5,000 / 20,000 = 25%
    });

    it('should return income category breakdown when type=INCOME', async () => {
      const res = await request(app)
        .get('/api/reports/category-spending?startDate=2026-09-01&endDate=2026-09-30&type=INCOME')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('INCOME');
      expect(res.body.data.totalAmount).toBe(9000000);
      expect(res.body.data.categories[0].name).toBe('Salary');
      expect(res.body.data.categories[0].percentage).toBe(100);
    });
  });

  describe('3. Cash Flow Statement Report (GET /api/reports/cash-flow)', () => {
    it('should report operational inflows, outflows, net cash flow, and account type breakdown', async () => {
      const res = await request(app)
        .get('/api/reports/cash-flow?startDate=2026-09-01&endDate=2026-09-30')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.inflows.total).toBe(9000000);
      expect(data.outflows.total).toBe(2000000);
      expect(data.netCashFlow).toBe(7000000); // Inflows - Outflows

      // Inflows categories
      expect(data.inflows.categories.length).toBe(1);
      expect(data.inflows.categories[0].name).toBe('Salary');

      // Outflows categories
      expect(data.outflows.categories.length).toBe(2);

      // Account type distribution
      expect(data.byAccountType).toBeInstanceOf(Array);
      const bankFlow = data.byAccountType.find((a) => a.accountType === 'BANK');
      expect(bankFlow).toBeDefined();
      expect(bankFlow.inflow).toBe(9000000);
      expect(bankFlow.outflow).toBe(1500000);

      const ccFlow = data.byAccountType.find((a) => a.accountType === 'CREDIT_CARD');
      expect(ccFlow).toBeDefined();
      expect(ccFlow.outflow).toBe(500000);
    });
  });

  describe('4. Net Worth Trajectory Report (GET /api/reports/net-worth)', () => {
    it('should compute net worth trajectory accurately across requested months', async () => {
      const res = await request(app)
        .get('/api/reports/net-worth?months=2&endMonth=2026-09')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.currentNetWorth).toBeDefined();
      expect(data.history).toBeInstanceOf(Array);
      expect(data.history.length).toBe(2);

      // Latest month (2026-09)
      const sepPoint = data.history.find((h) => h.month === '2026-09');
      expect(sepPoint).toBeDefined();
      expect(sepPoint.assets).toBeGreaterThan(0);
      expect(sepPoint.liabilities).toBe(500000); // Credit card debt ₹5,000
      expect(sepPoint.netWorth).toBe(sepPoint.assets - sepPoint.liabilities);

      expect(data.changeAmount).toBeDefined();
      expect(data.changePercentage).toBeDefined();
    });
  });

  describe('5. Account Growth Report (GET /api/reports/account-growth)', () => {
    it('should return balance history for a specific account', async () => {
      const res = await request(app)
        .get(`/api/reports/account-growth?accountId=${bankAccountId}&months=2&endMonth=2026-09`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.account).toBeDefined();
      expect(data.account.name).toBe('HDFC Salary Bank');
      expect(data.history.length).toBe(2);
    });
  });

  describe('6. Security & Tenant Isolation', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/reports/income-expense');
      expect(res.status).toBe(401);
    });

    it('should strictly isolate user data so User B transactions never leak into User A reports', async () => {
      const resA = await request(app)
        .get('/api/reports/income-expense?startDate=2026-09-01&endDate=2026-09-30')
        .set('Authorization', `Bearer ${userAToken}`);

      // User A income is ₹90,000 (9000000), not ₹590,000 (User B had ₹500,000 income)
      expect(resA.body.data.summary.totalIncome).toBe(9000000);

      const resB = await request(app)
        .get('/api/reports/income-expense?startDate=2026-09-01&endDate=2026-09-30')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resB.body.data.summary.totalIncome).toBe(50000000); // 500,000 * 100
    });
  });
});
