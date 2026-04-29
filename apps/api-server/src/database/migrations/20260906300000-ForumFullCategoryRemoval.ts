/**
 * WO-O4O-FORUM-CATEGORY-FULL-REMOVAL-V2
 *
 * 포럼 카테고리 구조 완전 제거:
 *   1. 남은 카테고리 이름을 태그로 변환
 *      - 복약지도대화 → 'kpa-medication-guidance' 태그
 *      - KPA개선포럼 → 'kpa-improvement' 태그
 *   2. 모든 forum_post의 categoryId = NULL
 *   3. 남은 forum_category 행 전부 삭제
 *
 * 결과: 단일 피드 포럼, category 구조 완전 제거
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

const CATEGORY_TO_TAG: Record<string, string> = {
  '562d6a58-e606-408c-9ad5-8656a178cc92': 'kpa-medication-guidance',  // 복약지도대화
  '56102758-79a1-43ef-8ebe-bf123b569c39': 'kpa-improvement',          // KPA개선포럼
};

export class ForumFullCategoryRemoval20260906300000 implements MigrationInterface {
  name = 'ForumFullCategoryRemoval20260906300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 남은 카테고리를 태그로 변환
    for (const [catId, tag] of Object.entries(CATEGORY_TO_TAG)) {
      const updated: { count: string }[] = await queryRunner.query(
        `UPDATE forum_post
         SET tags = CASE
           WHEN tags IS NULL THEN ARRAY[$1]::text[]
           WHEN $1 = ANY(tags) THEN tags
           ELSE array_append(tags, $1)
         END
         WHERE "categoryId" = $2
           AND status IN ('publish', 'published', 'pending', 'draft')
         RETURNING id`,
        [tag, catId],
      ).catch(() => []);
      console.log(
        `[ForumFullCategoryRemoval] Category ${catId} → tag '${tag}': ${updated.length} posts updated`,
      );
    }

    // 2. 모든 forum_post의 categoryId를 NULL로 초기화
    const nullResult = await queryRunner.query(
      `UPDATE forum_post SET "categoryId" = NULL WHERE "categoryId" IS NOT NULL`,
    );
    console.log(
      `[ForumFullCategoryRemoval] Cleared categoryId from posts: ${nullResult?.[1] ?? 0} rows`,
    );

    // 3. 남은 forum_category 전부 삭제 (FK 제약 해제 후)
    const cats: { id: string; name: string }[] = await queryRunner.query(
      `SELECT id, name FROM forum_category`,
    );
    if (cats.length === 0) {
      console.log('[ForumFullCategoryRemoval] No categories to delete');
    } else {
      // FK 참조 해제 (forum_category_members, kpa_approval_requests)
      await queryRunner.query(`DELETE FROM forum_category_members`);
      await queryRunner.query(
        `UPDATE forum_category_requests SET created_category_id = NULL, created_category_slug = NULL`,
      );
      await queryRunner.query(
        `DELETE FROM kpa_approval_requests WHERE entity_type = 'forum_member_join'`,
      );

      await queryRunner.query(`DELETE FROM forum_category`);
      console.log(
        `[ForumFullCategoryRemoval] Deleted ${cats.length} categories:`,
        cats.map((c) => c.name).join(', '),
      );
    }

    // 4. 최종 확인
    const [postCheck]: { null_count: string }[] = await queryRunner.query(
      `SELECT COUNT(*)::int AS null_count FROM forum_post WHERE "categoryId" IS NOT NULL`,
    );
    const [catCheck]: { cat_count: string }[] = await queryRunner.query(
      `SELECT COUNT(*)::int AS cat_count FROM forum_category`,
    );
    console.log(
      `[ForumFullCategoryRemoval] Done — posts with categoryId: ${postCheck?.null_count ?? '?'}, categories remaining: ${catCheck?.cat_count ?? '?'}`,
    );
  }

  public async down(): Promise<void> {
    console.log('[ForumFullCategoryRemoval] down() — no-op (category removal is irreversible)');
  }
}
