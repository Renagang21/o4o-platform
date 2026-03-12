import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-TEMPLATE-LIBRARY
 *
 * Creates template library tables:
 * - lms_template_tags
 * - lms_template_tag_map
 * - lms_template_categories
 * - lms_template_category_map
 */
export class CreateTemplateLibraryTables1771200000011 implements MigrationInterface {
  name = 'CreateTemplateLibraryTables1771200000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. lms_template_tags
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_template_tags" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lms_template_tags_slug" ON "lms_template_tags" ("slug")`);

    // ============================================
    // 2. lms_template_tag_map
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_template_tag_map" (
        "templateId" UUID NOT NULL,
        "tagId" UUID NOT NULL,
        PRIMARY KEY ("templateId", "tagId")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lms_template_tag_map_template_tag" ON "lms_template_tag_map" ("templateId", "tagId")`);

    // ============================================
    // 3. lms_template_categories
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_template_categories" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lms_template_categories_slug" ON "lms_template_categories" ("slug")`);

    // ============================================
    // 4. lms_template_category_map
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_template_category_map" (
        "templateId" UUID NOT NULL,
        "categoryId" UUID NOT NULL,
        PRIMARY KEY ("templateId", "categoryId")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lms_template_category_map_template_category" ON "lms_template_category_map" ("templateId", "categoryId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_template_category_map"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_template_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_template_tag_map"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_template_tags"`);
  }
}
