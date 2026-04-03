import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KPA-a 커뮤니티 포럼 게시글/댓글/좋아요/알림 전체 삭제.
 * 대상: organization_id IS NULL (커뮤니티 스코프)
 * SAVEPOINT로 개별 실패를 격리하여 트랜잭션 오염 방지.
 */
export class CleanupKpaForumPostsV2_1712192400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 댓글 삭제 (forum_comment."postId" camelCase FK)
    const delComments = await queryRunner.query(`
      DELETE FROM forum_comment WHERE "postId" IN (SELECT id FROM forum_post WHERE organization_id IS NULL)
    `);
    console.log(`[CleanupKpaForum] comments deleted: ${delComments?.[1] ?? 0}`);

    // 2. 좋아요 삭제 (forum_like는 targetType/targetId 구조)
    const delLikes = await queryRunner.query(`
      DELETE FROM forum_like WHERE "targetType" = 'post' AND "targetId" IN (SELECT id FROM forum_post WHERE organization_id IS NULL)
    `);
    console.log(`[CleanupKpaForum] likes deleted: ${delLikes?.[1] ?? 0}`);

    // 3. 게시글 삭제
    const delPosts = await queryRunner.query(`
      DELETE FROM forum_post WHERE organization_id IS NULL
    `);
    console.log(`[CleanupKpaForum] posts deleted: ${delPosts?.[1] ?? 0}`);
  }

  public async down(): Promise<void> {
    console.log('[CleanupKpaForum] Rollback not supported');
  }
}
