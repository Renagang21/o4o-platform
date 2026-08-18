/**
 * Auto-Listing Utilities
 *
 * WO-NETURE-TIER1-AUTO-EXPANSION-BETA-V1
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1: product_masters + supplier_product_offers 구조 반영
 *
 * Distribution Security Tier 1 (PUBLIC) + Tier 2 (SERVICE) 자동 확산 유틸리티.
 * PUBLIC Offer 승인 시 / SERVICE Offer 승인 시 / 신규 조직 생성 시 자동 listing 생성.
 *
 * 모든 listing은 is_active=false로 생성 — 판매자가 가격/채널 설정 후 활성화.
 */

import type { DataSource, QueryRunner } from 'typeorm';
import logger from './logger.js';
import { isDrugProductById } from '../modules/neture/guards/drug-access.guard.js';
import { NON_CANONICAL_ENROLLMENT_CODES } from './listing-service-key.js';

/** DataSource 또는 QueryRunner 양쪽에서 query() 실행 가능 */
type QueryExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

/**
 * WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1
 *
 * 자동확산 대상 조직을 **약국 대상 서비스로 제한**하는 SQL 조건.
 * `:masterParam` 이 의약품이 아니면 조건은 항상 참(기존 동작 불변),
 * 의약품이면 `service_audience_policies.is_pharmacy_target_service = true` 인 서비스만 통과한다.
 * 정책 행이 없으면 EXISTS 가 false → 제외 (fail-closed).
 *
 * @param masterParam 마스터 id 를 담은 파라미터 placeholder (예: '$2')
 * @param serviceExpr 대상 service_key SQL 식 (예: 'ose.service_code')
 */
function drugAudienceSqlCondition(masterParam: string, serviceExpr: string): string {
  return `(
      NOT EXISTS (
        SELECT 1 FROM product_masters pm_drug
         WHERE pm_drug.id = ${masterParam}
           AND upper(btrim(pm_drug.regulatory_type)) IN ('DRUG', '의약품')
      )
      OR EXISTS (
        SELECT 1 FROM service_audience_policies sap
         WHERE sap.service_key = ${serviceExpr}
           AND sap.is_pharmacy_target_service = true
      )
    )`;
}

/**
 * 조직 단위 확산(신규 조직 → 기존 PUBLIC/SERVICE offer)에서 사용하는 조건.
 * offer 의 master 가 의약품이면, 그 조직이 진입하는 serviceKey 가 약국 대상일 때만 통과한다.
 *
 * @param masterExpr offer 의 master_id SQL 식 (예: 'spo.master_id')
 * @param serviceParam 대상 serviceKey 파라미터 placeholder (예: '$2')
 */
function drugAudienceSqlConditionForOrg(masterExpr: string, serviceParam: string): string {
  return `(
      NOT EXISTS (
        SELECT 1 FROM product_masters pm_drug
         WHERE pm_drug.id = ${masterExpr}
           AND upper(btrim(pm_drug.regulatory_type)) IN ('DRUG', '의약품')
      )
      OR EXISTS (
        SELECT 1 FROM service_audience_policies sap
         WHERE sap.service_key = ${serviceParam}
           AND sap.is_pharmacy_target_service = true
      )
    )`;
}

/**
 * PUBLIC Offer 승인 시: 모든 활성 조직에 listing 자동 생성.
 *
 * @param executor - DataSource 또는 QueryRunner (트랜잭션 내 실행 시 QueryRunner 사용)
 * @param offerId - 승인된 Offer UUID
 * @param masterId - Offer의 ProductMaster UUID
 * @returns 생성된 listing 수
 */
