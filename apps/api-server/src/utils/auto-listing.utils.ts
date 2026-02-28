/**
 * Auto-Listing Utilities
 *
 * WO-NETURE-TIER1-AUTO-EXPANSION-BETA-V1
 *
 * Distribution Security Tier 1 (PUBLIC) 자동 확산 유틸리티.
 * PUBLIC 상품 승인 시 / 신규 조직 생성 시 자동 listing 생성.
 *
 * 모든 listing은 is_active=false로 생성 — 판매자가 가격/채널 설정 후 활성화.
 */

import type { DataSource, QueryRunner } from 'typeorm';
import logger from './logger.js';

/** DataSource 또는 QueryRunner 양쪽에서 query() 실행 가능 */
type QueryExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

/**
 * PUBLIC 상품 승인 시: 모든 활성 조직에 listing 자동 생성.
 *
 * @param executor - DataSource 또는 QueryRunner (트랜잭션 내 실행 시 QueryRunner 사용)
 * @param productId - 승인된 상품 UUID
 * @param productName - 상품명 (listing에 denormalize)
 * @returns 생성된 listing 수
 */
export async function autoExpandPublicProduct(
  executor: QueryExecutor,
  productId: string,
  productName: string,
): Promise<number> {
  try {
    const result = await executor.query(
      `INSERT INTO organization_product_listings
        (id, organization_id, service_key, product_name, product_metadata,
         product_id, is_active, display_order, created_at, updated_at)
       SELECT
         gen_random_uuid(),
         ose.organization_id,
         ose.service_code,
         $2,
         '{}'::jsonb,
         $1,
         false,
         0,
         NOW(), NOW()
       FROM organization_service_enrollments ose
       JOIN organizations o ON o.id = ose.organization_id
       WHERE o."isActive" = true
         AND ose.status = 'active'
       ON CONFLICT (organization_id, service_key, product_id) DO NOTHING`,
      [productId, productName],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    logger.info(`[AutoListing] Expanded PUBLIC product ${productId} to ${count} org listings`);
    return count;
  } catch (error) {
    logger.error(`[AutoListing] Failed to expand PUBLIC product ${productId}:`, error);
    throw error;
  }
}

/**
 * 신규 조직 생성 시: 모든 APPROVED PUBLIC 상품에 대해 listing 자동 생성.
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
        (id, organization_id, service_key, product_name, product_metadata,
         product_id, is_active, display_order, created_at, updated_at)
       SELECT
         gen_random_uuid(),
         $1,
         $2,
         sp.name,
         '{}'::jsonb,
         sp.id,
         false,
         0,
         NOW(), NOW()
       FROM neture_supplier_products sp
       JOIN neture_suppliers s ON s.id = sp.supplier_id
       WHERE sp.is_active = true
         AND sp.approval_status = 'APPROVED'
         AND sp.distribution_type = 'PUBLIC'
         AND s.status = 'ACTIVE'
       ON CONFLICT (organization_id, service_key, product_id) DO NOTHING`,
      [organizationId, serviceKey],
    );

    const count = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    logger.info(`[AutoListing] Listed ${count} PUBLIC products for org ${organizationId} (${serviceKey})`);
    return count;
  } catch (error) {
    logger.error(`[AutoListing] Failed to list PUBLIC products for org ${organizationId}:`, error);
    throw error;
  }
}
