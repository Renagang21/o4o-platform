import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Align Forum Post Columns to snake_case
 *
 * This migration ensures forum_post table has all required columns
 * with consistent snake_case naming convention.
 *
 * Columns added/renamed:
 * - organization_id (uuid, nullable)
 * - is_organization_exclusive (boolean, default false)
 * - last_comment_at (timestamp, nullable)
 * - last_comment_by (uuid, nullable)
 * - metadata (jsonb, nullable)
 *
 * @version 1.0.0
 * @date 2025-12-13
 */
export class AlignForumPostColumns1702454400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Handle organization_id column
    // ============================================
    // Check if organizationId (camelCase) exists and rename to snake_case
    const hasOrgIdCamel = await this.columnExists(queryRunner, 'forum_post', 'organizationId');
    const hasOrgIdSnake = await this.columnExists(queryRunner, 'forum_post', 'organization_id');

    if (hasOrgIdCamel && !hasOrgIdSnake) {
      // Rename camelCase to snake_case
      await queryRunner.query(`
        ALTER TABLE "forum_post" RENAME COLUMN "organizationId" TO "organization_id"
      `);
    } else if (!hasOrgIdCamel && !hasOrgIdSnake) {
      // Add new column with snake_case name
      await queryRunner.query(`
        ALTER TABLE "forum_post" ADD COLUMN "organization_id" uuid NULL
      `);
    }
    // If snake_case already exists, do nothing

    // ============================================
    // 2. Handle is_organization_exclusive column
    // ============================================
    const hasOrgExclCamel = await this.columnExists(queryRunner, 'forum_post', 'isOrganizationExclusive');
    const hasOrgExclSnake = await this.columnExists(queryRunner, 'forum_post', 'is_organization_exclusive');

    if (hasOrgExclCamel && !hasOrgExclSnake) {
      // Rename camelCase to snake_case
      await queryRunner.query(`
        ALTER TABLE "forum_post" RENAME COLUMN "isOrganizationExclusive" TO "is_organization_exclusive"
      `);
    } else if (!hasOrgExclCamel && !hasOrgExclSnake) {
      // Add new column with snake_case name
      await queryRunner.query(`
        ALTER TABLE "forum_post" ADD COLUMN "is_organization_exclusive" boolean DEFAULT false
      `);
    }

    // ============================================
    // 3. Handle last_comment_at column
    // ============================================
    const hasLastCommentAtCamel = await this.columnExists(queryRunner, 'forum_post', 'lastCommentAt');
    const hasLastCommentAtSnake = await this.columnExists(queryRunner, 'forum_post', 'last_comment_at');

    if (hasLastCommentAtCamel && !hasLastCommentAtSnake) {
      await queryRunner.query(`
        ALTER TABLE "forum_post" RENAME COLUMN "lastCommentAt" TO "last_comment_at"
      `);
    } else if (!hasLastCommentAtCamel && !hasLastCommentAtSnake) {
      await queryRunner.query(`
        ALTER TABLE "forum_post" ADD COLUMN "last_comment_at" timestamp NULL
      `);
    }

    // ============================================
    // 4. Handle last_comment_by column
    // ============================================
    const hasLastCommentByCamel = await this.columnExists(queryRunner, 'forum_post', 'lastCommentBy');
    const hasLastCommentBySnake = await this.columnExists(queryRunner, 'forum_post', 'last_comment_by');

    if (hasLastCommentByCamel && !hasLastCommentBySnake) {
      await queryRunner.query(`
        ALTER TABLE "forum_post" RENAME COLUMN "lastCommentBy" TO "last_comment_by"
      `);
    } else if (!hasLastCommentByCamel && !hasLastCommentBySnake) {
      await queryRunner.query(`
        ALTER TABLE "forum_post" ADD COLUMN "last_comment_by" uuid NULL
      `);
    }

    // ============================================
    // 5. Handle metadata column
    // ============================================
    const hasMetadata = await this.columnExists(queryRunner, 'forum_post', 'metadata');

    if (!hasMetadata) {
      await queryRunner.query(`
        ALTER TABLE "forum_post" ADD COLUMN "metadata" jsonb NULL
      `);
    }

    // ============================================
    // 6. Update indexes if needed
    // ============================================
    // Drop old index if exists (with camelCase column reference)
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_forum_post_organization"`);
    } catch (e) {
      // Index might not exist, ignore
    }

    // Create new index with snake_case column names
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_forum_post_org_status_created"
      ON "forum_post" ("organization_id", "status", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert snake_case to camelCase for backward compatibility

    // Drop new index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_forum_post_org_status_created"`);

    // Rename columns back to camelCase
    const hasOrgIdSnake = await this.columnExists(queryRunner, 'forum_post', 'organization_id');
    if (hasOrgIdSnake) {
      await queryRunner.query(`
        ALTER TABLE "forum_post" RENAME COLUMN "organization_id" TO "organizationId"
      `);
    }

    const hasOrgExclSnake = await this.columnExists(queryRunner, 'forum_post', 'is_organization_exclusive');
    if (hasOrgExclSnake) {
      await queryRunner.query(`
        ALTER TABLE "forum_post" RENAME COLUMN "is_organization_exclusive" TO "isOrganizationExclusive"
      `);
    }

    const hasLastCommentAtSnake = await this.columnExists(queryRunner, 'forum_post', 'last_comment_at');
    if (hasLastCommentAtSnake) {
      await queryRunner.query(`
        ALTER TABLE "forum_post" RENAME COLUMN "last_comment_at" TO "lastCommentAt"
      `);
    }

    const hasLastCommentBySnake = await this.columnExists(queryRunner, 'forum_post', 'last_comment_by');
    if (hasLastCommentBySnake) {
      await queryRunner.query(`
        ALTER TABLE "forum_post" RENAME COLUMN "last_comment_by" TO "lastCommentBy"
      `);
    }

    // Note: metadata column doesn't need case change, keep it

    // Recreate old index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_forum_post_organization"
      ON "forum_post" ("organizationId", "status", "created_at")
    `);
  }

  /**
   * Helper method to check if a column exists in a table
   */
  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    `, [tableName, columnName]);
    return result.length > 0;
  }
}
