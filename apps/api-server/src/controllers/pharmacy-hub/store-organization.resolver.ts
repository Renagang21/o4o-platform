/**
 * Pharmacy-Hub 매장 조직 해석기 (서버 전용 SSOT)
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1
 *   (규칙 자체는 WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1 에서 확정된 것과 동일하다)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 파일이 존재하는가
 *
 *   홈 요약(GET /store-owner/dashboard)과 매장 정보 조회·수정(GET·PATCH
 *   /store-owner/info)이 **서로 다른 조직을 고르는 일이 절대 없어야** 한다.
 *   조회와 수정이 같은 해석기를 쓰지 않으면 "보이는 매장"과 "저장되는 매장"이
 *   갈라질 수 있으므로, 해석 규칙을 한 곳에 두고 모든 경로가 이것만 사용한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 해석 규칙 (확정 정책 — 임시 편법 아님)
 *
 *   로그인 사용자
 *   → organization_members 활성 매장 역할(owner/admin/manager, left_at IS NULL) 후보
 *   → organization_service_enrollments
 *        (service_code='pharmacy-hub' AND status='active') 로 한정
 *   → 정확히 1개  : 해당 organizations 사용            (status='connected')
 *   → 0개         : "매장 정보 미연결"                  (status='not_connected')
 *   → 2개 이상    : 임의 선택 금지, 명시적 오류         (status='ambiguous',
 *                                                      code='AMBIGUOUS_STORE_CONNECTION')
 *
 *   폴백 금지 대상 (하나라도 매장으로 대신 쓰지 않는다):
 *     K-Cosmetics 조직 · KPA 약국 조직 · Neture 공급자 조직 ·
 *     users.businessInfo · 일반 organization_members LIMIT 1
 *
 *   **클라이언트가 보낸 organizationId 는 어떤 경우에도 신뢰하지 않는다.**
 *   조직은 항상 인증 사용자 + 위 enrollment 로 서버가 다시 결정한다.
 *
 *   왜 공통 resolveStoreAccess()/isStoreOwner() 를 쓰지 않는가:
 *     (해소됨) WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1 에서
 *     공통 해석기도 같은 규칙(서비스 스코프 + ambiguous 차단)으로 정비했다.
 *     이 파일은 매장 정보 화면이 필요로 하는 organizations 원본 행까지 함께 반환하므로
 *     계속 유지한다 — 규칙은 공통 해석기와 동일하고, 매장 역할 집합은 공통 SSOT 를 쓴다.
 */
import { AppDataSource } from '../../database/connection.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { STORE_MEMBER_ROLES } from '../../utils/store-organization.resolver.js';

export { STORE_MEMBER_ROLES };

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

/** 구조화 주소 (organizations.address_detail) */
export interface StoreAddressDetail {
  zipCode?: string;
  baseAddress?: string;
  detailAddress?: string;
  region?: string;
}

/** 해석된 매장 조직 원본 행 — organizations 가 매장 정보의 SSOT 이다. */
export interface StoreOrgRow {
  id: string;
  name: string | null;
  code: string | null;
  address: string | null;
  addressDetail: StoreAddressDetail | null;
  phone: string | null;
  businessNumber: string | null;
  description: string | null;
  isActive: boolean;
  /** 공개 매장 주소 (platform_store_slugs) — 없으면 null */
  slug: string | null;
  slugActive: boolean | null;
  /** 서비스 연결 (organization_service_enrollments) */
  enrollmentStatus: string;
  enrolledAt: string | null;
  updatedAt: string | null;
}

export type StoreOrgResolution =
  | { status: 'not_connected'; organizationId: null; org: null; candidateCount: 0 }
  | {
      status: 'ambiguous';
      organizationId: null;
      org: null;
      candidateCount: number;
      errorCode: 'AMBIGUOUS_STORE_CONNECTION';
    }
  | { status: 'connected'; organizationId: string; org: StoreOrgRow; candidateCount: 1 };

/**
 * 인증 사용자로부터 Pharmacy-Hub 매장 조직을 결정한다.
 * 후보가 0개거나 2개 이상이면 **어떤 조직도 반환하지 않는다** (임의 선택 없음).
 */
export async function resolvePharmacyHubStoreOrganization(
  userId: string,
): Promise<StoreOrgResolution> {
  const rows: any[] = await AppDataSource.query(
    `SELECT o.id::text                 AS id,
            o.name,
            o.code,
            o.address,
            o.address_detail           AS "addressDetail",
            o.phone,
            o.business_number          AS "businessNumber",
            o.description,
            o."isActive"               AS "isActive",
            o."updatedAt"              AS "updatedAt",
            e.status                   AS "enrollmentStatus",
            e.enrolled_at              AS "enrolledAt",
            (SELECT s.slug FROM platform_store_slugs s
              WHERE s.store_id = o.id AND s.service_key = $3
              LIMIT 1)                 AS slug,
            (SELECT s.is_active FROM platform_store_slugs s
              WHERE s.store_id = o.id AND s.service_key = $3
              LIMIT 1)                 AS "slugActive"
       FROM organization_members om
       JOIN organizations o
         ON o.id = om.organization_id
       JOIN organization_service_enrollments e
         ON e.organization_id = o.id
        AND e.service_code = $3
        AND e.status = 'active'
      WHERE om.user_id = $1::uuid
        AND om.role = ANY($2::text[])
        AND om.left_at IS NULL
      ORDER BY o.id`,
    [userId, STORE_MEMBER_ROLES, SERVICE_KEY],
  );

  if (rows.length === 0) {
    return { status: 'not_connected', organizationId: null, org: null, candidateCount: 0 };
  }
  if (rows.length > 1) {
    // 2개 이상은 사람이 판단할 대상이다. 이름을 하나 골라 보여주거나 저장하지 않는다.
    return {
      status: 'ambiguous',
      organizationId: null,
      org: null,
      candidateCount: rows.length,
      errorCode: 'AMBIGUOUS_STORE_CONNECTION',
    };
  }

  const r = rows[0];
  return {
    status: 'connected',
    organizationId: r.id,
    candidateCount: 1,
    org: {
      id: r.id,
      name: r.name ?? null,
      code: r.code ?? null,
      address: r.address ?? null,
      addressDetail: (r.addressDetail as StoreAddressDetail | null) ?? null,
      phone: r.phone ?? null,
      businessNumber: r.businessNumber ?? null,
      description: r.description ?? null,
      isActive: r.isActive === true,
      slug: r.slug ?? null,
      slugActive: r.slugActive === null || r.slugActive === undefined ? null : r.slugActive === true,
      enrollmentStatus: r.enrollmentStatus,
      enrolledAt: r.enrolledAt ?? null,
      updatedAt: r.updatedAt ?? null,
    },
  };
}
