import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add Images Field to Glycopharm Products Migration
 *
 * WO-PRODUCT-IMAGES-AND-BARCODE-UNBLOCK-V1
 * Adds images field to glycopharm_products table to achieve schema parity
 * with cosmetics_products and neture_products.
 *
 * This unblocks UI rendering for all products.
 */
export class AddImagesToGlycopharmProducts1738181200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add images column to glycopharm_products
    await queryRunner.query(`
      ALTER TABLE public.glycopharm_products
      ADD COLUMN IF NOT EXISTS images JSONB
    `);

    // Add index for performance (optional but recommended)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_products_images"
      ON public.glycopharm_products USING GIN (images)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS public."IDX_glycopharm_products_images"
    `);

    // Drop images column
    await queryRunner.query(`
      ALTER TABLE public.glycopharm_products
      DROP COLUMN IF EXISTS images
    `);
  }
}
