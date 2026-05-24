import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-POP-OPERATOR-PUBLISHING-V1 Phase 1 Backend Foundation (2026-05-24)
 *
 * store_pops 테이블 신설 — Blog 의 store_blog_posts 패턴 mirror.
 *
 * 선행 IR (IR-O4O-KPA-POP-STRUCTURE-AND-MENU-AUDIT-V1) Option C 채택:
 *   - kpa_store_contents 의 기존 정책 (Workspace A / visibility_scope='organization' /
 *     organization_id NOT NULL / share_status 흐름 폐기) 와 운영자 POP HUB 진열 흐름이
 *     4 개 제약 모두에서 충돌. 별도 entity 신설이 정합 가장 자연스러움.
 *
 * 컬럼:
 *   - id (uuid PK)
 *   - store_id (uuid NULLABLE) — author_role 에 따라 NULL 허용
 *   - service_key (varchar 50) — cross-service isolation
 *   - author_role (varchar 30, default 'store') — 'operator' | 'store' (DB CHECK)
 *   - title / slug / excerpt / content
 *   - status (varchar 20, default 'draft') — draft / published / archived
 *   - published_at (timestamptz NULLABLE)
 *   - created_at / updated_at
 *
 * 제약:
 *   1. CHECK author_role IN ('operator', 'store') — 'supplier' 금지 (Canonical)
 *   2. CHECK (author_role='operator' AND store_id IS NULL)
 *           OR (author_role='store' AND store_id IS NOT NULL)
 *
 * 인덱스:
 *   - UNIQUE (store_id, slug) — 매장 내 slug 충돌 방지 (operator 게시 row 는 store_id NULL 이라
 *     PostgreSQL 표준상 NULL 비교 안 됨 → operator slug 충돌은 application-level 검사)
 *   - (store_id, status)
 *   - (store_id, published_at)
 *   - IDX_store_pops_hub_query (service_key, author_role, status) — HUB query 최적화
 *
 * Blog 패턴 (commit 'aea7dfa70' Phase 2-1 + 'a849cec40' nullable 통합) 정확 mirror.
 *
 * 참조:
 *   - docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md
 *   - docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md
 *   - docs/investigations/IR-O4O-KPA-POP-STRUCTURE-AND-MENU-AUDIT-V1.md
 */
export class CreateStorePops20261029000000 implements MigrationInterface {
  name = 'CreateStorePops20261029000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. 테이블 생성 ─────────────────────────────────────────────
    const tableCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'store_pops'
    `);
    if (tableCheck.length === 0) {
      await queryRunner.query(`
        CREATE TABLE "store_pops" (
          "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "store_id"       uuid,
          "service_key"    varchar(50) NOT NULL,
          "author_role"    varchar(30) NOT NULL DEFAULT 'store',
          "title"          varchar(255) NOT NULL,
          "slug"           varchar(150) NOT NULL,
          "excerpt"        text,
          "content"        text NOT NULL,
          "status"         varchar(20) NOT NULL DEFAULT 'draft',
          "published_at"   timestamptz,
          "created_at"     timestamp NOT NULL DEFAULT now(),
          "updated_at"     timestamp NOT NULL DEFAULT now()
        )
      `);

      // ── 2. CHECK 제약 — author_role 화이트리스트 ──
      await queryRunner.query(`
        ALTER TABLE "store_pops"
          ADD CONSTRAINT "CHK_store_pops_author_role"
            CHECK ("author_role" IN ('operator', 'store'))
      `);

      // ── 3. CHECK 제약 — author_role 과 store_id 정합 (Blog 의 store_id nullable 패턴 mirror) ──
      await queryRunner.query(`
        ALTER TABLE "store_pops"
          ADD CONSTRAINT "CHK_store_pops_author_role_store_id"
            CHECK (
              ("author_role" = 'operator' AND "store_id" IS NULL)
              OR
              ("author_role" = 'store' AND "store_id" IS NOT NULL)
            )
      `);

      // ── 4. 인덱스 ──
      await queryRunner.query(`
        CREATE INDEX "IDX_store_pops_store_id_status"
          ON "store_pops" ("store_id", "status")
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_store_pops_store_id_slug"
          ON "store_pops" ("store_id", "slug")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_store_pops_store_id_published_at"
          ON "store_pops" ("store_id", "published_at")
      `);
      // HUB query 최적화 — service_key + author_role + status 복합 조건
      await queryRunner.query(`
        CREATE INDEX "IDX_store_pops_hub_query"
          ON "store_pops" ("service_key", "author_role", "status")
      `);

      console.log(
        '[CreateStorePops] store_pops created with CHECK constraints + indexes (Blog pattern mirror)',
      );
    } else {
      console.log('[CreateStorePops] store_pops already exists, skipping.');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_pops_hub_query"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_pops_store_id_published_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_store_pops_store_id_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_pops_store_id_status"`);
    await queryRunner.query(`
      ALTER TABLE "store_pops"
        DROP CONSTRAINT IF EXISTS "CHK_store_pops_author_role_store_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "store_pops"
        DROP CONSTRAINT IF EXISTS "CHK_store_pops_author_role"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_pops"`);
  }
}
