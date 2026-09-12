import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User, Category, Account } from '../src/models/index.js';

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 3: Authentication API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
    app = createApp();
  });

  afterAll(async () => {
    // Clean up test database
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await Category.deleteMany({});
      await Account.deleteMany({});
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Account.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'Password123',
      currency: 'INR'
    };

    it('should successfully register user, return tokens, and seed defaults', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.name).toBe('Alice Johnson');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Verify user created in DB
      const dbUser = await User.findOne({ email: 'alice@example.com' });
      expect(dbUser).toBeDefined();
      expect(dbUser.isActive).toBe(true);

      // Verify default categories were seeded
      const categories = await Category.find({ userId: dbUser._id });
      expect(categories.length).toBeGreaterThan(5);
      const foodCategory = categories.find((c) => c.name === 'Food & Dining');
      expect(foodCategory).toBeDefined();

      // Verify subcategory linked to parent
      const groceries = categories.find((c) => c.name === 'Groceries');
      expect(groceries).toBeDefined();
      expect(groceries.parentId.toString()).toBe(foodCategory._id.toString());

      // Verify default Cash Wallet account was created
      const accounts = await Account.find({ userId: dbUser._id });
      expect(accounts.length).toBe(1);
      expect(accounts[0].name).toBe('Cash Wallet');
      expect(accounts[0].balance).toBe(0);
    });

    it('should reject duplicate email with 409 Conflict', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const res = await request(app).post('/api/auth/register').send(validUser);
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject weak password with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          password: 'onlyletters'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject invalid email format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'not-a-valid-email'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: 'Password123'
      });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('bob@example.com');
    });

    it('should reject incorrect password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'WrongPassword999'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent user with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nobody@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      const reg = await request(app).post('/api/auth/register').send({
        name: 'Charlie',
        email: 'charlie@example.com',
        password: 'Password123'
      });
      token = reg.body.data.accessToken;
    });

    it('should return user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('charlie@example.com');
      expect(res.body.data.user.name).toBe('Charlie');
    });

    it('should reject request without token with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with forged token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.fake.token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh and /api/auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      const reg = await request(app).post('/api/auth/register').send({
        name: 'Diana',
        email: 'diana@example.com',
        password: 'Password123'
      });
      accessToken = reg.body.data.accessToken;
      refreshToken = reg.body.data.refreshToken;
    });

    it('should rotate access and refresh tokens', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(refreshToken); // rotated
    });

    it('should invalidate token on logout so refresh fails', async () => {
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.status).toBe(200);

      // Attempting to refresh with old token should now be rejected
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Eve',
        email: 'eve@example.com',
        password: 'OldPassword123'
      });
    });

    it('should generate reset token and allow password reset', async () => {
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'eve@example.com' });

      expect(forgotRes.status).toBe(200);
      const resetToken = forgotRes.body.data.devResetToken;
      expect(resetToken).toBeDefined();

      // Reset password using token
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword999'
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify old password fails
      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'eve@example.com', password: 'OldPassword123' });
      expect(oldLogin.status).toBe(401);

      // Verify new password succeeds
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'eve@example.com', password: 'NewPassword999' });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.data.accessToken).toBeDefined();
    });
  });
});
