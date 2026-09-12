import { transferService } from '../services/transferService.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';

export const transferController = {
  /**
   * POST /api/transfers
   */
  async executeTransfer(req, res, next) {
    try {
      const result = await transferService.executeTransfer(req.user.id, req.body);
      return successResponse(res, 201, 'Transfer executed successfully', result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/transfers
   */
  async getTransfers(req, res, next) {
    try {
      const result = await transferService.getTransfers(req.user.id, req.query);
      return paginatedResponse(
        res,
        200,
        'Transfers retrieved successfully',
        result.transfers,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/transfers/:id
   */
  async getTransferById(req, res, next) {
    try {
      const transfer = await transferService.getTransferById(req.user.id, req.params.id);
      return successResponse(res, 200, 'Transfer retrieved successfully', { transfer });
    } catch (error) {
      next(error);
    }
  }
};
