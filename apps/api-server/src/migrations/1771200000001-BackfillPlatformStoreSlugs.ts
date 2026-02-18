import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfill Platform Store Slugs
 *
 * WO-CORE-STORE-SLUG-SYSTEM-V1
 *
 * Copies existing slugs from service-specific tables into the
 * centralized platform_store_slugs table.
 *
 * Sources:
 * - glycopharm_pharmacies.slug -> service_key='glycopharm'
 * - cosmetics_stores.slug -> service_key='cosmetics'
 */
export class BackfillPlatformStoreSlugs1771200000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill from glycopharm_pharmacies
    // Only copy approved pharmacies with non-null slugs
    await queryRunner.query(`
      INSERT INTO platform_store_slugs (id, slug, store_id, service_key, is_active, created_at, updated_at)
      SELECT
        uuid_generate_v4(),
        slug,
        id,
        'glycopharm',
        true,
        COALESCE(created_at, now()),
        now()
      FROM glycopharm_pharmacies
      WHERE slug IS NOT NULL
        AND slug != ''
        AND status = 'approved'
      ON CONFLICT (slug) DO NOTHING
    `);

    // Backfill from cosmetics_stores
    // Only copy approved stores with non-null slugs
    await queryRunner.query(`
      INSERT INTO platform_store_slugs (id, slug, store_id, service_key, is_active, created_at, updated_at)
      SELECT
        uuid_generate_v4(),
        slug,
        id,
        'cosmetics',
        true,
        COALESCE(created_at, now()),
        now()
      FROM cosmetics_stores
      WHERE slug IS NOT NULL
        AND slug != ''
        AND status = 'approved'
      ON CONFLICT (slug) DO NOTHING
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove backfilled data (only data from known service keys)
    await queryRunner.query(`
      DELETE FROM platform_store_slugs
      WHERE service_key IN ('glycopharm', 'cosmetics')
    `);
  }
}
