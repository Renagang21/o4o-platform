import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1
 *
 * forum_category 테이블 및 forum_post.categoryId 컬럼 완전 제거.
 *
 * 사전 조건 (선행 마이그레이션 보장):
 *   1. ForumFullCategoryRemoval20260906300000 — forum_category 모든 행 삭제
 *   2. ForumFullCategoryRemoval20260906300000 — forum_post.categoryId = NULL 처리
 *
 * 실행 순서:
 *   1. 사전 조건 검증
 *   2. forum_post → forum_category FK 제약 제거
 *   3. forum_post."categoryId" 컬럼 DROP
 *   4. forum_category 테이블 DROP CASCADE
 */
export class DropForumCategory20260908000000 implements MigrationInterface {
  name = 'DropForumCategory20260908000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. 사전 조건 검증 ─────────────────────────────────────────────────────

    // forum_category 테이블 존재 확인
    const hasTable = await queryRunner.hasTable('forum_category');
    if (!hasTable) {
      console.log('[DropForumCategory] forum_category does not exist — skip');
      return;
    }

    // forum_category 비어있어야 함
    const [catCount]: { cnt: string }[] = await queryRunner.query(
      `SELECT COUNT(*)::int AS cnt FROM forum_category`,
    );
    if (parseInt(catCount?.cnt ?? '0', 10) > 0) {
      throw new Error(
        `[DropForumCategory] BLOCKED: forum_category has ${catCount.cnt} rows. ` +
        `Run ForumFullCategoryRemoval migration first.`,
      );
    }

    // forum_post.categoryId IS NOT NULL인 행 없어야 함
    const hasCategoryIdCol = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'forum_post' AND column_name = '"categoryId"'
      LIMIT 1
    `);
    if (hasCategoryIdCol.length > 0) {
      const [postCount]: { cnt: string }[] = await queryRunner.query(
        `SELECT COUNT(*)::int AS cnt FROM forum_post WHERE "categoryId" IS NOT NULL`,
      );
      if (parseInt(postCount?.cnt ?? '0', 10) > 0) {
        throw new Error(
          `[DropForumCategory] BLOCKED: forum_post has ${postCount.cnt} rows with non-null categoryId. ` +
          `Run ForumFullCategoryRemoval migration first.`,
        );
      }
    }

    console.log('[DropForumCategory] Pre-conditions verified — proceeding with DROP');

    // ── 2. forum_post → forum_category FK 제거 ────────────────────────────────
    // FK 이름을 동적으로 탐색 (TypeORM 자동 생성 이름 포함)
    const fkRows: { conname: string }[] = await queryRunner.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'forum_post'::regclass
        AND confrelid = 'forum_category'::regclass
    `);
    for (const { conname } of fkRows) {
      await queryRunner.query(`ALTER TABLE forum_post DROP CONSTRAINT IF EXISTS "${conname}"`);
      console.log(`[DropForumCategory] Dropped FK constraint: ${conname}`);
    }

    // ── 3. forum_post."categoryId" 컬럼 DROP ─────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE forum_post DROP COLUMN IF EXISTS "categoryId"
    `);
    console.log('[DropForumCategory] Dropped column forum_post."categoryId"');

    // ── 4. forum_category 테이블 DROP CASCADE ─────────────────────────────────
    // CASCADE: forum_category_members FK 등 참조 제약도 함께 제거
    await queryRunner.query(`DROP TABLE IF EXISTS forum_category CASCADE`);
    console.log('[DropForumCategory] Dropped table forum_category (CASCADE)');

    // ── 5. 완료 확인 ───────────────────────────────────────────────────────────
    const stillExists = await queryRunner.hasTable('forum_category');
    if (stillExists) {
      throw new Error('[DropForumCategory] table still exists after DROP — check for locks');
    }
    console.log('[DropForumCategory] Done — forum_category completely removed');
  }

  public async down(): Promise<void> {
    // 이 마이그레이션은 되돌릴 수 없음 (irreversible by design)
    console.log('[DropForumCategory] down() — no-op (irreversible migration)');
  }
}
