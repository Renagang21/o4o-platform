import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-PRODUCTS-DELTA-REBACKFILL-V1
 *
 * WO-B2(최초 백필) ~ WO-C2(이중 쓰기) 배포 직전까지 발생한
 * glycopharm_products write 갭을 catalog_products / store_products에 한 번 더 보정한다.
 *
 * 정책:
 *  - WO-B2 / WO-C2와 동일한 deterministic UUID(md5) 규칙 사용
 *  - 동일 컬럼 매핑 (regulatory_type='GENERAL', product_master_id=NULL)
 *  - pharmacy_id IS NULL → store skip
 *  - INSERT ... ON CONFLICT (id) DO UPDATE → 누락 row 추가 + 기존 row의 누락 필드 보정
 *  - 단일 SQL 2건 (catalog 1건, store 1건)
 *  - down(): no-op (백필 성격)
 *
 * 멱등: 재실행 안전. ON CONFLICT DO UPDATE이므로 동일 데이터에 대해 결과 동일.
 */
export class RebackfillGlycopharmProductsAfterDualWrite20260409400000
  implements MigrationInterface
{
  name = 'RebackfillGlycopharmProductsAfterDualWrite20260409400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasGlycopharm = await queryRunner.hasTable('glycopharm_products');
    const hasCatalog = await queryRunner.hasTable('catalog_products');
    const hasStore = await queryRunner.hasTable('store_products');
    if (!hasGlycopharm || !hasCatalog || !hasStore) {
      return;
    }

    // ------------------------------------------------------------------
    // catalog_products delta upsert
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
        (gp.status = 'active') AS is_active,
        gp.created_at,
        gp.updated_at
      FROM glycopharm_products gp
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        manufacturer = EXCLUDED.manufacturer,
        origin_country = EXCLUDED.origin_country,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at
    `);

    // ------------------------------------------------------------------
    // store_products delta upsert (pharmacy_id 있는 row만)
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
        updated_at = EXCLUDED.updated_at
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 백필 성격 — 되돌리지 않음.
  }
}
