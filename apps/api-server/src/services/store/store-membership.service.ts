/**
 * Store Membership — 사업자가 허가한 사용자(Store Member)의 **단일 정본**
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 * 상위 정본: `docs/baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md` §3 (store = 공통 Store Workspace)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 새 테이블을 만들지 않았나
 *
 *   census 결과 매장 접근의 SSOT 는 이미 `organization_members` 다.
 *     - 활성 판정 = `left_at IS NULL`
 *     - 매장 접근 역할 = `STORE_MEMBER_ROLES`(owner · admin · manager) — `store-organization.resolver`
 *     - `UNIQUE (organization_id, user_id)` — 한 사람은 한 조직에 한 행
 *
 *   초대 대기 상태를 담을 `status` 컬럼은 없지만, **역할 값으로 표현할 수 있다**. 기존 질의는
 *   전부 명시적 allowlist(`role IN (...)` · `role = ANY($n)`)라 새 역할 값은 어느 경로에도
 *   권한을 주지 않는다(전수 확인). 그래서 테이블·migration 없이 두 값만 추가한다.
 *
 *     'invited'  초대됨 — 아직 아무 접근도 없다
 *     'staff'    수락함 — Store Member (조회 · 사용, 소유 변경 불가)
 *
 *   `'member'` 를 쓰지 않은 이유: `organization_members.role` 의 **DB 기본값이 'member'** 라,
 *   다른 경로가 만든 기존 행이 이미 그 값을 갖고 있을 수 있다. 그 값에 접근을 부여하면
 *   조용한 권한 확대가 된다. `'staff'` 는 저장소 전체에서 쓰이지 않던 값이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 접근 결정 순서 (이 순서를 바꾸지 않는다)
 *
 *   1. 세션 사용자  — userId 는 세션에서만 온다. body/query 의 userId 는 받지 않는다
 *   2. 조직 확정    — Owner 는 `isStoreOwner()` 가 해석한 조직, Member 는 자기 활성 행의 조직
 *   3. 역할 판정    — owner(기존 경로 그대로) > staff > none
 *   4. 업종 경계    — 조직이 그 serviceKey 에 연결돼 있어야 한다(`STORE_SERVICE_ORG_LINKAGE`)
 *
 *   **Owner 판정은 건드리지 않는다.** 기존 `isStoreOwner()`(role_assignments + active service
 *   membership + 조직 해석)가 그대로 정본이고, 이 모듈은 그 아래에 Member 단계를 더한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 인가는 role 이 한다 — 관계 행만으로 권한을 주지 않는다
 *
 *   `O4O-IDENTITY-ARCHITECTURE-V3` §7: **`role_assignments` 가 Authorization SSOT** 이고
 *   `organization_members` 같은 Relationship 행은 **접근 판정의 조건**일 뿐이다.
 *   그래서 Store Member 접근은 두 가지를 **모두** 요구한다.
 *
 *     Role          role_assignments 의 `{prefix}:store_member` (활성)
 *     Relationship  organization_members 의 활성 `'staff'` 행 + 조직↔서비스 linkage
 *
 *   초대 수락이 role 을 발급하고, 해제가 회수한다. 관계 행 하나가 생겼다고 권한이 생기지 않는다
 *   — 초기 구현이 그렇게 돼 있었고(PR #277 리뷰 P1) 정본과 어긋나 바로잡았다.
 */
import type { DataSource } from 'typeorm';
import { isStoreOwner, type StoreOwnerServiceKey } from '../../utils/store-owner.utils.js';
import {
  STORE_SERVICE_ORG_LINKAGE,
  isOrganizationLinkedToService,
} from '../../utils/store-organization.resolver.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';

/** 초대 대기 — 어떤 접근도 주지 않는다. 수락 전까지 매장이 보이지 않는다. */
export const STORE_INVITED_ROLE = 'invited';
/** Store Member — 사업자가 허가한 사용자(직원 · 담당자). 소유 변경은 못 한다. */
export const STORE_STAFF_ROLE = 'staff';

/** 이 모듈이 다루는 **관계** 역할. 기존 매장 역할(owner/admin/manager)은 건드리지 않는다. */
export const STORE_MEMBERSHIP_MANAGED_ROLES: readonly string[] = [STORE_INVITED_ROLE, STORE_STAFF_ROLE];

