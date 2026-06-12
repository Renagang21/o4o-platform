import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-CONTENT-COPY
 *
 * Creates store content tables:
 * - store_contents
 * - store_content_blocks
 */
export class CreateStoreContentTables1771200000012 implements MigrationInterface {
  name = 'CreateStoreContentTables1771200000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // Create enum types
    // ============================================

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE store_content_status_enum AS ENUM ('draft', 'active', 'archived');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE store_content_block_type_enum AS ENUM ('text', 'image', 'video', 'question', 'choice');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    // ============================================
    // 1. store_contents
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_contents" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "templateId" UUID NOT NULL,
        "templateVersionId" UUID NOT NULL,
        "storeId" UUID NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status" store_content_status_enum NOT NULL DEFAULT 'draft',
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_store_contents_store_status" ON "store_contents" ("storeId", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_store_contents_template" ON "store_contents" ("templateId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_store_contents_store_template" ON "store_contents" ("storeId", "templateId")`);

    // ============================================
    // 2. store_content_blocks
    // ============================================

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_content_blocks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "storeContentId" UUID NOT NULL,
        "blockType" store_content_block_type_enum NOT NULL,
        "content" JSONB NOT NULL DEFAULT '{}',
        "position" INTEGER NOT NULL DEFAULT 0,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_store_content_blocks_content_position" ON "store_content_blocks" ("storeContentId", "position")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "store_content_blocks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_contents"`);
    await queryRunner.query(`DROP TYPE IF EXISTS store_content_block_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS store_content_status_enum`);
  }
}
