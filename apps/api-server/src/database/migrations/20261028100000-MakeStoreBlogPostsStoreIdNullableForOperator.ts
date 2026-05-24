import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-OPERATOR-BLOG-PUBLISHING-WRITE-API-V1
 *
 * store_blog_posts.store_id 를 NULLABLE 로 확장하고, author_role 과의 정합을
 * DB CHECK 제약으로 보장한다.
 *
 * 배경 (Canonical):
 *   - 운영자 HUB 게시 블로그는 특정 매장에 귀속되지 않는 HUB 원본 콘텐츠이다.
 *   - 매장 직접 작성 블로그는 반드시 한 매장에 귀속된다.
 *   - 두 흐름이 동일 테이블 (store_blog_posts) 을 공유하므로 schema 레벨 정합 필요.
 *
 * 변경:
 *   1. store_id 컬럼 NOT NULL → NULL 허용
 *   2. CHECK 제약 추가 (엄격):
 *        (author_role = 'operator' AND store_id IS NULL)
 *        OR
 *        (author_role = 'store' AND store_id IS NOT NULL)
 *
 * 기존 데이터 정합 (Phase 2-1 backfill 결과):
 *   - 모든 row: author_role='store' + store_id NOT NULL → CHECK 통과 ✅
 *   - operator 게시 row 는 본 WO 의 write API 가 도입되는 시점부터 생성
 *
 * 인덱스:
 *   - 기존 unique (storeId, slug) 는 NULL 을 unique 로 취급 안 함 (PostgreSQL 표준)
 *     → operator row 는 store_id NULL 이라 slug 충돌 검사 application-level 처리
 *
 * 참조:
 *   - docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md
 *   - docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md (HUB 원본 vs 매장 사본)
 *   - docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md (운영자 → HUB → 매장 흐름)
 */
export class MakeStoreBlogPostsStoreIdNullableForOperator20261028100000
  implements MigrationInterface
{
  name = 'MakeStoreBlogPostsStoreIdNullableForOperator20261028100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. store_id NULL 허용 ──────────────────────────────────────
    const colInfo = await queryRunner.query(`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'store_blog_posts'
        AND column_name = 'store_id'
    `);
    if (colInfo.length > 0 && colInfo[0].is_nullable === 'NO') {
      await queryRunner.query(`
        ALTER TABLE "store_blog_posts" ALTER COLUMN "store_id" DROP NOT NULL
      `);
      console.log(
        '[MakeStoreBlogPostsStoreIdNullableForOperator] store_id NOT NULL → NULL 허용',
      );
    } else {
      console.log(
        '[MakeStoreBlogPostsStoreIdNullableForOperator] store_id already nullable, skipping.',
      );
    }

    // ── 2. CHECK 제약 — author_role 과 store_id 정합 ─────────────
    const chkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'store_blog_posts'
        AND constraint_name = 'CHK_store_blog_posts_author_role_store_id'
    `);
    if (chkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "store_blog_posts"
          ADD CONSTRAINT "CHK_store_blog_posts_author_role_store_id"
            CHECK (
              ("author_role" = 'operator' AND "store_id" IS NULL)
              OR
              ("author_role" = 'store' AND "store_id" IS NOT NULL)
            )
      `);
      console.log(
        '[MakeStoreBlogPostsStoreIdNullableForOperator] CHECK 제약 추가 — (operator+NULL) OR (store+NOT NULL)',
      );
    } else {
      console.log(
        '[MakeStoreBlogPostsStoreIdNullableForOperator] CHECK 제약 이미 존재, skipping.',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── 역순: CHECK 제약 → store_id NOT NULL ──
    await queryRunner.query(`
      ALTER TABLE "store_blog_posts"
        DROP CONSTRAINT IF EXISTS "CHK_store_blog_posts_author_role_store_id"
    `);
    // 주의: down 시 store_id NOT NULL 로 복원하려면 NULL row (operator 게시) 가
    //       0건이어야 한다. 그렇지 않으면 ALTER 실패. 운영자 게시 데이터가 있는
    //       상태에서는 의도적으로 NOT NULL 복원을 skip.
    const nullCount = await queryRunner.query(`
      SELECT COUNT(*)::int AS c FROM store_blog_posts WHERE store_id IS NULL
    `);
    if (nullCount[0]?.c === 0) {
      await queryRunner.query(`
        ALTER TABLE "store_blog_posts" ALTER COLUMN "store_id" SET NOT NULL
      `);
    } else {
      console.log(
        '[MakeStoreBlogPostsStoreIdNullableForOperator] down: operator 게시 row 존재 → store_id NOT NULL 복원 skip',
      );
    }
  }
}
