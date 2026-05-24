import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-OPERATOR-HUB-QR-TEMPLATE-FOUNDATION-V1 Phase 1 Backend Foundation (2026-05-24)
 *
 * operator_qr_templates 테이블 신설 — POP store_pops 패턴 mirror.
 *
 * 선행 IR (IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1) Option B 채택:
 *   - 기존 store_qr_codes (organization_id NOT NULL+FK, global slug unique,
 *     service_key/author_role/status 부재) 와 운영자 HUB QR 흐름이 4 개 제약 모두에서 충돌.
 *   - 별도 entity 신설 → store_qr_codes 9 endpoint 영향 0,
 *     /qr/public/:slug global URL 정합 보존, 마이그레이션 위험 최소.
 *
 * 컬럼:
 *   - id (uuid PK)
 *   - service_key (varchar 50) — cross-service isolation
 *   - author_role (varchar 30, default 'operator') — 'operator' 만 (DB CHECK)
 *   - title (varchar 255) / description (text NULLABLE)
 *   - status (varchar 20, default 'draft') — draft / published / archived
 *   - target_type (varchar 20) — 'url' | 'content' (DB CHECK)
 *   - target_url (text NULLABLE) — target_type='url' 시 필수
 *   - target_content_kind (varchar 20 NULLABLE) — 'blog' | 'cms' | 'pop'
 *   - target_content_ref (varchar 500 NULLABLE) — target_type='content' 시 필수
 *   - published_at (timestamptz NULLABLE)
 *   - created_at / updated_at
 *
 * 의도적 부재 (IR §5.2):
 *   - slug 컬럼 (운영자 단계에서 slug 미발급 — 매장 가져가기 시 store_qr_codes 가 발급)
 *   - organization_id (운영자 원본은 매장 무귀속)
 *   - scan tracking (scan 은 매장 사본 layer 만)
 *
 * 제약 (3 종):
 *   1. CHECK author_role IN ('operator') — Canonical: store/supplier 차단
 *   2. CHECK status IN ('draft', 'published', 'archived')
 *   3. CHECK target_type IN ('url', 'content')
 *   4. CHECK target_consistency:
 *      (target_type='url' AND target_url IS NOT NULL AND target_content_kind IS NULL AND target_content_ref IS NULL)
 *      OR
 *      (target_type='content' AND target_content_kind IS NOT NULL AND target_content_ref IS NOT NULL AND target_url IS NULL)
 *
 * 인덱스:
 *   - IDX_operator_qr_templates_hub_query (service_key, author_role, status) — HUB query 최적화
 *   - IDX_operator_qr_templates_service_published (service_key, published_at) — 정렬 최적화
 *
 * 참조:
 *   - docs/investigations/IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1.md
 *   - docs/investigations/IR-O4O-KPA-QR-STRUCTURE-AND-MENU-AUDIT-V1.md
 *   - apps/api-server/src/database/migrations/20261029000000-CreateStorePops.ts (mirror 원본)
 */
export class CreateOperatorQrTemplates20260524224943 implements MigrationInterface {
  name = 'CreateOperatorQrTemplates20260524224943';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. 테이블 생성 ─────────────────────────────────────────────
    const tableCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'operator_qr_templates'
    `);
    if (tableCheck.length === 0) {
      await queryRunner.query(`
        CREATE TABLE "operator_qr_templates" (
          "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "service_key"         varchar(50) NOT NULL,
          "author_role"         varchar(30) NOT NULL DEFAULT 'operator',
          "title"               varchar(255) NOT NULL,
          "description"         text,
          "status"              varchar(20) NOT NULL DEFAULT 'draft',
          "target_type"         varchar(20) NOT NULL,
          "target_url"          text,
          "target_content_kind" varchar(20),
          "target_content_ref"  varchar(500),
          "published_at"        timestamptz,
          "created_at"          timestamp NOT NULL DEFAULT now(),
          "updated_at"          timestamp NOT NULL DEFAULT now()
        )
      `);

      // ── 2. CHECK 제약 — author_role 화이트리스트 (operator 만) ──
      await queryRunner.query(`
        ALTER TABLE "operator_qr_templates"
          ADD CONSTRAINT "CHK_operator_qr_templates_author_role"
            CHECK ("author_role" IN ('operator'))
      `);

      // ── 3. CHECK 제약 — status 화이트리스트 ──
      await queryRunner.query(`
        ALTER TABLE "operator_qr_templates"
          ADD CONSTRAINT "CHK_operator_qr_templates_status"
            CHECK ("status" IN ('draft', 'published', 'archived'))
      `);

      // ── 4. CHECK 제약 — target_type 화이트리스트 ──
      await queryRunner.query(`
        ALTER TABLE "operator_qr_templates"
          ADD CONSTRAINT "CHK_operator_qr_templates_target_type"
            CHECK ("target_type" IN ('url', 'content'))
      `);

      // ── 5. CHECK 제약 — target_type 별 NULL 조건 정합성 ──
      //    target_type='url'     → target_url NOT NULL, content_* NULL
      //    target_type='content' → content_kind + content_ref NOT NULL, target_url NULL
      await queryRunner.query(`
        ALTER TABLE "operator_qr_templates"
          ADD CONSTRAINT "CHK_operator_qr_templates_target_consistency"
            CHECK (
              (
                "target_type" = 'url'
                AND "target_url" IS NOT NULL
                AND "target_content_kind" IS NULL
                AND "target_content_ref" IS NULL
              )
              OR
              (
                "target_type" = 'content'
                AND "target_content_kind" IS NOT NULL
                AND "target_content_ref" IS NOT NULL
                AND "target_url" IS NULL
              )
            )
      `);

      // ── 6. 인덱스 ──
      // HUB query 최적화 — service_key + author_role + status 복합 조건 (queryQr 용)
      await queryRunner.query(`
        CREATE INDEX "IDX_operator_qr_templates_hub_query"
          ON "operator_qr_templates" ("service_key", "author_role", "status")
      `);
      // 정렬 최적화 — service_key + published_at
      await queryRunner.query(`
        CREATE INDEX "IDX_operator_qr_templates_service_published"
          ON "operator_qr_templates" ("service_key", "published_at")
      `);

      console.log(
        '[CreateOperatorQrTemplates] operator_qr_templates created with CHECK constraints + indexes (POP store_pops pattern mirror)',
      );
    } else {
      console.log('[CreateOperatorQrTemplates] operator_qr_templates already exists, skipping.');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_operator_qr_templates_service_published"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_operator_qr_templates_hub_query"`);
    await queryRunner.query(`
      ALTER TABLE "operator_qr_templates"
        DROP CONSTRAINT IF EXISTS "CHK_operator_qr_templates_target_consistency"
    `);
    await queryRunner.query(`
      ALTER TABLE "operator_qr_templates"
        DROP CONSTRAINT IF EXISTS "CHK_operator_qr_templates_target_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "operator_qr_templates"
        DROP CONSTRAINT IF EXISTS "CHK_operator_qr_templates_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "operator_qr_templates"
        DROP CONSTRAINT IF EXISTS "CHK_operator_qr_templates_author_role"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "operator_qr_templates"`);
  }
}
