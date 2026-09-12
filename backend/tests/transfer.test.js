import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User, Account, Category, Transaction } from '../src/models/index.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 7: Transfer APIs & Double-Entry Invariants', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let accountAId;
  let accountBId;
  let userBAccountId;

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

    // Create Account A: ₹20,000 opening balance
    const accARes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Salary Account A', type: 'BANK', openingBalance: 20000 });
    accountAId = accARes.body.data.account._id;

    // Create Account B: ₹5,000 opening balance
    const accBRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Savings Account B', type: 'BANK', openingBalance: 5000 });
    accountBId = accBRes.body.data.account._id;

    // Create Account for User B
    const userBAccRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: 'User B Bank', type: 'BANK', openingBalance: 50000 });
    userBAccountId = userBAccRes.body.data.account._id;
  });

  describe('Section 50 Transfer Test (A = ₹20,000, B = ₹5,000, Transfer ₹10,000)', () => {
    it('should correctly transfer ₹10,000: A becomes ₹10,000, B becomes ₹15,000, and net worth remains unchanged', async () => {
      // Pre-condition check
      let accA = await Account.findById(accountAId);
      let accB = await Account.findById(accountBId);
      expect(accA.balance).toBe(2000000); // ₹20,000
      expect(accB.balance).toBe(500000);  // ₹5,000

      // Execute Transfer: ₹10,000
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: accountAId,
          toAccountId: accountBId,
          amount: 10000,
          date: '2026-09-12',
          note: 'Monthly savings transfer'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify returned balances
      expect(res.body.data.sourceAccount.newBalance).toBe(1000000);      // ₹10,000
      expect(res.body.data.destinationAccount.newBalance).toBe(1500000); // ₹15,000

      // Verify persisted in DB
      accA = await Account.findById(accountAId);
      accB = await Account.findById(accountBId);
      expect(accA.balance).toBe(1000000);
      expect(accB.balance).toBe(1500000);

      // Verify Ledger Record
      const tx = await Transaction.findById(res.body.data.transfer._id);
      expect(tx).toBeDefined();
      expect(tx.type).toBe('TRANSFER');
      expect(tx.amount).toBe(1000000);
      expect(tx.categoryId).toBeNull();
      expect(tx.fromAccountId.toString()).toBe(accountAId);
      expect(tx.toAccountId.toString()).toBe(accountBId);

      // Section 61 Invariant: Transfer MUST NOT be counted as Income or Expense!
      const txSummaryRes = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(txSummaryRes.status).toBe(200);
      expect(txSummaryRes.body.meta.summary.totalIncome).toBe(0);
      expect(txSummaryRes.body.meta.summary.totalExpense).toBe(0);
      expect(txSummaryRes.body.meta.summary.totalTransfer).toBe(1000000);
      expect(txSummaryRes.body.meta.summary.netSavings).toBe(0);
    });
  });

  describe('Validation & Insufficient Funds Protection', () => {
    it('should reject transfer when source account has insufficient funds and preserve balances', async () => {
      // Source A has ₹20,000; attempt to transfer ₹25,000
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: accountAId,
          toAccountId: accountBId,
          amount: 25000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/insufficient/i);

      // Balances must remain completely untouched
      const accA = await Account.findById(accountAId);
      const accB = await Account.findById(accountBId);
      expect(accA.balance).toBe(2000000);
      expect(accB.balance).toBe(500000);
    });

    it('should reject transfer when source and destination accounts are identical', async () => {
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: accountAId,
          toAccountId: accountAId,
          amount: 1000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Tenant Isolation & Cross-User Security', () => {
    it('should reject transfer if source account belongs to another user (returns 404)', async () => {
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: userBAccountId, // Belongs to User B
          toAccountId: accountBId,
          amount: 5000
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/source account not found/i);
    });

    it('should reject transfer if destination account belongs to another user (returns 404)', async () => {
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: accountAId,
          toAccountId: userBAccountId, // Belongs to User B
          amount: 5000
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/destination account not found/i);
    });
  });

  describe('GET /api/transfers (Listing & Detail)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: accountAId,
          toAccountId: accountBId,
          amount: 2000,
          date: '2026-09-10'
        });

      await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: accountAId,
          toAccountId: accountBId,
          amount: 3000,
          date: '2026-09-12'
        });
    });

    it('should retrieve list of transfers for user', async () => {
      const res = await request(app)
        .get('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.data[0].fromAccountId.name).toBe('Salary Account A');
      expect(res.body.data[0].toAccountId.name).toBe('Savings Account B');
    });

    it('should retrieve single transfer by ID', async () => {
      const listRes = await request(app)
        .get('/api/transfers')
        .set('Authorization', `Bearer ${userAToken}`);

      const transferId = listRes.body.data[0]._id;

      const singleRes = await request(app)
        .get(`/api/transfers/${transferId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(singleRes.status).toBe(200);
      expect(singleRes.body.data.transfer._id).toBe(transferId);
    });
  });
});
