import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-PRODUCT-REGISTRATION-UI-ALIGN-TO-IMPORT-V1
 *
 * Seed initial product categories for Neture.
 * - depth 0: 대분류 (일반상품, 건강기능식품, 의약외품, 화장품)
 * - depth 1: 일부 중분류
 * - is_regulated: 건강기능식품/의약외품 = true
 *
 * Idempotent: slug UNIQUE constraint — ON CONFLICT DO NOTHING.
 */
export class SeedProductCategories20260323700000 implements MigrationInterface {
  name = 'SeedProductCategories20260323700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // depth 0 — 대분류
    await queryRunner.query(`
      INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated)
      VALUES
        (gen_random_uuid(), '일반상품',     'general',           NULL, 0, 1, true, false),
        (gen_random_uuid(), '건강기능식품', 'health-functional', NULL, 0, 2, true, true),
        (gen_random_uuid(), '의약외품',     'quasi-drug',        NULL, 0, 3, true, true),
        (gen_random_uuid(), '화장품',       'cosmetics',         NULL, 0, 4, true, false)
      ON CONFLICT (slug) DO NOTHING
    `);

    // depth 1 — 일반상품 하위
    await queryRunner.query(`
      INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated)
      VALUES
        (gen_random_uuid(), '식품',       'general-food',       (SELECT id FROM product_categories WHERE slug = 'general'), 1, 1, true, false),
        (gen_random_uuid(), '생활용품',   'general-living',     (SELECT id FROM product_categories WHERE slug = 'general'), 1, 2, true, false),
        (gen_random_uuid(), '기타',       'general-etc',        (SELECT id FROM product_categories WHERE slug = 'general'), 1, 3, true, false)
      ON CONFLICT (slug) DO NOTHING
    `);

    // depth 1 — 건강기능식품 하위
    await queryRunner.query(`
      INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated)
      VALUES
        (gen_random_uuid(), '비타민/미네랄', 'hf-vitamin-mineral', (SELECT id FROM product_categories WHERE slug = 'health-functional'), 1, 1, true, true),
        (gen_random_uuid(), '프로바이오틱스', 'hf-probiotics',     (SELECT id FROM product_categories WHERE slug = 'health-functional'), 1, 2, true, true),
        (gen_random_uuid(), '오메가3/지방산', 'hf-omega3',         (SELECT id FROM product_categories WHERE slug = 'health-functional'), 1, 3, true, true),
        (gen_random_uuid(), '홍삼/인삼',     'hf-ginseng',        (SELECT id FROM product_categories WHERE slug = 'health-functional'), 1, 4, true, true)
      ON CONFLICT (slug) DO NOTHING
    `);

    const result = await queryRunner.query(`SELECT COUNT(*)::int as cnt FROM product_categories`);
    console.log(`[Migration] product_categories seeded: ${result[0]?.cnt ?? 0} total rows`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded categories by slug (depth 1 first, then depth 0)
    await queryRunner.query(`
      DELETE FROM product_categories WHERE slug IN (
        'general-food', 'general-living', 'general-etc',
        'hf-vitamin-mineral', 'hf-probiotics', 'hf-omega3', 'hf-ginseng'
      )
    `);
    await queryRunner.query(`
      DELETE FROM product_categories WHERE slug IN (
        'general', 'health-functional', 'quasi-drug', 'cosmetics'
      )
    `);
  }
}
