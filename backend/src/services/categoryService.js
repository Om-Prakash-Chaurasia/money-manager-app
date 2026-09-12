import { categoryRepository } from '../repositories/categoryRepository.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

export const categoryService = {
  /**
   * Create a new custom category or subcategory
   */
  async createCategory(userId, data) {
    const { name, type, parentId, icon, color } = data;

    // If parentId provided, validate parent relationship
    if (parentId) {
      const parent = await categoryRepository.findByIdAndUserId(parentId, userId);
      if (!parent || !parent.isActive) {
        throw new AppError('Parent category not found or inactive', 404);
      }

      if (parent.type !== type) {
        throw new AppError(
          `Subcategory type (${type}) must match parent category type (${parent.type})`,
          400
        );
      }

      // Disallow nesting deeper than 2 tiers
      if (parent.parentId) {
        throw new AppError('Subcategories cannot be nested under another subcategory', 400);
      }
    }

    // Check duplicate name under same parent
    const duplicate = await categoryRepository.findDuplicate(name, parentId, userId);
    if (duplicate) {
      throw new AppError(
        `A category named "${name.trim()}" already exists at this level`,
        409
      );
    }

    const category = await categoryRepository.create({
      userId,
      name: name.trim(),
      type,
      parentId: parentId || null,
      icon: icon || (parentId ? 'corner-down-right' : 'folder'),
      color: color || '#64748B',
      isDefault: false,
      isActive: true
    });

    logger.info(`Category created: "${category.name}" (${category.type}) for user: ${userId}`);

    return category;
  },

  /**
   * Retrieve categories for user with tree or flat formatting
   */
  async getCategories(userId, query = {}) {
    const { type, format = 'tree', isActive = true, search } = query;

    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const categories = await categoryRepository.findWithFilters(userId, { filter });

    if (format === 'flat') {
      return {
        count: categories.length,
        categories
      };
    }

    // Build hierarchical tree: Parents with nested subcategories
    const parentCategories = [];
    const subcategoryMap = new Map();

    // Separate parents and subcategories
    for (const cat of categories) {
      const plainCat = cat.toJSON();
      if (!cat.parentId) {
        plainCat.subcategories = [];
        parentCategories.push(plainCat);
      } else {
        const pId = cat.parentId._id ? cat.parentId._id.toString() : cat.parentId.toString();
        if (!subcategoryMap.has(pId)) {
          subcategoryMap.set(pId, []);
        }
        subcategoryMap.get(pId).push(plainCat);
      }
    }

    // Attach subcategories to corresponding parents
    for (const parent of parentCategories) {
      const parentIdStr = parent._id.toString();
      if (subcategoryMap.has(parentIdStr)) {
        parent.subcategories = subcategoryMap.get(parentIdStr);
      }
    }

    // Handle case where user searched for a subcategory whose parent might not match search
    // but the subcategory does:
    if (search) {
      // Collect any orphans in map whose parents didn't match the search filter
      for (const [pId, subs] of subcategoryMap.entries()) {
        const parentFound = parentCategories.some((p) => p._id.toString() === pId);
        if (!parentFound && subs.length > 0) {
          // Fetch parent for context
          const parentDoc = await categoryRepository.findByIdAndUserId(pId, userId);
          if (parentDoc) {
            const parentPlain = parentDoc.toJSON();
            parentPlain.subcategories = subs;
            parentCategories.push(parentPlain);
          }
        }
      }
    }

    return {
      count: parentCategories.length,
      categories: parentCategories
    };
  },

  /**
   * Get single category with subcategories if parent
   */
  async getCategoryById(userId, categoryId) {
    const category = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const result = category.toJSON();
    if (!category.parentId) {
      const subcategories = await categoryRepository.findWithFilters(userId, {
        filter: { parentId: category._id, isActive: true }
      });
      result.subcategories = subcategories;
    }

    return result;
  },

  /**
   * Update category metadata
   */
  async updateCategory(userId, categoryId, updateData) {
    const category = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Prevent cycle: category cannot be its own parent
    if (updateData.parentId) {
      if (updateData.parentId.toString() === categoryId.toString()) {
        throw new AppError('A category cannot be its own parent', 400);
      }

      const newParent = await categoryRepository.findByIdAndUserId(updateData.parentId, userId);
      if (!newParent || !newParent.isActive) {
        throw new AppError('New parent category not found', 404);
      }

      if (newParent.type !== category.type) {
        throw new AppError('Parent category must have the same transaction type', 400);
      }

      if (newParent.parentId) {
        throw new AppError('Cannot nest under a subcategory', 400);
      }
    }

    if (updateData.name) {
      const parentIdToCheck = updateData.parentId !== undefined ? updateData.parentId : category.parentId;
      const duplicate = await categoryRepository.findDuplicate(
        updateData.name,
        parentIdToCheck,
        userId,
        categoryId
      );
      if (duplicate) {
        throw new AppError(
          `A category named "${updateData.name.trim()}" already exists at this level`,
          409
        );
      }
    }

    // Type and userId cannot be altered
    delete updateData.type;
    delete updateData.userId;

    const updated = await categoryRepository.update(categoryId, userId, updateData);
    logger.info(`Category updated: "${updated.name}" (${updated._id})`);

    return updated;
  },

  /**
   * Soft-delete category and cascade to subcategories
   */
  async deleteCategory(userId, categoryId) {
    const category = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Soft delete category
    await categoryRepository.softDelete(categoryId, userId);

    // If it is a parent category, cascade soft-delete to its subcategories
    if (!category.parentId) {
      await categoryRepository.softDeleteSubcategories(categoryId, userId);
    }

    logger.info(`Category deactivated: "${category.name}" (${categoryId})`);

    return {
      message: `Category "${category.name}" and any subcategories were deactivated successfully`,
      category: { id: category._id, isActive: false }
    };
  }
};
