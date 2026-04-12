import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-FORUM-TEST-DATA-CLEANUP-KEEP-2-FORUMS-V1
 *
 * KPA-a 포럼 테스트/시드 데이터 정리.
 * 아래 두 포럼만 유지하고 나머지 포럼 + 연관 데이터를 모두 삭제한다.
 *
 * 유지 대상:
 *   - 562d6a58-e606-408c-9ad5-8656a178cc92  복약 지도 대화
 *   - 56102758-79a1-43ef-8ebe-bf123b569c39  KPA-socierty 개선을 위한 포럼
 *
 * 삭제 순서 (FK 의존 순):
 *   1. forum_comment          (FK → forum_post)
 *   2. forum_post_like        (post_id 참조)
 *   3. forum_post             (FK → forum_category)
 *   4. forum_category_members (FK → forum_category)
 *   5. kpa_approval_requests  (forum_member_join, payload→forum_category_id)
 *   6. forum_category_requests (created_category_id 참조 → NULL)
 *   7. forum_category         (본체)
 */
export class CleanupForumTestData20260412100000 implements MigrationInterface {
  name = 'CleanupForumTestData20260412100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const KEEP_IDS = [
      '562d6a58-e606-408c-9ad5-8656a178cc92',
      '56102758-79a1-43ef-8ebe-bf123b569c39',
    ];

    // ── 0. 삭제 대상 카테고리 확정 ──
    const targets: { id: string; name: string }[] = await queryRunner.query(
      `SELECT id, name FROM forum_category WHERE id NOT IN ($1, $2)`,
      KEEP_IDS,
    );

    if (targets.length === 0) {
      console.log('[CleanupForumTestData] No forums to delete — skipping');
      return;
    }

    const ids = targets.map((c) => c.id);
    console.log(`[CleanupForumTestData] Deleting ${ids.length} forums:`,
      targets.map((c) => c.name).join(', '));

    // 파라미터 플레이스홀더 생성 헬퍼
    const ph = (arr: string[], offset = 0) => arr.map((_, i) => `$${i + 1 + offset}`).join(',');

    // ── 1. 삭제 대상 게시글 ID 수집 ──
    const posts: { id: string }[] = await queryRunner.query(
      `SELECT id FROM forum_post WHERE "categoryId" IN (${ph(ids)})`, ids,
    );
    const postIds = posts.map((p) => p.id);
    console.log(`[CleanupForumTestData] Found ${postIds.length} posts to delete`);

    if (postIds.length > 0) {
      // ── 2. forum_comment 삭제 ──
      await queryRunner.query(
        `DELETE FROM forum_comment WHERE "postId" IN (${ph(postIds)})`, postIds,
      );

      // ── 3. forum_post_like 삭제 ──
      await queryRunner.query(
        `DELETE FROM forum_post_like WHERE post_id IN (${ph(postIds)})`, postIds,
      );

      // ── 4. forum_post 삭제 ──
      await queryRunner.query(
        `DELETE FROM forum_post WHERE "categoryId" IN (${ph(ids)})`, ids,
      );
    }

    // ── 5. forum_category_members 삭제 ──
    await queryRunner.query(
      `DELETE FROM forum_category_members WHERE forum_category_id IN (${ph(ids)})`, ids,
    );

    // ── 6. kpa_approval_requests: forum_member_join 정리 ──
    for (const catId of ids) {
      await queryRunner.query(
        `DELETE FROM kpa_approval_requests
         WHERE entity_type = 'forum_member_join'
           AND payload->>'forum_category_id' = $1`,
        [catId],
      );
    }

    // ── 7. forum_category_requests: created_category_id 참조 해제 ──
    await queryRunner.query(
      `UPDATE forum_category_requests
       SET created_category_id = NULL, created_category_slug = NULL
       WHERE created_category_id IN (${ph(ids)})`,
      ids,
    );

    // ── 8. forum_category 삭제 (본체) ──
    await queryRunner.query(
      `DELETE FROM forum_category WHERE id IN (${ph(ids)})`, ids,
    );

    // ── 9. 유지 대상 확인 ──
    const remaining: { id: string; name: string }[] = await queryRunner.query(
      `SELECT id, name FROM forum_category ORDER BY name`,
    );
    console.log(`[CleanupForumTestData] Done. Remaining ${remaining.length} forums:`,
      remaining.map((c) => c.name).join(', '));
  }

  public async down(): Promise<void> {
    console.log('[CleanupForumTestData] down() — no-op (test data cleanup is irreversible)');
  }
}
