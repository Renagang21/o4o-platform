/**
 * PharmacyHubMembershipConsoleController — Pharmacy-Hub 운영자 회원 승인 콘솔 (Extension Layer)
 *
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-C
 *
 * 범위 (§5.5):
 *   회원 가입 신청 목록 / 상세 / 승인 / 반려 — 이것뿐이다.
 *   상품 승인 · 주문 승인 · 콘텐츠 승인 · 거래 개입 엔드포인트는 존재하지 않는다.
 *   회원 삭제 · hard delete · role_assignments 직접 부여도 포함하지 않는다
 *   (공통 /api/v1/operator/members 라우터에 pharmacy-hub:operator 를 추가하지 않은 이유).
 *
 * 격리 (§6-C):
 *   승인·반려 write 는 공통 MembershipApprovalService 에 위임하되
 *   isPlatformAdmin=false / serviceKeys=['pharmacy-hub'] 를 코드에서 고정한다.
 *   읽기 쿼리도 service_key = 'pharmacy-hub' 를 항상 포함한다.
 *   → 요청자 권한과 무관하게 타 서비스 membership 에 접근할 수 없다 (구조적 보장).
 *
 * 역할 부여 (§6-E):
 *   MembershipApprovalService 가 단일 트랜잭션에서
 *   service_memberships(active) + users + role_assignments(멱등 upsert) 를 함께 처리한다.
 *   부여되는 role 은 service_memberships.role 값 = 'pharmacy-hub:store_owner' | 'pharmacy-hub:supplier'.
 *   반려 시에는 역할을 부여하지 않는다.
 */

import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { MembershipApprovalService } from '../../services/approval/MembershipApprovalService.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { ActionLogService } from '@o4o/action-log-core';
// WO-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1: 승인 후 매장 주체(organization/owner/slug) 보장
import { PharmacyHubStoreProvisioningService } from '../../services/pharmacy-hub/PharmacyHubStoreProvisioningService.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
/** 이 콘솔이 접근할 수 있는 유일한 서비스 범위 — 요청 값에서 유도하지 않는다. */
const SCOPE_SERVICE_KEYS = [SERVICE_KEY];

const approvalService = new MembershipApprovalService();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (s: unknown): s is string => typeof s === 'string' && UUID_REGEX.test(s);

const VALID_STATUSES = ['pending', 'active', 'rejected', 'suspended', 'withdrawn'];

let actionLogService: ActionLogService | undefined;
function getActionLogService(): ActionLogService | undefined {
  if (!actionLogService && AppDataSource.isInitialized) {
    actionLogService = new ActionLogService(AppDataSource);
  }
  return actionLogService;
}

function toRoleType(role: string | null): string | null {
  if (!role) return null;
  return role.startsWith(`${SERVICE_KEY}:`) ? role.slice(SERVICE_KEY.length + 1) : role;
}

