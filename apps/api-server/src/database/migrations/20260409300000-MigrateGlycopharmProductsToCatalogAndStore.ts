import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-PRODUCTS-TO-CATALOG-AND-STORE-MIGRATION-V1
 *
 * 기존 glycopharm_products 데이터를 catalog_products + store_products 2계층으로
 * 1:1 분기 이관한다.
 *
 * 정책:
 *  - dedup 금지 — 1 row → catalog 1건 + store 1건
 *  - glycopharm_products 테이블/데이터는 그대로 유지 (drop 금지)
 *  - 멱등성: deterministic UUID(md5 기반)로 생성 후 ON CONFLICT (id) DO NOTHING
 *  - product_master_id는 NULL (이번 WO에서 매칭 시도하지 않음)
 *  - 강제 매칭/유사도 매칭 금지
 *
 * 결정 사항 (보고용):
 *  - regulatory_type: 모든 row를 'GENERAL'로 설정
 *      (glycopharm_products.legal_category는 자유 문자열이며, 현 REGULATORY_TYPES enum에
 *       MEDICAL_DEVICE 등이 없음. 카테고리 정의는 본 WO에서 변경하지 않는 원칙에 따라
 *       'GENERAL' fallback 후 후속 WO에서 수동 분류 권장)
 *  - price: DECIMAL → INTEGER 캐스트 (소수점 절삭). sale_price 우선, 없으면 price
 *  - created_by NOT NULL fallback: created_by_user_id → pharmacy_id → '00000000-0000-0000-0000-000000000000'
 *  - pharmacy_id가 NULL인 row는 catalog만 생성, store는 스킵 (store_products.organization_id NOT NULL)
 *
 * 누락 컬럼 (이번 WO에서 매핑하지 않음, 후속 WO 또는 별도 처리 필요):
 *  - subtitle, sku, barcodes(jsonb), images(jsonb), category, status, sort_order
 *  - certification_ids(jsonb), usage_info, caution_info
 *  - created_by_user_name, updated_by_user_name, updated_by_user_id
 *
 * down(): no-op (백필 성격)
 */
export class MigrateGlycopharmProductsToCatalogAndStore20260409300000
  implements MigrationInterface
{
  name = 'MigrateGlycopharmProductsToCatalogAndStore20260409300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 선행 테이블 존재 확인
    const hasGlycopharm = await queryRunner.hasTable('glycopharm_products');
    const hasCatalog = await queryRunner.hasTable('catalog_products');
    const hasStore = await queryRunner.hasTable('store_products');
    if (!hasGlycopharm || !hasCatalog || !hasStore) {
      return;
    }

    // ------------------------------------------------------------------
    // Step 1: glycopharm_products → catalog_products (1:1, 멱등)
    //
    // deterministic UUID:
    //   id = md5('catalog:' || gp.id)을 UUID 포맷으로 변환
    // ON CONFLICT (id) DO NOTHING으로 재실행 시 중복 방지
    // ------------------------------------------------------------------
    await queryRunner.query(`
      INSERT INTO catalog_products (
        id,
        product_master_id,
        name,
        manufacturer,
        origin_country,
        regulatory_type,
        short_description,
        description,
        created_by,
        is_active,
        created_at,
        updated_at
      )
      SELECT
        (
          substring(md5('catalog:' || gp.id::text), 1, 8) || '-' ||
          substring(md5('catalog:' || gp.id::text), 9, 4) || '-' ||
          substring(md5('catalog:' || gp.id::text), 13, 4) || '-' ||
          substring(md5('catalog:' || gp.id::text), 17, 4) || '-' ||
          substring(md5('catalog:' || gp.id::text), 21, 12)
        )::uuid AS id,
        NULL::uuid AS product_master_id,
        gp.name,
        gp.manufacturer,
        gp.origin_country,
        'GENERAL'::varchar AS regulatory_type,
        gp.short_description,
        gp.description,
        COALESCE(gp.created_by_user_id, gp.pharmacy_id, '00000000-0000-0000-0000-000000000000'::uuid) AS created_by,
        true AS is_active,
        gp.created_at,
        gp.updated_at
      FROM glycopharm_products gp
      ON CONFLICT (id) DO NOTHING
    `);

    // ------------------------------------------------------------------
    // Step 2: glycopharm_products → store_products (1:1, 멱등)
    //
    // pharmacy_id IS NULL인 row는 스킵 (store_products.organization_id NOT NULL)
    // catalog_product_id는 Step 1과 동일 deterministic UUID
    // ------------------------------------------------------------------
    await queryRunner.query(`
      INSERT INTO store_products (
        id,
        organization_id,
        catalog_product_id,
        product_master_id,
        name,
        price,
        stock_quantity,
        short_description,
        description,
        is_featured,
        is_partner_recruiting,
        is_active,
        created_by,
        created_at,
        updated_at
      )
      SELECT
        (
          substring(md5('store:' || gp.id::text), 1, 8) || '-' ||
          substring(md5('store:' || gp.id::text), 9, 4) || '-' ||
          substring(md5('store:' || gp.id::text), 13, 4) || '-' ||
          substring(md5('store:' || gp.id::text), 17, 4) || '-' ||
          substring(md5('store:' || gp.id::text), 21, 12)
        )::uuid AS id,
        gp.pharmacy_id AS organization_id,
        (
          substring(md5('catalog:' || gp.id::text), 1, 8) || '-' ||
          substring(md5('catalog:' || gp.id::text), 9, 4) || '-' ||
          substring(md5('catalog:' || gp.id::text), 13, 4) || '-' ||
          substring(md5('catalog:' || gp.id::text), 17, 4) || '-' ||
          substring(md5('catalog:' || gp.id::text), 21, 12)
        )::uuid AS catalog_product_id,
        NULL::uuid AS product_master_id,
        gp.name,
        COALESCE(gp.sale_price, gp.price)::integer AS price,
        gp.stock_quantity,
        gp.short_description,
        gp.description,
        gp.is_featured,
        gp.is_partner_recruiting,
        (gp.status = 'active') AS is_active,
        COALESCE(gp.created_by_user_id, gp.pharmacy_id, '00000000-0000-0000-0000-000000000000'::uuid) AS created_by,
        gp.created_at,
        gp.updated_at
      FROM glycopharm_products gp
      WHERE gp.pharmacy_id IS NOT NULL
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 백필 성격 — 되돌리지 않음.
    // 필요 시 deterministic UUID 패턴으로 catalog_products / store_products에서
    // 본 WO 생성 row를 식별하여 수동 정리할 수 있음.
  }
}
