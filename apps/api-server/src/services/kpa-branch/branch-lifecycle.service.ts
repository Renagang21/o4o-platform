/**
 * 분회 개설 신청·승인 lifecycle
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §5 (S3)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 커뮤니티와 같은 모양(신청 → 주소 2회 검사 → 승인 → 신청자가 첫 운영자)이지만
 * **운영자를 만드는 방식이 다르다.** 분회는 기존 4축 분리를 그대로 따른다:
 *
 *   branch_memberships(active)              어느 분회인가  — role 컬럼을 두지 않는다
 *   role_assignments('kpa-branch:operator') 운영자인가     — 서비스 전역 역할
 *   service_memberships('kpa-branch')       서비스 접근 자격
 *
 * 분회는 209개이고 전입·전출이 상시 발생하므로 `kpa-branch:operator:{branchId}` 같은
 * 분회별 역할을 만들지 않는다(그러면 소속 축이 role_assignments 에 중복 저장돼 drift 가 된다).
 * 커뮤니티에서 전역 operator 를 만들지 않은 것과 방향이 반대로 보이지만, 커뮤니티는
 * 개체 원장에 role 컬럼이 있고 분회는 없다 — 각 도메인의 기존 SSOT 를 따른 결과다.
 *
 * 승인 주체는 라우트에서 `kpa-branch:admin` 으로 고정한다. `kpa-branch:operator` 는 전역
 * 역할이어서 개별 분회 운영자도 갖는다 — 그 역할로 승인을 열면 A 분회 운영자가 B 분회
 * 개설을 승인한다.
 */
import type { DataSource, EntityManager } from 'typeorm';
import { KpaOrganization, BRANCH_ORG_TYPE } from '../../routes/kpa-branch/entities/kpa-organization.entity.js';
import { BranchMembership } from '../../routes/kpa-branch/entities/branch-membership.entity.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';

/** 분회 서비스 가입 키 */
export const KPA_BRANCH_SERVICE_KEY = 'kpa-branch';
/** 승인으로 부여되는 운영자 역할 — 전역 역할이며 대상 분회는 branch_memberships 가 정한다. */
export const KPA_BRANCH_OPERATOR_ROLE = 'kpa-branch:operator';

/** `kpa_organizations.slug` 와 같은 형식 (BranchAdminController 와 동일 계약). */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MIN = 2;
const SLUG_MAX = 80;

// 예약어 주소 정책은 의존성 없는 모듈에 둔다 — BranchAdminController(super_admin 직접 생성)도 같은 목록을 쓴다.
export { RESERVED_BRANCH_SLUGS, isReservedBranchSlug, reservedSlugMessage } from './branch-slug-policy.js';
import { isReservedBranchSlug, reservedSlugMessage } from './branch-slug-policy.js';
import {
  demoAccountService,
  DEMO_ACCOUNT_FORBIDDEN_CODE,
  DEMO_ACCOUNT_FORBIDDEN_MESSAGE,
} from '../auth/demo-account.service.js';

export type BranchLifecycleErrorCode =
  | 'INVALID_SLUG'
  | 'RESERVED_SLUG'
  | 'SLUG_TAKEN'
  | 'REQUESTER_SUSPENDED'
  | 'REQUEST_NOT_FOUND'
  | 'REQUEST_NOT_PENDING'
  | 'PARENT_NOT_FOUND'
  | typeof DEMO_ACCOUNT_FORBIDDEN_CODE;

export class BranchLifecycleError extends Error {
  constructor(
    readonly code: BranchLifecycleErrorCode,
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'BranchLifecycleError';
  }
}

export function normalizeBranchSlug(raw: unknown): string {
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX || !SLUG_RE.test(slug)) {
    throw new BranchLifecycleError(
      'INVALID_SLUG',
      `주소는 영문 소문자·숫자와 하이픈으로 ${SLUG_MIN}~${SLUG_MAX}자여야 합니다.`,
    );
  }
  if (isReservedBranchSlug(slug)) {
    throw new BranchLifecycleError('RESERVED_SLUG', reservedSlugMessage(slug), 409);
  }
  return slug;
}

