/**
 * Store 사업자 가입 — 공통 Store Workspace 의 **자가 가입** 경로
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1 §8
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 기존 provisioning 을 다시 만들지 않는다
 *
 *   조직 · 소유 관계 · 서비스 참여를 만드는 일은 이미 공용 helper 가 한다:
 *   `organizationOpsService.ensureOrganizationWithOwnerAndService()`
 *   (PharmacyHub · Cafe24 B2B 프로비저닝이 쓰는 바로 그 함수).
 *   이 모듈은 **그 helper 를 호출하는 새 진입 채널**일 뿐이고, 같은 축을 같은 순서로 쓴다.
 *
 *     매장 정보      organizations
 *     매장 소유 관계 organization_members(role='owner')
 *     서비스 참여    organization_service_enrollments
 *     서비스 가입    service_memberships
 *     서비스 역할    role_assignments ({prefix}:store_owner)
 *
 *   채널이 다른 이유: Cafe24 는 외부 로그인이, PharmacyHub 는 운영자 승인이 계기다.
 *   여기서는 **이미 로그인한 사용자가 직접** 매장을 열겠다고 한다. 그 계기만 다르다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 하지 않는 것
 *
 *   - 중복 생성 — 이미 이 서비스의 매장을 가진 사용자는 **그 매장을 돌려준다**
 *   - 임의 병합 — 후보가 2개 이상이면 고르지 않고 거절한다(`AMBIGUOUS_ORGANIZATION`).
 *     사람이 어느 사업자인지 정해야 하는 문제를 코드가 추측하면 남의 매장에 붙는다
 *   - 승인 우회 — role 과 membership 은 helper 와 기존 ensure 계약을 그대로 쓴다
 */
import type { DataSource } from 'typeorm';
import { organizationOpsService } from '../../modules/organization/services/organization-ops.service.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import {
  STORE_MEMBER_ROLES,
  isOrganizationLinkedToService,
} from '../../utils/store-organization.resolver.js';
import type { StoreOwnerServiceKey } from '../../utils/store-owner.utils.js';

/**
 * 가입 가능한 업종(서비스). owner role prefix 와 같은 축이다 — 새 prefix 를 만들지 않는다.
 * 약국(`kpa`)은 제외 — 약국 매장은 내 매장(약국) 신청 · 자격 확인 · 운영자 승인으로만 열린다
 * (WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · O4O-STORE-ACCESS-AND-MEMBERSHIP-V1 §3-A). 로그인만으로
 * 약국 조직 · kpa:store_owner · active membership 을 만들던 승인 우회 경로를 닫는다.
 */
// Pharmacy-Hub 매장 자가 가입도 은퇴 — 약국 매장은 내 매장(약국) 신청으로 통합(2026-10-05, 같은 WO).
// K-Cosmetics(`cosmetics`) 자가 가입도 은퇴 — 서비스 운영 종료로 매장 화면 · /api/v1/cosmetics 가 없다.
//   종료된 서비스의 조직 · active enrollment · cosmetics:store_owner 를 새로 만들지 않는다
//   (WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1). 현재 자가 가입 대상 업종은 없다 — 라우트는 400 으로 거절.
export const ENROLLABLE_SERVICE_KEYS: readonly StoreOwnerServiceKey[] = [];

/**
 * 가입이 부여하는 소유 role. `{prefix}:store_owner` — 기존 규약 그대로.
 *
 * 키는 공통 owner registry(`store-owner.utils.ts` `STORE_OWNER_ROLES_BY_SERVICE`)와 같은 3종이다.
 * `cafe24-b2b:store_owner` 는 **실재하는 role 이지만**(Cafe24 프로비저닝이 부여) 그 서비스는
 * HMAC 서명 쿠키 세션으로 진입해 공통 게이트를 거치지 않으므로 여기 두지 않는다. 자가 가입
 * 대상도 아니다(`ENROLLABLE_SERVICE_KEYS`).
 * (WO-O4O-STORE-OWNER-RBAC-AND-SERVICE-SEMANTICS-FINAL-ALIGNMENT-V1)
 */
export const STORE_OWNER_ROLE_BY_SERVICE: Readonly<Partial<Record<StoreOwnerServiceKey, string>>> =
  Object.freeze({
    kpa: 'kpa:store_owner',
    cosmetics: 'cosmetics:store_owner',
    'pharmacy-hub': 'pharmacy-hub:store_owner',
  });

/** 조직 type — 기존 프로비저닝과 같은 값(매장). */
const ORGANIZATION_TYPE = 'store';

export class StoreEnrollmentError extends Error {
  constructor(
    readonly code: 'SERVICE_NOT_ENROLLABLE' | 'BUSINESS_NAME_REQUIRED' | 'AMBIGUOUS_ORGANIZATION',
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'StoreEnrollmentError';
  }
}

const MESSAGES: Record<StoreEnrollmentError['code'], string> = {
  SERVICE_NOT_ENROLLABLE: '이 서비스로는 매장을 열 수 없습니다.',
  BUSINESS_NAME_REQUIRED: '사업자(매장) 이름을 입력해 주세요.',
  AMBIGUOUS_ORGANIZATION:
    '이미 이 서비스에 연결된 사업자가 두 곳 이상입니다. 어느 매장으로 들어갈지 먼저 정해 주세요.',
};

