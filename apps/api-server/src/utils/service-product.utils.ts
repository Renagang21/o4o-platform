/**
 * Service Product Query Utilities
 *
 * WO-O4O-SERVICE-PRODUCT-LAYER-PREP-V1
 *
 * service_products 레이어 조회 유틸리티.
 * 테이블에 데이터가 없으면 supplier_product_offers 직접 조회로 fallback.
 *
 * 기존 코드 변경 없이 미래 마이그레이션을 위한 준비 헬퍼.
 */

import type { DataSource } from 'typeorm';
import logger from './logger.js';

export interface ServiceProductRow {
  id: string;
  service_key: string;
  master_id: string;
  offer_id: string;
  status: string;
  visibility: string;
}

export interface GetServiceProductsOptions {
  status?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
}

/**
 * 서비스별 제품 목록 조회.
 *
 * service_products 테이블에 데이터가 있으면 해당 테이블에서 조회.
 * 없으면 supplier_product_offers에서 직접 조회 (현재 호환 fallback).
 *
 * @param dataSource - TypeORM DataSource
 * @param serviceKey - 서비스 키 (e.g. 'kpa', 'glycopharm')
 * @param options - 필터 옵션
 */
export async function getServiceProducts(
  dataSource: DataSource,
  serviceKey: string,
  options: GetServiceProductsOptions = {},
): Promise<ServiceProductRow[]> {
  const { status = 'active', visibility = 'visible', limit = 100, offset = 0 } = options;

  try {
    // service_products 테이블에서 먼저 조회
    const rows: ServiceProductRow[] = await dataSource.query(
      `SELECT id, service_key, master_id, offer_id, status, visibility
       FROM service_products
       WHERE service_key = $1
         AND status = $2
         AND visibility = $3
       ORDER BY created_at DESC
       LIMIT $4 OFFSET $5`,
      [serviceKey, status, visibility, limit, offset],
    );

    if (rows.length > 0) {
      return rows;
    }

    // Fallback: supplier_product_offers 직접 조회 (현재 호환)
    logger.debug(`[ServiceProduct] No service_products for ${serviceKey}, falling back to offers`);

    const fallbackRows: ServiceProductRow[] = await dataSource.query(
      `SELECT
         spo.id AS id,
         $1 AS service_key,
         spo.master_id,
         spo.id AS offer_id,
         'active' AS status,
         'visible' AS visibility
       FROM supplier_product_offers spo
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       WHERE spo.is_active = true
         AND spo.approval_status = 'APPROVED'
         AND s.status = 'ACTIVE'
       ORDER BY spo.created_at DESC
       LIMIT $2 OFFSET $3`,
      [serviceKey, limit, offset],
    );

    return fallbackRows;
  } catch (error) {
    logger.error(`[ServiceProduct] Failed to get service products for ${serviceKey}:`, error);
    throw error;
  }
}
