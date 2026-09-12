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
import { processDueRecurringTransactions } from '../src/jobs/recurringTransactionJob.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 10: Recurring Transactions & Cron Job Tests', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let bankAccountId;
  let savingsAccountId;
  let rentCategoryId;
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

    // 3. Create Accounts for User A
    const bankRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Salary Account', type: 'BANK', openingBalance: 100000 }); // ₹100,000
    bankAccountId = bankRes.body.data.account._id;

    const savRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Emergency Savings', type: 'BANK', openingBalance: 10000 }); // ₹10,000
    savingsAccountId = savRes.body.data.account._id;

    // 4. Fetch User A categories
    const catsRes = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userAToken}`);

    const cats = catsRes.body.data;
    const rentCat = cats.find((c) => c.name === 'Housing & Rent');
    const salCat = cats.find((c) => c.name === 'Salary');

    rentCategoryId = rentCat ? rentCat._id : cats.find((c) => c.type === 'EXPENSE')._id;
    salaryCategoryId = salCat ? salCat._id : cats.find((c) => c.type === 'INCOME')._id;
  });

  describe('POST /api/recurring-transactions (Creation & Validation)', () => {
    it('should create an EXPENSE recurring template with minor unit conversion', async () => {
      const res = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Apartment Monthly Rent',
          type: 'EXPENSE',
          amount: 25000, // ₹25,000.00
          frequency: 'MONTHLY',
          startDate: '2026-10-01T00:00:00.000Z',
          accountId: bankAccountId,
          categoryId: rentCategoryId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Apartment Monthly Rent');
      expect(res.body.data.type).toBe('EXPENSE');
      expect(res.body.data.amount).toBe(25000);
      expect(res.body.data.amountMinor).toBe(2500000);
      expect(res.body.data.frequency).toBe('MONTHLY');
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.account.name).toBe('Salary Account');
      expect(res.body.data.category.id).toBe(rentCategoryId.toString());
    });

    it('should create a TRANSFER recurring template with fromAccount and toAccount', async () => {
      const res = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Monthly SIP Savings',
          type: 'TRANSFER',
          amount: 10000, // ₹10,000.00
          frequency: 'MONTHLY',
          startDate: '2026-10-05T00:00:00.000Z',
          fromAccountId: bankAccountId,
          toAccountId: savingsAccountId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('TRANSFER');
      expect(res.body.data.fromAccount.name).toBe('Salary Account');
      expect(res.body.data.toAccount.name).toBe('Emergency Savings');
    });

    it('should reject transfer when fromAccount equals toAccount', async () => {
      const res = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Invalid Self Transfer',
          type: 'TRANSFER',
          amount: 5000,
          frequency: 'MONTHLY',
          startDate: '2026-10-01T00:00:00.000Z',
          fromAccountId: bankAccountId,
          toAccountId: bankAccountId // Identical
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot be the same/i);
    });

    it('should reject endDate earlier than startDate', async () => {
      const res = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Gym Subscription',
          type: 'EXPENSE',
          amount: 2000,
          frequency: 'MONTHLY',
          startDate: '2026-10-01T00:00:00.000Z',
          endDate: '2026-08-01T00:00:00.000Z', // Before start
          accountId: bankAccountId,
          categoryId: rentCategoryId
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/End date cannot be earlier/i);
    });
  });

  describe('GET, PATCH & DELETE /api/recurring-transactions', () => {
    let templateId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Internet Fiber Bill',
          type: 'EXPENSE',
          amount: 1500,
          frequency: 'MONTHLY',
          startDate: '2026-09-01T00:00:00.000Z',
          accountId: bankAccountId,
          categoryId: rentCategoryId
        });
      templateId = createRes.body.data.id;
    });

    it('should get recurring templates list', async () => {
      const res = await request(app)
        .get('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Internet Fiber Bill');
    });

    it('should get single recurring template by ID', async () => {
      const res = await request(app)
        .get(`/api/recurring-transactions/${templateId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(templateId);
      expect(res.body.data.amount).toBe(1500);
    });

    it('should update recurring template amount and status', async () => {
      const res = await request(app)
        .patch(`/api/recurring-transactions/${templateId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Upgraded Fiber 500Mbps',
          amount: 2200,
          isActive: false
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Upgraded Fiber 500Mbps');
      expect(res.body.data.amount).toBe(2200);
      expect(res.body.data.amountMinor).toBe(220000);
      expect(res.body.data.isActive).toBe(false);
    });

    it('should delete recurring template', async () => {
      const delRes = await request(app)
        .delete(`/api/recurring-transactions/${templateId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.status).toBe(200);

      const getRes = await request(app)
        .get(`/api/recurring-transactions/${templateId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('POST /api/recurring-transactions/:id/execute (Atomic Execution)', () => {
    it('should execute an EXPENSE template: debit account, generate transaction, and advance nextRunDate', async () => {
      // 1. Create monthly rent template of ₹25,000
      const createRes = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'House Rent',
          type: 'EXPENSE',
          amount: 25000, // ₹25,000
          frequency: 'MONTHLY',
          startDate: '2026-09-01T00:00:00.000Z',
          accountId: bankAccountId,
          categoryId: rentCategoryId
        });
      const templateId = createRes.body.data.id;

      // Initial bank balance is ₹100,000
      const initialBank = await Account.findById(bankAccountId);
      expect(initialBank.balance).toBe(10000000); // minor units

      // 2. Execute template
      const execRes = await request(app)
        .post(`/api/recurring-transactions/${templateId}/execute`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(execRes.status).toBe(200);
      expect(execRes.body.success).toBe(true);
      expect(execRes.body.data.transaction.amount).toBe(2500000);
      expect(execRes.body.data.transaction.type).toBe('EXPENSE');

      // 3. Bank balance must now be ₹75,000 (100,000 - 25,000)
      const updatedBank = await Account.findById(bankAccountId);
      expect(updatedBank.balance).toBe(7500000); // 75,000 * 100

      // 4. Template nextRunDate should have advanced by 1 month (from 2026-09-01 to 2026-10-01)
      const updatedTemplate = await RecurringTransaction.findById(templateId);
      expect(new Date(updatedTemplate.nextRunDate).getUTCMonth()).toBe(9); // Month index 9 = October
      expect(updatedTemplate.lastRunDate).toBeTruthy();
    });

    it('should execute a TRANSFER template: adjust both accounts atomically', async () => {
      // Bank has ₹100,000, Savings has ₹10,000
      const createRes = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Monthly Savings Deposit',
          type: 'TRANSFER',
          amount: 20000, // ₹20,000
          frequency: 'MONTHLY',
          startDate: '2026-09-01T00:00:00.000Z',
          fromAccountId: bankAccountId,
          toAccountId: savingsAccountId
        });
      const templateId = createRes.body.data.id;

      // Execute transfer
      const execRes = await request(app)
        .post(`/api/recurring-transactions/${templateId}/execute`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(execRes.status).toBe(200);

      const bank = await Account.findById(bankAccountId);
      const savings = await Account.findById(savingsAccountId);

      // Bank debited: 100,000 - 20,000 = ₹80,000
      expect(bank.balance).toBe(8000000);
      // Savings credited: 10,000 + 20,000 = ₹30,000
      expect(savings.balance).toBe(3000000);
    });
  });

  describe('Background Cron Processor (processDueRecurringTransactions)', () => {
    it('should identify due recurring templates, execute them, and deactivate if past endDate', async () => {
      // 1. Create a template with nextRunDate in the past and endDate set to today
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2); // 2 days ago

      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // 1 day ago (cutoff)

      const template = await RecurringTransaction.create({
        userId: userAId,
        title: 'Expiring Trial Service',
        type: 'EXPENSE',
        amount: 50000, // ₹500
        frequency: 'DAILY',
        startDate: pastDate,
        endDate: endDate,
        nextRunDate: pastDate,
        accountId: bankAccountId,
        categoryId: rentCategoryId,
        isActive: true
      });

      // 2. Run background processor
      const jobStats = await processDueRecurringTransactions(new Date());

      expect(jobStats.totalDue).toBeGreaterThanOrEqual(1);
      expect(jobStats.processed).toBeGreaterThanOrEqual(1);
      expect(jobStats.failed).toBe(0);

      // 3. Template should now be deactivated because nextRunDate exceeded endDate
      const finishedTemplate = await RecurringTransaction.findById(template._id);
      expect(finishedTemplate.isActive).toBe(false);
      expect(finishedTemplate.lastRunDate).toBeTruthy();
    });
  });

  describe('Multi-Tenancy Security', () => {
    it('should prevent User B from viewing, modifying, or executing User A recurring template', async () => {
      const createRes = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'User A Secret Bill',
          type: 'EXPENSE',
          amount: 5000,
          frequency: 'MONTHLY',
          startDate: '2026-09-01T00:00:00.000Z',
          accountId: bankAccountId,
          categoryId: rentCategoryId
        });
      const templateId = createRes.body.data.id;

      // User B attempts GET
      const getRes = await request(app)
        .get(`/api/recurring-transactions/${templateId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(getRes.status).toBe(404);

      // User B attempts PATCH
      const patchRes = await request(app)
        .patch(`/api/recurring-transactions/${templateId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ amount: 100 });
      expect(patchRes.status).toBe(404);

      // User B attempts DELETE
      const delRes = await request(app)
        .delete(`/api/recurring-transactions/${templateId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(delRes.status).toBe(404);

      // User B attempts execute
      const execRes = await request(app)
        .post(`/api/recurring-transactions/${templateId}/execute`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(execRes.status).toBe(404);
    });

    it('should prevent User B from creating a template using User A account', async () => {
      const res = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          title: 'Theft Attempt',
          type: 'EXPENSE',
          amount: 5000,
          frequency: 'MONTHLY',
          startDate: '2026-09-01T00:00:00.000Z',
          accountId: bankAccountId, // User A's account
          categoryId: rentCategoryId
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Account not found/i);
    });
  });
});