export interface StoreEnrollmentResult {
  organizationId: string;
  serviceKey: StoreOwnerServiceKey;
  /** 'created' 새 매장 · 'connected' 기존 사업자에 연결 · 'existing' 이미 경영자 */
  outcome: 'created' | 'connected' | 'existing';
}

/** 조직 code — 사람이 읽을 수 있고 재실행에 안정적이어야 한다(helper 가 code 로 멱등을 잡는다). */
function organizationCode(serviceKey: StoreOwnerServiceKey, userId: string): string {
  return `store-${serviceKey}-${userId.replace(/-/g, '').slice(0, 12)}`;
}

/**
 * 로그인 사용자가 자기 매장을 연다.
 *
 * 멱등하다 — 이미 이 서비스의 매장을 가지고 있으면 아무 것도 만들지 않고 그 매장을 돌려준다.
 */
export async function enrollStoreBusiness(
  dataSource: DataSource,
  input: { userId: string; serviceKey: StoreOwnerServiceKey; businessName: string },
): Promise<StoreEnrollmentResult> {
  const { userId, serviceKey } = input;
  if (!ENROLLABLE_SERVICE_KEYS.includes(serviceKey)) {
    throw new StoreEnrollmentError('SERVICE_NOT_ENROLLABLE', 400, MESSAGES.SERVICE_NOT_ENROLLABLE);
  }
  const businessName = (input.businessName ?? '').trim();
  if (!businessName) {
    throw new StoreEnrollmentError('BUSINESS_NAME_REQUIRED', 400, MESSAGES.BUSINESS_NAME_REQUIRED);
  }

  // ── 1. 기존 사업자 후보 — 이 서비스에 이미 연결된 내 조직 ─────────────────
  //   매장 접근 역할(owner/admin/manager)로 속한 조직 중 이 서비스에 등록된 것만 본다.
  const rows: Array<{ organization_id: string }> = await dataSource.query(
    `SELECT DISTINCT organization_id
       FROM organization_members
      WHERE user_id = $1 AND left_at IS NULL AND role = ANY($2::text[])
      ORDER BY organization_id ASC`,
    [userId, [...STORE_MEMBER_ROLES]],
  );
  const linked: string[] = [];
  for (const row of rows) {
    if (await isOrganizationLinkedToService(dataSource, row.organization_id, serviceKey)) {
      linked.push(row.organization_id);
    }
  }
  // 둘 이상이면 **고르지 않는다** — 임의 선택은 남의 매장에 붙는 길이다.
  if (linked.length > 1) {
    throw new StoreEnrollmentError('AMBIGUOUS_ORGANIZATION', 409, MESSAGES.AMBIGUOUS_ORGANIZATION);
  }

  const ownerRole = STORE_OWNER_ROLE_BY_SERVICE[serviceKey];
  // ENROLLABLE_SERVICE_KEYS 가 이미 걸러내지만, 두 목록이 어긋나면 조용히 role 없이 가입되는 것을 막는다.
  if (!ownerRole) throw new StoreEnrollmentError('SERVICE_NOT_ENROLLABLE', 400, MESSAGES.SERVICE_NOT_ENROLLABLE);
  const alreadyOwner = linked.length === 1 && (await roleAssignmentService.hasRole(userId, ownerRole));
  if (alreadyOwner) {
    return { organizationId: linked[0], serviceKey, outcome: 'existing' };
  }

  // ── 2. 조직 · 소유 관계 · 서비스 참여 — 공용 helper 가 멱등하게 처리한다 ──
  const ensured = await organizationOpsService.ensureOrganizationWithOwnerAndService(
    {
      name: businessName,
      code: organizationCode(serviceKey, userId),
      type: ORGANIZATION_TYPE,
      createdByUserId: userId,
      metadata: { source: 'store-self-enrollment', serviceKey },
    },
    userId,
    serviceKey,
  );

  // ── 3. 서비스 가입(status 보존) ────────────────────────────────────────────
  //   이미 있으면 상태를 바꾸지 않는다 — 정지된 회원이 가입 버튼으로 되살아나지 않게.
  const { ensureServiceMembershipsForRoles } = await import('../admin/service-membership-ensure.js');
  await ensureServiceMembershipsForRoles(userId, [ownerRole]);

  // ── 4. 인가 role ──────────────────────────────────────────────────────────
  //   관계를 세운 **뒤에** 발급한다(Identity V3 §7: Role ∧ Relationship).
  await roleAssignmentService.assignRole({ userId, role: ownerRole, assignedBy: userId });

  return {
    organizationId: ensured.id,
    serviceKey,
    outcome: ensured.created ? 'created' : linked.length === 1 ? 'connected' : 'created',
  };
}

/** 화면이 "가입하기" 를 보여줄지 정하는 용도 — 라우트의 입력 검증과 같은 목록을 쓴다. */
export function isEnrollableServiceKey(value: unknown): value is StoreOwnerServiceKey {
  return typeof value === 'string' && (ENROLLABLE_SERVICE_KEYS as readonly string[]).includes(value);
}
