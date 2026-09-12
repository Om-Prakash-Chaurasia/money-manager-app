import { Account } from '../models/Account.js';
import { ACCOUNT_TYPES, ACCOUNT_SUB_TYPES } from '../constants/accountTypes.js';

export const accountRepository = {
  /**
   * Seed default Cash Wallet account on registration
   * @param {string} userId
   * @param {string} currency
   * @param {import('mongoose').ClientSession} [session]
   */
  async seedDefaultAccountForUser(userId, currency = 'INR', session = null) {
    const [account] = await Account.create(
      [
        {
          userId,
          name: 'Cash Wallet',
          type: ACCOUNT_TYPES.CASH,
          subType: ACCOUNT_SUB_TYPES.WALLET,
          currency,
          balance: 0,
          openingBalance: 0,
          openingBalanceDate: new Date(),
          color: '#10B981',
          icon: 'wallet',
          isActive: true
        }
      ],
      session ? { session } : {}
    );
    return account;
  },

  /**
   * Create a new account
   * @param {object} accountData
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(accountData, session = null) {
    const [account] = await Account.create(
      [accountData],
      session ? { session } : {}
    );
    return account;
  },

  /**
   * Find account by ID and owner User ID (strict ownership check)
   * @param {string} id
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByIdAndUserId(id, userId, session = null) {
    let query = Account.findOne({ _id: id, userId });
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  },

  /**
   * Query accounts for a user with filters, sorting, and pagination
   * @param {string} userId
   * @param {object} options
   */
  async findWithFilters(userId, { filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 20 } = {}) {
    const query = { userId, ...filter };
    return Account.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  },

  /**
   * Count accounts matching filters for a user
   * @param {string} userId
   * @param {object} filter
   */
  async count(userId, filter = {}) {
    const query = { userId, ...filter };
    return Account.countDocuments(query).exec();
  },

  /**
   * Update an account by ID and user ID
   * @param {string} id
   * @param {string} userId
   * @param {object} updateData
   * @param {import('mongoose').ClientSession} [session]
   */
  async update(id, userId, updateData, session = null) {
    let query = Account.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  },

  /**
   * Atomically adjust account balance
   * @param {string} id
   * @param {string} userId
   * @param {number} deltaBalance - in integer minor units (+ or -)
   * @param {import('mongoose').ClientSession} [session]
   */
  async adjustBalance(id, userId, deltaBalance, session = null) {
    let query = Account.findOneAndUpdate(
      { _id: id, userId },
      { $inc: { balance: deltaBalance } },
      { new: true, runValidators: true }
    );
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  },

  /**
   * Soft-delete account (sets isActive = false)
   * @param {string} id
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async softDelete(id, userId, session = null) {
    let query = Account.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  },

  /**
   * Summarize balances by account type for user
   * @param {string} userId
   */
  async aggregateBalances(userId) {
    return Account.aggregate([
      { $match: { userId: typeof userId === 'string' ? new Account.base.Types.ObjectId(userId) : userId, isActive: true } },
      {
        $group: {
          _id: '$type',
          totalBalance: { $sum: '$balance' },
          count: { $sum: 1 }
        }
      }
    ]);
  }
};
