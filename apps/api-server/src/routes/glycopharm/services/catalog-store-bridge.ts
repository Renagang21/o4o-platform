/**
 * WO-O4O-GLYCOPHARM-WRITE-DUAL-WRITE-SAFETY-BRIDGE-V1
 *
 * GlycoPharm write 이중 쓰기 브리지.
 *
 * 정책:
 *  - WO-B2 마이그레이션과 동일한 deterministic UUID 규칙(md5 기반) 사용
 *  - catalog: 1 row → catalog_products 1건 (regulatory_type='GENERAL', product_master_id=NULL)
 *  - store : pharmacy_id 있는 경우만 store_products 1건 (price decimal→int 절삭)
 *  - 강제/유사도 ProductMaster 매칭 금지
 *  - 본 헬퍼는 read 경로 미관여, write 경로에서만 호출
 *  - 호출자가 EntityManager(트랜잭션) 컨텍스트를 넘기는 것을 전제로 함
 */

import { createHash } from 'crypto';
import type { EntityManager } from 'typeorm';
import type { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';

const SENTINEL_USER_ID = '00000000-0000-0000-0000-000000000000';

function md5UuidFromKey(prefix: 'catalog' | 'store', glycopharmProductId: string): string {
  const hex = createHash('md5').update(`${prefix}:${glycopharmProductId}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** glycopharm_products.id → catalog_products.id (deterministic, WO-B2 migration과 동일) */
export function toCatalogProductId(glycopharmProductId: string): string {
  return md5UuidFromKey('catalog', glycopharmProductId);
}

/** glycopharm_products.id → store_products.id (deterministic, WO-B2 migration과 동일) */
export function toStoreProductId(glycopharmProductId: string): string {
  return md5UuidFromKey('store', glycopharmProductId);
}

/**
 * GlycoPharm write 이후 동일 트랜잭션 안에서 catalog_products + store_products를 upsert.
 *
 * - catalog는 항상 upsert
 * - store는 pharmacy_id가 있을 때만 upsert (store_products.organization_id NOT NULL)
 * - 본 함수는 raw SQL ON CONFLICT DO UPDATE를 사용하여 멱등성을 보장
 */
export async function upsertCatalogAndStoreFromGlycopharm(
  em: EntityManager,
  gp: GlycopharmProduct,
): Promise<void> {
  const catalogId = toCatalogProductId(gp.id);
  const createdBy = gp.created_by_user_id ?? gp.pharmacy_id ?? SENTINEL_USER_ID;
  const isActive = gp.status === 'active';

  // ----- catalog_products upsert -----
  await em.query(
    `INSERT INTO catalog_products (
       id, product_master_id, name, manufacturer, origin_country,
       regulatory_type, short_description, description,
       created_by, is_active, created_at, updated_at
     ) VALUES (
       $1, NULL, $2, $3, $4,
       'GENERAL', $5, $6,
       $7, $8, $9, $10
     )
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       manufacturer = EXCLUDED.manufacturer,
       origin_country = EXCLUDED.origin_country,
       short_description = EXCLUDED.short_description,
       description = EXCLUDED.description,
       is_active = EXCLUDED.is_active,
       updated_at = EXCLUDED.updated_at`,
    [
      catalogId,
      gp.name,
      gp.manufacturer ?? null,
      gp.origin_country ?? null,
      gp.short_description ?? null,
      gp.description ?? null,
      createdBy,
      isActive,
      gp.created_at,
      gp.updated_at,
    ],
  );

  // ----- store_products upsert (pharmacy_id 있을 때만) -----
  if (!gp.pharmacy_id) {
    return;
  }

  const storeId = toStoreProductId(gp.id);
  const rawPrice = gp.sale_price ?? gp.price;
  const price =
    rawPrice === null || rawPrice === undefined ? null : Math.trunc(Number(rawPrice));

  await em.query(
    `INSERT INTO store_products (
       id, organization_id, catalog_product_id, product_master_id,
       name, price, stock_quantity, short_description, description,
       is_featured, is_partner_recruiting, is_active,
       created_by, created_at, updated_at
     ) VALUES (
       $1, $2, $3, NULL,
       $4, $5, $6, $7, $8,
       $9, $10, $11,
       $12, $13, $14
     )
     ON CONFLICT (id) DO UPDATE SET
       organization_id = EXCLUDED.organization_id,
       name = EXCLUDED.name,
       price = EXCLUDED.price,
       stock_quantity = EXCLUDED.stock_quantity,
       short_description = EXCLUDED.short_description,
       description = EXCLUDED.description,
       is_featured = EXCLUDED.is_featured,
       is_partner_recruiting = EXCLUDED.is_partner_recruiting,
       is_active = EXCLUDED.is_active,
       updated_at = EXCLUDED.updated_at`,
    [
      storeId,
      gp.pharmacy_id,
      catalogId,
      gp.name,
      price,
      gp.stock_quantity,
      gp.short_description ?? null,
      gp.description ?? null,
      gp.is_featured,
      gp.is_partner_recruiting,
      isActive,
      createdBy,
      gp.created_at,
      gp.updated_at,
    ],
  );
}
