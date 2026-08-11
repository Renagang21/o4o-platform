/**
 * MembershipConsoleController — Extension Layer
 * WO-O4O-MEMBERSHIP-CONSOLE-V1
 *
 * Operator 회원 콘솔: 사용자 + service_memberships + role_assignments 통합 조회
 * Core Freeze F10 준수: AdminUserController/users.routes 미수정, Extension 엔드포인트 사용
 */
import { Request, Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import type { ServiceScope } from '../../utils/serviceScope.js';
import { resolveOperatorScope, logCrossServiceQuery, PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE } from '../../utils/serviceScope.js';
import { hashPassword } from '../../utils/auth.utils.js';
import logger from '../../utils/logger.js';
import { MembershipApprovalService } from '../../services/approval/MembershipApprovalService.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { roleService } from '../../modules/auth/services/role.service.js';
import { isOperationalRole } from '../../types/roles.js';
import { ActionLogService } from '@o4o/action-log-core';
// WO-O4O-OPERATOR-SERVICE-CREDENTIAL-PASSWORD-CHANGE-AND-DOC-ALIGNMENT-V1:
//   canonical service_key → role prefix 는 @o4o/security-core SSOT 위임 (로컬 매핑 금지).
import { resolveRolePrefixFromCanonicalServiceKey } from '@o4o/security-core';
// WO-O4O-OPERATOR-MEMBER-PASSWORD-MIN-LENGTH-UNIFY-V1:
//   서비스 credential 최소 길이 정본(8자)을 재사용한다. 로컬 상수 신설 금지.
import { SERVICE_PASSWORD_MIN_LENGTH } from '../admin/AdminUserController.js';

const approvalService = new MembershipApprovalService();

// WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1: canonical 최고 관리자 역할
const PLATFORM_SUPER_ADMIN_ROLE = 'platform:super_admin';

// WO-O4O-GLYCOPHARM-OPERATOR-MEMBER-EDIT-INVALID-USERID-GUARD-V1:
// :userId 라우트 파라미터가 UUID 형식인지 검증하여 PostgreSQL UUID 파싱 500 을 400 으로 정리한다.
// 8 개 :userId 기반 endpoint 공통 사용.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (s: unknown): s is string => typeof s === 'string' && UUID_REGEX.test(s);
const INVALID_USER_ID_RESPONSE = {
  success: false,
  error: 'INVALID_USER_ID',
  message: '유효하지 않은 회원 ID입니다.',
};

/**
 * WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1:
 *   승인/중지/반려 외에 운영자 UI 가 보내는 상태. service_memberships.status 로만 전이하며
 *   users 공통 계정은 건드리지 않는다. (계정 전체 정지·삭제는 DELETE /:userId 및 admin API 담당)
 */
const MEMBERSHIP_SCOPED_STATUSES = ['withdrawn', 'pending'];

/**
 * WO-O4O-OPERATOR-SERVICE-CREDENTIAL-PASSWORD-CHANGE-AND-DOC-ALIGNMENT-V1
 * WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2
 *
 * 운영 계층. 비밀번호 변경은 **상위 계층만 하위 계층에 대해** 허용한다.
 * 판정 축은 `isOperationalRole` 과 동일하게 role 의 마지막 세그먼트다.
 */
type OperationalTier = 'member' | 'operator' | 'admin' | 'platform';

/** 비밀번호 변경 실패 응답. 성공 시 null 을 반환한다. */
interface PasswordChangeFailure {
  status: number;
  error: string;
  code: string;
}

const OPERATIONAL_TIER_RANK: Record<OperationalTier, number> = {
  member: 0,
  operator: 1,
  admin: 2,
  platform: 3,
};

/**
 * 주어진 서비스(rolePrefix) 기준 운영 계층을 판정한다.
 * platform 계정은 서비스와 무관하게 최상위다.
 */
function resolveOperationalTier(roles: string[], rolePrefix: string): OperationalTier {
  if (roles.includes(PLATFORM_SUPER_ADMIN_ROLE) || roles.includes('super_admin')) return 'platform';
  if (roles.includes(`${rolePrefix}:admin`)) return 'admin';
  if (roles.includes(`${rolePrefix}:operator`)) return 'operator';
  return 'member';
}


export class MembershipConsoleController {
  private actionLogService?: ActionLogService;

  private getActionLogService(): ActionLogService {
    if (!this.actionLogService && AppDataSource.isInitialized) {
      this.actionLogService = new ActionLogService(AppDataSource);
    }
    return this.actionLogService!;
  }

  /**
   * 운영자의 회원 비밀번호 변경 — Identity V2 서비스별 credential 경로.
   *
   * WO-O4O-OPERATOR-SERVICE-CREDENTIAL-PASSWORD-CHANGE-AND-DOC-ALIGNMENT-V1
   *
   * 계약:
   *   - `users.password` 를 건드리지 않는다 (V1 공통 비밀번호 경로 종료).
   *   - **정확히 하나의 serviceKey** 에 해당하는 `service_credentials` 만 갱신한다.
   *     대상 서비스가 모호하면 전역 변경 대신 400 으로 거절한다.
   *   - 운영 계층 순위(member < operator < admin < platform)에서 **상위만 하위를 변경**한다.
   *     동급(operator → 다른 operator)·상위(operator → admin) 변경은 금지.
   *   - credential row 가 없으면 그 서비스 row 만 생성한다(다른 서비스 credential 무변경).
   */
  private async changeMemberServicePassword(params: {
    req: Request;
    scope: ServiceScope;
    targetUserId: string;
    newPassword: string;
  }): Promise<PasswordChangeFailure | null> {
    const { req, scope, targetUserId, newPassword } = params;

    // (0) 최소 길이 검증 — hash · credential write 이전에 거절한다.
    //     WO-O4O-OPERATOR-MEMBER-PASSWORD-MIN-LENGTH-UNIFY-V1:
    //       프런트(목록/상세 모달)만 8자를 강제하면 API 직접 호출로 정책을 우회할 수 있다.
    //       복잡성 규칙은 이 WO 범위 밖이며 최소 길이만 서버에서 강제한다.
    if (typeof newPassword !== 'string' || newPassword.length < SERVICE_PASSWORD_MIN_LENGTH) {
      return {
        status: 400,
        error: `비밀번호는 최소 ${SERVICE_PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
        code: 'WEAK_PASSWORD',
      };
    }

    // (1) 후보 서비스 산출 = **호출자 관리 범위 ∩ 대상자 Membership**
    //     WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2:
    //       이전 구현은 `scope.serviceKeys.length === 1` 만 자동 확정해서,
    //       2개 서비스를 관리하는 운영자가 **한 서비스에만 속한 회원**을 바꿀 때도 400 이 났다.
    //       기준은 운영자가 관리하는 서비스 수가 아니라 **교집합 후보 수**여야 한다.
    const targetMembershipRows = await AppDataSource.query(
      `SELECT service_key FROM service_memberships WHERE user_id = $1`,
      [targetUserId]
    );
    const targetServiceKeys: string[] = targetMembershipRows.map((r: { service_key: string }) => r.service_key);
    const candidates = scope.isPlatformAdmin
      ? targetServiceKeys
      : targetServiceKeys.filter((k) => scope.serviceKeys.includes(k));

    if (candidates.length === 0) {
      return {
        status: 404,
        error: '비밀번호를 변경할 수 있는 서비스가 없습니다.',
        code: 'NO_MANAGEABLE_SERVICE',
      };
    }

    // (2) 대상 서비스 확정 — 모호하면 거절한다(전역·일괄 변경 금지).
    const requested = req.body?.serviceKey ?? req.body?.membershipServiceKey;
    const explicitKey = typeof requested === 'string' && requested.trim() ? requested.trim() : undefined;

    let serviceKey: string | undefined;
    if (explicitKey) {
      if (!candidates.includes(explicitKey)) {
        // 관리 범위 밖이거나 대상이 그 서비스 회원이 아니다. 어느 쪽인지 구분해 응답한다.
        const inScope = scope.isPlatformAdmin || scope.serviceKeys.includes(explicitKey);
        return inScope
          ? { status: 404, error: '해당 서비스의 회원이 아닙니다.', code: 'SERVICE_NOT_MEMBER' }
          : { status: 403, error: '다른 서비스 회원의 비밀번호는 변경할 수 없습니다.', code: 'SERVICE_SCOPE_FORBIDDEN' };
      }
      serviceKey = explicitKey;
    } else if (!scope.isPlatformAdmin && candidates.length === 1) {
      // 후보가 하나뿐이면 자동 확정. 플랫폼 관리자는 항상 명시적으로 선택해야 한다.
      serviceKey = candidates[0];
    }

    if (!serviceKey) {
      return {
        status: 400,
        error: '대상 서비스(serviceKey)를 지정해야 합니다.',
        code: 'SERVICE_KEY_REQUIRED',
      };
    }

    // (3) 운영 계층 검증 — **선택된 서비스 안에서만** 판정한다.
    //     다른 서비스의 role 이나 사용자의 전체 최고 role 로 판정하지 않는다.
    //     예) 대상이 kpa:admin 이어도 glycopharm 에서 일반 회원이면 glycopharm 에서는 member 다.
    //     platform 계정만 서비스와 무관한 최상위이며, 이는 "플랫폼 계정 비밀번호는
    //     이 경로가 다루지 않는다"는 계약을 표현한다(대상이 platform 이면 항상 차단).
    const rolePrefix = resolveRolePrefixFromCanonicalServiceKey(serviceKey);
    const callerRoles: string[] = (req as any).user?.roles ?? [];
    const targetRoleRows = await AppDataSource.query(
      `SELECT role FROM role_assignments WHERE user_id = $1 AND is_active = true`,
      [targetUserId]
    );
    const targetRoles: string[] = targetRoleRows.map((r: { role: string }) => r.role);

    const callerTier = resolveOperationalTier(callerRoles, rolePrefix);
    const targetTier = resolveOperationalTier(targetRoles, rolePrefix);

    if (OPERATIONAL_TIER_RANK[callerTier] <= OPERATIONAL_TIER_RANK[targetTier]) {
      return {
        status: 403,
        error: '이 회원의 비밀번호를 변경할 권한이 없습니다.',
        code: 'INSUFFICIENT_OPERATOR_TIER',
      };
    }

    // (4) 해당 서비스 credential 만 갱신 — users.password·타 서비스 credential 무변경.
    const passwordHash = await hashPassword(newPassword);
    await AppDataSource.query(
      `INSERT INTO service_credentials (user_id, service_key, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT ON CONSTRAINT "uq_service_credentials_user_service"
       DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()`,
      [targetUserId, serviceKey, passwordHash]
    );

    logger.info('[MembershipConsole] service credential password changed', {
      targetUserId, serviceKey, callerTier, targetTier,
      changedBy: (req as any).user?.id ?? null,
    });

    return null;
  }

  /**
   * Service boundary check — non-platform-admin can only access users in their service scope
   */
  private async checkServiceBoundary(userId: string, serviceKeys: string[]): Promise<boolean> {
    const result = await AppDataSource.query(
      `SELECT 1 FROM service_memberships WHERE user_id = $1 AND service_key = ANY($2) LIMIT 1`,
      [userId, serviceKeys]
    );
    return result.length > 0;
  }

  /**
   * GET /api/v1/operator/members
   * 회원 목록 + service_memberships + role_assignments
   */
  getMembers = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      // WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1: Option B 스코프 결정
      const resolved = resolveOperatorScope(scope, req.query);
      if (!resolved) {
        res.status(400).json(PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE);
        return;
      }
      if (resolved.crossService) logCrossServiceQuery(req);

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build WHERE conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if (search) {
        conditions.push(
          `(u."firstName" ILIKE $${paramIdx} OR u."lastName" ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`
        );
        params.push(`%${search}%`);
        paramIdx++;
      }

      // WO-GLYCOPHARM-MEMBER-REGISTRATION-PENDING-VISIBILITY-FIX-V1:
      // Status + service scope → combined service_memberships subquery.
      // Uses sm.status (SSOT for service-level membership state) instead of u.status.
      const smConditions: string[] = [];

      if (status && status !== 'all') {
        smConditions.push(`sm_f.status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      // Service scope filter — null serviceKeys 면 cross-service 모드 (필터 미적용)
      if (resolved.serviceKeys !== null) {
        smConditions.push(`sm_f.service_key = ANY($${paramIdx})`);
        params.push(resolved.serviceKeys);
        paramIdx++;
      }

      if (smConditions.length > 0) {
        conditions.push(
          `EXISTS (SELECT 1 FROM service_memberships sm_f WHERE sm_f.user_id = u.id AND ${smConditions.join(' AND ')})`
        );
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Sorting
      const validSortFields: Record<string, string> = {
        createdAt: 'u."createdAt"',
        updatedAt: 'u."updatedAt"',
        email: 'u.email',
        firstName: 'u."firstName"',
        lastName: 'u."lastName"',
      };
      const sortField = validSortFields[sortBy as string] || 'u."createdAt"';
      const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Count total
      const countResult = await AppDataSource.query(
        `SELECT COUNT(*)::int as total FROM users u ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limitNum);

      // Fetch users (users 테이블: camelCase columns — SnakeNamingStrategy 비활성)
      const users = await AppDataSource.query(
        `SELECT u.id, u.email, u."firstName", u."lastName", u.name, u.nickname, u.phone,
                u.status, u."isActive", u."createdAt", u."updatedAt",
                u."businessInfo"->>'businessName' AS company
         FROM users u
         ${whereClause}
         ORDER BY ${sortField} ${order}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limitNum, offset]
      );

      if (users.length === 0) {
        res.json({
          success: true,
          users: [],
          pagination: { page: pageNum, limit: limitNum, total, totalPages },
        });
        return;
      }

      const userIds = users.map((u: any) => u.id);

      // Batch fetch role_assignments
      const roleRows = await AppDataSource.query(
        `SELECT user_id, ARRAY_AGG(role ORDER BY role) as roles
         FROM role_assignments
         WHERE user_id = ANY($1) AND is_active = true
         GROUP BY user_id`,
        [userIds]
      );
      const roleMap: Record<string, string[]> = {};
      for (const row of roleRows) {
        roleMap[row.user_id] = row.roles || [];
      }

      // Batch fetch service_memberships (scoped by service)
      const membershipRows = scope.isPlatformAdmin
        ? await AppDataSource.query(
            `SELECT id, user_id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at
             FROM service_memberships
             WHERE user_id = ANY($1)
             ORDER BY created_at DESC`,
            [userIds]
          )
        : await AppDataSource.query(
            `SELECT id, user_id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at
             FROM service_memberships
             WHERE user_id = ANY($1) AND service_key = ANY($2)
             ORDER BY created_at DESC`,
            [userIds, scope.serviceKeys]
          );
      const membershipMap: Record<string, any[]> = {};
      for (const row of membershipRows) {
        if (!membershipMap[row.user_id]) membershipMap[row.user_id] = [];
        membershipMap[row.user_id].push({
          id: row.id,
          serviceKey: row.service_key,
          status: row.status,
          role: row.role,
          approvedBy: row.approved_by,
          approvedAt: row.approved_at,
          rejectionReason: row.rejection_reason,
          createdAt: row.created_at,
        });
      }

      // Compose response
      const enrichedUsers = users.map((u: any) => {
        const memberships = membershipMap[u.id] || [];
        // WO-GLYCOPHARM-MEMBER-REGISTRATION-PENDING-VISIBILITY-FIX-V1:
        // When filtering by membership status, reflect the matched membership status
        // so frontend action buttons (approve/reject) render correctly
        // WO-O4O-GLYCOPHARM-OPERATOR-MEMBER-APPROVAL-ACTIVE-STATUS-FIX-V1:
        // Prefer service membership status over global users.status.
        // users.status may be 'deleted'/'inactive' while membership is 'active' —
        // in a service-scoped operator view, the membership status is authoritative.
        let effectiveStatus = memberships.length > 0 ? memberships[0].status : u.status;
        if (status && status !== 'all' && memberships.length > 0) {
          const matched = memberships.find((m: any) => m.status === status);
          if (matched) effectiveStatus = matched.status;
        }

        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          name: u.name,
          nickname: u.nickname || null,
          company: u.company,
          phone: u.phone,
          status: effectiveStatus,
          isActive: u.isActive,
          roles: roleMap[u.id] || [],
          memberships,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      });

      res.json({
        success: true,
        users: enrichedUsers,
        pagination: { page: pageNum, limit: limitNum, total, totalPages },
      });
    } catch (error) {
      logger.error('[MembershipConsole] getMembers error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: 'Failed to fetch members' });
    }
  };

  /**
   * GET /api/v1/operator/members/:userId
   * 회원 상세: 기본정보 + role_assignments + service_memberships
   */
  getMemberDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      if (!isValidUuid(userId)) {
        res.status(400).json(INVALID_USER_ID_RESPONSE);
        return;
      }

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service boundary check
      if (!scope.isPlatformAdmin) {
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      // Fetch user (users 테이블: camelCase columns)
      const userRows = await AppDataSource.query(
        `SELECT id, email, "firstName", "lastName", name, nickname, phone,
                status, "isActive", "createdAt", "updatedAt",
                "businessInfo",
                "businessInfo"->>'businessName' AS company
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userRows.length === 0) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const u = userRows[0];

      // Fetch role_assignments
      const roleRows = await AppDataSource.query(
        `SELECT ra.id, ra.role, ra.is_active, ra.valid_from, ra.valid_until, ra.assigned_by, ra.scope_type, ra.scope_id, ra.created_at,
                COALESCE(r.is_admin_role, false) AS is_admin_role
         FROM role_assignments ra
         LEFT JOIN roles r ON ra.role = r.name
         WHERE ra.user_id = $1
         ORDER BY ra.is_active DESC, ra.created_at DESC`,
        [userId]
      );

      // Fetch service_memberships (scoped by service)
      const membershipRows = scope.isPlatformAdmin
        ? await AppDataSource.query(
            `SELECT id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at, updated_at
             FROM service_memberships
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
          )
        : await AppDataSource.query(
            `SELECT id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at, updated_at
             FROM service_memberships
             WHERE user_id = $1 AND service_key = ANY($2)
             ORDER BY created_at DESC`,
            [userId, scope.serviceKeys]
          );

      res.json({
        success: true,
        user: {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          name: u.name,
          nickname: u.nickname || null,
          company: u.company,
          phone: u.phone,
          status: u.status,
          isActive: u.isActive,
          businessInfo: u.businessInfo || null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
        roles: roleRows.map((r: any) => ({
          id: r.id,
          role: r.role,
          isActive: r.is_active,
          isAdminRole: r.is_admin_role || false,
          validFrom: r.valid_from,
          validUntil: r.valid_until,
          assignedBy: r.assigned_by,
          scopeType: r.scope_type,
          scopeId: r.scope_id,
          createdAt: r.created_at,
        })),
        memberships: membershipRows.map((m: any) => ({
          id: m.id,
          serviceKey: m.service_key,
          status: m.status,
          role: m.role,
          approvedBy: m.approved_by,
          approvedAt: m.approved_at,
          rejectionReason: m.rejection_reason,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
        })),
      });
    } catch (error) {
      logger.error('[MembershipConsole] getMemberDetail error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: 'Failed to fetch member detail' });
    }
  };

  /**
   * WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1:
   *   K-Cosmetics 판매자(=매장 경영자) 승인 직후 내 매장 context 를 자동 생성/보강한다 (멱등).
   *   별도 /cosmetics/stores/apply 승인 없이 store/org/member/enrollment + cosmetics:store_owner 준비.
   *   비-cosmetics / 소비자(consumer) 멤버십은 대상 아님. 실패해도 승인 흐름은 비차단(best-effort).
   *   (legacy 'seller' 변종도 대상 — 승인 시 role 은 store_owner 로 정규화되므로 store context 도 함께 보강.)
   */
  private async ensureCosmeticsStoreContext(membership: any): Promise<void> {
    try {
      if (!membership || membership.service_key !== 'k-cosmetics') return;
      const role = String(membership.role || '');
      const STORE_OWNER_ROLES = ['cosmetics:store_owner', 'seller', 'cosmetics:seller', 'k-cosmetics:seller'];
      if (!STORE_OWNER_ROLES.includes(role)) return;
      const userId = membership.user_id;
      if (!userId) return;

      const { CosmeticsStoreService } = await import('../../routes/cosmetics/services/cosmetics-store.service.js');
      const svc = new CosmeticsStoreService(AppDataSource);
      const result = await svc.ensureStoreContextForOwner(userId, null);
      logger.info('[MembershipConsole] cosmetics store context ensured', { userId, ...result });
    } catch (err) {
      logger.error('[MembershipConsole] ensureCosmeticsStoreContext failed', {
        userId: membership?.user_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * PATCH /api/v1/operator/members/:membershipId/approve
   * 서비스 멤버십 승인
   */
  approveMembership = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { membershipId } = req.params;
      const approvedBy = (req as any).user?.id || null;

      const membership = await approvalService.approveMembership({
        membershipId,
        approvedBy,
        isPlatformAdmin: scope.isPlatformAdmin,
        serviceKeys: scope.serviceKeys,
      });

      if (!membership) {
        res.status(404).json({ success: false, error: 'Membership not found or already active' });
        return;
      }

      // WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1:
      //   K-Cosmetics 판매자(=매장 경영자) 승인 시 내 매장 context 자동 provision (멱등, 비차단).
      await this.ensureCosmeticsStoreContext(membership);

      const serviceKey = membership.service_key || scope.serviceKeys[0] || 'platform';
      this.getActionLogService()?.logSuccess(serviceKey, approvedBy || 'unknown', `${serviceKey}.operator.member_approve`, {
        meta: { targetId: membershipId, statusBefore: 'pending', statusAfter: 'active' },
      }).catch(() => {});
      res.json({ success: true, message: 'Membership approved', membership });
    } catch (error) {
      logger.error('[MembershipConsole] approveMembership error', {
        membershipId: req.params.membershipId,
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        detail: (error as any)?.detail,
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve membership',
        code: (error as any)?.code,
      });
    }
  };

  /**
   * PATCH /api/v1/operator/members/:membershipId/reject
   * 서비스 멤버십 거부
   */
  rejectMembership = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { membershipId } = req.params;
      const { reason } = req.body;

      const membership = await approvalService.rejectMembership({
        membershipId,
        reason: reason || null,
        isPlatformAdmin: scope.isPlatformAdmin,
        serviceKeys: scope.serviceKeys,
      });

      if (!membership) {
        res.status(404).json({ success: false, error: 'Membership not found or already rejected' });
        return;
      }

      const serviceKey = membership.service_key || scope.serviceKeys[0] || 'platform';
      const rejectedBy = (req as any).user?.id || 'unknown';
      this.getActionLogService()?.logSuccess(serviceKey, rejectedBy, `${serviceKey}.operator.member_reject`, {
        meta: { targetId: membershipId, reason: reason || null, statusBefore: 'pending', statusAfter: 'rejected' },
      }).catch(() => {});
      res.json({ success: true, message: 'Membership rejected', membership });
    } catch (error) {
      logger.error('[MembershipConsole] rejectMembership error', {
        membershipId: req.params.membershipId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject membership',
      });
    }
  };

  /**
   * PATCH /api/v1/operator/members/:userId/status
   * 사용자 상태 변경 (approved, rejected, suspended 등)
   *
   * approved/active → MembershipApprovalService 위임 (atomic 3-table 일관성 보장)
   * 기타 → user 상태만 변경
   */
  updateMemberStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      if (!isValidUuid(userId)) {
        res.status(400).json(INVALID_USER_ID_RESPONSE);
        return;
      }
      const { status } = req.body;
      const updatedBy = (req as any).user?.id || null;

      if (!status) {
        res.status(400).json({ success: false, error: 'status is required' });
        return;
      }

      if (!scope.isPlatformAdmin) {
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      if (status === 'approved' || status === 'active') {
        // Delegate to MembershipApprovalService for atomic 3-table consistency
        // (membership + user + role_assignments in single transaction)
        const pendingMemberships = scope.isPlatformAdmin
          ? await AppDataSource.query(
              `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'rejected')`,
              [userId]
            )
          : await AppDataSource.query(
              `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'rejected') AND service_key = ANY($2)`,
              [userId, scope.serviceKeys]
            );

        if (pendingMemberships.length > 0) {
          for (const m of pendingMemberships) {
            const approved = await approvalService.approveMembership({
              membershipId: m.id,
              approvedBy: updatedBy,
              isPlatformAdmin: scope.isPlatformAdmin,
              serviceKeys: scope.serviceKeys,
            });
            // WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1: 판매자 승인 시 내 매장 context 자동 provision
            await this.ensureCosmeticsStoreContext(approved);
          }
        } else {
          // No pending memberships — just activate user (idempotent)
          // WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1:
          //   가드 없이 활성화하면 **다른 서비스가 정지시킨 계정을 되살린다.**
          //   MembershipApprovalService.approveMembership STEP2 와 동일한 status 화이트리스트를
          //   적용해 'suspended'(플랫폼/타 서비스 정지)는 건드리지 않는다.
          await AppDataSource.query(
            `UPDATE users SET status = 'active', "isActive" = true,
             "approvedAt" = COALESCE("approvedAt", NOW()), "approvedBy" = COALESCE("approvedBy", $1),
             "updatedAt" = NOW()
             WHERE id = $2
               AND status IN ('PENDING', 'pending', 'ACTIVE', 'active', 'inactive', 'deleted', 'rejected')`,
            [updatedBy, userId]
          );
        }
      } else if (status.toLowerCase() === 'suspended') {
        // WO-O4O-AUTH-RBAC-FINAL-CLEANUP-V2: service-level suspend via atomic transaction
        // Does NOT change users.status — only suspends memberships + deactivates roles in scope
        const result = await approvalService.suspendMembership({
          userId,
          suspendedBy: updatedBy,
          isPlatformAdmin: scope.isPlatformAdmin,
          serviceKeys: scope.serviceKeys,
        });

        if (!result) {
          res.status(404).json({ success: false, error: 'No active memberships found to suspend' });
          return;
        }
      } else if (status.toLowerCase() === 'rejected') {
        // WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1:
        //   반려는 **해당 서비스 membership 에만** 적용한다.
        //   이전 구현은 rejectMembership 뒤에 `UPDATE users SET status='rejected', isActive=false` 를
        //   스코프 없이 실행해서, 한 서비스 운영자의 반려가 그 사용자의 **다른 서비스 로그인과
        //   진행 중 세션까지** 끊었다 (requireAuth 가 매 요청 users.isActive 를 검사한다).
        //   suspendMembership 이 이미 users 를 건드리지 않는 계약이므로 그 형태로 통일한다.
        //
        // WO-GLYCOPHARM-MEMBER-REGISTRATION-PENDING-VISIBILITY-FIX-V1:
        //   service_memberships.status(SSOT) 갱신은 그대로 유지 — 목록 필터가 이 값을 본다.
        const rejectableMemberships = scope.isPlatformAdmin
          ? await AppDataSource.query(
              `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'active')`,
              [userId]
            )
          : await AppDataSource.query(
              `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'active') AND service_key = ANY($2)`,
              [userId, scope.serviceKeys]
            );

        let rejectedCount = 0;
        for (const m of rejectableMemberships) {
          const rejected = await approvalService.rejectMembership({
            membershipId: m.id,
            reason: req.body.reason || null,
            isPlatformAdmin: scope.isPlatformAdmin,
            serviceKeys: scope.serviceKeys,
          });
          if (rejected) rejectedCount += 1;
        }

        // suspend 분기와 동일한 계약 — 스코프 안에 대상이 없으면 404.
        if (rejectedCount === 0) {
          res.status(404).json({ success: false, error: 'No memberships found to reject' });
          return;
        }
      } else if (MEMBERSHIP_SCOPED_STATUSES.includes(status.toLowerCase())) {
        // WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1:
        //   'withdrawn'(탈퇴) · 'pending'(가입 신청으로 되돌림) 은 라이브 운영자 UI 의 실제 액션이다.
        //   이전 구현은 이 값들을 users.status 에 그대로 기록했다. 'withdrawn' 은 UserStatus enum
        //   에 없는 값이라 resolveAccountAccess 가 fail-closed 로 'blocked' 판정 →
        //   **미정의 값으로 계정이 전역 차단**되는 상태였다. membership 축으로 되돌린다.
        //
        //   서비스 접근 차단은 membership 만으로 성립한다 —
        //   membership-guard.middleware 가 `membership.status !== 'active'` 를 403 으로 막는다.
        const target = status.toLowerCase();
        const updated = scope.isPlatformAdmin
          ? await AppDataSource.query(
              `UPDATE service_memberships SET status = $1, updated_at = NOW()
               WHERE user_id = $2 AND status <> $1 RETURNING id`,
              [target, userId]
            )
          : await AppDataSource.query(
              `UPDATE service_memberships SET status = $1, updated_at = NOW()
               WHERE user_id = $2 AND service_key = ANY($3) AND status <> $1 RETURNING id`,
              [target, userId, scope.serviceKeys]
            );

        // pg driver 는 `UPDATE ... RETURNING` 에 [rows, rowCount] 를 반환한다.
        const updatedRows = Array.isArray(updated?.[0]) ? updated[0] : updated;
        if (!updatedRows || updatedRows.length === 0) {
          res.status(404).json({ success: false, error: `No memberships found to set ${target}` });
          return;
        }
      } else {
        // WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1:
        //   이전에는 임의 status 문자열이 그대로 users.status 에 기록됐다(스코프·검증 없음).
        //   서비스 운영자 경로가 다루는 축은 membership 이며 허용 전이는 위 목록뿐이다.
        //   계정 전체 정지·삭제는 platform 권한의 별도 경로(DELETE /:userId, admin users API)가 담당한다.
        res.status(400).json({
          success: false,
          error: '허용되지 않는 상태입니다. (approved/active | suspended | rejected | withdrawn | pending)',
          code: 'INVALID_MEMBER_STATUS',
        });
        return;
      }

      res.json({ success: true, message: `User status updated to ${status}` });
    } catch (error) {
      logger.error('[MembershipConsole] updateMemberStatus error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user status',
        code: (error as any)?.code,
      });
    }
  };

  /**
   * POST /api/v1/operator/members/batch-status
   * 일괄 상태 변경 (V3)
   * WO-O4O-TABLE-STANDARD-V3-EXPANSION
   */
  batchUpdateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ids, status: targetStatus } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, error: 'ids array is required' });
        return;
      }
      if (ids.length > 50) {
        res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
        return;
      }
      if (!targetStatus || !['approved', 'rejected', 'suspended'].includes(targetStatus)) {
        res.status(400).json({ success: false, error: 'status must be approved, rejected, or suspended' });
        return;
      }

      const scope: ServiceScope = (req as any).serviceScope;
      const updatedBy = (req as any).user?.id || null;
      const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];

      for (const userId of ids) {
        try {
          // Check access
          if (!scope.isPlatformAdmin) {
            const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
            if (!hasAccess) {
              results.push({ id: userId, status: 'failed', error: 'User not found or out of scope' });
              continue;
            }
          }

          if (targetStatus === 'approved') {
            const pendingMemberships = scope.isPlatformAdmin
              ? await AppDataSource.query(
                  `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'rejected')`,
                  [userId]
                )
              : await AppDataSource.query(
                  `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'rejected') AND service_key = ANY($2)`,
                  [userId, scope.serviceKeys]
                );

            if (pendingMemberships.length > 0) {
              for (const m of pendingMemberships) {
                const approved = await approvalService.approveMembership({
                  membershipId: m.id,
                  approvedBy: updatedBy,
                  isPlatformAdmin: scope.isPlatformAdmin,
                  serviceKeys: scope.serviceKeys,
                });
                // WO-O4O-KCOSMETICS-SELLER-STORE-OWNER-WRITEPATH-FIX-V1: 판매자 승인 시 내 매장 context 자동 provision
                await this.ensureCosmeticsStoreContext(approved);
              }
            } else {
              // WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1:
              //   단건 경로와 동일 가드 — 'suspended' 계정은 되살리지 않는다.
              await AppDataSource.query(
                `UPDATE users SET status = 'active', "isActive" = true,
                 "approvedAt" = COALESCE("approvedAt", NOW()), "approvedBy" = COALESCE("approvedBy", $1),
                 "updatedAt" = NOW()
                 WHERE id = $2
                   AND status IN ('PENDING', 'pending', 'ACTIVE', 'active', 'inactive', 'deleted', 'rejected')`,
                [updatedBy, userId]
              );
            }
          } else if (targetStatus === 'suspended') {
            const result = await approvalService.suspendMembership({
              userId,
              suspendedBy: updatedBy,
              isPlatformAdmin: scope.isPlatformAdmin,
              serviceKeys: scope.serviceKeys,
            });
            if (!result) {
              results.push({ id: userId, status: 'skipped', error: 'No active memberships found' });
              continue;
            }
          } else if (targetStatus === 'rejected') {
            const pendingMemberships = scope.isPlatformAdmin
              ? await AppDataSource.query(
                  `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'active')`,
                  [userId]
                )
              : await AppDataSource.query(
                  `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'active') AND service_key = ANY($2)`,
                  [userId, scope.serviceKeys]
                );

            // WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1:
            //   단건 경로와 동일 — membership 만 반려하고 users 전역 상태는 건드리지 않는다.
            let rejectedCount = 0;
            for (const m of pendingMemberships) {
              const rejected = await approvalService.rejectMembership({
                membershipId: m.id,
                reason: req.body.reason || null,
                isPlatformAdmin: scope.isPlatformAdmin,
                serviceKeys: scope.serviceKeys,
              });
              if (rejected) rejectedCount += 1;
            }

            if (rejectedCount === 0) {
              results.push({ id: userId, status: 'skipped', error: 'No memberships found to reject' });
              continue;
            }
          }

          const serviceKey = scope.serviceKeys[0] || 'platform';
          this.getActionLogService()?.logSuccess(serviceKey, updatedBy || 'unknown', `${serviceKey}.operator.member_batch_${targetStatus}`, {
            meta: { targetId: userId, statusAfter: targetStatus },
          }).catch(() => {});

          results.push({ id: userId, status: 'success' });
        } catch (err: any) {
          results.push({ id: userId, status: 'failed', error: err.message || 'Unknown error' });
        }
      }

      res.json({ success: true, data: { results } });
    } catch (error) {
      logger.error('[MembershipConsole] batchUpdateStatus error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to batch update status',
      });
    }
  };

  /**
   * POST /api/v1/operator/members/:userId/reactivate
   * 서비스 멤버십 재활성화 (membership + user + role_assignments atomic)
   * WO-O4O-USER-MEMBERSHIP-REACTIVATION-V1
   */
  reactivateMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      if (!isValidUuid(userId)) {
        res.status(400).json(INVALID_USER_ID_RESPONSE);
        return;
      }
      const reactivatedBy = (req as any).user?.id || null;

      if (!scope.isPlatformAdmin) {
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      const result = await approvalService.reactivateMembership({
        userId,
        reactivatedBy,
        isPlatformAdmin: scope.isPlatformAdmin,
        serviceKeys: scope.serviceKeys,
      });

      if (!result) {
        res.status(404).json({ success: false, error: 'No reactivatable memberships found' });
        return;
      }

      // Audit logging
      const serviceKey = scope.serviceKeys[0] || 'platform';
      this.getActionLogService()?.logSuccess(
        serviceKey,
        reactivatedBy || 'unknown',
        `${serviceKey}.operator.member_reactivate`,
        {
          meta: {
            targetId: userId,
            reactivatedMemberships: result.reactivatedMemberships,
            roles: result.reactivatedRoles,
          },
        },
      ).catch(() => {});

      res.json({ success: true, message: 'User reactivated', data: result });
    } catch (error) {
      logger.error('[MembershipConsole] reactivateMember error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate member',
      });
    }
  };

  /**
   * PUT /api/v1/operator/members/:userId
   * 사용자 정보 수정 (프로필 + 비밀번호 + 사업자 정보)
   * WO-O4O-GLYCOPHARM-MEMBER-EDIT-V1
   */
  updateMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      if (!isValidUuid(userId)) {
        res.status(400).json(INVALID_USER_ID_RESPONSE);
        return;
      }
      // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1: ceoName/taxInvoiceEmail/managerPhone canonical 수용.
      // taxEmail/representativeName 은 legacy alias — controller 에서 canonical key 로만 저장.
      const {
        password, lastName, firstName, nickname, phone,
        businessName, businessNumber, businessType,
        businessCategory, zipCode, address1, address2,
        ceoName, contactName, taxInvoiceEmail, pharmacyPhone, managerPhone,
        taxEmail, representativeName, // legacy aliases
        membershipRole, // service_memberships.role 변경
      } = req.body;

      if (!scope.isPlatformAdmin) {
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      // 0. Membership role update (service_memberships.role)
      if (membershipRole && typeof membershipRole === 'string') {
        // WO-O4O-MEMBER-ROLE-WRITE-PATH-HARDENING-V1:
        // service_memberships.role 은 참여 유형 축이다. 운영 권한(operator/admin/super_admin,
        // bare·namespaced 무관)을 이 컬럼에 저장하면 축이 혼입된다(IR-O4O-BARE-OPERATOR-ADMIN-WRITE-PATH-AUDIT-V1).
        // 운영 권한은 role_assignments 경로(POST/DELETE /operator/members/:id/roles)에서만 관리한다.
        if (isOperationalRole(membershipRole)) {
          res.status(400).json({
            success: false,
            error: '운영 권한(operator/admin)은 회원 유형으로 저장할 수 없습니다. 운영 권한은 별도 경로에서 관리됩니다.',
            code: 'INVALID_MEMBERSHIP_ROLE',
          });
          return;
        }
        // Platform admin은 scope.serviceKeys가 빈 배열 → 프론트에서 전달한 키 사용
        const serviceKey = req.body.membershipServiceKey || scope.serviceKeys[0];
        if (serviceKey) {
          await AppDataSource.query(
            `UPDATE service_memberships SET role = $1, updated_at = NOW()
             WHERE user_id = $2 AND service_key = $3`,
            [membershipRole, userId, serviceKey]
          );
        }
      }

      // 1. Password update — Identity V2 서비스별 credential
      //
      // WO-O4O-OPERATOR-SERVICE-CREDENTIAL-PASSWORD-CHANGE-AND-DOC-ALIGNMENT-V1:
      //   이전 구현은 `UPDATE users SET password` 로 V1 공통 비밀번호를 갱신했다.
      //   Identity V2(DECISION-...-V2-ADOPTION-V1) 채택 후 서비스 로그인은
      //   service_credentials 가 있으면 users.password 를 **보지 않는다**
      //   (auth-login.service.ts: `credentialHash ?? user.password`).
      //   따라서 credential 을 가진 회원에게는 성공 응답만 돌아가고 실제 로그인 비밀번호는
      //   바뀌지 않는 **사일런트 무효** 상태였다. Phase 2 에서 본인 변경(`PUT /users/password`)만
      //   서비스 범위로 전환되고 운영자의 타인 변경 경로가 누락된 결과다.
      if (password) {
        const pwFailure = await this.changeMemberServicePassword({
          req,
          scope,
          targetUserId: userId,
          newPassword: password,
        });
        if (pwFailure) {
          res.status(pwFailure.status).json({
            success: false,
            error: pwFailure.error,
            code: pwFailure.code,
          });
          return;
        }
      }

      // 2. Profile fields update
      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (lastName !== undefined) { sets.push(`"lastName" = $${idx++}`); params.push(lastName); }
      if (firstName !== undefined) { sets.push(`"firstName" = $${idx++}`); params.push(firstName); }
      if (nickname !== undefined) { sets.push(`nickname = $${idx++}`); params.push(nickname); }
      if (phone !== undefined) { sets.push(`phone = $${idx++}`); params.push(phone.replace(/\D/g, '')); }

      // name 동기화 (lastName+firstName → name)
      if (lastName !== undefined || firstName !== undefined) {
        sets.push(`name = $${idx++}`);
        params.push(`${lastName || ''}${firstName || ''}`.trim());
      }

      // 3. businessInfo JSONB 머지
      // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1:
      //   ceoName / taxInvoiceEmail / managerPhone canonical write.
      //   taxEmail → email overwrite 제거 (대표 이메일과 세금계산서 이메일 의미 분리).
      //   legacy alias (taxEmail / representativeName) 는 client 보내도 canonical key 로 저장.
      const bizFields: Record<string, any> = {};
      if (businessName !== undefined) bizFields.businessName = businessName;
      if (businessNumber !== undefined) bizFields.businessNumber = businessNumber;
      if (businessType !== undefined) bizFields.businessType = businessType;
      if (businessCategory !== undefined) bizFields.businessCategory = businessCategory;
      const effectiveCeoName = ceoName ?? representativeName;
      if (effectiveCeoName !== undefined) bizFields.ceoName = effectiveCeoName;
      if (contactName !== undefined) bizFields.contactName = contactName;
      const effectiveTaxInvoiceEmail = taxInvoiceEmail ?? taxEmail;
      if (effectiveTaxInvoiceEmail !== undefined) bizFields.taxInvoiceEmail = effectiveTaxInvoiceEmail;
      if (pharmacyPhone !== undefined) bizFields.pharmacyPhone = pharmacyPhone;
      if (managerPhone !== undefined) bizFields.managerPhone = managerPhone;
      // WO-O4O-POSTAL-CODE-ADDRESS-V1: zipCode 저장
      if (zipCode !== undefined) bizFields.zipCode = zipCode;
      if (address1 !== undefined) bizFields.address = address1;
      if (address2 !== undefined) bizFields.address2 = address2;
      // WO-O4O-STORE-PROFILE-UNIFICATION-V1: 구조화된 주소 동기화
      if (address1 !== undefined || address2 !== undefined || zipCode !== undefined) {
        (bizFields as any).storeAddress = {
          ...(zipCode ? { zipCode } : {}),
          baseAddress: address1 || '',
          ...(address2 ? { detailAddress: address2 } : {}),
        };
      }

      if (Object.keys(bizFields).length > 0) {
        const [existing] = await AppDataSource.query(
          `SELECT "businessInfo" FROM users WHERE id = $1`, [userId]
        );
        const merged = { ...(existing?.businessInfo || {}), ...bizFields };
        sets.push(`"businessInfo" = $${idx++}`);
        params.push(JSON.stringify(merged));
      }

      if (sets.length > 0) {
        sets.push(`"updatedAt" = NOW()`);
        params.push(userId);
        await AppDataSource.query(
          `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`,
          params
        );
      }

      res.json({ success: true, message: 'User updated' });
    } catch (error) {
      logger.error('[MembershipConsole] updateMember error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: 'Failed to update member' });
    }
  };

  /**
   * GET /api/v1/operator/members/:userId/delete-risk
   * 삭제 전 영향 분석 — WO-O4O-OPERATOR-MEMBER-DELETE-RISK-AND-SAFE-DELETE-V1
   */
  getDeleteRisk = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      if (!isValidUuid(userId)) {
        res.status(400).json(INVALID_USER_ID_RESPONSE);
        return;
      }
      const ds = AppDataSource;

      const userRows = await ds.query(
        `SELECT id, email, name, status FROM users WHERE id = $1`,
        [userId],
      );

      if (userRows.length === 0) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const u = userRows[0];
      const displayName = u.name || u.email;

      const [memberships, forumPosts, forumComments, auditLogs] = await Promise.all([
        ds.query(`SELECT COUNT(*)::int AS cnt FROM service_memberships WHERE user_id = $1`, [userId]),
        ds.query(`SELECT COUNT(*)::int AS cnt FROM forum_post WHERE author_id = $1`, [userId]).catch(() => [{ cnt: 0 }]),
        ds.query(`SELECT COUNT(*)::int AS cnt FROM forum_comment WHERE author_id = $1`, [userId]).catch(() => [{ cnt: 0 }]),
        ds.query(`SELECT COUNT(*)::int AS cnt FROM action_logs WHERE user_id = $1`, [userId]).catch(() => [{ cnt: 0 }]),
      ]);

      const risks = {
        serviceMemberships: memberships[0]?.cnt || 0,
        forumPosts: forumPosts[0]?.cnt || 0,
        forumComments: forumComments[0]?.cnt || 0,
        auditLogs: auditLogs[0]?.cnt || 0,
      };
      const totalImpact = Object.values(risks).reduce((a, b) => a + b, 0);
      const canHardDelete = risks.forumPosts === 0 && risks.forumComments === 0 && risks.auditLogs === 0;

      res.json({
        success: true,
        data: {
          user: { id: userId, email: u.email, name: displayName, status: u.status },
          risks,
          totalImpact,
          canHardDelete,
        },
      });
    } catch (error) {
      logger.error('[MembershipConsole] getDeleteRisk error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: 'Failed to assess delete risk' });
    }
  };

  /**
   * DELETE /api/v1/operator/members/:userId
   * 사용자 삭제 (service_memberships + user)
   */
  deleteMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      if (!isValidUuid(userId)) {
        res.status(400).json(INVALID_USER_ID_RESPONSE);
        return;
      }
      const deletedBy = (req as any).user?.id || null;

      // WO-NETURE-MEMBER-DELETE-SAFE-FLOW-V1: soft/hard 2단계 분리
      const mode = req.query.mode === 'hard' ? 'hard' as const : 'soft' as const;

      // WO-O4O-OPERATOR-MEMBERS-DELETE-ACTION-POLICY-FIX-V1:
      // hard delete는 service admin 이상만 허용.
      // operator-only role(service:operator)은 soft delete만 가능.
      if (mode === 'hard' && !scope.isPlatformAdmin) {
        const userRoles: string[] = (req as any).user?.roles ?? [];
        const hasAdminRole = userRoles.some(
          (r) => r === 'platform:super_admin' || r.endsWith(':admin'),
        );
        if (!hasAdminRole) {
          res.status(403).json({
            success: false,
            error: 'Hard delete requires admin role. Use soft delete (mode=soft) for deactivation.',
            code: 'HARD_DELETE_FORBIDDEN',
          });
          return;
        }
      }

      const deleted = await approvalService.deleteMember({
        userId,
        deletedBy,
        isPlatformAdmin: scope.isPlatformAdmin,
        serviceKeys: scope.serviceKeys,
        mode,
      });

      if (!deleted) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      logger.error('[MembershipConsole] deleteMember error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete member',
      });
    }
  };

  /**
   * POST /api/v1/operator/members/:userId/roles
   * 역할 할당 (role_assignments via roleAssignmentService)
   */
  assignMemberRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      if (!isValidUuid(userId)) {
        res.status(400).json(INVALID_USER_ID_RESPONSE);
        return;
      }
      const { role } = req.body;
      const assignedBy = (req as any).user?.id || null;

      if (!role || typeof role !== 'string') {
        res.status(400).json({ success: false, error: 'role is required' });
        return;
      }

      // DB-based role validation (WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1)
      // WO-NETURE-ROLE-NORMALIZATION-V1: cross-service collision 해결
      let roleEntity = await roleService.getRoleByName(role);
      // Cross-service collision: unprefixed name이 다른 서비스 role과 매칭된 경우 caller prefix로 재검색
      if (roleEntity && !role.includes(':') && !scope.isPlatformAdmin) {
        if (!scope.serviceKeys.includes(roleEntity.serviceKey)) {
          for (const prefix of scope.rolePrefixes) {
            const prefixed = await roleService.getRoleByName(`${prefix}:${role}`);
            if (prefixed) { roleEntity = prefixed; break; }
          }
        }
      }
      // Fallback: 못 찾은 경우 prefix 붙여서 재시도
      if (!roleEntity && !role.includes(':')) {
        for (const prefix of scope.rolePrefixes) {
          roleEntity = await roleService.getRoleByName(`${prefix}:${role}`);
          if (roleEntity) break;
        }
      }
      if (!roleEntity) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
      }

      // Service boundary check
      if (!scope.isPlatformAdmin) {
        // Assignability check
        if (!roleEntity.isAssignable) {
          res.status(403).json({ success: false, error: 'This role is not assignable' });
          return;
        }
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
        // 1. Service scope check — prefixed roles must match prefix, unprefixed roles must match serviceKey
        const allowedPrefixes = scope.rolePrefixes.map((p: string) => `${p}:`);
        const inScope = role.includes(':')
          ? allowedPrefixes.some((prefix: string) => role.startsWith(prefix))
          : scope.serviceKeys.includes(roleEntity.serviceKey);
        if (!inScope) {
          res.status(403).json({ success: false, error: 'Cannot assign roles outside your service scope' });
          return;
        }
        // 2. Operator/Admin tier restriction (WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1)
        //    운영자·관리자 권한 부여(role_assignments write)는 platform admin (admin.neture.co.kr) 전용이다.
        //    서비스 operator/admin 은 operator/admin tier 역할을 부여할 수 없다(F9 RBAC SSOT / F11 거버넌스 경계).
        //    부여·회수는 admin-dashboard 의 POST/PUT /admin/users 경로에서만 수행한다.
        if (roleEntity.isAdminRole || roleEntity.roleKey === 'operator') {
          res.status(403).json({
            success: false,
            error: '운영자·관리자 권한 부여는 플랫폼 관리자(admin)에서만 가능합니다.',
            code: 'ROLE_ASSIGNMENT_PLATFORM_ADMIN_ONLY',
          });
          return;
        }
      }

      const assignment = await roleAssignmentService.assignRole({
        userId,
        role,
        assignedBy,
      });

      res.json({ success: true, message: `Role ${role} assigned`, assignment });
    } catch (error) {
      logger.error('[MembershipConsole] assignMemberRole error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign role',
      });
    }
  };

  /**
   * DELETE /api/v1/operator/members/:userId/roles/:role
   * 역할 제거 (soft delete via roleAssignmentService)
   */
  removeMemberRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId, role } = req.params;
      if (!isValidUuid(userId)) {
        res.status(400).json(INVALID_USER_ID_RESPONSE);
        return;
      }

      if (!role) {
        res.status(400).json({ success: false, error: 'role is required' });
        return;
      }

      // DB-based role validation (WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1)
      // WO-NETURE-ROLE-NORMALIZATION-V1: cross-service collision 해결
      let roleEntity = await roleService.getRoleByName(role);
      if (roleEntity && !role.includes(':') && !scope.isPlatformAdmin) {
        if (!scope.serviceKeys.includes(roleEntity.serviceKey)) {
          for (const prefix of scope.rolePrefixes) {
            const prefixed = await roleService.getRoleByName(`${prefix}:${role}`);
            if (prefixed) { roleEntity = prefixed; break; }
          }
        }
      }
      if (!roleEntity && !role.includes(':')) {
        for (const prefix of scope.rolePrefixes) {
          roleEntity = await roleService.getRoleByName(`${prefix}:${role}`);
          if (roleEntity) break;
        }
      }
      if (!roleEntity) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
      }

      // Service boundary check
      if (!scope.isPlatformAdmin) {
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
        // 1. Service scope check — prefixed roles must match prefix, unprefixed roles must match serviceKey
        const allowedPrefixes = scope.rolePrefixes.map((p: string) => `${p}:`);
        const inScope = role.includes(':')
          ? allowedPrefixes.some((prefix: string) => role.startsWith(prefix))
          : scope.serviceKeys.includes(roleEntity.serviceKey);
        if (!inScope) {
          res.status(403).json({ success: false, error: 'Cannot remove roles outside your service scope' });
          return;
        }
        // 2. Operator/Admin tier restriction (WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1)
        //    운영자·관리자 권한 회수(role_assignments write)는 platform admin (admin.neture.co.kr) 전용이다.
        //    서비스 operator/admin 은 operator/admin tier 역할을 회수할 수 없다(F9 RBAC SSOT / F11 거버넌스 경계).
        //    부여·회수는 admin-dashboard 의 DELETE /admin/users/:id/role-assignments/:role 경로에서만 수행한다.
        if (roleEntity.isAdminRole || roleEntity.roleKey === 'operator') {
          res.status(403).json({
            success: false,
            error: '운영자·관리자 권한 회수는 플랫폼 관리자(admin)에서만 가능합니다.',
            code: 'ROLE_ASSIGNMENT_PLATFORM_ADMIN_ONLY',
          });
          return;
        }
      }

      // WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1:
      //   최후 platform:super_admin 보호 — 마지막 1명의 canonical 최고 관리자 역할을 회수하면
      //   플랫폼 관리자가 0명이 되고, 역할 재부여 API 자체가 platform admin 을 요구하므로
      //   애플리케이션 경로로는 복구가 불가능하다(직접 DB write 필요).
      //   AdminUserController.revokeRoleAssignment 는 platform:super_admin 회수를 전면 차단하므로
      //   실제로 열려 있는 회수 경로는 본 엔드포인트뿐이라 여기서 막는다.
      //   '활성 사용자' 기준으로 센다 — 비활성 계정은 로그인할 수 없어 예비 관리자가 되지 못한다.
      if (role === PLATFORM_SUPER_ADMIN_ROLE) {
        const holderIds = await roleAssignmentService.getUsersWithRole(PLATFORM_SUPER_ADMIN_ROLE);
        const activeHolders = holderIds.length
          ? await AppDataSource.getRepository(User).count({
              where: { id: In(holderIds), isActive: true },
            })
          : 0;
        const targetIsActiveHolder = holderIds.includes(userId);
        if (targetIsActiveHolder && activeHolders <= 1) {
          res.status(409).json({
            success: false,
            error:
              '마지막 platform:super_admin 역할은 회수할 수 없습니다. 다른 활성 플랫폼 관리자를 먼저 확보하세요.',
            code: 'LAST_PLATFORM_SUPER_ADMIN',
          });
          return;
        }
      }

      const removed = await roleAssignmentService.removeRole(userId, role);

      if (!removed) {
        res.status(404).json({ success: false, error: 'Role not found or already inactive' });
        return;
      }

      res.json({ success: true, message: `Role ${role} removed` });
    } catch (error) {
      logger.error('[MembershipConsole] removeMemberRole error', {
        userId: req.params.userId,
        role: req.params.role,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove role',
      });
    }
  };

  /**
   * GET /api/v1/operator/members/stats
   * 서비스 멤버십 통계 (operator 전용)
   *
   * WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1:
   *   Option B — service operator 는 auto-scope, platform admin 은 명시적
   *   serviceKey 또는 all=true 필수. 미명시 시 400.
   *   distinct user count 를 위해 status 별 COUNT(DISTINCT user_id) 사용.
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;

      const resolved = resolveOperatorScope(scope, req.query);
      if (!resolved) {
        res.status(400).json(PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE);
        return;
      }
      if (resolved.crossService) logCrossServiceQuery(req);

      let serviceFilter = '';
      const params: any[] = [];

      if (resolved.serviceKeys !== null) {
        serviceFilter = `WHERE sm.service_key = ANY($1)`;
        params.push(resolved.serviceKeys);
      }

      // WO-GLYCOPHARM-MEMBER-REGISTRATION-PENDING-VISIBILITY-FIX-V1:
      // Use sm.status (SSOT for service-level membership state) instead of u.status
      // WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1:
      // COUNT(DISTINCT user_id) — 동일 사용자가 다중 멤버십을 가진 경우에도
      // 사용자 수 기준으로 카운트 (status 별로 user 가 한 번만 집계됨).
      const rows = await AppDataSource.query(
        `SELECT sm.status, COUNT(DISTINCT sm.user_id)::int AS count
         FROM service_memberships sm
         ${serviceFilter}
         GROUP BY sm.status`,
        params
      );

      // total = distinct user count (status 무관)
      const totalRows = await AppDataSource.query(
        `SELECT COUNT(DISTINCT sm.user_id)::int AS total
         FROM service_memberships sm
         ${serviceFilter}`,
        params
      );
      const total = totalRows[0]?.total || 0;

      res.json({
        success: true,
        statistics: {
          total,
          byStatus: rows,
        },
      });
    } catch (error) {
      logger.error('[MembershipConsole] getStats error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.json({ success: true, statistics: { total: 0, byStatus: [] } });
    }
  };
}
