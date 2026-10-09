/**
 * Store Organization Resolver — service-scoped canonical SSOT
 *
 * WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 파일이 존재하는가
 *
 *   `utils/store-owner.utils.ts` 의 `isStoreOwner()` 는 role 은 serviceKey 로 걸러도
 *   조직은 `organization_members ... LIMIT 1` 로 **정렬·서비스 조건 없이** 골랐다.
 *   한 사용자가 여러 organization 에 속하면 어떤 매장이 잡힐지 보장되지 않는다
 *   (프로덕션 실측: store_owner role 보유 계정 중 3개 조직 보유 1명 — KPA 약국 /
 *   K-Cosmetics 매장 / Neture 공급자 조직이 섞여 있어 KPA 요청이 공급자 조직으로
 *   해석될 수 있었다).
 *
 *   핵심 원칙:  **role 판정 ≠ organization 판정**
 *   `kpa:store_owner` role 이 있다고 해서 그 사용자의 아무 organization 이나
 *   골라선 안 된다. serviceKey 가 주어지면 그 서비스에 등록된 organization 만
 *   후보가 된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 해석 규칙 (serviceKey 지정 시)
 *
 *   로그인 사용자
 *   → organization_members 활성 매장 역할(owner/admin/manager, left_at IS NULL)
 *   → 그 조직이 **해당 서비스에 등록**되어 있을 것 (아래 linkage 참조)
 *   → 정확히 1개 : 확정 (status='resolved')
 *   → 0개        : 미연결 (status='none')       — 호출 측 기존 정책대로 403/null
 *   → 2개 이상   : 임의 선택 금지 (status='ambiguous', AMBIGUOUS_STORE_CONNECTION)
 *
 *   "서비스에 등록" 판정 근거는 **이미 운영 중인 두 계약**의 합집합이다.
 *   새 테이블·새 컬럼·backfill 을 만들지 않는다 (본 WO 는 DB write 0).
 *
 *     (a) organization_service_enrollments(service_code, status='active')
 *         — K-Cosmetics / Pharmacy-Hub / Neture 프로비저닝 경로가 기록
 *     (b) platform_store_slugs(service_key, is_active = true)
 *         — KPA 약국 매장 주소 발급 경로가 기록 (KPA 는 enrollment row 를 만들지 않는다)
 *
 *   두 소스 모두 "이 조직이 이 서비스의 매장이다"를 뜻하는 기존 기록이며,
 *   어느 쪽도 이번 WO 에서 새로 채우지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * serviceKey 미지정(back-compat) 경로
 *
 *   `/api/v1/store/*` 공통 라우터는 서비스 중립 mount 라 요청에서 serviceKey 를
 *   알 수 없다. API 계약을 바꾸지 않기 위해(WO 변경 금지) **허용 집합은 그대로 두고
 *   선택만 결정적**으로 만든다: is_primary DESC → joined_at ASC → organization_id ASC.
 *   후보가 2개 이상이면 경고 로그를 남긴다. 서비스별 mount 로 분리 가능한 소비처는
 *   serviceKey 를 명시하도록 이번 WO 에서 함께 정리했다.
 */

import type { DataSource } from 'typeorm';
import logger from './logger.js';

/**
 * organization_members 중 "매장 접근"으로 인정되는 role.
 * 공통 가드 · Pharmacy-Hub 해석기 · 프로비저닝이 같은 집합을 쓴다 (중복 정의 금지).
 */
export const STORE_MEMBER_ROLES: readonly string[] = ['owner', 'admin', 'manager'];

/** 서비스별 store_owner role prefix (role_assignments 접두사 기준) */
export type StoreOwnerServiceKey = 'kpa' | 'cosmetics' | 'pharmacy-hub' | 'cafe24-b2b';

/**
 * 서비스 → organization 연결 근거.
 *
 * `enrollmentCodes` : organization_service_enrollments.service_code 후보
 * `slugKeys`        : platform_store_slugs.service_key 후보
 *
 * 두 테이블의 키 체계가 서로 다르다(전자는 platform-level, 후자는 product-level).
 * 실측값을 그대로 반영하며 새 값을 만들지 않는다.
 */
