import {
  User,
  Account,
  Category,
  Transaction,
  Budget,
  CreditCard,
  RecurringTransaction
} from '../src/models/index.js';

describe('Phase 2: Database Models & Schemas Validation', () => {
  describe('User Model', () => {
    it('should fail validation without required fields', () => {
      const user = new User({});
      const err = user.validateSync();
      expect(err.errors.name).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.passwordHash).toBeDefined();
    });

    it('should reject invalid email format', () => {
      const user = new User({
        name: 'John Doe',
        email: 'invalid-email-address',
        passwordHash: 'hashed_pw'
      });
      const err = user.validateSync();
      expect(err.errors.email).toBeDefined();
    });

    it('should validate valid user and normalize email to lowercase', () => {
      const user = new User({
        name: 'John Doe',
        email: 'John.Doe@Example.com',
        passwordHash: 'hashed_pw'
      });
      const err = user.validateSync();
      expect(err).toBeUndefined();
      expect(user.email).toBe('john.doe@example.com');
    });
  });

  describe('Account Model', () => {
    it('should reject floating point balances to enforce minor units precision', () => {
      const account = new Account({
        userId: '507f1f77bcf86cd799439011',
        name: 'Test Bank',
        type: 'BANK',
        balance: 100.5 // Floating point balance should fail
      });
      const err = account.validateSync();
      expect(err.errors.balance).toBeDefined();
    });

    it('should accept integer balance in minor units (paise/cents)', () => {
      const account = new Account({
        userId: '507f1f77bcf86cd799439011',
        name: 'Test Bank',
        type: 'BANK',
        balance: 10050 // ₹100.50 in paise
      });
      const err = account.validateSync();
      expect(err).toBeUndefined();
      expect(account.balance).toBe(10050);
    });

    it('should reject unsupported account types', () => {
      const account = new Account({
        userId: '507f1f77bcf86cd799439011',
        name: 'Invalid Type',
        type: 'CRYPTO_WALLET'
      });
      const err = account.validateSync();
      expect(err.errors.type).toBeDefined();
    });
  });

  describe('Category Model', () => {
    it('should accept valid parent and subcategory types', () => {
      const parent = new Category({
        userId: '507f1f77bcf86cd799439011',
        name: 'Food',
        type: 'EXPENSE'
      });
      expect(parent.validateSync()).toBeUndefined();

      const sub = new Category({
        userId: '507f1f77bcf86cd799439011',
        name: 'Groceries',
        type: 'EXPENSE',
        parentId: parent._id
      });
      expect(sub.validateSync()).toBeUndefined();
    });

    it('should reject invalid category type', () => {
      const cat = new Category({
        userId: '507f1f77bcf86cd799439011',
        name: 'Food',
        type: 'INVESTMENT'
      });
      const err = cat.validateSync();
      expect(err.errors.type).toBeDefined();
    });
  });

  describe('Transaction Model', () => {
    it('should require positive integer amount in minor units', () => {
      const tx = new Transaction({
        userId: '507f1f77bcf86cd799439011',
        type: 'EXPENSE',
        amount: 0, // Zero should fail
        description: 'Test'
      });
      const err = tx.validateSync();
      expect(err.errors.amount).toBeDefined();
    });

    it('should reject float amount', () => {
      const tx = new Transaction({
        userId: '507f1f77bcf86cd799439011',
        type: 'EXPENSE',
        amount: 150.25, // Float should fail
        description: 'Test'
      });
      const err = tx.validateSync();
      expect(err.errors.amount).toBeDefined();
    });

    it('should accept valid transaction with integer amount', () => {
      const tx = new Transaction({
        userId: '507f1f77bcf86cd799439011',
        type: 'EXPENSE',
        amount: 15025,
        description: 'Supermarket shopping'
      });
      expect(tx.validateSync()).toBeUndefined();
    });
  });

  describe('Budget Model', () => {
    it('should enforce YYYY-MM month format', () => {
      const invalidBudget = new Budget({
        userId: '507f1f77bcf86cd799439011',
        categoryId: '507f1f77bcf86cd799439012',
        month: 'September-2026',
        amount: 500000
      });
      const err = invalidBudget.validateSync();
      expect(err.errors.month).toBeDefined();

      const validBudget = new Budget({
        userId: '507f1f77bcf86cd799439011',
        categoryId: '507f1f77bcf86cd799439012',
        month: '2026-09',
        amount: 500000
      });
      expect(validBudget.validateSync()).toBeUndefined();
    });
  });

  describe('CreditCard Model', () => {
    it('should reject billing cycle day out of range 1-31', () => {
      const card = new CreditCard({
        userId: '507f1f77bcf86cd799439011',
        accountId: '507f1f77bcf86cd799439012',
        creditLimit: 10000000,
        billingCycleDay: 32, // Invalid
        dueDay: 20
      });
      const err = card.validateSync();
      expect(err.errors.billingCycleDay).toBeDefined();
    });
  });
});
