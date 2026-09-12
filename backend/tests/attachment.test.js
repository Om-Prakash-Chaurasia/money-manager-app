import request from 'supertest';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createApp } from '../src/app.js';
import {
  User,
  Account,
  Category,
  Transaction,
  TransactionAttachment
} from '../src/models/index.js';
import { env } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../', env.UPLOAD_DIR);

const TEST_DB_URI = 'mongodb://localhost:27017/money_manager_test_db';

describe('Phase 13: Receipt Attachments & File Uploads Integration Tests', () => {
  let app;
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let userATransactionId;
  let createdFiles = [];

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
    app = createApp();
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Cleanup any uploaded test files
    for (const f of createdFiles) {
      try {
        const fullPath = path.resolve(uploadDir, path.basename(f));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {
        // ignore cleanup errors
      }
    }

    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await Account.deleteMany({});
      await Category.deleteMany({});
      await Transaction.deleteMany({});
      await TransactionAttachment.deleteMany({});
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});
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

    // User A Account & Transaction
    const accRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'HDFC Bank', type: 'BANK', openingBalance: 50000 });

    const catsRes = await request(app)
      .get('/api/categories?format=flat')
      .set('Authorization', `Bearer ${userAToken}`);
    const expCat = catsRes.body.data.find((c) => c.type === 'EXPENSE');

    const txRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'EXPENSE',
        amount: 2500,
        accountId: accRes.body.data.account._id,
        categoryId: expCat._id,
        date: new Date().toISOString(),
        description: 'Dinner with colleagues'
      });
    userATransactionId = txRes.body.data.transaction._id;
  });

  describe('1. Single File Upload (POST /api/attachments/upload)', () => {
    it('should successfully upload an image receipt and create a TransactionAttachment record', async () => {
      const buffer = Buffer.from('fake image content for receipt');

      const res = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', buffer, { filename: 'dinner_bill.png', contentType: 'image/png' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const attachment = res.body.data.attachment;
      expect(attachment).toBeDefined();
      expect(attachment.name).toBe('dinner_bill.png');
      expect(attachment.type).toBe('IMAGE');
      expect(attachment.url).toMatch(/^\/uploads\/.+\.png$/);
      expect(attachment.userId.toString()).toBe(userAId);
      expect(attachment.transactionId).toBeNull();

      createdFiles.push(attachment.url);

      // Verify file was saved to filesystem
      const filename = path.basename(attachment.url);
      const filePath = path.resolve(uploadDir, filename);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should successfully upload and link to an existing transaction', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf invoice content');

      const res = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('transactionId', userATransactionId)
        .attach('file', pdfBuffer, { filename: 'invoice.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(201);
      const attachment = res.body.data.attachment;
      expect(attachment.type).toBe('PDF');
      expect(attachment.transactionId.toString()).toBe(userATransactionId.toString());

      createdFiles.push(attachment.url);
    });
  });

  describe('2. Multiple File Upload (POST /api/attachments/upload-multiple)', () => {
    it('should upload multiple receipts at once', async () => {
      const buf1 = Buffer.from('receipt 1');
      const buf2 = Buffer.from('receipt 2');

      const res = await request(app)
        .post('/api/attachments/upload-multiple')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('transactionId', userATransactionId)
        .attach('files', buf1, { filename: 'receipt1.jpg', contentType: 'image/jpeg' })
        .attach('files', buf2, { filename: 'receipt2.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(201);
      expect(res.body.data.attachments).toBeInstanceOf(Array);
      expect(res.body.data.attachments.length).toBe(2);

      for (const att of res.body.data.attachments) {
        createdFiles.push(att.url);
        expect(att.transactionId.toString()).toBe(userATransactionId.toString());
      }
    });
  });

  describe('3. Validation and Security', () => {
    it('should reject unauthenticated upload requests with 401', async () => {
      const buf = Buffer.from('test');
      const res = await request(app)
        .post('/api/attachments/upload')
        .attach('file', buf, 'test.png');

      expect(res.status).toBe(401);
    });

    it('should reject unsupported file types (e.g. .exe) with 400', async () => {
      const buf = Buffer.from('executable binary code');
      const res = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', buf, { filename: 'malware.exe', contentType: 'application/x-msdownload' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not supported/i);
    });

    it('should reject upload when no file is provided with 400', async () => {
      const res = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 404 if linking to non-existent transaction', async () => {
      const buf = Buffer.from('test image');
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('transactionId', fakeId)
        .attach('file', buf, { filename: 'test.png', contentType: 'image/png' });

      expect(res.status).toBe(404);
    });
  });

  describe('4. Retrieval and Static Serving', () => {
    let attachmentId;
    let fileUrl;

    beforeEach(async () => {
      const buf = Buffer.from('receipt content for retrieval');
      const res = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('transactionId', userATransactionId)
        .attach('file', buf, { filename: 'bill.png', contentType: 'image/png' });

      attachmentId = res.body.data.attachment._id;
      fileUrl = res.body.data.attachment.url;
      createdFiles.push(fileUrl);
    });

    it('should retrieve single attachment by ID', async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.attachment._id.toString()).toBe(attachmentId.toString());
      expect(res.body.data.attachment.name).toBe('bill.png');
    });

    it('should retrieve all attachments for a transaction', async () => {
      const res = await request(app)
        .get(`/api/attachments/transaction/${userATransactionId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.attachments).toBeInstanceOf(Array);
      expect(res.body.data.attachments.length).toBeGreaterThanOrEqual(1);
    });

    it('should statically serve the uploaded file via Express static middleware', async () => {
      const res = await request(app).get(fileUrl);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image\/png/);
    });
  });

  describe('5. Deletion & Physical Unlinking', () => {
    it('should delete database record and remove physical file from disk', async () => {
      const buf = Buffer.from('to be deleted file');
      const uploadRes = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', buf, { filename: 'delete_me.png', contentType: 'image/png' });

      const attId = uploadRes.body.data.attachment._id;
      const attUrl = uploadRes.body.data.attachment.url;
      const physicalPath = path.resolve(uploadDir, path.basename(attUrl));

      expect(fs.existsSync(physicalPath)).toBe(true);

      const delRes = await request(app)
        .delete(`/api/attachments/${attId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.status).toBe(200);

      // Verify removed from MongoDB
      const doc = await TransactionAttachment.findById(attId);
      expect(doc).toBeNull();

      // Verify removed from filesystem
      expect(fs.existsSync(physicalPath)).toBe(false);
    });
  });

  describe('6. Security & Tenant Isolation', () => {
    let userAAttachmentId;

    beforeEach(async () => {
      const buf = Buffer.from('User A private bill');
      const res = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', buf, { filename: 'private.png', contentType: 'image/png' });

      userAAttachmentId = res.body.data.attachment._id;
      createdFiles.push(res.body.data.attachment.url);
    });

    it('should prevent User B from viewing User A attachment (404)', async () => {
      const res = await request(app)
        .get(`/api/attachments/${userAAttachmentId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });

    it('should prevent User B from deleting User A attachment (404)', async () => {
      const res = await request(app)
        .delete(`/api/attachments/${userAAttachmentId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);

      // Verify User A doc still exists
      const doc = await TransactionAttachment.findById(userAAttachmentId);
      expect(doc).not.toBeNull();
    });
  });
});