export const STORE_SERVICE_ORG_LINKAGE: Readonly<
  Record<StoreOwnerServiceKey, { enrollmentCodes: readonly string[]; slugKeys: readonly string[] }>
> = Object.freeze({
  kpa: { enrollmentCodes: ['kpa-society', 'kpa'], slugKeys: ['kpa'] },
  cosmetics: { enrollmentCodes: ['k-cosmetics', 'cosmetics'], slugKeys: ['k-cosmetics', 'cosmetics'] },
  'pharmacy-hub': { enrollmentCodes: ['pharmacy-hub'], slugKeys: ['pharmacy-hub'] },
  // WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1:
  //   프로비저닝이 enrollment 와 slug 를 모두 같은 키로 기록하므로 후보도 1개씩이다.
  'cafe24-b2b': { enrollmentCodes: ['cafe24-b2b'], slugKeys: ['cafe24-b2b'] },
});

/**
 * 이 organization 이 해당 서비스의 매장인가?
 *
 * WO-O4O-SIGNAGE-CROSS-SERVICE-ORGANIZATION-SCOPE-GUARD-V1
 *
 * `findStoreOrganizationCandidates()` 는 "이 **사용자**의 이 서비스 매장" 을 찾는다.
 * 반면 Signage 처럼 **클라이언트가 organization 을 지정**하는 축에서는
 * "소유 여부" 와 "그 조직이 요청 서비스 소속인가" 를 따로 판정해야 한다.
 * 귀속 판정 근거는 위 두 계약(enrollment / store slug)으로 **동일**하다 —
 * 새 테이블·새 mapping 을 만들지 않는다.
 *
 * 한 organization 이 복수 서비스에 정상 귀속될 수 있으므로(합법 구조),
 * "요청 서비스에 귀속 기록이 존재하는가" 만 본다. 다른 서비스 귀속은 배제 사유가 아니다.
 */
export async function isOrganizationLinkedToService(
  dataSource: DataSource,
  organizationId: string,
  serviceKey: StoreOwnerServiceKey,
): Promise<boolean> {
  const linkage = STORE_SERVICE_ORG_LINKAGE[serviceKey];
  const rows = await dataSource.query(
    `SELECT 1
       WHERE EXISTS (
               SELECT 1 FROM organization_service_enrollments e
                WHERE e.organization_id = $1
                  AND e.service_code = ANY($2::text[])
                  AND e.status = 'active'
             )
          OR EXISTS (
               SELECT 1 FROM platform_store_slugs s
                WHERE s.store_id = $1
                  AND s.service_key = ANY($3::text[])
                  AND s.is_active = true
             )`,
    [organizationId, linkage.enrollmentCodes, linkage.slugKeys],
  );
  return Array.isArray(rows) && rows.length > 0;
}

export interface StoreOrganizationCandidate {
  organizationId: string;
  memberRole: string;
}

export type StoreOrganizationResolution =
  | { status: 'resolved'; organizationId: string; memberRole: string; candidateCount: number }
  | { status: 'none'; organizationId: null; memberRole: ''; candidateCount: 0 }
  | { status: 'ambiguous'; organizationId: null; memberRole: ''; candidateCount: number };

const NONE: StoreOrganizationResolution = {
  status: 'none',
  organizationId: null,
  memberRole: '',
  candidateCount: 0,
};

/**
 * 서비스 스코프가 걸린 매장 조직 후보 목록.
 * 조직당 1행(DISTINCT ON)이며 순서는 결정적이다.
 */
