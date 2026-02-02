import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FORUM-HUB-UI-REDESIGN-IMPLEMENTATION-V1
 *
 * Adds iconUrl field to forum_category for forum branding/identification.
 */
export class AddIconUrlToForumCategory2026020200001 implements MigrationInterface {
  name = 'AddIconUrlToForumCategory2026020200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "forum_category"
      ADD COLUMN IF NOT EXISTS "iconUrl" varchar(500) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "forum_category"
      DROP COLUMN IF EXISTS "iconUrl"
    `);
  }
}
