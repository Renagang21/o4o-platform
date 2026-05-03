/**
 * PointAdminController — 운영자 수동 포인트 지급/차감
 *
 * WO-O4O-POINT-CORE-EXTENSION-V1
 *
 * 라우트 가드: requireAuth + requireAdmin
 * 응답 표준: BaseController { success, data } / { success, error, code }
 */

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import {
  PointService,
  POINT_PAYOUT_TYPES,
  type PointPayoutType,
} from '../services/PointService.js';
import logger from '../../../utils/logger.js';

const PAYOUT_TYPE_SET = new Set<string>(POINT_PAYOUT_TYPES);

export class PointAdminController extends BaseController {
  /**
   * POST /api/v1/points/admin/grant
   * Body: { userId: string; amount: number; description: string }
   *
   * 멱등성: referenceKey가 `admin_grant:{userId}:{Date.now()}` 기반이라 동일 요청 재시도 시
   *        Date.now() 차이로 새 트랜잭션이 생성됨. 운영자가 의도적으로 두 번 지급하면 두 번 적립.
   *        클라이언트 단에서 중복 호출 가드는 별도 책임.
   */
  static async grant(req: Request, res: Response): Promise<any> {
    try {
      const { userId, amount, description } = req.body ?? {};

      if (!userId || typeof userId !== 'string') {
        return BaseController.badRequest(res, 'userId is required', 'INVALID_USER_ID');
      }
      if (!Number.isInteger(amount) || amount <= 0) {
        return BaseController.badRequest(res, 'amount must be positive integer', 'INVALID_AMOUNT');
      }
      const desc = typeof description === 'string' && description.trim()
        ? description.trim()
        : 'Admin grant';

      const operatorId = (req as any).user?.id;
      const referenceKey = `admin_grant:${userId}:${Date.now()}`;

      const tx = await PointService.getInstance().grantPoint({
        userId,
        amount,
        sourceType: 'admin_grant',
        referenceKey,
        description: desc,
      });

      logger.info('[PointAdmin] grant', { operatorId, userId, amount, referenceKey });

      return BaseController.ok(res, {
        granted: tx ? amount : 0,
        transactionId: tx?.id ?? null,
        deduped: tx === null,
      });
    } catch (error: any) {
      logger.error('[PointAdminController.grant] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /api/v1/points/admin/spend
   * Body: { userId: string; amount: number; payoutType: PointPayoutType; description: string }
   *
   * 정책: 차감은 "보상 지급 완료 처리"이므로 description은 필수.
   *      (docs/point/O4O-POINT-REWARD-OPERATION-POLICY.md §6)
   *
   * WO-O4O-POINT-PAYOUT-TYPE-BACKEND-V1: payoutType을 sourceType으로 저장하여
   *   credit_transactions에서 보상 유형별 집계가 가능하도록 한다.
   *   transactionType은 항상 'spend' (PointService.spendPoint 내부에서 보장).
   */
  static async spend(req: Request, res: Response): Promise<any> {
    try {
      const { userId, amount, payoutType, description } = req.body ?? {};

      if (!userId || typeof userId !== 'string') {
        return BaseController.badRequest(res, 'userId is required', 'INVALID_USER_ID');
      }
      if (!Number.isInteger(amount) || amount <= 0) {
        return BaseController.badRequest(res, 'amount must be positive integer', 'INVALID_AMOUNT');
      }
      if (typeof payoutType !== 'string' || !PAYOUT_TYPE_SET.has(payoutType)) {
        return BaseController.badRequest(
          res,
          'payoutType must be one of: ' + POINT_PAYOUT_TYPES.join(', '),
          'INVALID_PAYOUT_TYPE',
        );
      }
      if (typeof description !== 'string' || !description.trim()) {
        return BaseController.badRequest(res, 'description is required', 'INVALID_DESCRIPTION');
      }
      const desc = description.trim();
      const sourceType = payoutType as PointPayoutType;

      const operatorId = (req as any).user?.id;
      const referenceKey = `admin_spend:${userId}:${Date.now()}`;

      const result = await PointService.getInstance().spendPoint({
        userId,
        amount,
        sourceType,
        referenceKey,
        description: desc,
      });

      logger.info('[PointAdmin] spend', {
        operatorId,
        userId,
        amount,
        payoutType: sourceType,
        referenceKey,
      });

      return BaseController.ok(res, result);
    } catch (error: any) {
      if (error?.message === 'INSUFFICIENT_BALANCE') {
        return BaseController.badRequest(res, '잔액이 부족합니다', 'INSUFFICIENT_BALANCE');
      }
      if (error?.message === 'INVALID_AMOUNT') {
        return BaseController.badRequest(res, 'amount must be positive', 'INVALID_AMOUNT');
      }
      logger.error('[PointAdminController.spend] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
