import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KPA-a 커뮤니티 포럼 게시글/댓글/좋아요/알림 전체 삭제.
 * 대상: organization_id IS NULL (커뮤니티 스코프)
 * 순서: 댓글 → 좋아요 → 알림 → 게시글 (FK 순서)
 */
export class CleanupKpaForumPostsV2_1712192400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 댓글 삭제 (컬럼명: "postId" camelCase)
    const comments = await queryRunner.query(`
      DELETE FROM forum_comment
      WHERE "postId" IN (SELECT id FROM forum_post WHERE organization_id IS NULL)
      RETURNING id
    `);
    console.log(`[CleanupKpaForum] Deleted ${comments.length} comments`);

    // 2. 좋아요 삭제
    const likes = await queryRunner.query(`
      DELETE FROM forum_like
      WHERE "postId" IN (SELECT id FROM forum_post WHERE organization_id IS NULL)
      RETURNING id
    `).catch(() => []);
    console.log(`[CleanupKpaForum] Deleted ${likes.length} likes`);

    // 3. 알림 삭제
    const notifications = await queryRunner.query(`
      DELETE FROM forum_notifications
      WHERE "postId" IN (SELECT id FROM forum_post WHERE organization_id IS NULL)
      RETURNING id
    `).catch(() => []);
    console.log(`[CleanupKpaForum] Deleted ${notifications.length} notifications`);

    // 4. 게시글 삭제
    const posts = await queryRunner.query(`
      DELETE FROM forum_post WHERE organization_id IS NULL
      RETURNING id
    `);
    console.log(`[CleanupKpaForum] Deleted ${posts.length} posts`);
  }

  public async down(): Promise<void> {
    // 데이터 삭제는 되돌릴 수 없음
    console.log('[CleanupKpaForum] Rollback not supported - data deletion is irreversible');
  }
}
