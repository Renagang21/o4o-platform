import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-LISTING-AUTOLINK-V1
 * Adds source_type / source_id to organization_product_listings for origin tracking.
 */
export class AddSourceToOrganizationProductListings20260415240000 implements MigrationInterface {
  name = 'AddSourceToOrganizationProductListings20260415240000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS source_id   UUID        DEFAULT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_opl_source ON organization_product_listings (source_type, source_id)
      WHERE source_type IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_opl_source`);
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        DROP COLUMN IF EXISTS source_type,
        DROP COLUMN IF EXISTS source_id
    `);
  }
}
