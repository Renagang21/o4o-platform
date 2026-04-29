/**
 * WO-O4O-FORUM-CATEGORY-REMOVE-AND-ORPHAN-CLEANUP-V1
 *
 * 포럼 카테고리 정리:
 *   유지 대상 (2개):
 *     - 562d6a58-e606-408c-9ad5-8656a178cc92  복약 지도 대화
 *     - 56102758-79a1-43ef-8ebe-bf123b569c39  KPA-socierty 개선을 위한 포럼
 *
 *   삭제 대상: 위 2개를 제외한 모든 카테고리
 *     - f0000000-0a00-4000-f000-000000000001~000000000006 (postCount:224 but 0 실제 게시글)
 *     - f0000000-0a00-4000-b000-010c0fa00001 (당뇨 케어)
 *     - f0000000-0a00-4000-f000-0000000000f1 (시범판매 Market Trial)
 *
 *   추가 작업:
 *     - 삭제 대상 카테고리의 연관 데이터 제거 (posts, comments, likes, members, requests)
 *     - 유지 카테고리의 postCount를 실제 published 게시글 수로 재산정
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

const KEEP_IDS = [
  '562d6a58-e606-408c-9ad5-8656a178cc92',
  '56102758-79a1-43ef-8ebe-bf123b569c39',
];

export class CleanupOrphanForumCategories20260906200000 implements MigrationInterface {
  name = 'CleanupOrphanForumCategories20260906200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('forum_category');
    if (!hasTable) {
      console.log('[CleanupOrphanForumCategories] forum_category table not found — skipping');
      return;
    }

    // 0. 삭제 대상 카테고리 확정
    const targets: { id: string; name: string }[] = await queryRunner.query(
      `SELECT id, name FROM forum_category WHERE id NOT IN ($1, $2)`,
      KEEP_IDS,
    );

    if (targets.length === 0) {
      console.log('[CleanupOrphanForumCategories] No orphan categories found — skipping');
    } else {
      const ids = targets.map((c) => c.id);
      console.log(
        `[CleanupOrphanForumCategories] Deleting ${ids.length} categories:`,
        targets.map((c) => `${c.name} (${c.id})`).join(', '),
      );

      const ph = (arr: string[], offset = 0) =>
        arr.map((_, i) => `$${i + 1 + offset}`).join(',');

      // 1. 삭제 대상 카테고리의 게시글 ID 수집
      const posts: { id: string }[] = await queryRunner.query(
        `SELECT id FROM forum_post WHERE "categoryId" IN (${ph(ids)})`,
        ids,
      );
      const postIds = posts.map((p) => p.id);
      console.log(`[CleanupOrphanForumCategories] Found ${postIds.length} posts to delete`);

      if (postIds.length > 0) {
        // 2. 댓글 삭제
        await queryRunner.query(
          `DELETE FROM forum_comment WHERE "postId" IN (${ph(postIds)})`,
          postIds,
        );

        // 3. 좋아요 삭제
        await queryRunner.query(
          `DELETE FROM forum_post_like WHERE post_id IN (${ph(postIds)})`,
          postIds,
        );

        // 4. 게시글 삭제
        await queryRunner.query(
          `DELETE FROM forum_post WHERE "categoryId" IN (${ph(ids)})`,
          ids,
        );
      }

      // 5. 카테고리 멤버 삭제
      await queryRunner.query(
        `DELETE FROM forum_category_members WHERE forum_category_id IN (${ph(ids)})`,
        ids,
      );

      // 6. kpa_approval_requests: forum_member_join 정리
      for (const catId of ids) {
        await queryRunner.query(
          `DELETE FROM kpa_approval_requests
           WHERE entity_type = 'forum_member_join'
             AND payload->>'forum_category_id' = $1`,
          [catId],
        );
      }

      // 7. forum_category_requests: created_category_id 참조 해제
      await queryRunner.query(
        `UPDATE forum_category_requests
         SET created_category_id = NULL, created_category_slug = NULL
         WHERE created_category_id IN (${ph(ids)})`,
        ids,
      );

      // 8. 카테고리 본체 삭제
      await queryRunner.query(
        `DELETE FROM forum_category WHERE id IN (${ph(ids)})`,
        ids,
      );

      console.log(`[CleanupOrphanForumCategories] Deleted ${ids.length} orphan categories`);
    }

    // 9. 유지 카테고리 postCount를 실제 published 게시글 수로 재산정
    for (const keepId of KEEP_IDS) {
      await queryRunner.query(
        `UPDATE forum_category
         SET "postCount" = (
           SELECT COUNT(*)::int
           FROM forum_post
           WHERE "categoryId" = $1
             AND status IN ('publish', 'published')
         )
         WHERE id = $1`,
        [keepId],
      );
    }

    // 10. 최종 상태 확인
    const remaining: { id: string; name: string; postCount: number }[] = await queryRunner.query(
      `SELECT id, name, "postCount" FROM forum_category ORDER BY name`,
    );
    console.log(
      `[CleanupOrphanForumCategories] Done. Remaining ${remaining.length} categories:`,
      remaining.map((c) => `${c.name} (postCount=${c.postCount})`).join(', '),
    );
  }

  public async down(): Promise<void> {
    console.log('[CleanupOrphanForumCategories] down() — no-op (data cleanup is irreversible)');
  }
}
