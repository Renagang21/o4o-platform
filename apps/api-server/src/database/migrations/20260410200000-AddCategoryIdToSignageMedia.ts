import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add categoryId FK to signage_media
 *
 * WO-O4O-SIGNAGE-REGISTRATION-AND-CATEGORY-REFINE-V1 Phase 1
 *
 * 1. signage_media에 categoryId UUID NULL 컬럼 추가
 * 2. signage_categories 테이블로의 FK 설정 (ON DELETE SET NULL)
 * 3. 기존 category 문자열 → categoryId 백필
 */
export class AddCategoryIdToSignageMedia20260410200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add categoryId column
    await queryRunner.query(`
      ALTER TABLE signage_media
        ADD COLUMN IF NOT EXISTS "categoryId" UUID NULL
    `);

    // 2. Add FK (gracefully skip if signage_categories doesn't exist yet)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signage_categories') THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'FK_signage_media_category'
          ) THEN
            ALTER TABLE signage_media
              ADD CONSTRAINT "FK_signage_media_category"
              FOREIGN KEY ("categoryId") REFERENCES signage_categories(id) ON DELETE SET NULL;
          END IF;
        END IF;
      END;
      $$
    `);

    // 3. Backfill: match existing category string to signage_categories name
    await queryRunner.query(`
      UPDATE signage_media m
        SET "categoryId" = c.id
        FROM signage_categories c
        WHERE m.category = c.name
          AND m."serviceKey" = c."serviceKey"
          AND m."categoryId" IS NULL
          AND m.category IS NOT NULL
          AND m.category <> ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE signage_media
        DROP CONSTRAINT IF EXISTS "FK_signage_media_category"
    `);
    await queryRunner.query(`
      ALTER TABLE signage_media
        DROP COLUMN IF EXISTS "categoryId"
    `);
  }
}