export interface BranchCreationRequestRow {
  id: string;
  requester_user_id: string;
  desired_slug: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'slug_conflict';
  reviewed_by_user_id: string | null;
  reviewed_at: Date | null;
  reason: string | null;
  created_branch_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/** 이미 개설된 주소이거나 pending 신청이 붙잡고 있는 주소인지. */
async function slugTaken(m: EntityManager, slug: string): Promise<boolean> {
  const branch = await m.getRepository(KpaOrganization).findOne({ where: { slug } });
  if (branch) return true;
  const pending: unknown[] = await m.query(
    `SELECT 1 FROM branch_creation_requests WHERE desired_slug = $1 AND status = 'pending' LIMIT 1`,
    [slug],
  );
  return pending.length > 0;
}

export class BranchLifecycleService {
  constructor(private readonly dataSource: DataSource) {}

  /** 개설 신청 — 주소 검사 1회차. */
  async requestCreation(input: {
    requesterUserId: string;
    desiredSlug: string;
    name: string;
    parentId?: string | null;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
  }): Promise<BranchCreationRequestRow> {
    const slug = normalizeBranchSlug(input.desiredSlug);
    return this.dataSource.transaction(async (m) => {
      if (await slugTaken(m, slug)) {
        throw new BranchLifecycleError('SLUG_TAKEN', `이미 사용 중인 주소입니다: ${slug}`, 409);
      }
      // 상위 조직은 표시용이다(권한 계산에 쓰지 않는다). 그래도 존재하는 행이어야 한다.
      if (input.parentId) {
        const parent = await m.getRepository(KpaOrganization).findOne({ where: { id: input.parentId } });
        if (!parent) {
          throw new BranchLifecycleError('PARENT_NOT_FOUND', '상위 조직을 찾을 수 없습니다.', 404);
        }
      }
      const rows: BranchCreationRequestRow[] = await m.query(
        `INSERT INTO branch_creation_requests
           (requester_user_id, desired_slug, name, parent_id, description, address, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING *`,
        [
          input.requesterUserId,
          slug,
          input.name,
          input.parentId ?? null,
          input.description ?? null,
          input.address ?? null,
          input.phone ?? null,
        ],
      );
      return rows[0];
    });
  }