/**
 * Store Member 의 **인가 role** — `{prefix}:store_owner` 와 같은 자리에 둔다.
 * 서비스별로 나누는 이유: 업종이 다른 매장의 자격이 서로 섞이지 않게 하려는 것이고,
 * 이는 owner role 이 이미 쓰는 규약이다.
 *
 * **키는 공통 owner registry(`STORE_OWNER_ROLES_BY_SERVICE`, 3종)와 다르다 — 여기는 4종이다.**
 *   owner 게이트는 `cafe24-b2b` 를 제외한다(그 서비스는 HMAC 서명 쿠키 세션으로 `/store/*` 에
 *   들어가 `isStoreOwner()` 를 거치지 않는다). 하지만 **초대·수락은 서비스 중립 표면**이고 조직↔서비스
 *   linkage(`STORE_SERVICE_ORG_LINKAGE`)가 `cafe24-b2b` 를 포함하므로, 그 조직에 초대받은 사람에게도
 *   발급할 role 이 있어야 한다. 없으면 수락이 관계만 `staff` 로 바꾸고 role 을 건너뛰어 **접근 0 ·
 *   재수락 불가**인 막다른 상태가 된다.
 *   PH 이름은 과거 회수 식별자로만 보존한다. 현재 접근·수락 발급은 PH를 제외한다.
 *   (WO-O4O-STORE-OWNER-RBAC-AND-SERVICE-SEMANTICS-FINAL-ALIGNMENT-V1 — 한 번 3종으로 줄였다가
 *    PR #288 리뷰로 되돌렸다. 과거 CHECK 는 ACTIVE 정본을 이기지 못한다.)
 */
export const STORE_MEMBER_ROLE_BY_SERVICE: Readonly<Record<StoreOwnerServiceKey, string>> = Object.freeze({
  kpa: 'kpa:store_member',
  cosmetics: 'cosmetics:store_member',
  'pharmacy-hub': 'pharmacy-hub:store_member',
  'cafe24-b2b': 'cafe24-b2b:store_member',
});

// PH role names remain available for historical revocation, but grant no current Store access.
const ALL_STORE_MEMBER_ROLES: readonly string[] = Object.entries(STORE_MEMBER_ROLE_BY_SERVICE)
  .filter(([key]) => key !== 'pharmacy-hub').map(([, role]) => role);

/** 과거 PH를 포함한 조직 linkage. 수락 발급은 PH를 제외하고 회수는 과거 이름도 처리한다. */
async function linkedServiceKeys(
  dataSource: DataSource,
  organizationId: string,
): Promise<StoreOwnerServiceKey[]> {
  const keys = Object.keys(STORE_SERVICE_ORG_LINKAGE) as StoreOwnerServiceKey[];
  const linked: StoreOwnerServiceKey[] = [];
  for (const key of keys) {
    if (await isOrganizationLinkedToService(dataSource, organizationId, key)) {
      linked.push(key);
    } else if (key === 'pharmacy-hub') {
      // Inactive PH records still identify a retired organization; they cannot become an unscoped store.
      const linkage = STORE_SERVICE_ORG_LINKAGE[key];
      const historical: unknown[] = await dataSource.query(
        `SELECT 1 WHERE EXISTS (
           SELECT 1 FROM organization_service_enrollments e
            WHERE e.organization_id = $1 AND e.service_code = ANY($2::text[])
         ) OR EXISTS (
           SELECT 1 FROM platform_store_slugs s
            WHERE s.store_id = $1 AND s.service_key = ANY($3::text[])
         )`,
        [organizationId, linkage.enrollmentCodes, linkage.slugKeys],
      );
      if (historical.length > 0) linked.push(key);
    }
  }
  return linked;
}

export type StoreAccessLevel = 'owner' | 'member' | 'none';

export interface StoreAccess {
  level: StoreAccessLevel;
  organizationId: string | null;
  /** `organization_members.role` 원값 — 화면 표시용. 권한 판정은 level 로만 한다. */
  memberRole: string | null;
}

export interface StoreMemberRow {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  status: 'invited' | 'active';
  joinedAt: string;
}

export class StoreMemberError extends Error {
  constructor(
    readonly code:
      | 'STORE_NOT_RESOLVED'
      | 'STORE_OWNER_REQUIRED'
      | 'USER_NOT_FOUND'
      | 'ALREADY_MEMBER'
      | 'INVITATION_NOT_FOUND'
      | 'CANNOT_MODIFY_OWNER'
      | 'SELF_INVITE_FORBIDDEN',
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'StoreMemberError';
  }
}

const MESSAGES: Record<StoreMemberError['code'], string> = {
  STORE_NOT_RESOLVED: '매장을 확정할 수 없습니다.',
  STORE_OWNER_REQUIRED: '매장 경영자만 할 수 있습니다.',
  USER_NOT_FOUND: '해당 주소로 가입된 사용자가 없습니다. 먼저 가입한 뒤 초대해 주세요.',
  ALREADY_MEMBER: '이미 이 매장의 구성원입니다.',
  INVITATION_NOT_FOUND: '수락할 초대가 없습니다.',
  CANNOT_MODIFY_OWNER: '매장 경영자 본인의 소속은 이 경로로 바꿀 수 없습니다.',
  SELF_INVITE_FORBIDDEN: '자기 자신은 초대할 수 없습니다.',
};