export async function findStoreOrganizationCandidates(
  dataSource: DataSource,
  userId: string,
  serviceKey: StoreOwnerServiceKey,
): Promise<StoreOrganizationCandidate[]> {
  // WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (DESIGN §5):
  //   약국 매장(`kpa`) 후보는 서비스 연결(enrollment · slug)이 아니라 **내 매장(약국) 신청 원장 active** 로 판정한다.
  //   kpa-society 가입 · 옛 약국 조직을 매장 자격으로 재해석하지 않는다(대체, 누적 아님).
  if (serviceKey === 'kpa') {
    const pharmacyRows = await dataSource.query(
      `SELECT DISTINCT ON (om.organization_id)
              om.organization_id AS organization_id,
              om.role            AS role
         FROM organization_members om
         JOIN neture_pharmacy_memberships npm
           ON npm.organization_id = om.organization_id AND npm.status = 'active'
        WHERE om.user_id = $1
          AND om.role = ANY($2::text[])
          AND om.left_at IS NULL
        ORDER BY om.organization_id, om.role`,
      [userId, STORE_MEMBER_ROLES],
    );
    return (pharmacyRows as Array<{ organization_id: string; role: string }>).map((r) => ({
      organizationId: r.organization_id,
      memberRole: r.role,
    }));
  }

  const linkage = STORE_SERVICE_ORG_LINKAGE[serviceKey];
  const rows = await dataSource.query(
    `SELECT DISTINCT ON (om.organization_id)
            om.organization_id AS organization_id,
            om.role            AS role
       FROM organization_members om
      WHERE om.user_id = $1
        AND om.role = ANY($2::text[])
        AND om.left_at IS NULL
        AND (
              EXISTS (
                SELECT 1 FROM organization_service_enrollments e
                 WHERE e.organization_id = om.organization_id
                   AND e.service_code = ANY($3::text[])
                   AND e.status = 'active'
              )
              OR EXISTS (
                SELECT 1 FROM platform_store_slugs s
                 WHERE s.store_id = om.organization_id
                   AND s.service_key = ANY($4::text[])
                   AND s.is_active = true
              )
            )
      ORDER BY om.organization_id, om.role`,
    [userId, STORE_MEMBER_ROLES, linkage.enrollmentCodes, linkage.slugKeys],
  );

  return (rows as Array<{ organization_id: string; role: string }>).map((r) => ({
    organizationId: r.organization_id,
    memberRole: r.role,
  }));
}

interface StoreRetirementIdentity {
  retired_store_identity: boolean;
  current_store_identity: boolean;
}

// Use the same statement snapshot for candidate relationships and service identity.
const RETIREMENT_IDENTITY_PARAMETERS = [
  STORE_SERVICE_ORG_LINKAGE['pharmacy-hub'].enrollmentCodes,
  STORE_SERVICE_ORG_LINKAGE['pharmacy-hub'].slugKeys,
  // Pharmacy approval comes only from npm, never legacy KPA enrollment or slug records.
  [...new Set(Object.entries(STORE_SERVICE_ORG_LINKAGE).filter(([key]) => key !== 'pharmacy-hub' && key !== 'kpa').flatMap(([, value]) => value.enrollmentCodes))],
  [...new Set(Object.entries(STORE_SERVICE_ORG_LINKAGE).filter(([key]) => key !== 'pharmacy-hub' && key !== 'kpa').flatMap(([, value]) => value.slugKeys))],
];

function storeRetirementIdentityProjection(
  organization: 'om.organization_id' | 'organization_members.organization_id',
  firstParameter: 2 | 3,
): string {
  return `(EXISTS (
             SELECT 1 FROM organization_service_enrollments e
              WHERE e.organization_id = ${organization} AND e.service_code = ANY($${firstParameter}::text[])
           ) OR EXISTS (
             SELECT 1 FROM platform_store_slugs s
              WHERE s.store_id = ${organization} AND s.service_key = ANY($${firstParameter + 1}::text[])
           )) AS retired_store_identity,
          (EXISTS (
             SELECT 1 FROM neture_pharmacy_memberships npm
              WHERE npm.organization_id = ${organization} AND npm.status = 'active'
           ) OR EXISTS (
             SELECT 1 FROM organization_service_enrollments e
              WHERE e.organization_id = ${organization}
                AND e.service_code = ANY($${firstParameter + 2}::text[]) AND e.status = 'active'
           ) OR EXISTS (
             SELECT 1 FROM platform_store_slugs s
              WHERE s.store_id = ${organization}
                AND s.service_key = ANY($${firstParameter + 3}::text[]) AND s.is_active = true
           )) AS current_store_identity`;
}

function isCurrentStoreCandidate(row: StoreRetirementIdentity): boolean {
  return !row.retired_store_identity || row.current_store_identity === true;
}