  /**
   * 개설 승인 — 주소 검사 2회차.
   *
   * 승인 직전 주소가 선점됐으면 **임의 주소로 개설하지 않고** `slug_conflict` 로 신청을
   * 돌려준다. 신청자가 새 주소로 다시 신청해야 한다 — 주소는 분회 tenant 키이므로
   * 승인자가 대신 고를 값이 아니다.
   */
  async approveCreation(input: {
    requestId: string;
    reviewerUserId: string;
  }): Promise<
    | { outcome: 'created'; branch: KpaOrganization; request: BranchCreationRequestRow }
    | { outcome: 'slug_conflict'; slug: string; reason: 'taken' | 'reserved' }
  > {
    return this.dataSource.transaction(async (m) => {
      const found: BranchCreationRequestRow[] = await m.query(
        `SELECT * FROM branch_creation_requests WHERE id = $1`,
        [input.requestId],
      );
      const request = found[0];
      if (!request) {
        throw new BranchLifecycleError('REQUEST_NOT_FOUND', '신청을 찾을 수 없습니다.', 404);
      }
      if (request.status !== 'pending') {
        throw new BranchLifecycleError('REQUEST_NOT_PENDING', '이미 처리된 신청입니다.', 409);
      }
      // Demo 계정은 승인으로 운영자 role 을 얻지 않는다 — write 전에 거절.
      if (await demoAccountService.isDemoAccount(request.requester_user_id, m)) {
        throw new BranchLifecycleError(DEMO_ACCOUNT_FORBIDDEN_CODE, DEMO_ACCOUNT_FORBIDDEN_MESSAGE, 403);
      }

      // 재검사: 선점 + 예약어. 예약어는 신청 시 막지만, 예약어 목록이 신청 뒤에 늘었거나
      // 목록 도입 전에 들어온 pending 신청이 있을 수 있다 — 승인 직전에 다시 본다.
      const reserved = isReservedBranchSlug(request.desired_slug);
      const existing = reserved
        ? null
        : await m.getRepository(KpaOrganization).findOne({ where: { slug: request.desired_slug } });
      if (reserved || existing) {
        await m.query(
          `UPDATE branch_creation_requests
              SET status = 'slug_conflict', reviewed_by_user_id = $2, reviewed_at = now(),
                  reason = $3, updated_at = now()
            WHERE id = $1`,
          [
            request.id,
            input.reviewerUserId,
            reserved
              ? reservedSlugMessage(request.desired_slug)
              : `승인 직전 주소가 선점되었습니다(${request.desired_slug}). 새 주소로 다시 신청해 주세요.`,
          ],
        );
        return {
          outcome: 'slug_conflict' as const,
          slug: request.desired_slug,
          reason: reserved ? ('reserved' as const) : ('taken' as const),
        };
      }

      // 정지된 서비스 가입자는 승인으로 되살리지 않는다 — 분회를 만들기 전에 판정한다.
      await assertRequesterNotSuspended(m, request.requester_user_id);

      // 분회 개체 — type·is_active 는 서버가 고정한다(BranchAdminController 와 같은 계약).
      const orgRepo = m.getRepository(KpaOrganization);
      const branch = await orgRepo.save(
        orgRepo.create({
          name: request.name,
          type: BRANCH_ORG_TYPE,
          slug: request.desired_slug,
          parent_id: request.parent_id,
          description: request.description,
          address: request.address,
          phone: request.phone,
          is_active: true,
        }),
      );

      // 신청자가 첫 운영자가 된다 — 세 축을 모두 만든다.
      await this.grantFirstOperator(m, request.requester_user_id, branch.id, input.reviewerUserId);

      const updated: BranchCreationRequestRow[] = await m.query(
        `UPDATE branch_creation_requests
            SET status = 'approved', reviewed_by_user_id = $2, reviewed_at = now(),
                created_branch_id = $3, updated_at = now()
          WHERE id = $1
        RETURNING *`,
        [request.id, input.reviewerUserId, branch.id],
      );

      return { outcome: 'created' as const, branch, request: updated[0] };
    });
  }

  /** 개설 거절 — 사유를 남기고 분회를 만들지 않는다. */
  async rejectCreation(input: {
    requestId: string;
    reviewerUserId: string;
    reason: string;
  }): Promise<BranchCreationRequestRow> {
    return this.dataSource.transaction(async (m) => {
      const found: BranchCreationRequestRow[] = await m.query(
        `SELECT * FROM branch_creation_requests WHERE id = $1`,
        [input.requestId],
      );
      if (!found[0]) {
        throw new BranchLifecycleError('REQUEST_NOT_FOUND', '신청을 찾을 수 없습니다.', 404);
      }
      if (found[0].status !== 'pending') {
        throw new BranchLifecycleError('REQUEST_NOT_PENDING', '이미 처리된 신청입니다.', 409);
      }
      const rows: BranchCreationRequestRow[] = await m.query(
        `UPDATE branch_creation_requests
            SET status = 'rejected', reviewed_by_user_id = $2, reviewed_at = now(),
                reason = $3, updated_at = now()
          WHERE id = $1
        RETURNING *`,
        [input.requestId, input.reviewerUserId, input.reason],
      );
      return rows[0];
    });
  }

