/**
 * 운영자 지정 · 초대 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §5·§7·§15·§20
 *
 * 관리자(platform:super_admin)가 쓰는 두 경로:
 *   (A) 기존 사용자 선택 — **userId 로** 고른 대상에게 확인 초대 메일 발송
 *   (B) 미가입자 초대 — 가입·로그인과 메일 수락 후 지정 확정 (전용 초대 라우트)
 *
 * 이 컨트롤러는 비밀번호를 만들지도 받지도 않는다.
 * 감사 로그에는 raw invite token · Google ID token · Google sub 를 넣지 않는다(§20).
 */
import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { ActionLogService } from '@o4o/action-log-core';
import { AppDataSource } from '../../database/connection.js';
import {
  operatorAssignmentService,
  OperatorAssignmentError,
} from '../../services/admin/operator-assignment.service.js';
import { OperatorRoleContractError, ASSIGNABLE_PLATFORM_INVITATION_ROLES } from '../../config/operator-role-catalog.js';
import logger from '../../utils/logger.js';
import { ServiceOperatorInvitationError } from '../../services/admin/service-operator-invitation.service.js';
import { DemoAccountForbiddenError } from '../../services/auth/demo-account.service.js';

let actionLogService: ActionLogService | undefined;
function getActionLogService(): ActionLogService | undefined {
  if (!actionLogService && AppDataSource.isInitialized) {
    actionLogService = new ActionLogService(AppDataSource);
  }
  return actionLogService;
}

/** 감사 로그는 실패해도 본 요청을 실패시키지 않는다(기록 실패 < 작업 실패). */
function audit(serviceKey: string, userId: string | null, actionKey: string, meta: Record<string, unknown>): void {
  getActionLogService()
    ?.logSuccess(serviceKey, userId, actionKey, { meta })
    .catch((error) => logger.warn('[OperatorAssignment] action log failed', { actionKey, error: String(error) }));
}

function fail(res: Response, error: unknown, context: string): void {
  if (
    error instanceof ServiceOperatorInvitationError
    || error instanceof OperatorAssignmentError
    || error instanceof OperatorRoleContractError
    || error instanceof DemoAccountForbiddenError
  ) {
    res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
    return;
  }
  logger.error(`[OperatorAssignment] ${context} failed`, { code: (error as {code?:string})?.code ?? 'UNKNOWN' });
  res.status(500).json({ success: false, error: '요청을 처리하지 못했습니다.' });
}

export class OperatorAssignmentController {
  /** GET /api/v1/admin/operator-assignments/roles — 부여 가능한 역할 카탈로그(서버 SSOT). */
  listRoles = async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({ success: true, data: { roles: ASSIGNABLE_PLATFORM_INVITATION_ROLES } });
  };

  /** GET /api/v1/admin/operator-assignments/candidates?q=... — 지정 후보 검색. */
  searchCandidates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const candidates = await operatorAssignmentService.searchCandidates(q);
      res.json({ success: true, data: { candidates } });
    } catch (error) {
      fail(res, error, 'searchCandidates');
    }
  };

  /** POST /api/v1/admin/operator-assignments — `{ userId, serviceKey?, role }`. */
  assign = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId, serviceKey, role } = req.body ?? {};
      if (typeof userId !== 'string' || userId.trim().length === 0) {
        res.status(400).json({ success: false, error: 'userId 가 필요합니다.', code: 'USER_ID_REQUIRED' });
        return;
      }
      const actorId = req.user?.id ?? null;
      const { serviceOperatorInvitationService } = await import('../../services/admin/service-operator-invitation.service.js');
      const result = await serviceOperatorInvitationService.create({
        targetUserId: userId.trim(), serviceKey, role, actorId: actorId ?? '',
      });
      audit(result.service_key, actorId, 'admin.operator_confirmation_requested', {
        targetUserId: result.target_user_id, role: result.role,
      });
      res.status(202).json({ success: true, data: result });
    } catch (error) {
      fail(res, error, 'assign');
    }
  };

  // 모든 신규 지정은 이메일 확인과 수락을 거친다. 실제 역할 부여는 수락 트랜잭션에서만 한다.
}

export const operatorAssignmentController = new OperatorAssignmentController();