/**
 * 서비스 조건 없는 매장 조직 후보 raw 행.
 *
 * 기존 관계 후보에서 PH-only 퇴역 조직을 제외한다. 현재 매장 원장/연결이 함께 있으면 유지한다. 별도 함수로 노출해
 * `utils/buyer-organization.resolver.ts` 의 selection-validation 이 같은 SSOT 를 쓰게 한다
 * (WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1).
 */
async function findUnscopedStoreOrganizationRows(
  dataSource: DataSource,
  userId: string,
): Promise<Array<{ organization_id: string; role: string; is_primary: boolean | null; joined_at: string | null }>> {
  const rows = await dataSource.query(
    `SELECT DISTINCT ON (om.organization_id)
            om.organization_id AS organization_id,
            om.role            AS role,
            om.is_primary      AS is_primary,
            om.joined_at       AS joined_at,
            ${storeRetirementIdentityProjection('om.organization_id', 3)}
       FROM organization_members om
      WHERE om.user_id = $1
        AND om.role = ANY($2::text[])
        AND om.left_at IS NULL
      ORDER BY om.organization_id, om.role`,
    [userId, STORE_MEMBER_ROLES, ...RETIREMENT_IDENTITY_PARAMETERS],
  );
  return (rows as StoreRetirementIdentity[]).filter(isCurrentStoreCandidate) as Array<StoreRetirementIdentity & {
    organization_id: string;
    role: string;
    is_primary: boolean | null;
    joined_at: string | null;
  }>;
}

/**
 * 서비스 스코프 없는 매장 조직 후보 목록 (candidate 형상).
 *
 * `STORE_SERVICE_ORG_LINKAGE` 에 매핑이 없는 serviceKey(예: `neture`)의 조직 검증에 쓴다.
 * 허용 집합은 back-compat 경로와 **동일**하다 — 새 축을 만들지 않는다.
 */
export async function findAnyServiceStoreOrganizationCandidates(
  dataSource: DataSource,
  userId: string,
): Promise<StoreOrganizationCandidate[]> {
  const rows = await findUnscopedStoreOrganizationRows(dataSource, userId);
  return rows.map((r) => ({ organizationId: r.organization_id, memberRole: r.role }));
}

/**
 * Store Member(사업자가 허가한 사용자)의 매장 후보.
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1
 *
 * `STORE_MEMBER_ROLES`(owner/admin/manager)를 **넓히지 않는다** — 그 집합은 owner 조직 해석이
 * 쓰는 것이라 값을 더하면 소유 판정까지 같이 넓어진다. Member 는 별도 집합(`'staff'`)으로 본다.
 *
 * 인가는 호출 측이 `role_assignments`(`{prefix}:store_member`)로 확인한다 — 이 함수는
 * **관계 후보만** 돌려준다(Identity V3 §7: Relationship 은 조건, Role 이 권한).
 */
export async function findStoreMemberOrganizationCandidates(
  dataSource: DataSource,
  userId: string,
): Promise<StoreOrganizationCandidate[]> {
  if (!userId) return [];
  const rows = (await dataSource.query(
    `SELECT organization_id, role,
            ${storeRetirementIdentityProjection('organization_members.organization_id', 2)}
       FROM organization_members
      WHERE user_id = $1 AND left_at IS NULL AND role = 'staff'
      ORDER BY is_primary DESC, joined_at ASC, organization_id ASC`,
    [userId, ...RETIREMENT_IDENTITY_PARAMETERS],
  )) as Array<StoreRetirementIdentity & { organization_id: string; role: string }>;
  return rows.filter(isCurrentStoreCandidate).map((r) => ({ organizationId: r.organization_id, memberRole: r.role }));
}

/**
 * 매장 조직 확정.
 *
 * @param serviceKey 지정 시 해당 서비스에 등록된 조직만 후보가 된다.
 *                   미지정 시 현재 관계 후보에서 PH-only 조직은 제외하고 선택은 결정적으로 한다.
 * @param preferredOrganizationId 클라이언트가 고른 매장(`X-Store-Organization-Id`). **선택 힌트일 뿐 권한 근거가
 *                   아니다** — 위 후보 집합 안에 있을 때만 쓰이고, 밖이면 없는 것과 같다.
 */
