import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-TEMPLATE-SYSTEM-FOUNDATION
 *
 * Creates template system tables:
 * - lms_templates
 * - lms_template_versions
 * - lms_template_blocks
 */
export class CreateTemplateTables1771200000010 implements MigrationInterface {
  name = 'CreateTemplateTables1771200000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // Create enum types
    // ============================================

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE lms_template_type_enum AS ENUM ('lecture', 'quiz', 'survey');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE lms_template_visibility_enum AS ENUM ('private', 'organization', 'public');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE lms_template_status_enum AS ENUM ('draft', 'published', 'archived');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE lms_template_version_status_enum AS ENUM ('draft', 'published', 'archived');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE lms_template_block_type_enum AS ENUM ('text', 'image', 'video', 'question', 'choice');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    // ============================================
    // 1. lms_templates
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_templates" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" lms_template_type_enum NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "thumbnail" VARCHAR(500),
        "authorUserId" UUID,
        "organizationId" UUID,
        "serviceKey" VARCHAR(100),
        "visibility" lms_template_visibility_enum NOT NULL DEFAULT 'private',
        "status" lms_template_status_enum NOT NULL DEFAULT 'draft',
        "currentVersionId" UUID,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_templates_type_status" ON "lms_templates" ("type", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_templates_author" ON "lms_templates" ("authorUserId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_templates_org_visibility" ON "lms_templates" ("organizationId", "visibility")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_templates_servicekey_status" ON "lms_templates" ("serviceKey", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_templates_status_created" ON "lms_templates" ("status", "createdAt")`);

    // ============================================
    // 2. lms_template_versions
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_template_versions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "templateId" UUID NOT NULL,
        "versionNumber" INTEGER NOT NULL DEFAULT 1,
        "title" VARCHAR(255),
        "description" TEXT,
        "status" lms_template_version_status_enum NOT NULL DEFAULT 'draft',
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_template_versions_template_version" ON "lms_template_versions" ("templateId", "versionNumber")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_template_versions_template_status" ON "lms_template_versions" ("templateId", "status")`);

    // ============================================
    // 3. lms_template_blocks
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lms_template_blocks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "templateVersionId" UUID NOT NULL,
        "blockType" lms_template_block_type_enum NOT NULL,
        "content" JSONB NOT NULL DEFAULT '{}',
        "position" INTEGER NOT NULL DEFAULT 0,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "bundleId" UUID,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_template_blocks_version_position" ON "lms_template_blocks" ("templateVersionId", "position")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_lms_template_blocks_bundle" ON "lms_template_blocks" ("bundleId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_template_blocks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_template_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lms_templates"`);
    await queryRunner.query(`DROP TYPE IF EXISTS lms_template_block_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS lms_template_version_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS lms_template_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS lms_template_visibility_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS lms_template_type_enum`);
  }
}
