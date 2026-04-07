import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-TEST-PRODUCT-EMPTY-FIELD-BACKFILL-V1
 *
 * 현재 등록된 모든 Neture 상품(테스트용)의 비어있는 필드만 기본값으로 보정.
 * 이미 값이 있는 필드는 절대 변경하지 않는다.
 *
 * 보정 대상:
 * 1. category_id NULL → '미분류' 카테고리
 * 2. stock_quantity = 0 → 100
 * 3. price_general = 0 → 1000
 * 4. is_public = false AND serviceKeys=[] AND allowedSellerIds=[] → is_public=true (전체공개)
 * 5. consumer_short_description NULL/'' → 템플릿
 * 6. consumer_detail_description NULL/'' → 템플릿
 * 7. tags 빈 배열 → ['테스트상품', '미분류']
 *
 * 안전 원칙:
 * - 이미 채워진 값은 절대 덮어쓰지 않음
 * - distribution_type은 is_public + serviceKeys 기준으로 자동 동기화
 */
export class BackfillTestProductsEmptyFields20260406300000 implements MigrationInterface {
  name = 'BackfillTestProductsEmptyFields20260406300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Step 1: '미분류' 카테고리 확보 ───
    let uncategorizedId: string | null = null;
    const existingCat = await queryRunner.query(
      `SELECT id FROM product_categories WHERE slug = 'uncategorized' LIMIT 1`,
    );
    if (existingCat.length > 0) {
      uncategorizedId = existingCat[0].id;
    } else {
      const inserted = await queryRunner.query(
        `INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated, created_at, updated_at)
         VALUES (gen_random_uuid(), '미분류', 'uncategorized', NULL, 0, 9999, true, false, NOW(), NOW())
         RETURNING id`,
      );
      uncategorizedId = inserted[0]?.id;
    }
    if (!uncategorizedId) {
      console.warn('[BackfillTestProducts] 미분류 카테고리 확보 실패, 카테고리 보정 건너뜀');
    }

    // ─── Step 2: ProductMaster.category_id 보정 ───
    if (uncategorizedId) {
      await queryRunner.query(
        `UPDATE product_masters
         SET category_id = $1, updated_at = NOW()
         WHERE category_id IS NULL`,
        [uncategorizedId],
      );
    }

    // ─── Step 3: ProductMaster.tags 보정 (빈 배열만) ───
    await queryRunner.query(
      `UPDATE product_masters
       SET tags = '["테스트상품", "미분류"]'::jsonb, updated_at = NOW()
       WHERE tags IS NULL OR tags = '[]'::jsonb OR jsonb_array_length(tags) = 0`,
    );

    // ─── Step 4: SupplierProductOffer 필드 보정 ───
    // 4-1. stock_quantity 0 → 100
    await queryRunner.query(
      `UPDATE supplier_product_offers
       SET stock_quantity = 100, updated_at = NOW()
       WHERE stock_quantity IS NULL OR stock_quantity = 0`,
    );

    // 4-2. price_general 0 → 1000
    await queryRunner.query(
      `UPDATE supplier_product_offers
       SET price_general = 1000, updated_at = NOW()
       WHERE price_general IS NULL OR price_general = 0`,
    );

    // 4-3. consumer_short_description NULL/'' → 템플릿
    // 상품명 기준 — supplier_product_offers는 master_id로 조인 필요
    await queryRunner.query(
      `UPDATE supplier_product_offers spo
       SET consumer_short_description = '<p>' || COALESCE(pm.marketing_name, pm.regulatory_name, '테스트 상품') || ' (테스트용)</p>',
           updated_at = NOW()
       FROM product_masters pm
       WHERE spo.master_id = pm.id
         AND (spo.consumer_short_description IS NULL OR spo.consumer_short_description = '')`,
    );

    // 4-4. consumer_detail_description NULL/'' → 공통 템플릿
    await queryRunner.query(
      `UPDATE supplier_product_offers spo
       SET consumer_detail_description = '<h3>' || COALESCE(pm.marketing_name, pm.regulatory_name, '테스트 상품') || '</h3><p>본 상품은 테스트 목적으로 등록된 상품입니다.</p><p>실제 운영 데이터가 아니며, 테스트용 기본 설명이 자동 입력되었습니다.</p>',
           updated_at = NOW()
       FROM product_masters pm
       WHERE spo.master_id = pm.id
         AND (spo.consumer_detail_description IS NULL OR spo.consumer_detail_description = '')`,
    );

    // 4-5. is_public 보정 (정책 미설정 상태만 → 전체공개)
    // 조건: is_public=false AND serviceKeys 비어있음 AND allowedSellerIds 비어있음
    await queryRunner.query(
      `UPDATE supplier_product_offers
       SET is_public = true,
           distribution_type = 'PUBLIC',
           updated_at = NOW()
       WHERE is_public = false
         AND (service_keys IS NULL OR service_keys = '{}'::text[] OR array_length(service_keys, 1) IS NULL)
         AND (allowed_seller_ids IS NULL OR allowed_seller_ids = '{}'::text[] OR array_length(allowed_seller_ids, 1) IS NULL)`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 되돌리지 않음 — 테스트 데이터 보정 작업
  }
}
