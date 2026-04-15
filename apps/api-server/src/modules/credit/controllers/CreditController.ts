import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CreditService } from '../services/CreditService.js';
import logger from '../../../utils/logger.js';

/**
 * CreditController
 *
 * WO-O4O-CREDIT-SYSTEM-V1
 * Handles credit balance and transaction history endpoints.
 */
export class CreditController extends BaseController {
  /**
   * GET /api/v1/credits/me
   * Get current user's credit balance
   */
  static async getMyBalance(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const service = CreditService.getInstance();
      const balance = await service.getBalance(userId);

      return BaseController.ok(res, { balance });
    } catch (error: any) {
      logger.error('[CreditController.getMyBalance] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * GET /api/v1/credits/me/transactions
   * Get current user's credit transaction history
   */
  static async getMyTransactions(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const service = CreditService.getInstance();
      const { transactions, total } = await service.getTransactions(userId, page, limit);

      return BaseController.ok(res, {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      logger.error('[CreditController.getMyTransactions] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
