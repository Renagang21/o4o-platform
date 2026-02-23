/**
 * Migration: AddAuthorRoleAndVisibilityScopeToCmsContents
 *
 * WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1
 *
 * Adds author_role and visibility_scope columns to cms_contents table.
 * - author_role: tracks who created the content (admin, service_admin, supplier, community)
 * - visibility_scope: controls where content is visible (platform, service, organization)
 *
 * All existing rows default to author_role='admin', visibility_scope='platform'
 * (consistent with current admin-only content creation model).
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthorRoleAndVisibilityScopeToCmsContents1708732800000 implements MigrationInterface {
  name = 'AddAuthorRoleAndVisibilityScopeToCmsContents1708732800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add author_role column with default 'admin'
    await queryRunner.query(`
      ALTER TABLE "cms_contents"
      ADD COLUMN IF NOT EXISTS "authorRole" VARCHAR(20) NOT NULL DEFAULT 'admin'
    `);

    // Add visibility_scope column with default 'platform'
    await queryRunner.query(`
      ALTER TABLE "cms_contents"
      ADD COLUMN IF NOT EXISTS "visibilityScope" VARCHAR(20) NOT NULL DEFAULT 'platform'
    `);

    // Add composite index for efficient filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_contents_service_visibility_author_status"
      ON "cms_contents" ("serviceKey", "visibilityScope", "authorRole", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_cms_contents_service_visibility_author_status"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "cms_contents" DROP COLUMN IF EXISTS "visibilityScope"
    `);

    await queryRunner.query(`
      ALTER TABLE "cms_contents" DROP COLUMN IF EXISTS "authorRole"
    `);
  }
}
