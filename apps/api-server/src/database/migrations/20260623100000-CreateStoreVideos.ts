import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * store_videos 테이블 신설 — store_pops 패턴 mirror.
 *
 * Store Production Material 의 "동영상(video)" 유형. QR-code 로 연결되는 외부 동영상 URL
 * 콘텐츠를 운영자 → HUB → 매장 사본 흐름으로 관리한다. POP 과 달리 content(본문) 대신
 * video_url(외부 URL) 을 보관하며 excerpt 대신 description 사용. copied_from_id 로 가져오기
 * 출처를 추적하되 복사 후 원본과 독립.
 *
 * 컬럼:
 *   - id (uuid PK)
 *   - store_id (uuid NULLABLE) — author_role 에 따라 NULL 허용
 *   - service_key (varchar 50) — cross-service isolation
 *   - author_role (varchar 30, default 'store') — 'operator' | 'store' (DB CHECK)
 *   - title / slug / description
 *   - video_url (varchar 1000 NOT NULL) — 외부 동영상 URL
 *   - status (varchar 20, default 'draft') — draft / published / archived
 *   - published_at (timestamptz NULLABLE)
 *   - copied_from_id (uuid NULLABLE) — 가져오기 출처(운영자 원본) 추적
 *   - created_at / updated_at
 *
 * 제약 (store_pops 와 동일):
 *   1. CHECK author_role IN ('operator', 'store')
 *   2. CHECK (author_role='operator' AND store_id IS NULL)
 *           OR (author_role='store' AND store_id IS NOT NULL)
 *
 * 인덱스 (store_pops 와 동일):
 *   - UNIQUE (store_id, slug)
 *   - (store_id, status)
 *   - (store_id, published_at)
 *   - IDX_store_videos_hub_query (service_key, author_role, status)
 *
 * 참조:
 *   - apps/api-server/src/database/migrations/20261029000000-CreateStorePops.ts (mirror 원본)
 *   - docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md
 */
export class CreateStoreVideos20260623100000 implements MigrationInterface {
  name = 'CreateStoreVideos20260623100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'store_videos'
    `);
    if (tableCheck.length === 0) {
      await queryRunner.query(`
        CREATE TABLE "store_videos" (
          "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "store_id"       uuid,
          "service_key"    varchar(50) NOT NULL,
          "author_role"    varchar(30) NOT NULL DEFAULT 'store',
          "title"          varchar(255) NOT NULL,
          "slug"           varchar(150) NOT NULL,
          "description"    text,
          "video_url"      varchar(1000) NOT NULL,
          "status"         varchar(20) NOT NULL DEFAULT 'draft',
          "published_at"   timestamptz,
          "copied_from_id" uuid,
          "created_at"     timestamp NOT NULL DEFAULT now(),
          "updated_at"     timestamp NOT NULL DEFAULT now()
        )
      `);

      // ── CHECK 제약 — author_role 화이트리스트 ──
      await queryRunner.query(`
        ALTER TABLE "store_videos"
          ADD CONSTRAINT "CHK_store_videos_author_role"
            CHECK ("author_role" IN ('operator', 'store'))
      `);

      // ── CHECK 제약 — author_role 과 store_id 정합 ──
      await queryRunner.query(`
        ALTER TABLE "store_videos"
          ADD CONSTRAINT "CHK_store_videos_author_role_store_id"
            CHECK (
              ("author_role" = 'operator' AND "store_id" IS NULL)
              OR
              ("author_role" = 'store' AND "store_id" IS NOT NULL)
            )
      `);

      // ── 인덱스 ──
      await queryRunner.query(`
        CREATE INDEX "IDX_store_videos_store_id_status"
          ON "store_videos" ("store_id", "status")
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_store_videos_store_id_slug"
          ON "store_videos" ("store_id", "slug")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_store_videos_store_id_published_at"
          ON "store_videos" ("store_id", "published_at")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_store_videos_hub_query"
          ON "store_videos" ("service_key", "author_role", "status")
      `);

      console.log(
        '[CreateStoreVideos] store_videos created with CHECK constraints + indexes (POP pattern mirror)',
      );
    } else {
      console.log('[CreateStoreVideos] store_videos already exists, skipping.');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_videos_hub_query"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_videos_store_id_published_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_store_videos_store_id_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_videos_store_id_status"`);
    await queryRunner.query(`
      ALTER TABLE "store_videos"
        DROP CONSTRAINT IF EXISTS "CHK_store_videos_author_role_store_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "store_videos"
        DROP CONSTRAINT IF EXISTS "CHK_store_videos_author_role"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_videos"`);
  }
}