export async function resolveStoreOrganization(
  dataSource: DataSource,
  userId: string,
  serviceKey?: StoreOwnerServiceKey,
  preferredOrganizationId?: string | null,
): Promise<StoreOrganizationResolution> {
  if (serviceKey) {
    const candidates = await findStoreOrganizationCandidates(dataSource, userId, serviceKey);
    if (candidates.length === 0) return NONE;
    // 선택 매장(CHECK-O4O-URL-FIRST-CENSUS-V1 §21-14): 이미 허용된 후보 안에서만 고른다.
    //   후보 밖 값은 무시하고 기존 규칙(1개 확정 / 2개 이상 ambiguous)을 그대로 따른다 — 허용 집합 불변.
    const preferred = preferredOrganizationId
      ? candidates.find((c) => c.organizationId === preferredOrganizationId)
      : undefined;
    if (preferred) {
      return {
        status: 'resolved',
        organizationId: preferred.organizationId,
        memberRole: preferred.memberRole,
        candidateCount: candidates.length,
      };
    }
    if (candidates.length > 1) {
      logger.warn('[StoreOrgResolver] ambiguous store organization', {
        userId,
        serviceKey,
        candidateCount: candidates.length,
      });
      return {
        status: 'ambiguous',
        organizationId: null,
        memberRole: '',
        candidateCount: candidates.length,
      };
    }
    return {
      status: 'resolved',
      organizationId: candidates[0].organizationId,
      memberRole: candidates[0].memberRole,
      candidateCount: 1,
    };
  }

  // 서비스 미지정: PH-only 퇴역 조직은 후보에서 제외하고 현재 후보의 선택은 결정적으로 한다.
  const list = await findUnscopedStoreOrganizationRows(dataSource, userId);
  if (list.length === 0) return NONE;

  // 선택 매장이 허용 후보 안에 있으면 그것을 쓴다(결정적 정렬보다 우선). 후보 밖 값은 무시.
  const preferredRow = preferredOrganizationId
    ? list.find((r) => r.organization_id === preferredOrganizationId)
    : undefined;
  if (preferredRow) {
    return {
      status: 'resolved',
      organizationId: preferredRow.organization_id,
      memberRole: preferredRow.role,
      candidateCount: list.length,
    };
  }

  const sorted = [...list].sort((a, b) => {
    const pa = a.is_primary === true ? 0 : 1;
    const pb = b.is_primary === true ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const ja = a.joined_at ?? '';
    const jb = b.joined_at ?? '';
    if (ja !== jb) return ja < jb ? -1 : 1;
    return a.organization_id < b.organization_id ? -1 : a.organization_id > b.organization_id ? 1 : 0;
  });

  if (sorted.length > 1) {
    logger.warn('[StoreOrgResolver] multi-org user on serviceKey-less path — deterministic pick', {
      userId,
      candidateCount: sorted.length,
    });
  }

  return {
    status: 'resolved',
    organizationId: sorted[0].organization_id,
    memberRole: sorted[0].role,
    candidateCount: sorted.length,
  };
}

/**
 * 선택 매장 헤더 — CHECK-O4O-URL-FIRST-CENSUS-V1 §21-14
 *
 * 한 서비스에 매장이 2개 이상인 경영자는 409 AMBIGUOUS_STORE_CONNECTION 으로 막혔다. 통합 매장 공간
 * (store.neture.co.kr)은 사용자가 고른 매장을 이 헤더로 보낸다. `X-Organization-Id` 를 쓰지 않는 이유:
 * 그 헤더는 signage 조회 범위(`extractScope`) 등 다른 의미로 이미 쓰이고 있어, 모든 요청에 실으면
 * 기존 화면의 조회 범위가 바뀐다. 이 헤더는 매장 조직 해석에서만 읽는다.
 */
export const STORE_ORGANIZATION_HEADER = 'x-store-organization-id';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readPreferredStoreOrganizationId(
  req: { headers?: Record<string, string | string[] | undefined> } | undefined,
): string | null {
  const raw = req?.headers?.[STORE_ORGANIZATION_HEADER];
  const v = typeof raw === 'string' ? raw.trim() : '';
  return UUID_RE.test(v) ? v.toLowerCase() : null;
}
