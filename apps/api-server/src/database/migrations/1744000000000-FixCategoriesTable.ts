import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCategoriesTable1744000000000 implements MigrationInterface {
  name = 'FixCategoriesTable1744000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to categories table
    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD COLUMN IF NOT EXISTS "image" varchar(500),
      ADD COLUMN IF NOT EXISTS "sortOrder" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "metaTitle" varchar(255),
      ADD COLUMN IF NOT EXISTS "metaDescription" text,
      ADD COLUMN IF NOT EXISTS "nsleft" integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "nsright" integer DEFAULT 2
    `);

    // Create indexes for categories
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_categories_isActive" ON "categories" ("isActive");
      CREATE INDEX IF NOT EXISTS "IDX_categories_sortOrder" ON "categories" ("sortOrder");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_categories_sortOrder";
      DROP INDEX IF EXISTS "IDX_categories_isActive";
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "categories" 
      DROP COLUMN IF EXISTS "image",
      DROP COLUMN IF EXISTS "sortOrder",
      DROP COLUMN IF EXISTS "isActive",
      DROP COLUMN IF EXISTS "metaTitle",
      DROP COLUMN IF EXISTS "metaDescription",
      DROP COLUMN IF EXISTS "nsleft",
      DROP COLUMN IF EXISTS "nsright"
    `);
  }
}