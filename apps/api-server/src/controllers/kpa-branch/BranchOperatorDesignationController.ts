/**
 * BranchOperatorDesignationController — 개별 분회 운영자 지정·해제 (분회 서비스 관리자)
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *   GET    /admin/branches/:branchId/operators           분회 active 소속 회원 + 운영자 여부
 *   POST   /admin/branches/:branchId/operators           { userId } 지정
 *   DELETE /admin/branches/:branchId/operators/:userId   해제
 *
 * 가드는 `kpa-branch:admin`(서비스 관리자 · platformBypass). 분회 한정 판정은 서비스가 한다 —
 * `BranchOperatorDesignationService` 머리말 참조. Admin(admin.neture.co.kr)은 이 역할을 주지 않는다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import {
  BranchOperatorDesignationError,
  BranchOperatorDesignationService,
} from '../../services/kpa-branch/branch-operator-designation.service.js';

function service(): BranchOperatorDesignationService {
  return new BranchOperatorDesignationService(AppDataSource);
}

function sendError(res: Response, error: unknown): boolean {
  if (!(error instanceof BranchOperatorDesignationError)) return false;
  res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
  return true;
}

export const BranchOperatorDesignationController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const data = await service().list(req.params.branchId);
      res.json({ success: true, data });
    } catch (error) {
      if (!sendError(res, error)) throw error;
    }
  },

  async designate(req: Request, res: Response): Promise<void> {
    const actorId = (req as { user?: { id?: string } }).user?.id;
    if (!actorId) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId 가 필요합니다.', code: 'FIELD_REQUIRED', field: 'userId' });
      return;
    }
    try {
      const data = await service().designate(req.params.branchId, userId, actorId);
      res.status(data.assigned ? 201 : 200).json({ success: true, data });
    } catch (error) {
      if (!sendError(res, error)) throw error;
    }
  },

  async release(req: Request, res: Response): Promise<void> {
    try {
      const data = await service().release(req.params.branchId, req.params.userId);
      res.json({ success: true, data });
    } catch (error) {
      if (!sendError(res, error)) throw error;
    }
  },
};
