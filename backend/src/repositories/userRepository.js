import { User } from '../models/User.js';

export const userRepository = {
  /**
   * Find user by email
   * @param {string} email
   * @param {boolean} includePassword
   */
  async findByEmail(email, includePassword = false) {
    let query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) {
      query = query.select('+passwordHash +refreshTokenHash');
    }
    return query.exec();
  },

  /**
   * Find user by ID
   * @param {string} id
   * @param {boolean} includeSecrets
   */
  async findById(id, includeSecrets = false) {
    let query = User.findById(id);
    if (includeSecrets) {
      query = query.select('+passwordHash +refreshTokenHash');
    }
    return query.exec();
  },

  /**
   * Create a new user document
   * @param {object} userData
   */
  async create(userData) {
    return User.create(userData);
  },

  /**
   * Update user by ID
   * @param {string} id
   * @param {object} updateData
   */
  async updateById(id, updateData) {
    return User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).exec();
  },

  /**
   * Update refresh token hash
   * @param {string} id
   * @param {string|null} refreshTokenHash
   */
  async updateRefreshToken(id, refreshTokenHash) {
    return User.findByIdAndUpdate(id, { refreshTokenHash }).exec();
  },

  /**
   * Find user with active password reset token
   * @param {string} hashedToken
   */
  async findByPasswordResetToken(hashedToken) {
    return User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires').exec();
  }
};
