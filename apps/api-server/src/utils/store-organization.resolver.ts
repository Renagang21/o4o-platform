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
 *         — K-Cosmetics / Pharmacy-Hub / Neture / GlycoPharm 프로비저닝 경로가 기록
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
export type StoreOwnerServiceKey = 'kpa' | 'glycopharm' | 'cosmetics' | 'pharmacy-hub';

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
  glycopharm: { enrollmentCodes: ['glycopharm'], slugKeys: ['glycopharm'] },
  cosmetics: { enrollmentCodes: ['k-cosmetics', 'cosmetics'], slugKeys: ['k-cosmetics', 'cosmetics'] },
  'pharmacy-hub': { enrollmentCodes: ['pharmacy-hub'], slugKeys: ['pharmacy-hub'] },
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

/**
 * 서비스 조건 없는 매장 조직 후보 raw 행.
 *
 * 기존 back-compat 경로가 쓰던 쿼리 그대로다(허용 집합 불변). 별도 함수로 노출해
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
            om.joined_at       AS joined_at
       FROM organization_members om
      WHERE om.user_id = $1
        AND om.role = ANY($2::text[])
        AND om.left_at IS NULL
      ORDER BY om.organization_id, om.role`,
    [userId, STORE_MEMBER_ROLES],
  );
  return rows as Array<{
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
 * 매장 조직 확정.
 *
 * @param serviceKey 지정 시 해당 서비스에 등록된 조직만 후보가 된다.
 *                   미지정 시 back-compat — 허용 집합은 기존과 동일하되 선택이 결정적이다.
 */
export async function resolveStoreOrganization(
  dataSource: DataSource,
  userId: string,
  serviceKey?: StoreOwnerServiceKey,
): Promise<StoreOrganizationResolution> {
  if (serviceKey) {
    const candidates = await findStoreOrganizationCandidates(dataSource, userId, serviceKey);
    if (candidates.length === 0) return NONE;
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

  // back-compat: 서비스 조건 없음. 허용 집합 불변 + 선택만 결정적.
  const list = await findUnscopedStoreOrganizationRows(dataSource, userId);
  if (list.length === 0) return NONE;

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