const fail = (code: StoreMemberError['code'], status: number): never => {
  throw new StoreMemberError(code, status, MESSAGES[code]);
};

/**
 * 이 사용자가 이 요청에서 매장에 어떤 자격으로 접근하는가.
 *
 * Owner 는 기존 판정을 그대로 통과시킨다(회귀 0). Owner 가 아니면 `staff` 활성 행을 찾고,
 * 그 조직이 요청 서비스에 연결돼 있는지까지 본다 — 업종이 다른 매장으로 새지 않게.
 */
export async function resolveStoreAccessLevel(
  dataSource: DataSource,
  userId: string,
  serviceKey?: StoreOwnerServiceKey,
  preferredOrganizationId?: string | null,
): Promise<StoreAccess> {
  if (!userId || serviceKey === 'pharmacy-hub') return { level: 'none', organizationId: null, memberRole: null };

  const owner = await isStoreOwner(dataSource, userId, serviceKey, preferredOrganizationId);
  if (owner.isOwner && owner.organizationId) {
    return { level: 'owner', organizationId: owner.organizationId, memberRole: owner.memberRole ?? 'owner' };
  }

  // Store Member — 사업자가 허가한 사용자. 수락 전('invited')은 여기서 걸러진다.
  const rows: Array<{ organization_id: string; role: string }> = await dataSource.query(
    `SELECT organization_id, role
       FROM organization_members
      WHERE user_id = $1 AND left_at IS NULL AND role = $2
      ORDER BY is_primary DESC, joined_at ASC, organization_id ASC`,
    [userId, STORE_STAFF_ROLE],
  );
  if (rows.length === 0) return { level: 'none', organizationId: null, memberRole: null };

  // **Role 이 없으면 거부** (Identity V3 §7-1). 관계 행만으로는 아무 접근도 주지 않는다.
  const requiredRoles = serviceKey ? [STORE_MEMBER_ROLE_BY_SERVICE[serviceKey]] : ALL_STORE_MEMBER_ROLES;
  if (!(await roleAssignmentService.hasAnyRole(userId, [...requiredRoles]))) {
    return { level: 'none', organizationId: null, memberRole: null };
  }

  const preferred = preferredOrganizationId
    ? rows.find((r) => r.organization_id === preferredOrganizationId)
    : undefined;
  // 선택 힌트는 **허용 후보 안에서만** 고른다 — 없는 조직을 요청하면 힌트를 버리고 기본 후보로 간다.
  const candidates = preferred ? [preferred] : rows;

  for (const row of candidates) {
    if (serviceKey && !(await isOrganizationLinkedToService(dataSource, row.organization_id, serviceKey))) {
      continue; // 업종 경계 — 다른 서비스의 매장이면 이 요청에서는 접근이 아니다
    }
    return { level: 'member', organizationId: row.organization_id, memberRole: row.role };
  }
  return { level: 'none', organizationId: null, memberRole: null };
}

/** 소유 변경(초대 · 해제 · 역할 변경)을 할 수 있는 조직. Owner 가 아니면 던진다. */
async function requireOwnedOrganization(
  dataSource: DataSource,
  userId: string,
  serviceKey?: StoreOwnerServiceKey,
  preferredOrganizationId?: string | null,
): Promise<string> {
  const access = await resolveStoreAccessLevel(dataSource, userId, serviceKey, preferredOrganizationId);
  if (access.level !== 'owner' || !access.organizationId) {
    // 매장이 아예 안 잡히는 것과 Member 인 것을 구분해 알린다(둘 다 쓰기는 불가).
    return access.organizationId ? fail('STORE_OWNER_REQUIRED', 403) : fail('STORE_NOT_RESOLVED', 403);
  }
  return access.organizationId;
}

/** 매장 구성원 목록 — 초대 대기 포함. Owner 전용. */
export async function listStoreMembers(
  dataSource: DataSource,
  ownerUserId: string,
  serviceKey?: StoreOwnerServiceKey,
  preferredOrganizationId?: string | null,
): Promise<{ organizationId: string; members: StoreMemberRow[] }> {
  const organizationId = await requireOwnedOrganization(dataSource, ownerUserId, serviceKey, preferredOrganizationId);
  const rows: Array<{ user_id: string; email: string; name: string | null; role: string; joined_at: Date }> =
    await dataSource.query(
      `SELECT om.user_id, u.email, u.name, om.role, om.joined_at
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = $1 AND om.left_at IS NULL
        ORDER BY om.joined_at ASC`,
      [organizationId],
    );
  return {
    organizationId,
    members: rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.role === STORE_INVITED_ROLE ? 'invited' : 'active',
      joinedAt: new Date(r.joined_at).toISOString(),
    })),
  };
}

