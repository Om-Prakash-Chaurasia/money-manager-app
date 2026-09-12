import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import {
  User,
  Account,
  Category,
  Transaction,
  Budget,
  CreditCard,
  CreditCardStatement
} from '../src/models/index.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 9: Budgets Engine Integration Tests', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let bankAccountId;
  let foodCategoryId;
  let groceriesCategoryId;
  let restaurantsCategoryId;
  let shoppingCategoryId;
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

    // 3. Create Bank Account for User A with ₹100,000
    const bankRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Salary Account', type: 'BANK', openingBalance: 100000 });
    bankAccountId = bankRes.body.data.account._id;

    // 4. Fetch User A categories
    const catsRes = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userAToken}`);

    const cats = catsRes.body.data;
    const foodCat = cats.find((c) => c.name === 'Food & Dining' && !c.parentId);
    const grocCat = cats.find((c) => c.name === 'Groceries');
    const restCat = cats.find((c) => c.name === 'Restaurants');
    const shopCat = cats.find((c) => c.name === 'Shopping');
    const salCat = cats.find((c) => c.name === 'Salary');

    foodCategoryId = foodCat._id;
    groceriesCategoryId = grocCat._id;
    restaurantsCategoryId = restCat._id;
    shoppingCategoryId = shopCat._id;
    salaryCategoryId = salCat._id;
  });

  describe('POST /api/budgets (Creation & Validations)', () => {
    it('should create a budget for an EXPENSE category with amount in minor units', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: foodCategoryId,
          month: '2026-09',
          amount: 10000 // ₹10,000.00
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.month).toBe('2026-09');
      expect(res.body.data.amount).toBe(10000);
      expect(res.body.data.amountMinor).toBe(1000000); // 10,000 * 100 paise
      expect(res.body.data.spent).toBe(0);
      expect(res.body.data.remaining).toBe(10000);
      expect(res.body.data.percentageUsed).toBe(0);
      expect(res.body.data.status).toBe('HEALTHY');
      expect(res.body.data.category.name).toBe('Food & Dining');
    });

    it('should reject creating a budget for an INCOME category', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: salaryCategoryId, // INCOME category
          month: '2026-09',
          amount: 50000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only be assigned to EXPENSE categories/i);
    });

    it('should reject duplicate budget for the same category and month (409 Conflict)', async () => {
      // First creation
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: foodCategoryId,
          month: '2026-09',
          amount: 10000
        });

      // Duplicate attempt
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: foodCategoryId,
          month: '2026-09',
          amount: 12000
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject invalid month format', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: foodCategoryId,
          month: '2026-9', // Invalid format, should be YYYY-MM
          amount: 10000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Dynamic Expense Rollup (Parent + Subcategory Aggregation)', () => {
    it('should roll up expenses from parent category AND all its subcategories into budget spent', async () => {
      // 1. Create a ₹10,000 budget for parent "Food & Dining" for 2026-09
      const budgetRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: foodCategoryId,
          month: '2026-09',
          amount: 10000
        });
      const budgetId = budgetRes.body.data.id;

      // 2. Add expense on parent "Food & Dining": ₹2,500
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 2500,
          accountId: bankAccountId,
          categoryId: foodCategoryId,
          date: '2026-09-05T12:00:00.000Z',
          description: 'Dining out'
        });

      // 3. Add expense on subcategory "Groceries": ₹3,500
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 3500,
          accountId: bankAccountId,
          categoryId: groceriesCategoryId,
          date: '2026-09-10T14:00:00.000Z',
          description: 'Supermarket supplies'
        });

      // 4. Add expense on subcategory "Restaurants": ₹3,000
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 3000,
          accountId: bankAccountId,
          categoryId: restaurantsCategoryId,
          date: '2026-09-15T20:00:00.000Z',
          description: 'Weekend dinner'
        });

      // 5. Add expense in a DIFFERENT category "Shopping": ₹4,000 (must NOT be counted)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 4000,
          accountId: bankAccountId,
          categoryId: shoppingCategoryId,
          date: '2026-09-16T18:00:00.000Z',
          description: 'Electronics'
        });

      // 6. Add expense in a DIFFERENT month (October 2026): ₹2,000 (must NOT be counted)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 2000,
          accountId: bankAccountId,
          categoryId: groceriesCategoryId,
          date: '2026-10-02T10:00:00.000Z',
          description: 'October Groceries'
        });

      // 7. Verify dynamic budget calculation:
      // Total spent = 2500 + 3500 + 3000 = ₹9,000 (90%)
      const getRes = await request(app)
        .get(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.amount).toBe(10000);
      expect(getRes.body.data.spent).toBe(9000);
      expect(getRes.body.data.spentMinor).toBe(900000);
      expect(getRes.body.data.remaining).toBe(1000);
      expect(getRes.body.data.percentageUsed).toBe(90);
      expect(getRes.body.data.status).toBe('WARNING'); // 80% <= 90% < 100%

      // 8. Add another ₹2,000 expense -> Total spent = ₹11,000 (110%) -> EXCEEDED
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 2000,
          accountId: bankAccountId,
          categoryId: groceriesCategoryId,
          date: '2026-09-20T11:00:00.000Z',
          description: 'Extra groceries'
        });

      const exceededRes = await request(app)
        .get(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(exceededRes.status).toBe(200);
      expect(exceededRes.body.data.spent).toBe(11000);
      expect(exceededRes.body.data.remaining).toBe(0);
      expect(exceededRes.body.data.percentageUsed).toBe(110);
      expect(exceededRes.body.data.status).toBe('EXCEEDED');
    });
  });

  describe('PATCH & DELETE /api/budgets/:id', () => {
    it('should update budget amount and dynamically recalculate health status', async () => {
      // 1. Create budget: ₹5,000 for Shopping
      const createRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: shoppingCategoryId,
          month: '2026-09',
          amount: 5000
        });
      const budgetId = createRes.body.data.id;

      // 2. Spend ₹4,500 (90% - WARNING)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 4500,
          accountId: bankAccountId,
          categoryId: shoppingCategoryId,
          date: '2026-09-08T15:00:00.000Z',
          description: 'Clothing'
        });

      const check1 = await request(app)
        .get(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(check1.body.data.status).toBe('WARNING');

      // 3. Update budget amount to ₹10,000 (45% - HEALTHY)
      const patchRes = await request(app)
        .patch(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ amount: 10000 });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.amount).toBe(10000);
      expect(patchRes.body.data.spent).toBe(4500);
      expect(patchRes.body.data.remaining).toBe(5500);
      expect(patchRes.body.data.percentageUsed).toBe(45);
      expect(patchRes.body.data.status).toBe('HEALTHY');
    });

    it('should delete a budget', async () => {
      const createRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: shoppingCategoryId,
          month: '2026-09',
          amount: 5000
        });
      const budgetId = createRes.body.data.id;

      const delRes = await request(app)
        .delete(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('GET /api/budgets/summary (Monthly Overview)', () => {
    it('should calculate budgeted, unbudgeted, and total expense metrics', async () => {
      // 1. Create Budget A: Food & Dining ₹10,000
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: foodCategoryId,
          month: '2026-09',
          amount: 10000
        });

      // 2. Create Budget B: Shopping ₹5,000
      await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: shoppingCategoryId,
          month: '2026-09',
          amount: 5000
        });

      // 3. Spend on Food & Dining: ₹4,000
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 4000,
          accountId: bankAccountId,
          categoryId: foodCategoryId,
          date: '2026-09-02T10:00:00.000Z',
          description: 'Food expense'
        });

      // 4. Spend on Shopping: ₹3,000
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 3000,
          accountId: bankAccountId,
          categoryId: shoppingCategoryId,
          date: '2026-09-03T10:00:00.000Z',
          description: 'Shopping expense'
        });

      // 5. Unbudgeted expense (e.g. Health & Fitness if exists, or create a custom expense category)
      const customCatRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Medical Emergencies',
          type: 'EXPENSE',
          color: '#EF4444',
          icon: 'heart'
        });
      const medicalCat = customCatRes.body.data.category;
      const medicalCatId = medicalCat._id || medicalCat.id;

      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'EXPENSE',
          amount: 2500,
          accountId: bankAccountId,
          categoryId: medicalCatId,
          date: '2026-09-04T10:00:00.000Z',
          description: 'Medical checkup'
        });

      // 6. Fetch monthly summary
      const summaryRes = await request(app)
        .get('/api/budgets/summary?month=2026-09')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(summaryRes.status).toBe(200);
      const summary = summaryRes.body.data;
      expect(summary.month).toBe('2026-09');
      expect(summary.totalBudgeted).toBe(15000); // 10000 + 5000
      expect(summary.budgetedSpent).toBe(7000); // 4000 + 3000
      expect(summary.unbudgetedSpent).toBe(2500); // 2500 medical
      expect(summary.totalExpense).toBe(9500); // 7000 + 2500
      expect(summary.totalRemaining).toBe(8000); // 15000 - 7000
      expect(summary.healthCounts.healthy).toBe(2);
      expect(summary.budgets.length).toBe(2);
    });
  });

  describe('Multi-Tenancy & Authorization Security', () => {
    it('should prevent User B from viewing, modifying, or deleting User A budget', async () => {
      // User A creates budget
      const budgetRes = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          categoryId: foodCategoryId,
          month: '2026-09',
          amount: 10000
        });
      const budgetId = budgetRes.body.data.id;

      // User B attempts GET
      const getRes = await request(app)
        .get(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(getRes.status).toBe(404);

      // User B attempts PATCH
      const patchRes = await request(app)
        .patch(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ amount: 99999 });
      expect(patchRes.status).toBe(404);

      // User B attempts DELETE
      const delRes = await request(app)
        .delete(`/api/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${userBToken}`);
      expect(delRes.status).toBe(404);
    });

    it('should prevent User B from creating a budget using User A category', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          categoryId: foodCategoryId, // Belongs to User A
          month: '2026-09',
          amount: 10000
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Category not found/i);
    });
  });
});
