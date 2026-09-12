import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User, Category } from '../src/models/index.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 5: Category APIs Integration Tests', () => {
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
      await Category.deleteMany({});
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});

    // Register User A (auto-seeds default categories)
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123'
    });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user.id;

    // Register User B (auto-seeds default categories)
    const resB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password123'
    });
    userBToken = resB.body.data.accessToken;
    userBId = resB.body.data.user.id;
  });

  describe('GET /api/categories (Hierarchical Tree & Filtering)', () => {
    it('should return seeded categories in hierarchical tree format', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify Food & Dining parent has subcategories
      const foodParent = res.body.data.find((c) => c.name === 'Food & Dining');
      expect(foodParent).toBeDefined();
      expect(foodParent.subcategories).toBeDefined();
      expect(foodParent.subcategories.length).toBe(3);
      expect(foodParent.subcategories.map((s) => s.name)).toContain('Groceries');
    });

    it('should filter categories by type=INCOME', async () => {
      const res = await request(app)
        .get('/api/categories?type=INCOME')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      // All returned top-level categories must be INCOME
      expect(res.body.data.every((c) => c.type === 'INCOME')).toBe(true);
    });

    it('should return flat list when format=flat', async () => {
      const res = await request(app)
        .get('/api/categories?format=flat')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(15);
      // In flat format, subcategories have parentId populated
      const sub = res.body.data.find((c) => c.parentId !== null);
      expect(sub).toBeDefined();
    });
  });

  describe('POST /api/categories (Creation & Hierarchy Rules)', () => {
    it('should create a custom top-level parent category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Side Hustle',
          type: 'INCOME',
          icon: 'briefcase',
          color: '#10B981'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Side Hustle');
      expect(res.body.data.category.parentId).toBeNull();
      expect(res.body.data.category.isDefault).toBe(false);
    });

    it('should create a subcategory linked to a parent category', async () => {
      // 1. Create Parent
      const parentRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Investments',
          type: 'INCOME',
          icon: 'trending-up'
        });
      const parentId = parentRes.body.data.category._id;

      // 2. Create Subcategory
      const subRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Stock Dividends',
          type: 'INCOME',
          parentId
        });

      expect(subRes.status).toBe(201);
      expect(subRes.body.data.category.name).toBe('Stock Dividends');
      expect(subRes.body.data.category.parentId).toBe(parentId);

      // Verify hierarchical tree view shows this subcategory
      const treeRes = await request(app)
        .get('/api/categories?type=INCOME')
        .set('Authorization', `Bearer ${userAToken}`);

      const parentInTree = treeRes.body.data.find((c) => c._id === parentId);
      expect(parentInTree.subcategories.length).toBe(1);
      expect(parentInTree.subcategories[0].name).toBe('Stock Dividends');
    });

    it('should reject creating a subcategory with mismatched type from parent', async () => {
      const parentRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Income Stream',
          type: 'INCOME'
        });
      const parentId = parentRes.body.data.category._id;

      // Attempting to create an EXPENSE subcategory under an INCOME parent
      const subRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Invalid Subcategory',
          type: 'EXPENSE',
          parentId
        });

      expect(subRes.status).toBe(400);
      expect(subRes.body.success).toBe(false);
      expect(subRes.body.message).toMatch(/type/i);
    });

    it('should reject nesting subcategories deeper than 2 levels', async () => {
      const parentRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Level 1', type: 'EXPENSE' });
      const level1Id = parentRes.body.data.category._id;

      const level2Res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Level 2', type: 'EXPENSE', parentId: level1Id });
      const level2Id = level2Res.body.data.category._id;

      // Attempt level 3
      const level3Res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Level 3', type: 'EXPENSE', parentId: level2Id });

      expect(level3Res.status).toBe(400);
      expect(level3Res.body.message).toMatch(/cannot be nested/i);
    });

    it('should reject duplicate category name under the same parent', async () => {
      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Hobbies', type: 'EXPENSE' });

      const duplicateRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Hobbies', type: 'EXPENSE' });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
    });
  });

  describe('Security & Tenant Isolation', () => {
    let catAId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'User A Secret Category', type: 'EXPENSE' });
      catAId = res.body.data.category._id;
    });

    it('should prevent User B from reading User A category', async () => {
      const res = await request(app)
        .get(`/api/categories/${catAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('should prevent User B from modifying User A category', async () => {
      const res = await request(app)
        .patch(`/api/categories/${catAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked Category' });

      expect(res.status).toBe(404);
    });

    it('should prevent User B from attaching a subcategory to User A category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          name: 'Stealing Parent',
          type: 'EXPENSE',
          parentId: catAId
        });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/categories/:id', () => {
    it('should update category metadata and reject self-referential cycle', async () => {
      const createRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Tech Gadgets', type: 'EXPENSE' });
      const catId = createRes.body.data.category._id;

      // Self-reference cycle check
      const cycleRes = await request(app)
        .patch(`/api/categories/${catId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ parentId: catId });

      expect(cycleRes.status).toBe(400);
      expect(cycleRes.body.message).toMatch(/cannot be its own parent/i);

      // Valid update
      const validUpdate = await request(app)
        .patch(`/api/categories/${catId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Electronics & Gadgets', icon: 'cpu' });

      expect(validUpdate.status).toBe(200);
      expect(validUpdate.body.data.category.name).toBe('Electronics & Gadgets');
    });
  });

  describe('DELETE /api/categories/:id (Cascading Soft-Delete)', () => {
    it('should soft-delete parent and cascade to all subcategories', async () => {
      const parentRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Parent Category', type: 'EXPENSE' });
      const parentId = parentRes.body.data.category._id;

      const subRes = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Child Subcategory', type: 'EXPENSE', parentId });
      const subId = subRes.body.data.category._id;

      // Delete parent
      const delRes = await request(app)
        .delete(`/api/categories/${parentId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.status).toBe(200);

      // Verify in DB that parent and child are soft-deleted
      const parentDb = await Category.findById(parentId);
      const subDb = await Category.findById(subId);

      expect(parentDb.isActive).toBe(false);
      expect(subDb.isActive).toBe(false);

      // Active listing should no longer include them
      const listRes = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(listRes.body.data.find((c) => c._id === parentId)).toBeUndefined();
    });
  });
});
