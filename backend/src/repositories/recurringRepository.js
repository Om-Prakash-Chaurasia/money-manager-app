import { RecurringTransaction } from '../models/RecurringTransaction.js';

class RecurringRepository {
  /**
   * Helper to populate category and account references
   */
  populateRefs(query) {
    return query
      .populate('categoryId', 'name icon color type parentId')
      .populate('accountId', 'name type balance color icon')
      .populate('fromAccountId', 'name type balance color icon')
      .populate('toAccountId', 'name type balance color icon');
  }

  /**
   * Create a new recurring template
   */
  async create(data, session = null) {
    const options = session ? { session } : {};
    const [recurring] = await RecurringTransaction.create([data], options);
    return recurring;
  }

  /**
   * Find by ID with populated references
   */
  async findById(id, populate = true) {
    let query = RecurringTransaction.findById(id);
    if (populate) {
      query = this.populateRefs(query);
    }
    return query.exec();
  }

  /**
   * Find one matching filter
   */
  async findOne(filter, populate = true) {
    let query = RecurringTransaction.findOne(filter);
    if (populate) {
      query = this.populateRefs(query);
    }
    return query.exec();
  }

  /**
   * Find multiple with filters and pagination
   */
  async find(filter = {}, options = {}) {
    const { page = 1, limit = 50, sort = { nextRunDate: 1 } } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.populateRefs(
        RecurringTransaction.find(filter).sort(sort).skip(skip).limit(limit)
      ).exec(),
      RecurringTransaction.countDocuments(filter).exec()
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update by ID
   */
  async update(id, updateData, session = null) {
    const options = { new: true, runValidators: true, ...(session && { session }) };
    return this.populateRefs(
      RecurringTransaction.findByIdAndUpdate(id, updateData, options)
    ).exec();
  }

  /**
   * Delete by ID
   */
  async delete(id, session = null) {
    const options = session ? { session } : {};
    return RecurringTransaction.findByIdAndDelete(id, options).exec();
  }

  /**
   * Find all active recurring templates whose nextRunDate <= cutoffDate
   */
  async findDueTemplates(cutoffDate = new Date()) {
    return RecurringTransaction.find({
      isActive: true,
      nextRunDate: { $lte: cutoffDate }
    })
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name type balance')
      .populate('fromAccountId', 'name type balance')
      .populate('toAccountId', 'name type balance')
      .exec();
  }
}

export const recurringRepository = new RecurringRepository();
