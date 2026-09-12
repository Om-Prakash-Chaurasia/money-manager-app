import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User, Account, Category, Transaction } from '../src/models/index.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 6: Transaction APIs & Atomic Ledger Integration Tests', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let salaryAccountId;
  let savingsAccountId;
  let groceryCategoryId;
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
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123'
    });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password123'
    });
    userBToken = resB.body.data.accessToken;
    userBId = resB.body.data.user.id;

    // Create Account A: Salary Account with ₹20,000 opening balance
    const accARes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Salary Account', type: 'BANK', openingBalance: 20000 });
    salaryAccountId = accARes.body.data.account._id;

    // Create Account B: Savings Account with ₹10,000 opening balance
    const accBRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Savings Account', type: 'BANK', openingBalance: 10000 });
    savingsAccountId = accBRes.body.data.account._id;

    // Retrieve default Groceries and Salary category IDs
    const catsRes = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userAToken}`);

    const groc = catsRes.body.data.find((c) => c.name === 'Groceries');
    groceryCategoryId = groc._id;

    const sal = catsRes.body.data.find((c) => c.name === 'Salary');
    salaryCategoryId = sal._id;
  });

  describe('Financial Ledger Invariants (Section 50 Critical Test)', () => {
    it('should correctly apply Expense, two-phase Edit, and Delete balance reversals', async () => {
      // 1. Initial State: Account has ₹20,000 (2,000,000 paise)
      let acc = await Account.findById(salaryAccountId);
      expect(acc.balance).toBe(2000000);

      // 2. Record Expense = ₹2,000
      const createRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 2000,
          date: '2026-09-12',
          description: 'Supermarket Groceries',
          accountId: salaryAccountId,
          categoryId: groceryCategoryId
        });

      expect(createRes.status).toBe(201);
      const txId = createRes.body.data.transaction._id;

      // Expected balance: ₹20,000 - ₹2,000 = ₹18,000 (1,800,000 paise)
      acc = await Account.findById(salaryAccountId);
      expect(acc.balance).toBe(1800000);

      // 3. Edit transaction amount to ₹3,000
      // Reverse ₹2,000 (18,000 -> 20,000) then apply ₹3,000 (20,000 -> 17,000)
      const editRes = await request(app)
        .patch(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ amount: 3000 });

      expect(editRes.status).toBe(200);

      // Expected balance: ₹17,000 (1,700,000 paise)
      acc = await Account.findById(salaryAccountId);
      expect(acc.balance).toBe(1700000);

      // 4. Delete transaction
      // Reverses ₹3,000 (17,000 -> 20,000)
      const delRes = await request(app)
        .delete(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.status).toBe(200);

      // Expected balance restored to ₹20,000 (2,000,000 paise)
      acc = await Account.findById(salaryAccountId);
      expect(acc.balance).toBe(2000000);

      // Verify transaction is soft-deleted
      const txDb = await Transaction.findById(txId);
      expect(txDb.isDeleted).toBe(true);
    });

    it('should correctly handle account transfer during transaction edit', async () => {
      // Account A = 20,000, Account B = 10,000
      // Create Expense of 2,000 on Account A
      const createRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 2000,
          date: '2026-09-12',
          description: 'Office Dinner',
          accountId: salaryAccountId,
          categoryId: groceryCategoryId
        });
      const txId = createRes.body.data.transaction._id;

      let accA = await Account.findById(salaryAccountId);
      expect(accA.balance).toBe(1800000); // 20,000 - 2,000 = 18,000

      // Now switch transaction to Account B with amount 4,000
      const editRes = await request(app)
        .patch(`/api/transactions/${txId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          accountId: savingsAccountId,
          amount: 4000
        });

      expect(editRes.status).toBe(200);

      // Account A should be restored: 18,000 + 2,000 = 20,000 (2,000,000 paise)
      accA = await Account.findById(salaryAccountId);
      expect(accA.balance).toBe(2000000);

      // Account B should be deducted: 10,000 - 4,000 = 6,000 (600,000 paise)
      const accB = await Account.findById(savingsAccountId);
      expect(accB.balance).toBe(600000);
    });

    it('should correctly record Income and increase balance', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'INCOME',
          amount: 50000,
          date: '2026-09-01',
          description: 'Monthly Salary',
          accountId: salaryAccountId,
          categoryId: salaryCategoryId
        });

      expect(res.status).toBe(201);

      // Expected balance: 20,000 + 50,000 = 70,000 (7,000,000 paise)
      const acc = await Account.findById(salaryAccountId);
      expect(acc.balance).toBe(7000000);
    });
  });

  describe('GET /api/transactions (Filtering, Search & Pagination)', () => {
    beforeEach(async () => {
      // Create 3 transactions
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'INCOME',
          amount: 40000,
          date: '2026-09-01',
          description: 'Company Salary',
          accountId: salaryAccountId,
          categoryId: salaryCategoryId
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 1500,
          date: '2026-09-05',
          description: 'Supermarket Groceries',
          accountId: salaryAccountId,
          categoryId: groceryCategoryId
        });

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 3000,
          date: '2026-09-10',
          description: 'Organic Fruits & Veggies',
          accountId: salaryAccountId,
          categoryId: groceryCategoryId
        });
    });

    it('should list transactions with financial summary', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination.total).toBe(3);

      // Summary checks
      expect(res.body.meta.summary.totalIncome).toBe(4000000);
      expect(res.body.meta.summary.totalExpense).toBe(450000);
      expect(res.body.meta.summary.netSavings).toBe(3550000);
    });

    it('should filter by transaction type=EXPENSE', async () => {
      const res = await request(app)
        .get('/api/transactions?type=EXPENSE')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((t) => t.type === 'EXPENSE')).toBe(true);
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/transactions?startDate=2026-09-02&endDate=2026-09-06')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].description).toBe('Supermarket Groceries');
    });

    it('should filter by keyword search', async () => {
      const res = await request(app)
        .get('/api/transactions?search=Fruits')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].description).toBe('Organic Fruits & Veggies');
    });
  });

  describe('Security & Tenant Isolation', () => {
    let txAId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 500,
          date: '2026-09-12',
          description: 'User A Secret Purchase',
          accountId: salaryAccountId,
          categoryId: groceryCategoryId
        });
      txAId = res.body.data.transaction._id;
    });

    it('should prevent User B from reading User A transaction', async () => {
      const res = await request(app)
        .get(`/api/transactions/${txAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('should prevent User B from editing User A transaction', async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ amount: 9999 });

      expect(res.status).toBe(404);
    });

    it('should prevent User B from deleting User A transaction', async () => {
      const res = await request(app)
        .delete(`/api/transactions/${txAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });
});
