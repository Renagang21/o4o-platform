/**
 * 약국 조직 ↔ 내 매장 연결 — **Store/Commerce 트랙 계약** (DESIGN §13)
 *
 * 인증 · 가입 트랙(가입 원장 · 승인 orchestration · role 발급)이 호출하는 Store 쪽 진입점이다.
 * 이 파일은 조직 · owner 관계 · 약국 업무 영역 enrollment · 매장 공개 주소(slug)만 다룬다.
 * 가입 상태 · 승인 판정 · role 은 다루지 않는다(그쪽은 인증 · 가입 트랙).
 *
 *   createPharmacyStoreOrganization  신청 시 약국 조직(= 내 매장) 1개 + owner 관계
 *   updatePharmacyStoreProfile       재신청 시 같은 조직의 표시 정보 갱신(약국 1 : 매장 1 유지)
 *   activatePharmacyStore            내 매장(약국) 신청 활성 시 약국 업무 영역(kpa-society enrollment) · slug
 *   deactivatePharmacyStore          정지 · 종료 시 업무 영역 inactive (조직 · 데이터는 남긴다)
 *
 * 매장 접근 판정(isStoreOwner 'kpa')은 원장 `neture_pharmacy_memberships.status='active'` 를 읽는다 —
 * 원장 테이블의 소유는 인증 · 가입 트랙이고, Store 는 읽기만 한다.
 */
import type { DataSource } from 'typeorm';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { organizationOpsService } from '../../organization/services/organization-ops.service.js';
import {
  KPA_CANONICAL_SERVICE_CODE,
  KPA_STORE_SLUG_SERVICE_KEY,
} from '../../../routes/kpa/services/store-identity.constants.js';
import logger from '../../../utils/logger.js';

type Exec = { query: (sql: string, params?: unknown[]) => Promise<any> };

export interface PharmacyStoreProfile {
  pharmacyName: string;
  businessNumber: string;
  address?: string | null;
  phone?: string | null;
}

/** 약국 조직(type='pharmacy') 1개 + 신청자 owner 관계. 트랜잭션 executor 를 받는다. */
export async function createPharmacyStoreOrganization(
  exec: Exec,
  userId: string,
  profile: PharmacyStoreProfile,
): Promise<string> {
  const [org] = await exec.query(
    `INSERT INTO organizations (name, code, type, business_number, address, phone, created_by_user_id, "isActive")
     VALUES ($1, 'neture-pharm-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), 'pharmacy', $2, $3, $4, $5, true)
     RETURNING id`,
    [profile.pharmacyName, profile.businessNumber, profile.address ?? null, profile.phone ?? null, userId],
  );
  await exec.query(
    `INSERT INTO organization_members (organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
     VALUES ($1, $2, 'owner', true, NOW(), NOW(), NOW())
     ON CONFLICT (organization_id, user_id) DO NOTHING`,
    [org.id, userId],
  );
  return org.id as string;
}

export async function updatePharmacyStoreProfile(
  exec: Exec,
  organizationId: string,
  profile: PharmacyStoreProfile,
): Promise<void> {
  await exec.query(
    `UPDATE organizations SET name = $2, business_number = $3,
            address = COALESCE($4, address), phone = COALESCE($5, phone), "updatedAt" = NOW()
      WHERE id = $1`,
    [organizationId, profile.pharmacyName, profile.businessNumber, profile.address ?? null, profile.phone ?? null],
  );
}

/** 약국 업무 영역 연결(세미프랜차이즈 가입이 아니다) + 매장 공개 주소. 멱등. */
export async function activatePharmacyStore(
  dataSource: DataSource,
  input: { organizationId: string; pharmacyName: string },
): Promise<void> {
  const { organizationId, pharmacyName } = input;
  await organizationOpsService.enrollService({ organizationId, serviceCode: KPA_CANONICAL_SERVICE_CODE });
  await dataSource.query(
    `UPDATE organization_service_enrollments SET status = 'active', updated_at = NOW()
      WHERE organization_id = $1 AND service_code = $2 AND status <> 'active'`,
    [organizationId, KPA_CANONICAL_SERVICE_CODE],
  );
  try {
    const slugService = new StoreSlugService(dataSource);
    const existing = await slugService.findByStoreId(organizationId, KPA_STORE_SLUG_SERVICE_KEY);
    if (!existing) {
      const slug = await slugService.generateUniqueSlug(pharmacyName);
      await slugService.reserveSlug({ storeId: organizationId, serviceKey: KPA_STORE_SLUG_SERVICE_KEY, slug });
    }
  } catch (err) {
    // 매장 주소 예약 실패는 비차단(기존 KPA 프로비저닝과 같은 정책).
    logger.warn('[PharmacyStoreLink] store slug reservation failed', {
      organizationId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function deactivatePharmacyStore(dataSource: DataSource, organizationId: string): Promise<void> {
  await dataSource.query(
    `UPDATE organization_service_enrollments SET status = 'inactive', updated_at = NOW()
      WHERE organization_id = $1 AND service_code = $2`,
    [organizationId, KPA_CANONICAL_SERVICE_CODE],
  );
}
