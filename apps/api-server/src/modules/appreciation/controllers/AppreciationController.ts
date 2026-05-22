/**
 * AppreciationController — 기여 감사 포인트
 * WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
 */

import type { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AppreciationService } from '../services/AppreciationService.js';
import { APPRECIATION_TARGET_TYPES, type AppreciationTargetType } from '../entities/AppreciationSend.js';
import logger from '../../../utils/logger.js';

export class AppreciationController extends BaseController {

  /** POST /api/v1/appreciation/send */
  static async send(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return BaseController.unauthorized(res);

      const { targetType, targetId, amount, message } = req.body ?? {};

      if (!targetType || !targetId || amount === undefined) {
        return BaseController.badRequest(res, 'targetType, targetId, amount 필수');
      }

      const result = await AppreciationService.getInstance().sendAppreciation(userId, {
        targetType,
        targetId,
        amount: Number(amount),
        message,
      });

      return BaseController.created(res, { appreciation: result });
    } catch (e: any) {
      if (e.message === 'APPRECIATION_SELF_SEND') return BaseController.badRequest(res, '자신에게 감사 포인트를 보낼 수 없습니다');
      if (e.message === 'APPRECIATION_TARGET_INVALID') return BaseController.badRequest(res, '감사 대상을 찾을 수 없습니다');
      if (e.message === 'INVALID_AMOUNT') return BaseController.badRequest(res, '금액은 1P 이상이어야 합니다');
      if (e.message === 'INSUFFICIENT_BALANCE') return BaseController.badRequest(res, '포인트가 부족합니다');
      logger.error('[AppreciationController.send]', { error: e.message });
      return BaseController.error(res, e);
    }
  }

  /** GET /api/v1/appreciation/my-sent */
  static async getMySent(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return BaseController.unauthorized(res);

      const page = Number((req.query as any).page) || 1;
      const limit = Math.min(50, Number((req.query as any).limit) || 20);
      const result = await AppreciationService.getInstance().getMySent(userId, page, limit);

      return BaseController.okPaginated(res, result.items, {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (e: any) {
      logger.error('[AppreciationController.getMySent]', { error: e.message });
      return BaseController.error(res, e);
    }
  }

  /** GET /api/v1/appreciation/my-received */
  static async getMyReceived(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return BaseController.unauthorized(res);

      const page = Number((req.query as any).page) || 1;
      const limit = Math.min(50, Number((req.query as any).limit) || 20);
      const result = await AppreciationService.getInstance().getMyReceived(userId, page, limit);

      return BaseController.okPaginated(res, result.items, {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (e: any) {
      logger.error('[AppreciationController.getMyReceived]', { error: e.message });
      return BaseController.error(res, e);
    }
  }

  /** GET /api/v1/appreciation/:targetType/:targetId/recent — 최근 감사 메시지 (WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1) */
  static async getRecent(req: Request, res: Response): Promise<any> {
    try {
      const { targetType, targetId } = req.params;

      if (!APPRECIATION_TARGET_TYPES.includes(targetType as AppreciationTargetType)) {
        return BaseController.badRequest(res, '지원하지 않는 targetType');
      }

      const items = await AppreciationService.getInstance().getRecent(
        targetType as AppreciationTargetType,
        targetId,
        5,
      );

      return BaseController.ok(res, { items });
    } catch (e: any) {
      logger.error('[AppreciationController.getRecent]', { error: e.message });
      return BaseController.error(res, e);
    }
  }

  /** GET /api/v1/appreciation/:targetType/:targetId/summary */
  static async getSummary(req: Request, res: Response): Promise<any> {
    try {
      const { targetType, targetId } = req.params;

      if (!APPRECIATION_TARGET_TYPES.includes(targetType as AppreciationTargetType)) {
        return BaseController.badRequest(res, '지원하지 않는 targetType');
      }

      const summary = await AppreciationService.getInstance().getSummary(
        targetType as AppreciationTargetType,
        targetId,
      );

      return BaseController.ok(res, summary);
    } catch (e: any) {
      logger.error('[AppreciationController.getSummary]', { error: e.message });
      return BaseController.error(res, e);
    }
  }
}
