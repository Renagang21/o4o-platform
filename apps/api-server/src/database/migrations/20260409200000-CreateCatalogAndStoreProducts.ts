import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-CATALOG-AND-STORE-PRODUCT-SCHEMA-IMPLEMENTATION-V1
 *
 * 매장 공용 상품 구조 도입:
 *   - catalog_products: 매장들이 공유하는 공용 상품 풀
 *   - store_products  : 매장별 독립 상품 (Catalog에서 application layer copy)
 *
 * 정책:
 *   - ProductMaster 연결은 optional (느슨한 매칭, SET NULL)
 *   - StoreProduct → CatalogProduct는 RESTRICT (원본 보호)
 *   - (organization_id, catalog_product_id) UNIQUE
 *   - 본 마이그레이션은 신규 테이블 생성만. 기존 데이터/테이블 영향 없음.
 *
 * 제외:
 *   - glycopharm_products 변경/이관 없음 (별도 후속 WO-B2)
 *   - SupplierProductOffer 변경 없음
 */
export class CreateCatalogAndStoreProducts20260409200000 implements MigrationInterface {
  name = 'CreateCatalogAndStoreProducts20260409200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ----------------------------------------------------------------------
    // catalog_products
    // ----------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS catalog_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_master_id UUID NULL,
        name VARCHAR(255) NOT NULL,
        manufacturer VARCHAR(255) NULL,
        origin_country VARCHAR(100) NULL,
        regulatory_type VARCHAR(50) NOT NULL,
        short_description TEXT NULL,
        description TEXT NULL,
        created_by UUID NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_catalog_product_master_id
      ON catalog_products (product_master_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_catalog_regulatory_type
      ON catalog_products (regulatory_type)
    `);

    // FK to product_masters (optional, SET NULL on master delete)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_masters')
           AND NOT EXISTS (
             SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'fk_catalog_product_master'
           )
        THEN
          ALTER TABLE catalog_products
          ADD CONSTRAINT fk_catalog_product_master
          FOREIGN KEY (product_master_id)
          REFERENCES product_masters(id)
          ON DELETE SET NULL;
        END IF;
      END
      $$
    `);

    // ----------------------------------------------------------------------
    // store_products
    // ----------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        catalog_product_id UUID NOT NULL,
        product_master_id UUID NULL,
        name VARCHAR(255) NOT NULL,
        price INTEGER NULL,
        stock_quantity INTEGER NULL,
        short_description TEXT NULL,
        description TEXT NULL,
        is_featured BOOLEAN NOT NULL DEFAULT false,
        is_partner_recruiting BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_product_org
      ON store_products (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_product_catalog_id
      ON store_products (catalog_product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_product_master_id
      ON store_products (product_master_id)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'uq_store_product_org_catalog'
        ) THEN
          ALTER TABLE store_products
          ADD CONSTRAINT uq_store_product_org_catalog
          UNIQUE (organization_id, catalog_product_id);
        END IF;
      END
      $$
    `);

    // FK store_products → catalog_products (RESTRICT, 원본 보호)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_store_product_catalog'
        ) THEN
          ALTER TABLE store_products
          ADD CONSTRAINT fk_store_product_catalog
          FOREIGN KEY (catalog_product_id)
          REFERENCES catalog_products(id)
          ON DELETE RESTRICT;
        END IF;
      END
      $$
    `);

    // FK store_products → product_masters (optional, SET NULL)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_masters')
           AND NOT EXISTS (
             SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'fk_store_product_master'
           )
        THEN
          ALTER TABLE store_products
          ADD CONSTRAINT fk_store_product_master
          FOREIGN KEY (product_master_id)
          REFERENCES product_masters(id)
          ON DELETE SET NULL;
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS store_products DROP CONSTRAINT IF EXISTS fk_store_product_master`);
    await queryRunner.query(`ALTER TABLE IF EXISTS store_products DROP CONSTRAINT IF EXISTS fk_store_product_catalog`);
    await queryRunner.query(`ALTER TABLE IF EXISTS store_products DROP CONSTRAINT IF EXISTS uq_store_product_org_catalog`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_store_product_master_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_store_product_catalog_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_store_product_org`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_products`);

    await queryRunner.query(`ALTER TABLE IF EXISTS catalog_products DROP CONSTRAINT IF EXISTS fk_catalog_product_master`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_catalog_regulatory_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_catalog_product_master_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS catalog_products`);
  }
}
