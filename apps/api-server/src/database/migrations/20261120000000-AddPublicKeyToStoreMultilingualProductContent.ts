import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1
 *
 * Adds a hard-to-guess public_key to store-scoped multilingual product content
 * groups so an unauthenticated QR / public landing can resolve the store COPY
 * (never the operator original) by key + locale.
 *
 * - Nullable: keys are issued lazily on first "고객용 보기 / QR" request, not backfilled.
 * - Unique (partial, where not null) so distinct groups never collide.
 */
export class AddPublicKeyToStoreMultilingualProductContent20261120000000 implements MigrationInterface {
  name = 'AddPublicKeyToStoreMultilingualProductContent20261120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_multilingual_product_content_groups
      ADD COLUMN IF NOT EXISTS public_key varchar(40)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS UQ_store_multilingual_product_content_group_public_key
      ON store_multilingual_product_content_groups (public_key)
      WHERE public_key IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS UQ_store_multilingual_product_content_group_public_key');
    await queryRunner.query(`
      ALTER TABLE store_multilingual_product_content_groups
      DROP COLUMN IF EXISTS public_key
    `);
  }
}