export class PharmacyHubMembershipConsoleController {
  /**
   * GET /api/v1/pharmacy-hub/operator/memberships
   * 가입 신청 목록 (기본 status=pending)
   */
  static async list(req: Request, res: Response): Promise<any> {
    try {
      const { status = 'pending', search, page = 1, limit = 20 } = req.query as Record<string, any>;

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      const conditions = ['sm.service_key = $1'];
      const params: any[] = [SERVICE_KEY];
      let idx = 2;

      if (status && status !== 'all') {
        if (!VALID_STATUSES.includes(String(status))) {
          return res.status(400).json({ success: false, error: 'Invalid status', code: 'INVALID_STATUS' });
        }
        conditions.push(`sm.status = $${idx++}`);
        params.push(status);
      }

      if (search) {
        conditions.push(`(u.email ILIKE $${idx} OR u.name ILIKE $${idx})`);
        params.push(`%${search}%`);
        idx++;
      }

      const where = `WHERE ${conditions.join(' AND ')}`;

      const countRows = await AppDataSource.query(
        `SELECT COUNT(*)::int AS total
           FROM service_memberships sm
           JOIN users u ON u.id = sm.user_id
           ${where}`,
        params,
      );
      const total = countRows[0]?.total || 0;

      const rows = await AppDataSource.query(
        `SELECT sm.id, sm.user_id, sm.status, sm.role, sm.rejection_reason,
                sm.approved_by, sm.approved_at, sm.created_at, sm.updated_at,
                u.email, u.name, u.phone,
                u."businessInfo"->>'businessName' AS company
           FROM service_memberships sm
           JOIN users u ON u.id = sm.user_id
           ${where}
           ORDER BY sm.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset],
      );

      return res.json({
        success: true,
        data: {
          items: rows.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            email: r.email,
            name: r.name,
            phone: r.phone,
            company: r.company,
            status: r.status,
            role: r.role,
            roleType: toRoleType(r.role),
            rejectionReason: r.rejection_reason,
            approvedBy: r.approved_by,
            approvedAt: r.approved_at,
            appliedAt: r.created_at,
            updatedAt: r.updated_at,
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubMembershipConsole] list error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 신청 목록 조회에 실패했습니다.' });
    }
  }

  /**
   * GET /api/v1/pharmacy-hub/operator/memberships/:membershipId
   */
  static async detail(req: Request, res: Response): Promise<any> {
    const { membershipId } = req.params;
    if (!isValidUuid(membershipId)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 신청 ID입니다.', code: 'INVALID_MEMBERSHIP_ID' });
    }

    try {
      const rows = await AppDataSource.query(
        `SELECT sm.id, sm.user_id, sm.status, sm.role, sm.rejection_reason,
                sm.approved_by, sm.approved_at, sm.created_at, sm.updated_at,
                u.email, u.name, u.phone, u."businessInfo"
           FROM service_memberships sm
           JOIN users u ON u.id = sm.user_id
          WHERE sm.id = $1 AND sm.service_key = $2`,
        [membershipId, SERVICE_KEY],
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: '가입 신청을 찾을 수 없습니다.' });
      }

      const r = rows[0];
      const biz = r.businessInfo || {};
      return res.json({
        success: true,
        data: {
          id: r.id,
          userId: r.user_id,
          email: r.email,
          name: r.name,
          phone: r.phone,
          status: r.status,
          role: r.role,
          roleType: toRoleType(r.role),
          rejectionReason: r.rejection_reason,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          appliedAt: r.created_at,
          updatedAt: r.updated_at,
          profile: {
            businessName: biz.businessName ?? null,
            contactName: biz.contactName ?? null,
            managerPhone: biz.managerPhone ?? null,
            businessNumber: biz.businessNumber ?? null,
            businessAddress: biz.businessAddress ?? null,
          },
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubMembershipConsole] detail error', {
        membershipId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 신청 상세 조회에 실패했습니다.' });
    }
  }

  /**
   * PATCH /api/v1/pharmacy-hub/operator/memberships/:membershipId/approve
   */
  static async approve(req: Request, res: Response): Promise<any> {
    const { membershipId } = req.params;
    if (!isValidUuid(membershipId)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 신청 ID입니다.', code: 'INVALID_MEMBERSHIP_ID' });
    }
    const approvedBy = (req as any).user?.id || null;

    try {
      const membership = await approvalService.approveMembership({
        membershipId,
        approvedBy,
        isPlatformAdmin: false,
        serviceKeys: SCOPE_SERVICE_KEYS,
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          error: '승인 가능한 가입 신청을 찾을 수 없습니다.',
          code: 'MEMBERSHIP_NOT_APPROVABLE',
        });
      }

      getActionLogService()
        ?.logSuccess(SERVICE_KEY, approvedBy || 'unknown', `${SERVICE_KEY}.operator.member_approve`, {
          meta: { targetId: membershipId, statusBefore: 'pending', statusAfter: 'active', role: membership.role },
        })
        .catch(() => {});

      // WO-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1
      //   승인이 커밋된 뒤 매장 주체를 보장한다 (store_owner 만 대상, 멱등).
      //   실패 격리: 프로비저닝 실패가 회원 승인을 되돌리지 않는다 — KPA member.controller.ts
      //   pharmacy_owner auto-activation 과 동일 정책. 보류/실패는 응답 storeSubject 로 보고되고
      //   backfill 스크립트로 복구 가능하다.
      let storeSubject: Record<string, unknown> | undefined;
      try {
        const provisioning = new PharmacyHubStoreProvisioningService(AppDataSource);
        const result = await provisioning.provisionStoreSubject(membership.user_id, approvedBy);
        storeSubject = {
          outcome: result.outcome,
          organizationId: result.organizationId,
          slug: result.slug,
          ...(result.holdReason ? { holdReason: result.holdReason, detail: result.detail } : {}),
        };
        if (result.outcome === 'held') {
          logger.warn('[PharmacyHubMembershipConsole] store subject held', {
            membershipId,
            userId: membership.user_id,
            holdReason: result.holdReason,
            detail: result.detail,
          });
        }
      } catch (provisionError) {
        logger.error('[PharmacyHubMembershipConsole] store subject provisioning failed', {
          membershipId,
          userId: membership.user_id,
          error: provisionError instanceof Error ? provisionError.message : String(provisionError),
        });
        storeSubject = { outcome: 'failed' };
      }

      return res.json({
        success: true,
        data: {
          id: membership.id,
          userId: membership.user_id,
          status: membership.status,
          role: membership.role,
          roleType: toRoleType(membership.role),
          storeSubject,
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubMembershipConsole] approve error', {
        membershipId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 승인에 실패했습니다.' });
    }
  }

  /**
   * PATCH /api/v1/pharmacy-hub/operator/memberships/:membershipId/reject
   * 반려 사유 + 처리자 + 처리 일시는 기존 컬럼(rejection_reason / updated_at)과 action log 에 남는다.
   */
  static async reject(req: Request, res: Response): Promise<any> {
    const { membershipId } = req.params;
    if (!isValidUuid(membershipId)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 신청 ID입니다.', code: 'INVALID_MEMBERSHIP_ID' });
    }

    const reason = String((req.body ?? {}).reason ?? '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, error: '반려 사유를 입력해 주세요.', code: 'REJECTION_REASON_REQUIRED' });
    }

    const rejectedBy = (req as any).user?.id || null;

    try {
      const membership = await approvalService.rejectMembership({
        membershipId,
        reason,
        isPlatformAdmin: false,
        serviceKeys: SCOPE_SERVICE_KEYS,
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          error: '반려 가능한 가입 신청을 찾을 수 없습니다.',
          code: 'MEMBERSHIP_NOT_REJECTABLE',
        });
      }

      getActionLogService()
        ?.logSuccess(SERVICE_KEY, rejectedBy || 'unknown', `${SERVICE_KEY}.operator.member_reject`, {
          meta: { targetId: membershipId, reason, statusBefore: 'pending', statusAfter: 'rejected' },
        })
        .catch(() => {});

      return res.json({
        success: true,
        data: {
          id: membership.id,
          userId: membership.user_id,
          serviceKey: membership.service_key,
          status: membership.status,
          role: membership.role,
          roleType: toRoleType(membership.role),
          rejectionReason: membership.rejection_reason ?? reason,
        },
      });
    } catch (error) {
      logger.error('[PharmacyHubMembershipConsole] reject error', {
        membershipId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 반려에 실패했습니다.' });
    }
  }
}