  /**
   * 승인 대기 목록 — 심사 화면. 신청자 이름 · 이메일을 함께 준다(심사자가 누구의 신청인지 알아야 한다).
   * `reserved_slug` 는 예약어 주소 신청을 화면이 미리 표시하게 한다(승인하면 slug_conflict 로 돌아간다).
   */
  async listPendingRequests(): Promise<
    Array<BranchCreationRequestRow & { requester_name: string | null; requester_email: string | null; reserved_slug: boolean }>
  > {
    const rows: Array<BranchCreationRequestRow & { requester_name: string | null; requester_email: string | null }> =
      await this.dataSource.query(
        `SELECT r.*, u.name AS requester_name, u.email AS requester_email
           FROM branch_creation_requests r
           LEFT JOIN users u ON u.id = r.requester_user_id
          WHERE r.status = 'pending'
          ORDER BY r.created_at ASC`,
      );
    return rows.map((r) => ({ ...r, reserved_slug: isReservedBranchSlug(r.desired_slug) }));
  }

  /** 내 신청 이력 — `slug_conflict` 재신청 안내가 신청자에게 도달하는 경로. */
  async listMyRequests(requesterUserId: string): Promise<BranchCreationRequestRow[]> {
    return this.dataSource.query(
      `SELECT * FROM branch_creation_requests WHERE requester_user_id = $1 ORDER BY created_at DESC`,
      [requesterUserId],
    );
  }

  /**
   * 첫 운영자 3축.
   *
   * `branch_memberships` 는 전입·전출 원장이라 **기존 active 행을 덮어쓰지 않는다** —
   * 같은 분회에 이미 active 면 그대로 두고, 없으면 새로 만든다. 다른 분회의 active 행은
   * 건드리지 않는다(전출 처리는 별도 운영 절차다).
   */
  private async grantFirstOperator(
    m: EntityManager,
    userId: string,
    branchId: string,
    reviewerUserId: string,
  ): Promise<void> {
    const repo = m.getRepository(BranchMembership);
    const existing = await repo.findOne({
      where: { user_id: userId, organization_id: branchId, status: 'active' },
    });
    if (!existing) {
      await repo.save(repo.create({ user_id: userId, organization_id: branchId, status: 'active' }));
    }

    // 서비스 접근 자격. 정지(suspended)는 approveCreation 이 먼저 막았다 — 여기 오는 것은 없음·pending·active 등.
    await m.query(
      `INSERT INTO service_memberships (user_id, service_key, status, created_at, updated_at)
       VALUES ($1, $2, 'active', NOW(), NOW())
       ON CONFLICT (user_id, service_key)
       DO UPDATE SET status = 'active', updated_at = NOW()`,
      [userId, KPA_BRANCH_SERVICE_KEY],
    );

    // 운영자 역할은 **canonical 경로**로만 준다. RBAC SSOT 는 frozen(F9)이고, 이 서비스가
    // 활성 행 탐색 -> 비활성 이력 행 복원 순서를 이미 처리한다(`unique_active_role_per_user`
    // 가 (user_id, role) WHERE is_active 라 직접 INSERT 는 23505 를 만들 수 있다).
    await roleAssignmentService.assignRole(
      { userId, role: KPA_BRANCH_OPERATOR_ROLE, assignedBy: reviewerUserId },
      m,
    );
  }
}

/**
 * 신청자의 분회 서비스 가입이 정지(suspended) 상태면 승인하지 않는다.
 *
 * 첫 운영자 부여는 `service_memberships` 를 active 로 upsert 한다. 정지된 가입을 그대로 두면
 * 개설 승인이 **정지 처분을 되살리는 우회 경로**가 된다. 신청은 pending 으로 남고 심사자는 거절할 수 있다.
 */
async function assertRequesterNotSuspended(m: EntityManager, userId: string): Promise<void> {
  const rows: Array<{ status: string }> = await m.query(
    `SELECT status FROM service_memberships WHERE user_id = $1 AND service_key = $2 LIMIT 1`,
    [userId, KPA_BRANCH_SERVICE_KEY],
  );
  if (rows?.[0]?.status === 'suspended') {
    throw new BranchLifecycleError(
      'REQUESTER_SUSPENDED',
      '신청자의 분회 서비스 이용이 정지된 상태라 승인할 수 없습니다. 거절하거나 정지를 먼저 해소하세요.',
      409,
    );
  }
}
