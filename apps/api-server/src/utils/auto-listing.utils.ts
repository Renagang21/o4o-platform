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

/** DataSource 또는 QueryRunner 양쪽에서 query() 실행 가능 */
type QueryExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

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
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [offerId, masterId],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    logger.info(`[AutoListing] Expanded PUBLIC offer ${offerId} to ${count} org listings`);
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
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [offerId, masterId, approvedServiceKeys],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    logger.info(`[AutoListing] Expanded SERVICE offer ${offerId} to ${count} org listings for services: ${approvedServiceKeys.join(', ')}`);
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
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [organizationId, serviceKey],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    logger.info(`[AutoListing] Listed ${count} PUBLIC offers for org ${organizationId} (${serviceKey})`);
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
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [organizationId, serviceKey],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    logger.info(`[AutoListing] Listed ${count} SERVICE offers for org ${organizationId} (${serviceKey})`);
    return count;
  } catch (error) {
    logger.error(`[AutoListing] Failed to list SERVICE offers for org ${organizationId}:`, error);
    throw error;
  }
}
