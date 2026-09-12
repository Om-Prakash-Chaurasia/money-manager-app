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
  CreditCardStatement,
  TransactionAttachment
} from '../src/models/index.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 14: Data Export & Backup Engine Integration Tests', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let bankAccountId;
  let cashAccountId;
  let housingCatId;
  let salaryCatId;

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
      await TransactionAttachment.deleteMany({});
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
    await TransactionAttachment.deleteMany({});

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

    // User A Accounts
    const bankRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'HDFC Bank', type: 'BANK', openingBalance: 50000 });
    bankAccountId = bankRes.body.data.account._id;

    const cashRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Wallet Cash', type: 'CASH', openingBalance: 10000 });
    cashAccountId = cashRes.body.data.account._id;

    // Categories
    const catsRes = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userAToken}`);
    const houseCat = catsRes.body.data.find((c) => c.name === 'Housing & Rent');
    const salCat = catsRes.body.data.find((c) => c.name === 'Salary');

    housingCatId = houseCat ? houseCat._id : catsRes.body.data[0]._id;
    salaryCatId = salCat ? salCat._id : catsRes.body.data[1]._id;

    // Transactions with special characters to test CSV quoting
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'INCOME',
        amount: 80000,
        accountId: bankAccountId,
        categoryId: salaryCatId,
        date: '2026-09-01T10:00:00.000Z',
        description: 'September "Full" Salary, with Bonus'
      });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'EXPENSE',
        amount: 25000,
        accountId: bankAccountId,
        categoryId: housingCatId,
        date: '2026-09-05T12:00:00.000Z',
        description: 'House Rent, Maintenance'
      });

    // Transfer
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        fromAccountId: bankAccountId,
        toAccountId: cashAccountId,
        amount: 5000,
        date: '2026-09-06T10:00:00.000Z',
        description: 'ATM Withdrawal'
      });

    // User B Data (for isolation test)
    const bAcc = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: 'User B Secret Bank', type: 'BANK', openingBalance: 1000000 });

    const bCatsRes = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userBToken}`);
    const bSalCat = bCatsRes.body.data.find((c) => c.type === 'INCOME');

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        type: 'INCOME',
        amount: 999999,
        accountId: bAcc.body.data.account._id,
        categoryId: bSalCat._id,
        date: '2026-09-01T10:00:00.000Z',
        description: 'Secret Millions'
      });
  });

  describe('1. Transactions Export (GET /api/export/transactions)', () => {
    it('should export transactions as properly escaped RFC 4180 CSV', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=csv')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="transactions_.+\.csv"/);

      const csv = res.text;
      // Header check
      expect(csv).toContain('"Date"');
      expect(csv).toContain('"Type"');
      expect(csv).toContain('"Amount"');
      expect(csv).toContain('"Description"');

      // Check properly escaped cells with quotes and commas
      expect(csv).toContain('"September ""Full"" Salary, with Bonus"');
      expect(csv).toContain('"House Rent, Maintenance"');
      expect(csv).toContain('"ATM Withdrawal"');

      // Verify amounts in major units
      expect(csv).toContain('"80000.00"'); // ₹80,000.00
      expect(csv).toContain('"25000.00"'); // ₹25,000.00
      expect(csv).toContain('"5000.00"');  // ₹5,000.00
    });

    it('should export transactions as JSON with resolved names', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=json')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="transactions_.+\.json"/);

      const data = res.body;
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBe(3);

      const salaryTx = data.find((t) => t.type === 'INCOME');
      expect(salaryTx).toBeDefined();
      expect(salaryTx.amount).toBe(8000000);
      expect(salaryTx.amountMajor).toBe(80000);
      expect(salaryTx.account.name).toBe('HDFC Bank');
    });

    it('should filter transactions export by type', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=json&type=EXPENSE')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].type).toBe('EXPENSE');
    });
  });

  describe('2. Accounts Export (GET /api/export/accounts)', () => {
    it('should export accounts as CSV', async () => {
      const res = await request(app)
        .get('/api/export/accounts?format=csv')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="accounts_.+\.csv"/);

      const csv = res.text;
      expect(csv).toContain('"Account Name"');
      expect(csv).toContain('"HDFC Bank"');
      expect(csv).toContain('"Wallet Cash"');
    });

    it('should export accounts as JSON', async () => {
      const res = await request(app)
        .get('/api/export/accounts?format=json')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(3); // 1 default cash wallet + 2 user-created accounts
      expect(res.body[0].name).toBeDefined();
      expect(res.body[0].balanceMajor).toBeDefined();
    });
  });

  describe('3. Full Backup Export (GET /api/export/full-backup)', () => {
    it('should generate a complete JSON financial universe snapshot without leaking password hashes', async () => {
      const res = await request(app)
        .get('/api/export/full-backup')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="money_manager_backup_.+\.json"/);

      const backup = JSON.parse(res.text);
      expect(backup.version).toBe('1.0');
      expect(backup.exportedAt).toBeDefined();
      expect(backup.user).toBeDefined();
      expect(backup.user.email).toBe('usera@example.com');
      expect(backup.user.passwordHash).toBeUndefined(); // NEVER EXPOSED!

      expect(backup.counts).toBeDefined();
      expect(backup.counts.accounts).toBe(3); // 1 default cash wallet + 2 user-created accounts
      expect(backup.counts.transactions).toBe(3);

      expect(backup.data).toBeDefined();
      expect(backup.data.accounts.length).toBe(3);
      expect(backup.data.transactions.length).toBe(3);
      expect(backup.data.categories.length).toBeGreaterThan(0);
    });
  });

  describe('4. Security & Tenant Isolation', () => {
    it('should reject unauthenticated export requests with 401', async () => {
      const res = await request(app).get('/api/export/transactions');
      expect(res.status).toBe(401);
    });

    it('should never include another user data in exports', async () => {
      const resA = await request(app)
        .get('/api/export/transactions?format=csv')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(resA.text).not.toContain('Secret Millions');
      expect(resA.text).not.toContain('User B Secret Bank');

      const resB = await request(app)
        .get('/api/export/transactions?format=csv')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resB.text).toContain('Secret Millions');
      expect(resB.text).not.toContain('September "Full" Salary');
    });
  });
});
