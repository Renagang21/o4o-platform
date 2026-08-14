/**
 * KPA 매장 조직 canonical provisioning
 *
 * WO-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 파일이 존재하는가
 *
 *   KPA 는 매장 조직을 만들 때 organizations / organization_members /
 *   role_assignments / platform_store_slugs 는 기록했지만
 *   **organization_service_enrollments 는 한 번도 기록하지 않았다**
 *   (프로덕션 실측: KPA enrollment row 0건).
 *   그 결과 "이 조직이 KPA 서비스에 연결되어 있다"는 canonical 근거가 없어
 *   서비스 스코프 판정이 slug 테이블에 의존해야 했다.
 *
 *   계약 (WO §2):
 *     organization_service_enrollments = organization ↔ O4O 서비스 canonical 연결
 *     platform_store_slugs             = 매장 URL/slug 식별 (authorization SSOT 아님)
 *
 *   승인 경로가 2개(회원 승인 PATCH /:id/status, 운영자 회원정보 수정 PATCH /:id)라
 *   각각을 patch 하지 않고 이 helper 한 곳으로 수렴시킨다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 멱등성
 *   전 단계가 멱등이다. 동일 (organization, service) 재호출 시 중복 INSERT 0.
 *     organizations                     ON CONFLICT (code)
 *     organization_members              ON CONFLICT (organization_id, user_id)
 *     organization_service_enrollments  ON CONFLICT (organization_id, service_code)
 *     role_assignments                  role-assignment.service 멱등 upsert
 *     platform_store_slugs              findByStoreId 선조회 후 없을 때만 예약
 */
import type { DataSource } from 'typeorm';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { organizationOpsService } from '../../../modules/organization/services/organization-ops.service.js';
import { roleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';

/** KPA 매장 slug 의 service_key (platform_store_slugs — product-level 키) */
export const KPA_STORE_SLUG_SERVICE_KEY = 'kpa';

/**
 * KPA canonical service code (organization_service_enrollments.service_code).
 * 로컬 매핑을 새로 만들지 않는다 — role prefix → canonical service key 는 security-core 가 SSOT.
 */
export const KPA_CANONICAL_SERVICE_CODE = resolveCanonicalServiceKey('kpa'); // 'kpa-society'

export interface EnsureKpaStoreOrganizationInput {
  dataSource: DataSource;
  /** 약국명 — organizations.name / slug 생성 원본 */
  pharmacyName: string;
  /** 사업자번호 숫자만 — organizations.code = kpa-pharm-{digits} */
  businessNumberDigits: string;
  /** 매장 소유자 user id */
  userId: string;
  /** role_assignments.assigned_by */
  assignedBy?: string;
}

export interface EnsureKpaStoreOrganizationResult {
  organizationId: string;
  created: boolean;
  /** slug 예약 실패는 비차단 — 실패 사유를 호출 측이 로그/warning 으로 쓸 수 있게 반환 */
  slugError: string | null;
}

/**
 * KPA 매장 조직을 canonical 상태로 보장한다.
 *
 *   1) organizations(type='pharmacy', code=kpa-pharm-{bizno})
 *   2) kpa_members.organization_id 보정 (NULL 인 경우에만 — 분회 연결 보호)
 *   3) organization_members(role='owner')
 *   4) role_assignments('kpa:store_owner')
 *   5) organization_service_enrollments(service_code=KPA canonical, status='active')  ← 본 WO 추가
 *   6) platform_store_slugs(service_key='kpa')  — 비차단
 *
 * 조직 연락처·주소 동기화는 경로마다 소스가 달라 여기서 하지 않는다 (호출 측 책임).
 */
export async function ensureKpaStoreOrganization(
  input: EnsureKpaStoreOrganizationInput,
): Promise<EnsureKpaStoreOrganizationResult> {
  const { dataSource, pharmacyName, businessNumberDigits, userId, assignedBy } = input;

  // 1) organizations — 멱등 (code 충돌 시 동일 row 반환)
  const orgResult = await organizationOpsService.ensureOrganization({
    name: pharmacyName,
    code: `kpa-pharm-${businessNumberDigits}`,
    type: 'pharmacy',
    createdByUserId: userId,
  });

  // 2) kpa_members.organization_id — NULL 인 경우에만 (분회 연결 보호)
  await dataSource.query(
    `UPDATE kpa_members SET organization_id = $1, updated_at = NOW()
      WHERE user_id = $2 AND organization_id IS NULL`,
    [orgResult.id, userId],
  );

  // 3) organization_members(owner) — 멱등
  await organizationOpsService.addMember({
    organizationId: orgResult.id,
    userId,
    role: 'owner',
    isPrimary: false,
  });

  // 4) role_assignments(kpa:store_owner) — RBAC F9 SSOT
  await roleAssignmentService.assignRole({
    userId,
    role: 'kpa:store_owner',
    assignedBy,
  });

  // 5) organization_service_enrollments — canonical service 연결 (멱등)
  await organizationOpsService.enrollService({
    organizationId: orgResult.id,
    serviceCode: KPA_CANONICAL_SERVICE_CODE,
  });

  // 6) platform_store_slugs — 매장 URL. 비차단(기존 계약 유지) + 멱등.
  let slugError: string | null = null;
  try {
    const slugService = new StoreSlugService(dataSource);
    const existing = await slugService.findByStoreId(orgResult.id, KPA_STORE_SLUG_SERVICE_KEY);
    if (!existing) {
      const slug = await slugService.generateUniqueSlug(pharmacyName);
      await slugService.reserveSlug({
        storeId: orgResult.id,
        serviceKey: KPA_STORE_SLUG_SERVICE_KEY,
        slug,
      });
    }
  } catch (error) {
    slugError = error instanceof Error ? error.message : String(error);
  }

  return { organizationId: orgResult.id, created: orgResult.created, slugError };
}
