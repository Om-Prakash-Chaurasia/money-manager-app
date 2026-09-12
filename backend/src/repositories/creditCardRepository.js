import { CreditCard } from '../models/CreditCard.js';
import { CreditCardStatement } from '../models/CreditCardStatement.js';

export const creditCardRepository = {
  /**
   * Create credit card
   * @param {object} data
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(data, session = null) {
    const [card] = await CreditCard.create([data], session ? { session } : {});
    return card;
  },

  /**
   * Find credit card by ID and user ID
   * @param {string} id
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByIdAndUserId(id, userId, session = null) {
    let query = CreditCard.findOne({ _id: id, userId });
    if (session) {
      query = query.session(session);
    }
    return query.populate('accountId', 'name type subType balance currency color icon isActive').exec();
  },

  /**
   * Find credit card by backing account ID and user ID
   * @param {string} accountId
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByAccountIdAndUserId(accountId, userId, session = null) {
    let query = CreditCard.findOne({ accountId, userId });
    if (session) {
      query = query.session(session);
    }
    return query.populate('accountId', 'name type subType balance currency color icon isActive').exec();
  },

  /**
   * Find all credit cards for user
   * @param {string} userId
   * @param {object} filter
   */
  async findWithFilters(userId, filter = {}) {
    return CreditCard.find({ userId, ...filter })
      .populate('accountId', 'name type subType balance currency color icon isActive')
      .sort({ createdAt: -1 })
      .exec();
  },

  /**
   * Update credit card
   * @param {string} id
   * @param {string} userId
   * @param {object} updateData
   * @param {import('mongoose').ClientSession} [session]
   */
  async update(id, userId, updateData, session = null) {
    let query = CreditCard.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (session) {
      query = query.session(session);
    }
    return query.populate('accountId', 'name type subType balance currency color icon isActive').exec();
  },

  /**
   * Soft-delete credit card
   * @param {string} id
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async softDelete(id, userId, session = null) {
    let query = CreditCard.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  },

  // ----------------------------------------------------
  // Credit Card Statement Operations
  // ----------------------------------------------------

  /**
   * Create statement
   * @param {object} data
   * @param {import('mongoose').ClientSession} [session]
   */
  async createStatement(data, session = null) {
    const [statement] = await CreditCardStatement.create([data], session ? { session } : {});
    return statement;
  },

  /**
   * List statements for a credit card
   * @param {string} creditCardId
   * @param {string} userId
   */
  async findStatements(creditCardId, userId) {
    return CreditCardStatement.find({ creditCardId, userId })
      .sort({ statementDate: -1 })
      .exec();
  },

  /**
   * Find statement by ID
   * @param {string} statementId
   * @param {string} creditCardId
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async findStatementById(statementId, creditCardId, userId, session = null) {
    let query = CreditCardStatement.findOne({ _id: statementId, creditCardId, userId });
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  },

  /**
   * Update statement status and paid amount
   * @param {string} statementId
   * @param {string} creditCardId
   * @param {string} userId
   * @param {object} updateData
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateStatement(statementId, creditCardId, userId, updateData, session = null) {
    let query = CreditCardStatement.findOneAndUpdate(
      { _id: statementId, creditCardId, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (session) {
      query = query.session(session);
    }
    return query.exec();
  }
};
