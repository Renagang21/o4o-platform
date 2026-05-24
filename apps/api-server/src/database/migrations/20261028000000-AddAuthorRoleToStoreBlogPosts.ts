import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-OPERATOR-BLOG-PUBLISHING-V1 Phase 2-1
 *
 * store_blog_posts 에 author_role 컬럼 추가:
 *   - 'operator' : 운영자가 매장 HUB 에 게시한 블로그 (운영자 → HUB → 매장 흐름)
 *   - 'store'    : 매장 경영자가 자기 매장에 직접 작성한 블로그 (기존 데이터)
 *
 * DB 레벨 Drift 가드:
 *   - CHECK author_role IN ('operator', 'store')
 *   - 'supplier' 금지 (공급자는 O4O 내부 Producer 아님 — Canonical)
 *
 * 기존 데이터 처리:
 *   - 기존 row 는 모두 매장 경영자 직접 작성 블로그이므로 author_role='store' 로 자동 backfill
 *   - default 'store' 적용으로 ALTER TABLE 시 자동 처리
 *   - 안전한 backfill — 기존 데이터를 'operator' 로 잘못 분류할 위험 없음
 *
 * 복합 인덱스:
 *   - (service_key, author_role, status) — HUB query 시 가장 자주 쓰일 조건 조합
 *   - HubContentQueryService.queryBlog 가 author_role='operator' AND status='published' AND serviceKey
 *     를 동시 필터링하므로 복합 인덱스로 SQL 최적화
 *
 * service_key 정합 (P3 확인):
 *   - 신규 흐름 (createBlogController) 은 이미 정확한 serviceKey 저장:
 *     KPA='kpa', GlycoPharm='glycopharm' (default), Cosmetics='cosmetics'
 *   - 기존 데이터의 service_key 정합은 본 마이그레이션에서 정비 안 함 (별도 IR/WO)
 *
 * 참조:
 *   - docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md
 *   - docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md
 *   - docs/investigations/IR-O4O-OPERATOR-HUB-CONTENT-PUBLISHING-SIMPLIFICATION-V1.md
 */
export class AddAuthorRoleToStoreBlogPosts20261028000000 implements MigrationInterface {
  name = 'AddAuthorRoleToStoreBlogPosts20261028000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. author_role 컬럼 추가 ─────────────────────────────────────
    const colCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'store_blog_posts'
        AND column_name = 'author_role'
    `);
    if (colCheck.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "store_blog_posts"
          ADD COLUMN "author_role" VARCHAR(30) NOT NULL DEFAULT 'store'
      `);
      // CHECK: 'supplier' 금지 (Canonical — Supplier 는 O4O 내부 Producer 아님)
      await queryRunner.query(`
        ALTER TABLE "store_blog_posts"
          ADD CONSTRAINT "CHK_store_blog_posts_author_role"
            CHECK ("author_role" IN ('operator', 'store'))
      `);
      console.log(
        '[AddAuthorRoleToStoreBlogPosts] author_role added (default=store, CHECK IN (operator, store))',
      );
    } else {
      console.log('[AddAuthorRoleToStoreBlogPosts] author_role already exists, skipping.');
    }

    // ── 2. 복합 인덱스 — HUB query 최적화 ────────────────────────────
    const idxCheck = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'store_blog_posts'
        AND indexname = 'IDX_store_blog_posts_hub_query'
    `);
    if (idxCheck.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_store_blog_posts_hub_query"
          ON "store_blog_posts" ("service_key", "author_role", "status")
      `);
      console.log(
        '[AddAuthorRoleToStoreBlogPosts] composite index (service_key, author_role, status) created',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_store_blog_posts_hub_query"`,
    );
    await queryRunner.query(`
      ALTER TABLE "store_blog_posts"
        DROP CONSTRAINT IF EXISTS "CHK_store_blog_posts_author_role"
    `);
    await queryRunner.query(
      `ALTER TABLE "store_blog_posts" DROP COLUMN IF EXISTS "author_role"`,
    );
  }
}
