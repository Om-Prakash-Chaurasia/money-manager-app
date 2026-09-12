import mongoose from 'mongoose';
import { logger } from './logger.js';

/**
 * Checks if current MongoDB connection topology supports multi-document transactions.
 * Transactions require a Replica Set (Atlas, Docker replica set) or Mongos.
 * @returns {boolean}
 */
export const supportsTransactions = () => {
  const topology = mongoose.connection?.client?.topology?.description;
  if (!topology) return false;
  if (topology.setName) return true;
  if (topology.type === 'Sharded' || topology.type === 'LoadBalanced' || topology.type === 'ReplicaSetWithPrimary') return true;
  return false;
};

/**
 * Executes a callback within a MongoDB session/transaction.
 * If the MongoDB instance is a standalone instance (not a replica set),
 * it gracefully executes the callback directly without transaction locks,
 * while on Replica Sets (Atlas, Docker replica sets) it guarantees strict ACID rollback.
 *
 * @param {Function} callback - async (session) => Promise<any>
 * @returns {Promise<any>} Result of callback
 */
export const runInTransaction = async (callback) => {
  if (!supportsTransactions()) {
    return callback(null);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (abortError) {
      logger.error(`Error aborting transaction: ${abortError.message}`);
    }
    throw error;
  } finally {
    await session.endSession();
  }
};
