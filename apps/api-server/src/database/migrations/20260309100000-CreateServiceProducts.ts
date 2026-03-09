import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SERVICE-PRODUCT-LAYER-PREP-V1
 *
 * 1. service_products 테이블 생성 (서비스별 제품 정책 레이어)
 * 2. organization_product_listings에 service_product_id 컬럼 추가 (nullable, 미래 FK)
 *
 * 기존 동작 무변경. 준비 레이어만 추가.
 */
export class CreateServiceProducts1709309100000 implements MigrationInterface {
  name = 'CreateServiceProducts20260309100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. service_products 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key VARCHAR(50) NOT NULL,
        master_id UUID NOT NULL REFERENCES product_masters(id),
        offer_id UUID NOT NULL REFERENCES supplier_product_offers(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        visibility VARCHAR(20) NOT NULL DEFAULT 'visible',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Unique: (service_key, offer_id)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_service_products_service_offer"
        ON service_products (service_key, offer_id)
    `);

    // Index: (service_key, status)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_service_products_service_status"
        ON service_products (service_key, status)
    `);

    // Index: (offer_id)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_service_products_offer"
        ON service_products (offer_id)
    `);

    // 2. organization_product_listings에 service_product_id 추가 (nullable)
    const colExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organization_product_listings'
        AND column_name = 'service_product_id'
    `);

    if (!colExists || colExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE organization_product_listings
          ADD COLUMN service_product_id UUID NULL
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_org_product_listing_service_product"
          ON organization_product_listings (service_product_id)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_org_product_listing_service_product"`);

    const colExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organization_product_listings'
        AND column_name = 'service_product_id'
    `);

    if (colExists && colExists.length > 0) {
      await queryRunner.query(`
        ALTER TABLE organization_product_listings
          DROP COLUMN service_product_id
      `);
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_service_products_offer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_service_products_service_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_service_products_service_offer"`);
    await queryRunner.query(`DROP TABLE IF EXISTS service_products`);
  }
}
