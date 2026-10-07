/**
 * 개별 분회 운영자 지정·해제 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 원칙: Admin 은 서비스 운영자(`kpa-branch:admin`)만 지정한다. 개별 분회 운영자
 * (`kpa-branch:operator`)는 분회 서비스 관리자가 분회 서비스 화면에서 **대상 분회에 한정해** 지정·해제한다.
 *
 * 대상 분회 한정은 새 축이 아니라 기존 계약 그대로다:
 *   `kpa-branch:operator` 는 서비스 전역 역할이고, 그 역할이 닿는 분회는 사용자의 **유일한 active
 *   `branch_memberships` 행**이다(partial UNIQUE). 런타임은 `requireBranchScope` 가 그 행과 요청 분회를
 *   비교한다(유지). 그래서 지정·해제 모두 "대상자가 이 분회의 active 소속인가" 를 먼저 확인한다 —
 *   다른 분회 소속자를 이 분회 id 로 지정·해제할 수 없다.
 *
 * 입장 자격: 서비스 membership(`kpa-branch`)이 active 가 아니면 지정하지 않는다(409). pending · suspended 를
 *   여기서 되살리지 않는다 — 서비스 가입 승인은 같은 서비스 관리자 화면의 가입 승인 경로가 정본이다.
 *
 * 역할 쓰기는 canonical 경로(`roleAssignmentService`)만 쓴다 — RBAC SSOT(F9) 직접 INSERT 금지.
 */
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { BRANCH_ORG_TYPE } from '../../routes/kpa-branch/entities/kpa-organization.entity.js';
import { KPA_BRANCH_OPERATOR_ROLE, KPA_BRANCH_SERVICE_KEY } from './branch-lifecycle.service.js';
import {
  demoAccountService,
  DEMO_ACCOUNT_FORBIDDEN_CODE,
  DEMO_ACCOUNT_FORBIDDEN_MESSAGE,
} from '../auth/demo-account.service.js';

export interface BranchOperatorQueryRunner {
  query: (sql: string, params?: unknown[]) => Promise<any>;
}

export class BranchOperatorDesignationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'BranchOperatorDesignationError';
  }
}

