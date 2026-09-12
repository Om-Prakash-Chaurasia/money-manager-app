import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User, Account, Category } from '../src/models/index.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 4: Account APIs Integration Tests', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
    app = createApp();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await Account.deleteMany({});
      await Category.deleteMany({});
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});

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
  });

  describe('POST /api/accounts', () => {
    it('should create an account with opening balance converted to minor units', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'HDFC Salary Account',
          type: 'BANK',
          subType: 'SALARY',
          currency: 'INR',
          openingBalance: 25000.50, // Major units
          color: '#3B82F6',
          icon: 'landmark'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.account.name).toBe('HDFC Salary Account');
      expect(res.body.data.account.balance).toBe(2500050); // Minor units
      expect(res.body.data.account.openingBalance).toBe(2500050);

      // Verify persisted in DB
      const dbAccount = await Account.findById(res.body.data.account._id);
      expect(dbAccount.balance).toBe(2500050);
      expect(dbAccount.userId.toString()).toBe(userAId);
    });

    it('should reject duplicate account name for the same user', async () => {
      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'HDFC Bank',
          type: 'BANK'
        });

      const duplicateRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'HDFC Bank',
          type: 'BANK'
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
    });

    it('should allow two different users to have an account with the same name', async () => {
      const resA = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Salary Account', type: 'BANK' });
      expect(resA.status).toBe(201);

      const resB = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Salary Account', type: 'BANK' });
      expect(resB.status).toBe(201);
    });

    it('should reject invalid account type', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Invalid Account', type: 'BITCOIN' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/accounts', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Savings Account', type: 'BANK', openingBalance: 10000 });

      await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Credit Card', type: 'CREDIT_CARD', openingBalance: 0 });
    });

    it('should list accounts for authenticated user with net worth summary', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // User A has default Cash Wallet + Savings Account + Credit Card = 3 accounts
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.meta.summary).toBeDefined();
      expect(res.body.meta.summary.totalAssets).toBe(1000000); // 10,000 * 100
    });

    it('should filter accounts by type', async () => {
      const res = await request(app)
        .get('/api/accounts?type=BANK')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].type).toBe('BANK');
    });

    it('should search accounts by name', async () => {
      const res = await request(app)
        .get('/api/accounts?search=Savings')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Savings Account');
    });
  });

  describe('Security & Tenant Isolation', () => {
    let accountAId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Secret Account', type: 'BANK', openingBalance: 50000 });
      accountAId = res.body.data.account._id;
    });

    it('should prevent User B from reading User A account (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/accounts/${accountAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should prevent User B from updating User A account (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/accounts/${accountAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked Account' });

      expect(res.status).toBe(404);
    });

    it('should prevent User B from deleting User A account (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/accounts/${accountAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Direct Balance Tampering Protection', () => {
    it('should ignore client attempts to directly modify balance via PATCH', async () => {
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Tamper Test', type: 'BANK', openingBalance: 1000 });
      const accountId = createRes.body.data.account._id;

      const patchRes = await request(app)
        .patch(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Renamed Account',
          balance: 999999999 // Client attempting to fake money
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.account.name).toBe('Renamed Account');
      // Balance MUST remain unchanged
      expect(patchRes.body.data.account.balance).toBe(100000);

      const dbAccount = await Account.findById(accountId);
      expect(dbAccount.balance).toBe(100000);
    });
  });

  describe('DELETE /api/accounts/:id (Soft-Delete)', () => {
    it('should soft delete account setting isActive to false', async () => {
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Old Account', type: 'BANK' });
      const accountId = createRes.body.data.account._id;

      const delRes = await request(app)
        .delete(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.status).toBe(200);

      // Verify in DB that account is not wiped, but isActive is false
      const dbAccount = await Account.findById(accountId);
      expect(dbAccount).toBeDefined();
      expect(dbAccount.isActive).toBe(false);

      // By default, GET /api/accounts excludes inactive accounts
      const getRes = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`);

      const found = getRes.body.data.find((a) => a._id === accountId);
      expect(found).toBeUndefined();
    });
  });

  describe('Account Balance and Balance History Endpoints', () => {
    it('should retrieve current balance and formatted balance', async () => {
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Balance Endpoint Test', type: 'BANK', openingBalance: 1550.25 });
      const accountId = createRes.body.data.account._id;

      const balanceRes = await request(app)
        .get(`/api/accounts/${accountId}/balance`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(balanceRes.status).toBe(200);
      expect(balanceRes.body.data.balance).toBe(155025);
      expect(balanceRes.body.data.formattedBalance).toBeDefined();
    });

    it('should retrieve account transactions endpoint successfully', async () => {
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Tx Endpoint Test', type: 'BANK' });
      const accountId = createRes.body.data.account._id;

      const txRes = await request(app)
        .get(`/api/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(txRes.status).toBe(200);
      expect(txRes.body.data).toEqual([]);
    });
  });
});