/**
 * 사용자를 매장에 초대한다 — **이미 가입한 사용자만**.
 *
 * 메일을 보내지 않는다. 운영자 지정 경로와 같은 모양(기존 사용자 조회 → 연결)이며, 은퇴한
 * 이메일 초대 토큰 도메인(`operator_invitations`)을 되살리지 않는다. 미가입자 초대는 V1 범위
 * 밖이고 정책 정본에 한계로 적는다.
 */
export async function inviteStoreMember(
  dataSource: DataSource,
  input: { ownerUserId: string; email: string; serviceKey?: StoreOwnerServiceKey; preferredOrganizationId?: string | null },
): Promise<{ organizationId: string; userId: string; role: string }> {
  const organizationId = await requireOwnedOrganization(
    dataSource,
    input.ownerUserId,
    input.serviceKey,
    input.preferredOrganizationId,
  );
  const linked = await linkedServiceKeys(dataSource, organizationId);
  // 서비스 미지정 경로에서도 PH만 연결된 과거 조직에 새 초대는 만들지 않는다.
  if (linked.length > 0 && linked.every((key) => key === 'pharmacy-hub')) fail('STORE_NOT_RESOLVED', 403);
  const email = (input.email ?? '').trim().toLowerCase();
  const [user]: Array<{ id: string }> = await dataSource.query(
    `SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`,
    [email],
  );
  if (!user) fail('USER_NOT_FOUND', 404);
  if (user.id === input.ownerUserId) fail('SELF_INVITE_FORBIDDEN', 400);

  const [existing]: Array<{ role: string; left_at: Date | null }> = await dataSource.query(
    `SELECT role, left_at FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1`,
    [organizationId, user.id],
  );

  if (existing && existing.left_at === null) {
    // 이미 활성 행이 있다 — 경영자 · 관리자 역할을 이 경로로 덮어쓰지 않는다.
    if (existing.role !== STORE_INVITED_ROLE) fail('ALREADY_MEMBER', 409);
    return { organizationId, userId: user.id, role: STORE_INVITED_ROLE }; // 재초대는 멱등
  }

  // `UNIQUE (organization_id, user_id)` 라 과거에 나간 사람은 같은 행을 되살린다.
  await dataSource.query(
    `INSERT INTO organization_members (organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
     VALUES ($1, $2, $3, false, now(), now(), now())
     ON CONFLICT (organization_id, user_id) DO UPDATE
       SET role = EXCLUDED.role, left_at = NULL, joined_at = now(), updated_at = now()`,
    [organizationId, user.id, STORE_INVITED_ROLE],
  );
  return { organizationId, userId: user.id, role: STORE_INVITED_ROLE };
}

/** 내가 받은 초대 목록 — 수락 화면용. */
export async function listMyInvitations(
  dataSource: DataSource,
  userId: string,
): Promise<Array<{ organizationId: string; organizationName: string }>> {
  const rows: Array<{ organization_id: string; name: string | null }> = await dataSource.query(
    `SELECT om.organization_id, o.name
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = $1 AND om.left_at IS NULL AND om.role = $2
      ORDER BY om.joined_at ASC`,
    [userId, STORE_INVITED_ROLE],
  );
  const invitations: Array<{ organizationId: string; organizationName: string }> = [];
  for (const row of rows) {
    const linked = await linkedServiceKeys(dataSource, row.organization_id);
    // Only actionable invitations belong in this list; retain the historical invited row.
    if (linked.length > 0 && linked.every((key) => key === 'pharmacy-hub')) continue;
    invitations.push({ organizationId: row.organization_id, organizationName: row.name ?? '' });
  }
  return invitations;
}

/**
 * 초대 수락 — **초대받은 본인만**.
 *
 * 세션 사용자와 대상 행의 user_id 가 같을 때만 바뀐다. 초대가 없으면 아무 것도 만들지 않는다
 * (수락이 membership 을 새로 만드는 경로가 되면 초대 없이 들어올 수 있다).
 */
