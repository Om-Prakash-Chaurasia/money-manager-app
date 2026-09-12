import { Category } from '../models/Category.js';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories.js';

export const categoryRepository = {
  /**
   * Seeds system default categories and subcategories for a new user
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async seedDefaultCategoriesForUser(userId, session = null) {
    const createdCategories = [];

    for (const catDef of DEFAULT_CATEGORIES) {
      // 1. Create Parent Category
      const [parent] = await Category.create(
        [
          {
            userId,
            name: catDef.name,
            type: catDef.type,
            icon: catDef.icon,
            color: catDef.color,
            isDefault: true,
            parentId: null,
            isActive: true
          }
        ],
        session ? { session } : {}
      );
      createdCategories.push(parent);

      // 2. Create Subcategories if any
      if (catDef.subcategories && catDef.subcategories.length > 0) {
        const subcategoryDocs = catDef.subcategories.map((sub) => ({
          userId,
          name: sub.name,
          type: catDef.type,
          icon: sub.icon || parent.icon,
          color: sub.color || parent.color,
          isDefault: true,
          parentId: parent._id,
          isActive: true
        }));

        const subs = await Category.insertMany(
          subcategoryDocs,
          session ? { session } : {}
        );
        createdCategories.push(...subs);
      }
    }

    return createdCategories;
  },

  /**
   * Create a new category
   * @param {object} categoryData
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(categoryData, session = null) {
    const [category] = await Category.create(
      [categoryData],
      session ? { session } : {}
    );
    return category;
  },

  /**
   * Find category by ID and user ID (ownership enforcement)
   * @param {string} id
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByIdAndUserId(id, userId, session = null) {
    let query = Category.findOne({ _id: id, userId });
    if (session) {
      query = query.session(session);
    }
    return query.populate('parentId', 'name icon color type').exec();
  },

  /**
   * Find categories for a user with filters and sorting
   * @param {string} userId
   * @param {object} options
   */
  async findWithFilters(userId, { filter = {}, sort = { type: 1, name: 1 } } = {}) {
    const query = { userId, ...filter };
    return Category.find(query)
      .populate('parentId', 'name icon color type')
      .sort(sort)
      .exec();
  },

  /**
   * Check if a category with same name and parent exists for user
   * @param {string} name
   * @param {string|null} parentId
   * @param {string} userId
   * @param {string} [excludeId]
   */
  async findDuplicate(name, parentId, userId, excludeId = null) {
    const query = {
      userId,
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
      parentId: parentId || null,
      isActive: true
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return Category.findOne(query).exec();
  },

  /**
   * Update category
   * @param {string} id
   * @param {string} userId
   * @param {object} updateData
   * @param {import('mongoose').ClientSession} [session]
   */
  async update(id, userId, updateData, session = null) {
    let query = Category.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (session) {
      query = query.session(session);
    }
    return query.populate('parentId', 'name icon color type').exec();
  },

  /**
   * Soft-delete category
   * @param {string} id
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async softDelete(id, userId, session = null) {
    let query = Category.findOneAndUpdate(
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
   * Soft-delete all subcategories belonging to a parent category
   * @param {string} parentId
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async softDeleteSubcategories(parentId, userId, session = null) {
    const operation = Category.updateMany(
      { parentId, userId },
      { $set: { isActive: false } }
    );
    if (session) {
      operation.session(session);
    }
    return operation.exec();
  }
};
