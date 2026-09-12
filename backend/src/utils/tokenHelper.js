import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Sign an Access Token (short-lived)
 * @param {object} payload - { id: string, email: string }
 * @returns {string}
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN
  });
};

/**
 * Sign a Refresh Token (long-lived) with a cryptographic nonce
 * to guarantee uniqueness across instant rotations.
 * @param {object} payload - { id: string }
 * @returns {string}
 */
export const generateRefreshToken = (payload) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  return jwt.sign({ ...payload, nonce }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN
  });
};

/**
 * Verify Access Token
 * @param {string} token
 * @returns {object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

/**
 * Verify Refresh Token
 * @param {string} token
 * @returns {object} Decoded payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

/**
 * Hash a sensitive token (e.g. refresh token or password reset token) before storing in DB
 * @param {string} token
 * @returns {string} SHA-256 hex string
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a cryptographically secure random token (e.g., for password reset)
 * @returns {{ token: string, hashedToken: string }}
 */
export const generateCryptoToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(token);
  return { token, hashedToken };
};
