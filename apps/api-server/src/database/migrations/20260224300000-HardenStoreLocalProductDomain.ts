import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-STORE-LOCAL-PRODUCT-HARDENING-V1
 *
 * StoreLocalProduct Display Domain 경계 고정:
 * 1. product_type을 PostgreSQL ENUM으로 강화 (varchar CHECK → native ENUM)
 * 2. store_local_products ↔ ecommerce_order_items 교차 FK 부재 확인 (구조적 보증)
 *
 * 이 마이그레이션은 보호(Hardening) 작업이며, 구조 재설계가 아니다.
 */
export class HardenStoreLocalProductDomain20260224300000 implements MigrationInterface {
  name = 'HardenStoreLocalProductDomain20260224300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create PostgreSQL ENUM type for product_type
    await queryRunner.query(`
      CREATE TYPE "store_tablet_display_product_type_enum"
        AS ENUM ('supplier', 'local')
    `);

    // 2. Drop existing CHECK constraint
    await queryRunner.query(`
      ALTER TABLE "store_tablet_displays"
        DROP CONSTRAINT IF EXISTS "CHK_store_tablet_displays_product_type"
    `);

    // 3. Convert column from varchar to native ENUM
    await queryRunner.query(`
      ALTER TABLE "store_tablet_displays"
        ALTER COLUMN "product_type"
        TYPE "store_tablet_display_product_type_enum"
        USING "product_type"::"store_tablet_display_product_type_enum"
    `);

    // 4. Add COMMENT to document Display Domain boundary
    await queryRunner.query(`
      COMMENT ON TABLE "store_local_products" IS
        'Display Domain only. Must NEVER be referenced by ecommerce_order_items, '
        'organization_product_listings, or organization_product_channels. '
        'WO-STORE-LOCAL-PRODUCT-HARDENING-V1'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "store_tablet_displays" IS
        'Tablet display configuration. product_type discriminates supplier vs local products. '
        'No connection to Checkout or EcommerceOrder. '
        'WO-STORE-LOCAL-PRODUCT-HARDENING-V1'
    `);

    console.log('[HardenStoreLocalProductDomain] ENUM enforced, domain boundary documented.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert ENUM back to varchar with CHECK
    await queryRunner.query(`
      ALTER TABLE "store_tablet_displays"
        ALTER COLUMN "product_type"
        TYPE varchar(20)
        USING "product_type"::text
    `);

    await queryRunner.query(`
      ALTER TABLE "store_tablet_displays"
        ADD CONSTRAINT "CHK_store_tablet_displays_product_type"
        CHECK ("product_type" IN ('supplier', 'local'))
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "store_tablet_display_product_type_enum"
    `);

    await queryRunner.query(`COMMENT ON TABLE "store_local_products" IS NULL`);
    await queryRunner.query(`COMMENT ON TABLE "store_tablet_displays" IS NULL`);
  }
}
