import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User, Account, Category, Transaction, CreditCard, CreditCardStatement } from '../src/models/index.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 8: Credit Card & Statement Management Tests', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let bankAccountId;
  let shoppingCategoryId;

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
    await CreditCard.deleteMany({});
    await CreditCardStatement.deleteMany({});

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

    // Create Bank Account for User A with ₹50,000
    const bankRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Salary Account', type: 'BANK', openingBalance: 50000 });
    bankAccountId = bankRes.body.data.account._id;

    // Get shopping category for expenses
    const catsRes = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userAToken}`);
    const shopCat = catsRes.body.data.find((c) => c.name === 'Shopping');
    shoppingCategoryId = shopCat._id;
  });

  describe('POST /api/credit-cards (Creation & Backing Account Auto-Provisioning)', () => {
    it('should create credit card and automatically provision backing account', async () => {
      const res = await request(app)
        .post('/api/credit-cards')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'HDFC Regalia Gold',
          creditLimit: 100000, // ₹100,000 limit
          billingCycleDay: 15,
          dueDay: 5,
          color: '#8B5CF6'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.card.creditLimit).toBe(10000000); // 100,000 * 100 paise
      expect(res.body.data.card.outstanding).toBe(0);
      expect(res.body.data.card.availableCredit).toBe(10000000);

      // Verify backing account exists in DB
      const backingAcc = await Account.findById(res.body.data.card.accountId._id);
      expect(backingAcc).toBeDefined();
      expect(backingAcc.type).toBe('CREDIT_CARD');
      expect(backingAcc.name).toBe('HDFC Regalia Gold');
    });
  });

  describe('Credit Card Purchase & Bill Payment Lifecycle (Section 11 & 61)', () => {
    let cardId;
    let cardAccountId;

    beforeEach(async () => {
      const cardRes = await request(app)
        .post('/api/credit-cards')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Kotak White Credit Card',
          creditLimit: 100000,
          billingCycleDay: 20,
          dueDay: 10
        });
      cardId = cardRes.body.data.card._id;
      cardAccountId = cardRes.body.data.card.accountId._id;
    });

    it('should track credit card spend as liability and settle via transfer without double-counting expenses', async () => {
      // 1. User spends ₹3,000 using Credit Card
      const spendRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 3000,
          date: '2026-09-12',
          description: 'Zara Clothes Purchase',
          accountId: cardAccountId,
          categoryId: shoppingCategoryId
        });

      expect(spendRes.status).toBe(201);

      // Verify Outstanding and Available Credit
      const outRes = await request(app)
        .get(`/api/credit-cards/${cardId}/outstanding`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(outRes.status).toBe(200);
      expect(outRes.body.data.outstanding).toBe(300000); // ₹3,000 (300,000 paise)
      expect(outRes.body.data.availableCredit).toBe(9700000); // ₹97,000 (9,700,000 paise)

      // Verify aggregate transactions (Expense = ₹3,000)
      let summaryRes = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(summaryRes.body.meta.summary.totalExpense).toBe(300000);

      // 2. Later, User pays the credit card bill from Bank Account: ₹3,000
      const payRes = await request(app)
        .post(`/api/credit-cards/${cardId}/payment`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: bankAccountId,
          amount: 3000,
          date: '2026-09-25',
          note: 'Full payment'
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);

      // Bank account balance: 50,000 - 3,000 = 47,000 (4,700,000 paise)
      expect(payRes.body.data.sourceAccount.newBalance).toBe(4700000);

      // Credit card outstanding returns to 0
      expect(payRes.body.data.creditCard.newOutstanding).toBe(0);
      expect(payRes.body.data.creditCard.availableCredit).toBe(10000000);

      // Section 61 Critical Check: Payment must NOT be counted as another expense!
      // Total expenses must REMAIN ₹3,000!
      summaryRes = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(summaryRes.body.meta.summary.totalExpense).toBe(300000); // Remained 3,000
      expect(summaryRes.body.meta.summary.totalTransfer).toBe(300000); // Recorded as transfer
    });
  });

  describe('Credit Card Statement Generation & Payment Tracking', () => {
    let cardId;

    beforeEach(async () => {
      const cardRes = await request(app)
        .post('/api/credit-cards')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'ICICI Amazon Pay',
          creditLimit: 50000,
          billingCycleDay: 18,
          dueDay: 7
        });
      cardId = cardRes.body.data.card._id;
    });

    it('should generate statement and track partial/full payments', async () => {
      // 1. Create Statement: ₹10,000 total, ₹1,000 minimum
      const stmtRes = await request(app)
        .post(`/api/credit-cards/${cardId}/statements`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          statementDate: '2026-09-18',
          dueDate: '2026-10-07',
          totalAmount: 10000,
          minimumAmount: 1000
        });

      expect(stmtRes.status).toBe(201);
      const statementId = stmtRes.body.data.statement._id;
      expect(stmtRes.body.data.statement.status).toBe('UNPAID');

      // 2. Make Partial Payment: ₹4,000
      const partPayRes = await request(app)
        .post(`/api/credit-cards/${cardId}/payment`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: bankAccountId,
          amount: 4000,
          statementId
        });

      expect(partPayRes.status).toBe(200);
      expect(partPayRes.body.data.statement.status).toBe('PARTIAL');
      expect(partPayRes.body.data.statement.paidAmount).toBe(400000);

      // 3. Complete Remaining Payment: ₹6,000
      const fullPayRes = await request(app)
        .post(`/api/credit-cards/${cardId}/payment`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: bankAccountId,
          amount: 6000,
          statementId
        });

      expect(fullPayRes.status).toBe(200);
      expect(fullPayRes.body.data.statement.status).toBe('PAID');
      expect(fullPayRes.body.data.statement.paidAmount).toBe(1000000);
    });
  });

  describe('Security & Tenant Isolation', () => {
    let cardAId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/credit-cards')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'User A Card',
          creditLimit: 50000,
          billingCycleDay: 1,
          dueDay: 20
        });
      cardAId = res.body.data.card._id;
    });

    it('should prevent User B from viewing User A credit card', async () => {
      const res = await request(app)
        .get(`/api/credit-cards/${cardAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('should prevent User B from paying User A credit card', async () => {
      const res = await request(app)
        .post(`/api/credit-cards/${cardAId}/payment`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          fromAccountId: bankAccountId,
          amount: 1000
        });

      expect(res.status).toBe(404);
    });
  });
});
