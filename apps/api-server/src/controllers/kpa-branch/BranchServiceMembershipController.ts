/**
 * BranchServiceMembershipController — 분회 서비스 가입 승인 콘솔 (Extension Layer)
 *
 * WO-O4O-KPA-BRANCH-SERVICE-CREDENTIAL-ONBOARDING-V1
 *
 * 범위:
 *   service_memberships(service_key='kpa-branch') 목록 / 승인 / 반려 — 이것뿐이다.
 *   회원 삭제 · 비밀번호 변경 · role_assignments 직접 부여는 포함하지 않는다.
 *   (공통 /api/v1/operator/members 라우터에 kpa-branch role 을 추가하지 않은 이유.
 *    그 라우터의 requireRole allow-list 에 kpa-branch:* 가 없으므로 분회 운영자는
 *    다른 회원의 비밀번호를 변경할 수 없다 — 서비스 범위 밖 write 차단.)
 *
 * 격리:
 *   승인·반려 write 는 공통 MembershipApprovalService 에 위임하되
 *   isPlatformAdmin=false / serviceKeys=['kpa-branch'] 를 코드에서 고정한다.
 *   읽기 쿼리도 service_key = 'kpa-branch' 를 항상 포함한다.
 *   → 요청자 권한과 무관하게 타 서비스 membership 에 접근할 수 없다.
 *
 * 축 분리:
 *   여기서 승인되는 것은 "서비스 접근"이다. 분회 소속(branch_memberships)은 분회 운영자
 *   경로에서 별도로 처리한다. 두 축을 한 트랜잭션에 묶지 않는다.
 */

import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { MembershipApprovalService } from '../../services/approval/MembershipApprovalService.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.KPA_BRANCH;
/** 이 콘솔이 접근할 수 있는 유일한 서비스 범위 — 요청 값에서 유도하지 않는다. */
const SCOPE_SERVICE_KEYS = [SERVICE_KEY];

const approvalService = new MembershipApprovalService();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (s: unknown): s is string => typeof s === 'string' && UUID_REGEX.test(s);

const VALID_STATUSES = ['pending', 'active', 'rejected', 'suspended', 'withdrawn'];

export class BranchServiceMembershipController {
  /** GET /api/v1/kpa-branch/admin/service-members?status=pending */
  static async list(req: Request, res: Response): Promise<any> {
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

    try {
      const countRows = await AppDataSource.query(
        `SELECT COUNT(*)::int AS total
           FROM service_memberships sm
           JOIN users u ON u.id = sm.user_id
           ${where}`,
        params,
      );
      const rows = await AppDataSource.query(
        `SELECT sm.id, sm.user_id, sm.status, sm.role, sm.rejection_reason,
                sm.approved_at, sm.created_at, sm.updated_at,
                u.email, u.name, u.phone,
                (sc.id IS NOT NULL) AS has_credential
           FROM service_memberships sm
           JOIN users u ON u.id = sm.user_id
           LEFT JOIN service_credentials sc
                  ON sc.user_id = sm.user_id AND sc.service_key = sm.service_key
           ${where}
           ORDER BY sm.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset],
      );

      const total = countRows[0]?.total || 0;
      return res.json({
        success: true,
        data: {
          items: rows.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            email: r.email,
            name: r.name,
            phone: r.phone,
            status: r.status,
            role: r.role,
            // 서비스 비밀번호(L2 credential) 보유 여부. false 면 비밀번호 재설정 안내 대상이다.
            hasServiceCredential: r.has_credential === true,
            rejectionReason: r.rejection_reason,
            appliedAt: r.created_at,
            approvedAt: r.approved_at ?? null,
            updatedAt: r.updated_at,
          })),
          pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
        },
      });
    } catch (error) {
      logger.error('[BranchServiceMembership] list error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 신청 목록 조회에 실패했습니다.' });
    }
  }

  /** PATCH /api/v1/kpa-branch/admin/service-members/:membershipId/approve */
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
      return res.json({
        success: true,
        data: { id: membership.id, userId: membership.user_id, status: membership.status, role: membership.role },
      });
    } catch (error) {
      logger.error('[BranchServiceMembership] approve error', {
        membershipId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 승인에 실패했습니다.' });
    }
  }

  /** PATCH /api/v1/kpa-branch/admin/service-members/:membershipId/reject */
  static async reject(req: Request, res: Response): Promise<any> {
    const { membershipId } = req.params;
    if (!isValidUuid(membershipId)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 신청 ID입니다.', code: 'INVALID_MEMBERSHIP_ID' });
    }
    const reason = String((req.body ?? {}).reason ?? '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, error: '반려 사유를 입력해 주세요.', code: 'REJECTION_REASON_REQUIRED' });
    }

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
      return res.json({
        success: true,
        data: {
          id: membership.id,
          userId: membership.user_id,
          status: membership.status,
          role: membership.role,
          rejectionReason: membership.rejection_reason ?? reason,
        },
      });
    } catch (error) {
      logger.error('[BranchServiceMembership] reject error', {
        membershipId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '가입 반려에 실패했습니다.' });
    }
  }
}
