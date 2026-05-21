/**
 * PointBudgetController — 서비스별 포인트 예산 관리 API
 *
 * WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1
 *
 * 라우트 가드: requireAuth + requireAdmin
 *
 * GET  /api/v1/points/budget                      — 전체 서비스 예산 목록
 * GET  /api/v1/points/budget/:serviceKey          — 특정 서비스 예산 현황
 * POST /api/v1/points/budget/:serviceKey/allocate — 예산 추가
 * GET  /api/v1/points/budget/:serviceKey/transactions — 예산 변경 이력
 */

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { ServicePointBudgetService } from '../services/ServicePointBudgetService.js';
import logger from '../../../utils/logger.js';

const SERVICE_KEY_RE = /^[a-z0-9-]{1,100}$/;

export class PointBudgetController extends BaseController {
  /**
   * GET /api/v1/points/budget
   * 전체 서비스 예산 목록.
   */
  static async listAll(req: Request, res: Response): Promise<any> {
    try {
      const summaries = await ServicePointBudgetService.getInstance().listAll();
      return BaseController.ok(res, { budgets: summaries });
    } catch (error: any) {
      logger.error('[PointBudget] listAll error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * GET /api/v1/points/budget/:serviceKey
   * 특정 서비스 예산 현황.
   */
  static async getSummary(req: Request, res: Response): Promise<any> {
    try {
      const { serviceKey } = req.params;
      if (!SERVICE_KEY_RE.test(serviceKey)) {
        return BaseController.badRequest(res, 'Invalid serviceKey', 'INVALID_SERVICE_KEY');
      }
      const summary = await ServicePointBudgetService.getInstance().getSummary(serviceKey);
      return BaseController.ok(res, summary);
    } catch (error: any) {
      logger.error('[PointBudget] getSummary error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /api/v1/points/budget/:serviceKey/allocate
   * Body: { amount: number; memo?: string }
   * 예산 추가.
   */
  static async allocate(req: Request, res: Response): Promise<any> {
    try {
      const { serviceKey } = req.params;
      const { amount, memo } = req.body ?? {};

      if (!SERVICE_KEY_RE.test(serviceKey)) {
        return BaseController.badRequest(res, 'Invalid serviceKey', 'INVALID_SERVICE_KEY');
      }
      if (!Number.isInteger(amount) || amount <= 0) {
        return BaseController.badRequest(res, 'amount must be positive integer', 'INVALID_AMOUNT');
      }

      const operatorId = (req as any).user?.id;
      const summary = await ServicePointBudgetService.getInstance().allocateBudget({
        serviceKey,
        amount,
        memo: typeof memo === 'string' ? memo.trim() || undefined : undefined,
        operatorId,
      });

      logger.info('[PointBudget] Allocated', { serviceKey, amount, operatorId });

      return BaseController.ok(res, summary);
    } catch (error: any) {
      if (error?.message === 'INVALID_AMOUNT') {
        return BaseController.badRequest(res, 'amount must be positive', 'INVALID_AMOUNT');
      }
      logger.error('[PointBudget] allocate error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * GET /api/v1/points/budget/:serviceKey/transactions?page=1&limit=20
   * 예산 변경 이력.
   */
  static async listTransactions(req: Request, res: Response): Promise<any> {
    try {
      const { serviceKey } = req.params;
      if (!SERVICE_KEY_RE.test(serviceKey)) {
        return BaseController.badRequest(res, 'Invalid serviceKey', 'INVALID_SERVICE_KEY');
      }

      const pageRaw = parseInt(String(req.query.page ?? '1'), 10);
      const limitRaw = parseInt(String(req.query.limit ?? '20'), 10);
      const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
      const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20), 100);

      const { transactions, total } = await ServicePointBudgetService.getInstance().listTransactions(
        serviceKey,
        page,
        limit,
      );

      return BaseController.ok(res, {
        transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error: any) {
      logger.error('[PointBudget] listTransactions error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