export async function autoExpandPublicProduct(
  executor: QueryExecutor,
  offerId: string,
  masterId: string,
): Promise<number> {
  try {
    const result = await executor.query(
      `INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id,
         is_active, created_at, updated_at)
       SELECT
         gen_random_uuid(),
         ose.organization_id,
         ose.service_code,
         $2,
         $1,
         false,
         NOW(), NOW()
       FROM organization_service_enrollments ose
       JOIN organizations o ON o.id = ose.organization_id
       WHERE o."isActive" = true
         AND ose.status = 'active'
         -- WO-O4O-KCOS-ENROLLMENT-SERVICE-KEY-CANONICALIZATION-V1:
         --   enrollment.service_code 를 그대로 OPL.service_key 로 복사하므로,
         --   role/product-level 별칭('cosmetics' / 'kpa') 잔재 행은 제외한다.
         --   (canonical 행이 같은 조직에 이미 있어 진열 대상이 줄지 않는다)
         AND NOT (ose.service_code = ANY($3::text[]))
         AND ${drugAudienceSqlCondition('$2', 'ose.service_code')}
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [offerId, masterId, NON_CANONICAL_ENROLLMENT_CODES],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    // WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1: 조용한 skip 금지 — 제한 사실을 기록한다.
    const isDrug = await isDrugProductById(executor, masterId);
    if (isDrug === true) {
      logger.warn(
        `[AutoListing][DRUG] PUBLIC offer ${offerId} (master ${masterId}) 확산을 약국 대상 서비스로 제한했다. 생성된 listing=${count}`,
      );
    } else {
      logger.info(`[AutoListing] Expanded PUBLIC offer ${offerId} to ${count} org listings`);
    }
    return count;
  } catch (error) {
    logger.error(`[AutoListing] Failed to expand PUBLIC offer ${offerId}:`, error);
    throw error;
  }
}

/**
 * SERVICE Offer 승인 시: 승인된 service_key 대상 활성 조직에 listing 자동 생성.
 * WO-NETURE-SERVICE-DISTRIBUTION-AUTO-EXPAND-V1
 *
 * @param executor - DataSource 또는 QueryRunner (트랜잭션 내 실행 시 QueryRunner 사용)
 * @param offerId - 승인된 Offer UUID
 * @param masterId - Offer의 ProductMaster UUID
 * @param approvedServiceKeys - 승인된 service_key 배열 (e.g. ['kpa-society'])
 * @returns 생성된 listing 수
 */
export async function autoExpandServiceProduct(
  executor: QueryExecutor,
  offerId: string,
  masterId: string,
  approvedServiceKeys: string[],
): Promise<number> {
  if (!approvedServiceKeys.length) return 0;
  try {
    const result = await executor.query(
      `INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id,
         is_active, created_at, updated_at)
       SELECT
         gen_random_uuid(),
         ose.organization_id,
         ose.service_code,
         $2,
         $1,
         false,
         NOW(), NOW()
       FROM organization_service_enrollments ose
       JOIN organizations o ON o.id = ose.organization_id
       WHERE o."isActive" = true
         AND ose.status = 'active'
         AND ose.service_code = ANY($3::text[])
         AND ${drugAudienceSqlCondition('$2', 'ose.service_code')}
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [offerId, masterId, approvedServiceKeys],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    // WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1: 조용한 skip 금지.
    const isDrug = await isDrugProductById(executor, masterId);
    if (isDrug === true) {
      logger.warn(
        `[AutoListing][DRUG] SERVICE offer ${offerId} (master ${masterId}) 확산을 약국 대상 서비스로 제한했다. 요청 services=${approvedServiceKeys.join(', ')}, 생성된 listing=${count}`,
      );
    } else {
      logger.info(`[AutoListing] Expanded SERVICE offer ${offerId} to ${count} org listings for services: ${approvedServiceKeys.join(', ')}`);
    }
    return count;
  } catch (error) {
    logger.error(`[AutoListing] Failed to expand SERVICE offer ${offerId}:`, error);
    throw error;
  }
}

/**
 * 신규 조직 생성 시: 모든 APPROVED PUBLIC Offer에 대해 listing 자동 생성.
 *
 * @param dataSource - TypeORM DataSource
 * @param organizationId - 신규 조직 UUID
 * @param serviceKey - 서비스 키 (e.g. 'kpa', 'glycopharm')
 * @returns 생성된 listing 수
 */
export async function autoListPublicProductsForOrg(
  dataSource: DataSource,
  organizationId: string,
  serviceKey: string,
): Promise<number> {
  try {
    const result = await dataSource.query(
      `INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id,
         is_active, created_at, updated_at)
       SELECT
         gen_random_uuid(),
         $1,
         $2,
         spo.master_id,
         spo.id,
         false,
         NOW(), NOW()
       FROM supplier_product_offers spo
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       WHERE spo.is_active = true
         AND spo.approval_status = 'APPROVED'
         AND spo.distribution_type = 'PUBLIC'
         AND s.status = 'ACTIVE'
         AND ${drugAudienceSqlConditionForOrg('spo.master_id', '$2')}
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [organizationId, serviceKey],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    logger.info(`[AutoListing] Listed ${count} PUBLIC offers for org ${organizationId} (${serviceKey}) — 의약품은 약국 대상 서비스에만 포함`);
    return count;
  } catch (error) {
    logger.error(`[AutoListing] Failed to list PUBLIC offers for org ${organizationId}:`, error);
    throw error;
  }
}

/**
 * 신규 조직 생성 시: 해당 서비스에 승인된 SERVICE Offer에 대해 listing 자동 생성.
 * WO-NETURE-SERVICE-OFFER-AUTO-LIST-ON-NEW-ORG-ENROLLMENT-V1
 *
 * @param dataSource - TypeORM DataSource
 * @param organizationId - 신규 조직 UUID
 * @param serviceKey - 서비스 키 (e.g. 'kpa-society', 'glycopharm')
 * @returns 생성된 listing 수
 */
export async function autoListServiceProductsForOrg(
  dataSource: DataSource,
  organizationId: string,
  serviceKey: string,
): Promise<number> {
  try {
    const result = await dataSource.query(
      `INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id,
         is_active, created_at, updated_at)
       SELECT
         gen_random_uuid(),
         $1,
         $2,
         spo.master_id,
         spo.id,
         false,
         NOW(), NOW()
       FROM supplier_product_offers spo
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       JOIN offer_service_approvals osa ON osa.offer_id = spo.id
         AND osa.service_key = $2
         AND osa.approval_status = 'approved'
       WHERE spo.is_active = true
         AND spo.approval_status = 'APPROVED'
         AND spo.distribution_type = 'SERVICE'
         AND s.status = 'ACTIVE'
         AND ${drugAudienceSqlConditionForOrg('spo.master_id', '$2')}
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [organizationId, serviceKey],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    logger.info(`[AutoListing] Listed ${count} SERVICE offers for org ${organizationId} (${serviceKey}) — 의약품은 약국 대상 서비스에만 포함`);
    return count;
  } catch (error) {
    logger.error(`[AutoListing] Failed to list SERVICE offers for org ${organizationId}:`, error);
    throw error;
  }
}
