import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1
 *
 * 1. product_categories 테이블 생성 (4단계 계층 구조)
 * 2. brands 테이블 생성
 * 3. product_masters 확장 (category_id, brand_id, specification, origin_country, tags)
 * 4. 기존 brandName → brands 데이터 마이그레이션
 */
export class CategoryBrandProductMasterExtension20260307200000 implements MigrationInterface {
  name = 'CategoryBrandProductMasterExtension20260307200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // 1. product_categories 테이블 생성
    // ================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
        depth INT NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_product_categories_slug UNIQUE (slug)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories (parent_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_categories_depth ON product_categories (depth)`);

    // ================================================================
    // 2. brands 테이블 생성
    // ================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        manufacturer_name VARCHAR(255),
        country_of_origin VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_brands_slug UNIQUE (slug)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_brands_name ON brands (name)`);

    // ================================================================
    // 3. product_masters 확장
    // ================================================================
    await queryRunner.query(`
      ALTER TABLE product_masters
        ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS specification TEXT,
        ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100),
        ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_masters_category ON product_masters (category_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_masters_brand ON product_masters (brand_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_masters_tags ON product_masters USING GIN (tags)`);

    // ================================================================
    // 4. 데이터 마이그레이션: brandName → brands 테이블
    // ================================================================
    await queryRunner.query(`
      INSERT INTO brands (name, slug, is_active)
      SELECT DISTINCT
        brand_name,
        LOWER(REGEXP_REPLACE(brand_name, '[^a-zA-Z0-9가-힣]+', '-', 'g')),
        TRUE
      FROM product_masters
      WHERE brand_name IS NOT NULL AND brand_name != ''
      ON CONFLICT (slug) DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE product_masters pm
      SET brand_id = b.id
      FROM brands b
      WHERE pm.brand_name = b.name
        AND pm.brand_name IS NOT NULL
        AND pm.brand_name != ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // product_masters 확장 컬럼 제거
    await queryRunner.query(`ALTER TABLE product_masters DROP COLUMN IF EXISTS category_id`);
    await queryRunner.query(`ALTER TABLE product_masters DROP COLUMN IF EXISTS brand_id`);
    await queryRunner.query(`ALTER TABLE product_masters DROP COLUMN IF EXISTS specification`);
    await queryRunner.query(`ALTER TABLE product_masters DROP COLUMN IF EXISTS origin_country`);
    await queryRunner.query(`ALTER TABLE product_masters DROP COLUMN IF EXISTS tags`);

    // 테이블 제거
    await queryRunner.query(`DROP TABLE IF EXISTS brands CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_categories CASCADE`);
  }
}
