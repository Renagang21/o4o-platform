/**
 * Migration: Cleanup all forum posts (Phase 20-B)
 *
 * Root cause: Posts were created with authorId=null due to missing auth
 * in the createForumPost flow (Bearer token was empty, no credentials:include).
 *
 * This migration removes ALL existing forum data to start clean:
 * - forum_comment (FK → forum_post)
 * - forum_post
 *
 * The accompanying code fix ensures all future posts require authentication
 * and always have a valid authorId.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupForumOrphanedPosts2026013100004 implements MigrationInterface {
  name = 'CleanupForumOrphanedPosts2026013100004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Delete in FK-safe order: comments → posts
    await queryRunner.query(`DELETE FROM forum_comment`);
    await queryRunner.query(`DELETE FROM forum_post`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data cleanup is irreversible — no rollback
  }
}
