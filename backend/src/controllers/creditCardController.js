import { creditCardService } from '../services/creditCardService.js';
import { successResponse } from '../utils/apiResponse.js';

export const creditCardController = {
  /**
   * POST /api/credit-cards
   */
  async createCreditCard(req, res, next) {
    try {
      const card = await creditCardService.createCreditCard(req.user.id, req.body);
      return successResponse(res, 201, 'Credit card created successfully', { card });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/credit-cards
   */
  async getCreditCards(req, res, next) {
    try {
      const cards = await creditCardService.getCreditCards(req.user.id);
      return successResponse(res, 200, 'Credit cards retrieved successfully', cards, {
        count: cards.length
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/credit-cards/:id
   */
  async getCreditCardById(req, res, next) {
    try {
      const card = await creditCardService.getCreditCardById(req.user.id, req.params.id);
      return successResponse(res, 200, 'Credit card retrieved successfully', { card });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/credit-cards/:id
   */
  async updateCreditCard(req, res, next) {
    try {
      const card = await creditCardService.updateCreditCard(req.user.id, req.params.id, req.body);
      return successResponse(res, 200, 'Credit card updated successfully', { card });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/credit-cards/:id
   */
  async deleteCreditCard(req, res, next) {
    try {
      const result = await creditCardService.deleteCreditCard(req.user.id, req.params.id);
      return successResponse(res, 200, result.message, { creditCardId: result.creditCardId });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/credit-cards/:id/outstanding
   */
  async getOutstanding(req, res, next) {
    try {
      const result = await creditCardService.getOutstanding(req.user.id, req.params.id);
      return successResponse(res, 200, 'Outstanding details retrieved', result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/credit-cards/:id/statements
   */
  async createStatement(req, res, next) {
    try {
      const statement = await creditCardService.createStatement(
        req.user.id,
        req.params.id,
        req.body
      );
      return successResponse(res, 201, 'Statement created successfully', { statement });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/credit-cards/:id/statements
   */
  async getStatements(req, res, next) {
    try {
      const statements = await creditCardService.getStatements(req.user.id, req.params.id);
      return successResponse(res, 200, 'Statements retrieved successfully', statements, {
        count: statements.length
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/credit-cards/:id/payment
   */
  async payCreditCardBill(req, res, next) {
    try {
      const result = await creditCardService.payCreditCardBill(
        req.user.id,
        req.params.id,
        req.body
      );
      return successResponse(res, 200, result.message, result);
    } catch (error) {
      next(error);
    }
  }
};