export interface BranchOperatorCandidate {
  userId: string;
  name: string | null;
  email: string | null;
  serviceMembershipStatus: string | null;
  isOperator: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BranchOperatorDesignationService {
  constructor(private readonly db: BranchOperatorQueryRunner) {}

  private async requireBranch(branchId: string): Promise<{ id: string; name: string }> {
    if (!UUID.test(branchId)) {
      throw new BranchOperatorDesignationError(404, 'BRANCH_NOT_FOUND', '분회를 찾을 수 없습니다.');
    }
    const rows = await this.db.query(
      `SELECT id, name FROM kpa_organizations WHERE id = $1 AND type = $2 AND is_active = true`,
      [branchId, BRANCH_ORG_TYPE],
    );
    if (!rows?.length) throw new BranchOperatorDesignationError(404, 'BRANCH_NOT_FOUND', '분회를 찾을 수 없습니다.');
    return rows[0];
  }

  /** 대상자가 이 분회의 active 소속인지 — 분회 한정의 유일한 근거다. */
  private async requireActiveBranchMember(branchId: string, userId: string): Promise<void> {
    if (!UUID.test(userId)) {
      throw new BranchOperatorDesignationError(409, 'NOT_BRANCH_MEMBER', '이 분회의 소속 회원이 아닙니다.');
    }
    const rows = await this.db.query(
      `SELECT 1 FROM branch_memberships WHERE organization_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`,
      [branchId, userId],
    );
    if (!rows?.length) {
      throw new BranchOperatorDesignationError(409, 'NOT_BRANCH_MEMBER', '이 분회의 소속 회원이 아닙니다.');
    }
  }

  /** 분회 active 소속 회원 + 운영자 여부. 지정 후보와 현재 운영자를 한 목록으로 낸다. */
  async list(branchId: string): Promise<{ branch: { id: string; name: string }; members: BranchOperatorCandidate[] }> {
    const branch = await this.requireBranch(branchId);
    const rows: Array<{
      user_id: string;
      user_name: string | null;
      user_email: string | null;
      service_status: string | null;
      is_operator: boolean;
    }> = await this.db.query(
      `SELECT bm.user_id,
              u.name AS user_name,
              u.email AS user_email,
              sm.status AS service_status,
              EXISTS (
                SELECT 1 FROM role_assignments ra
                 WHERE ra.user_id = bm.user_id AND ra.role = $2 AND ra.is_active = true
              ) AS is_operator
         FROM branch_memberships bm
         JOIN users u ON u.id = bm.user_id
         LEFT JOIN service_memberships sm ON sm.user_id = bm.user_id AND sm.service_key = $3
        WHERE bm.organization_id = $1 AND bm.status = 'active'
        ORDER BY is_operator DESC, u.name ASC NULLS LAST`,
      [branchId, KPA_BRANCH_OPERATOR_ROLE, KPA_BRANCH_SERVICE_KEY],
    );
    return {
      branch,
      members: rows.map((r) => ({
        userId: r.user_id,
        name: r.user_name,
        email: r.user_email,
        serviceMembershipStatus: r.service_status,
        isOperator: r.is_operator === true,
      })),
    };
  }

  /** Demo 계정의 role 은 고정 — 판정 정본은 `demo_accounts.user_id`(조회 실패는 그대로 올린다). */
  private async rejectDemoAccount(userId: string): Promise<void> {
    if (await demoAccountService.isDemoAccount(userId, this.db)) {
      throw new BranchOperatorDesignationError(403, DEMO_ACCOUNT_FORBIDDEN_CODE, DEMO_ACCOUNT_FORBIDDEN_MESSAGE);
    }
  }

  /** 지정 — 이 분회 active 소속 + 서비스 membership active 인 사람만. 이미 운영자면 그대로(멱등). */
  async designate(branchId: string, userId: string, actorUserId: string): Promise<{ assigned: boolean }> {
    await this.requireBranch(branchId);
    await this.requireActiveBranchMember(branchId, userId);
    const sm = await this.db.query(
      `SELECT status FROM service_memberships WHERE user_id = $1 AND service_key = $2 LIMIT 1`,
      [userId, KPA_BRANCH_SERVICE_KEY],
    );
    if (sm?.[0]?.status !== 'active') {
      throw new BranchOperatorDesignationError(
        409,
        'SERVICE_MEMBERSHIP_NOT_ACTIVE',
        '분회 서비스 가입이 승인된(active) 회원만 운영자로 지정할 수 있습니다. 먼저 서비스 가입 승인을 처리하세요.',
      );
    }
    await this.rejectDemoAccount(userId);
    if (await roleAssignmentService.hasRole(userId, KPA_BRANCH_OPERATOR_ROLE)) return { assigned: false };
    await roleAssignmentService.assignRole({ userId, role: KPA_BRANCH_OPERATOR_ROLE, assignedBy: actorUserId });
    return { assigned: true };
  }

  /** 해제 — 이 분회 active 소속자의 운영자 역할만. 다른 분회 운영자는 이 분회 id 로 해제할 수 없다. */
  async release(branchId: string, userId: string): Promise<{ removed: boolean }> {
    await this.requireBranch(branchId);
    await this.requireActiveBranchMember(branchId, userId);
    if (!(await roleAssignmentService.hasRole(userId, KPA_BRANCH_OPERATOR_ROLE))) {
      throw new BranchOperatorDesignationError(404, 'NOT_OPERATOR', '이 회원은 분회 운영자가 아닙니다.');
    }
    await this.rejectDemoAccount(userId);
    await roleAssignmentService.removeRole(userId, KPA_BRANCH_OPERATOR_ROLE);
    return { removed: true };
  }
}
