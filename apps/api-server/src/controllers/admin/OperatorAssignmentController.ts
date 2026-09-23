/**
 * 운영자 지정 · 초대 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §5·§7·§15·§20
 *
 * 관리자(platform:super_admin)가 쓰는 두 경로:
 *   (A) 직접 지정  — 이미 Google 로 로그인하는 O4O 사용자를 **userId 로** 골라 역할 부여
 *   (B) 초대       — 미가입자에게 이메일로 초대를 보내고, 수락 시점에 Identity 가 확정된다
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
import {
  operatorInvitationService,
  OperatorInvitationError,
} from '../../services/admin/operator-invitation.service.js';
import { OperatorRoleContractError, ASSIGNABLE_OPERATOR_ROLES } from '../../config/operator-role-catalog.js';
import logger from '../../utils/logger.js';

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
    error instanceof OperatorAssignmentError
    || error instanceof OperatorInvitationError
    || error instanceof OperatorRoleContractError
  ) {
    res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
    return;
  }
  logger.error(`[OperatorAssignment] ${context} failed`, error);
  res.status(500).json({ success: false, error: '요청을 처리하지 못했습니다.' });
}

export class OperatorAssignmentController {
  /** GET /api/v1/admin/operator-assignments/roles — 부여 가능한 역할 카탈로그(서버 SSOT). */
  listRoles = async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({ success: true, data: { roles: ASSIGNABLE_OPERATOR_ROLES } });
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
      const result = await operatorAssignmentService.assign({
        userId: userId.trim(),
        serviceKey,
        role,
        assignedBy: actorId,
      });
      audit(result.serviceKey, actorId, 'admin.operator_role_assigned', {
        targetUserId: result.userId,
        role: result.role,
        membershipPolicy: result.membershipPolicy,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      fail(res, error, 'assign');
    }
  };

  /** GET /api/v1/admin/operator-invitations?status=pending */
  listInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const invitations = await operatorInvitationService.list(status);
      res.json({ success: true, data: { invitations } });
    } catch (error) {
      fail(res, error, 'listInvitations');
    }
  };

  /** POST /api/v1/admin/operator-invitations — `{ email, serviceKey?, role }`. */
  createInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, serviceKey, role } = req.body ?? {};
      if (typeof email !== 'string') {
        res.status(400).json({ success: false, error: '이메일이 필요합니다.', code: 'INVALID_EMAIL' });
        return;
      }
      const actorId = req.user?.id ?? null;
      const result = await operatorInvitationService.create({
        email,
        serviceKey,
        role,
        invitedByUserId: actorId,
      });
      audit(result.invitation.serviceKey, actorId, 'admin.operator_invitation_created', {
        invitationId: result.invitation.id,
        role: result.invitation.role,
        emailSent: result.emailSent,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      fail(res, error, 'createInvitation');
    }
  };

  /** POST /api/v1/admin/operator-invitations/:id/resend — 같은 행의 토큰을 회전시켜 다시 보낸다. */
  resendInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await operatorInvitationService.resend(req.params.id);
      audit(result.invitation.serviceKey, req.user?.id ?? null, 'admin.operator_invitation_resent', {
        invitationId: result.invitation.id,
        emailSent: result.emailSent,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      fail(res, error, 'resendInvitation');
    }
  };

  /** POST /api/v1/admin/operator-invitations/:id/cancel — 초대만 취소한다(권한 회수 아님). */
  cancelInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const invitation = await operatorInvitationService.cancel(req.params.id);
      audit(invitation.serviceKey, req.user?.id ?? null, 'admin.operator_invitation_cancelled', {
        invitationId: invitation.id,
      });
      res.json({ success: true, data: { invitation } });
    } catch (error) {
      fail(res, error, 'cancelInvitation');
    }
  };
}

export const operatorAssignmentController = new OperatorAssignmentController();
