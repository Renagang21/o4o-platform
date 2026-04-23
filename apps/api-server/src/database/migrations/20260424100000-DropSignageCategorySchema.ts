import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Drop signage category schema
 *
 * WO-O4O-SIGNAGE-CATEGORY-FIELD-REMOVAL-PHASE3-V1
 *
 * Phase 1 (UI) + Phase 2 (API/Runtime) 완료 후 DB 레이어 정리.
 *
 * Drop order:
 * 1. FK: FK_signage_media_category (signage_media.categoryId → signage_categories)
 * 2. Index: IDX_signage_media_category (VARCHAR category 컬럼 인덱스)
 * 3. Column: signage_media.categoryId (UUID)
 * 4. Column: signage_media.category (VARCHAR)
 * 5. Index: IDX_signage_categories_service_active
 * 6. Table: signage_categories
 */
export class DropSignageCategorySchema20260424100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop FK
    await queryRunner.query(`
      ALTER TABLE signage_media
        DROP CONSTRAINT IF EXISTS "FK_signage_media_category"
    `);

    // 2. Drop index on VARCHAR category column
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_signage_media_category"
    `);

    // 3. Drop categoryId column
    await queryRunner.query(`
      ALTER TABLE signage_media
        DROP COLUMN IF EXISTS "categoryId"
    `);

    // 4. Drop category column
    await queryRunner.query(`
      ALTER TABLE signage_media
        DROP COLUMN IF EXISTS "category"
    `);

    // 5. Drop index on signage_categories
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_signage_categories_service_active"
    `);

    // 6. Drop signage_categories table
    await queryRunner.query(`
      DROP TABLE IF EXISTS signage_categories
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore signage_categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS signage_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "serviceKey" VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("serviceKey", name)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_signage_categories_service_active"
        ON signage_categories ("serviceKey", "isActive", "sortOrder")
    `);

    // Restore category VARCHAR column on signage_media
    await queryRunner.query(`
      ALTER TABLE signage_media
        ADD COLUMN IF NOT EXISTS "category" VARCHAR(100) NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_signage_media_category"
        ON signage_media ("category")
    `);

    // Restore categoryId UUID column + FK
    await queryRunner.query(`
      ALTER TABLE signage_media
        ADD COLUMN IF NOT EXISTS "categoryId" UUID NULL
    `);

    await queryRunner.query(`
      ALTER TABLE signage_media
        ADD CONSTRAINT "FK_signage_media_category"
        FOREIGN KEY ("categoryId") REFERENCES signage_categories(id) ON DELETE SET NULL
    `);
  }
}
