import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash plain text password using bcrypt
 * @param {string} password
 * @returns {Promise<string>}
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Compare plain text password with bcrypt hash
 * @param {string} candidatePassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (candidatePassword, hash) => {
  if (!candidatePassword || !hash) return false;
  return bcrypt.compare(candidatePassword, hash);
};
