import { exportService } from '../services/exportService.js';

class ExportController {
  /**
   * GET /api/export/transactions
   * Export transactions as CSV or JSON file
   */
  async exportTransactions(req, res, next) {
    try {
      const result = await exportService.exportTransactions(
        req.user.id,
        req.query,
        req.user.currency
      );

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      if (result.contentType.includes('json')) {
        return res.status(200).json(result.data);
      }
      return res.status(200).send(result.data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/export/accounts
   * Export accounts list as CSV or JSON file
   */
  async exportAccounts(req, res, next) {
    try {
      const result = await exportService.exportAccounts(
        req.user.id,
        req.query,
        req.user.currency
      );

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      if (result.contentType.includes('json')) {
        return res.status(200).json(result.data);
      }
      return res.status(200).send(result.data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/export/full-backup
   * Export full system snapshot JSON for user
   */
  async exportFullBackup(req, res, next) {
    try {
      const result = await exportService.exportFullBackup(req.user.id);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

      return res.status(200).send(JSON.stringify(result.data, null, 2));
    } catch (error) {
      next(error);
    }
  }
}

export const exportController = new ExportController();