export async function acceptStoreInvitation(
  dataSource: DataSource,
  input: { userId: string; organizationId: string },
): Promise<{ organizationId: string; role: string; services: StoreOwnerServiceKey[] }> {
  const linked = await linkedServiceKeys(dataSource, input.organizationId);
  const services = linked.filter((key) => key !== 'pharmacy-hub');
  if (linked.length > 0 && services.length === 0) fail('STORE_NOT_RESOLVED', 403);
  const result = await dataSource.query(
    `UPDATE organization_members
        SET role = $3, updated_at = now()
      WHERE organization_id = $1 AND user_id = $2 AND left_at IS NULL AND role = $4
      RETURNING organization_id`,
    [input.organizationId, input.userId, STORE_STAFF_ROLE, STORE_INVITED_ROLE],
  );
  // UPDATE ... RETURNING 은 [rows, count] 형태로 온다.
  const rows = (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as unknown[];
  if (!rows || rows.length === 0) fail('INVITATION_NOT_FOUND', 404);

  // 관계를 세운 **뒤에** 인가 role 을 발급한다. 이 조직이 매장으로 등록된 서비스만 대상이다.
  //   발급이 실패하면 관계만 남고 접근은 생기지 않는다(fail-closed) — 반대 순서면 role 만 남아
  //   관계 없는 권한이 떠돈다.
  for (const key of services) {
    await roleAssignmentService.assignRole({
      userId: input.userId,
      role: STORE_MEMBER_ROLE_BY_SERVICE[key],
      assignedBy: input.userId,
    });
  }
  return { organizationId: input.organizationId, role: STORE_STAFF_ROLE, services };
}

/**
 * 구성원 해제 — Owner 전용. 행을 지우지 않고 `left_at` 을 세운다(이력 보존).
 * 이 경로는 **이 모듈이 만든 역할만** 건드린다 — owner · admin · manager 는 거절한다.
 */
export async function removeStoreMember(
  dataSource: DataSource,
  input: {
    ownerUserId: string;
    targetUserId: string;
    serviceKey?: StoreOwnerServiceKey;
    preferredOrganizationId?: string | null;
  },
): Promise<{ organizationId: string; userId: string; services: StoreOwnerServiceKey[] }> {
  const organizationId = await requireOwnedOrganization(
    dataSource,
    input.ownerUserId,
    input.serviceKey,
    input.preferredOrganizationId,
  );
  const [row]: Array<{ role: string }> = await dataSource.query(
    `SELECT role FROM organization_members
      WHERE organization_id = $1 AND user_id = $2 AND left_at IS NULL LIMIT 1`,
    [organizationId, input.targetUserId],
  );
  if (!row) fail('INVITATION_NOT_FOUND', 404);
  if (!STORE_MEMBERSHIP_MANAGED_ROLES.includes(row.role)) fail('CANNOT_MODIFY_OWNER', 403);

  await dataSource.query(
    `UPDATE organization_members SET left_at = now(), updated_at = now()
      WHERE organization_id = $1 AND user_id = $2 AND left_at IS NULL AND role = ANY($3::text[])`,
    [organizationId, input.targetUserId, STORE_MEMBERSHIP_MANAGED_ROLES],
  );

  // 인가 role 회수 — **다른 매장에 아직 남아 있으면 회수하지 않는다**.
  //   한 사람이 같은 서비스의 매장 둘에 소속될 수 있고, 한 곳에서 빠졌다고 나머지 접근까지
  //   끊으면 안 된다. 그래서 서비스별로 "남은 활성 staff 관계" 를 세고 0 일 때만 지운다.
  const services = await linkedServiceKeys(dataSource, organizationId);
  for (const key of services) {
    const remaining: unknown[] = await dataSource.query(
      `SELECT 1
         FROM organization_members om
        WHERE om.user_id = $1 AND om.left_at IS NULL AND om.role = $2
          AND (
            EXISTS (SELECT 1 FROM organization_service_enrollments e
                     WHERE e.organization_id = om.organization_id
                       AND e.service_code = ANY($3::text[]) AND e.status = 'active')
            OR EXISTS (SELECT 1 FROM platform_store_slugs s
                        WHERE s.store_id = om.organization_id
                          AND s.service_key = ANY($4::text[]) AND s.is_active = true)
          )
        LIMIT 1`,
      [
        input.targetUserId,
        STORE_STAFF_ROLE,
        STORE_SERVICE_ORG_LINKAGE[key].enrollmentCodes,
        STORE_SERVICE_ORG_LINKAGE[key].slugKeys,
      ],
    );
    if (!remaining || remaining.length === 0) {
      await roleAssignmentService.removeRole(input.targetUserId, STORE_MEMBER_ROLE_BY_SERVICE[key]);
    }
  }
  return { organizationId, userId: input.targetUserId, services };
}
