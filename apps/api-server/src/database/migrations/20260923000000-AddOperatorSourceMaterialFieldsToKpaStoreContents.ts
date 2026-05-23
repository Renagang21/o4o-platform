import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-OPERATOR-SOURCE-MATERIALS-DATA-MODEL-EXTENSION-V1
 *
 * kpa_store_contents 테이블에 Operator Workspace A 의 4개 컬럼 추가:
 *   - authorRole         (enum: 'operator' | 'store')
 *   - visibility_scope   (enum: 'organization')
 *   - source_metadata    (jsonb)
 *   - workspace_status   (enum: 'draft' | 'pending_ai' | 'ai_processed' | 'ready_curation' | 'archived')
 *
 * 본 확장의 의도:
 *   - kpa_store_contents 는 단기 SSOT 로서 Operator Workspace A 의 "운영자 수신 원천 자료" 도
 *     함께 저장한다. 신규 테이블 신설은 중장기 IR 후속 (별도 검토).
 *   - Operator Source Material 은 공급자 직접 등록 자료가 아니다 — 운영자가 외부/오프라인으로
 *     수신한 원천 자료를 등록하는 용도이다.
 *   - HUB 직접 노출 대상이 아니며, Workspace B (AI 작업) / C (큐레이션) 를 거쳐야 매장 실행
 *     자산이 된다.
 *
 * Drift 방지 (CHECK 제약):
 *   - author_role 은 'supplier' 금지 (Canonical: Supplier 는 O4O 내부 Producer 아님)
 *   - visibility_scope 는 'global' / 'service' 금지 (Workspace A 자료의 HUB 직접 노출 차단)
 *
 * 기존 데이터:
 *   - 기존 row 는 source_type='snapshot_edit' 또는 'direct' 의 매장 편집 콘텐츠
 *   - default 적용 후 author_role='operator', visibility_scope='organization',
 *     workspace_status='draft' 로 backfill (의미상 무난한 안전 default)
 *
 * 대상 서비스: 본 테이블은 KPA / GlycoPharm / Cosmetics 3 서비스 공통 사용 중
 *   (O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1 — legacy physical name).
 *   migration 은 단일 테이블만 변경하므로 3 서비스 모두에 동시 적용됨.
 *
 * 참조:
 *   - docs/investigations/IR-O4O-OPERATOR-WORKSPACE-A-OFFLINE-SOURCE-INGESTION-DESIGN-V1.md §7
 *   - docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md §4 Category A
 *   - docs/baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md §3
 */
export class AddOperatorSourceMaterialFieldsToKpaStoreContents20260923000000
  implements MigrationInterface
{
  name = 'AddOperatorSourceMaterialFieldsToKpaStoreContents20260923000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. author_role ─────────────────────────────────────────────────
    const authorRoleCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'kpa_store_contents'
        AND column_name = 'author_role'
    `);
    if (authorRoleCheck.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "kpa_store_contents"
          ADD COLUMN "author_role" VARCHAR(30) NOT NULL DEFAULT 'operator'
      `);
      // CHECK: 'supplier' 금지 (Canonical: O4O 내부 Producer 아님)
      await queryRunner.query(`
        ALTER TABLE "kpa_store_contents"
          ADD CONSTRAINT "CHK_kpa_store_contents_author_role"
            CHECK ("author_role" IN ('operator', 'store'))
      `);
      console.log(
        '[AddOperatorSourceMaterialFieldsToKpaStoreContents] author_role added (default=operator, CHECK in (operator,store))',
      );
    }

    // ── 2. visibility_scope ────────────────────────────────────────────
    const visibilityCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'kpa_store_contents'
        AND column_name = 'visibility_scope'
    `);
    if (visibilityCheck.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "kpa_store_contents"
          ADD COLUMN "visibility_scope" VARCHAR(30) NOT NULL DEFAULT 'organization'
      `);
      // CHECK: 'organization' 만 허용 (Workspace A 자료의 HUB 직접 노출 차단)
      await queryRunner.query(`
        ALTER TABLE "kpa_store_contents"
          ADD CONSTRAINT "CHK_kpa_store_contents_visibility_scope"
            CHECK ("visibility_scope" = 'organization')
      `);
      console.log(
        '[AddOperatorSourceMaterialFieldsToKpaStoreContents] visibility_scope added (default=organization, CHECK = organization)',
      );
    }

    // ── 3. source_metadata ─────────────────────────────────────────────
    const metadataCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'kpa_store_contents'
        AND column_name = 'source_metadata'
    `);
    if (metadataCheck.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "kpa_store_contents"
          ADD COLUMN "source_metadata" JSONB NOT NULL DEFAULT '{}'::jsonb
      `);
      console.log(
        '[AddOperatorSourceMaterialFieldsToKpaStoreContents] source_metadata added (jsonb default {})',
      );
    }

    // ── 4. workspace_status ────────────────────────────────────────────
    const workspaceStatusCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'kpa_store_contents'
        AND column_name = 'workspace_status'
    `);
    if (workspaceStatusCheck.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "kpa_store_contents"
          ADD COLUMN "workspace_status" VARCHAR(30) NOT NULL DEFAULT 'draft'
      `);
      await queryRunner.query(`
        ALTER TABLE "kpa_store_contents"
          ADD CONSTRAINT "CHK_kpa_store_contents_workspace_status"
            CHECK ("workspace_status" IN ('draft', 'pending_ai', 'ai_processed', 'ready_curation', 'archived'))
      `);
      console.log(
        '[AddOperatorSourceMaterialFieldsToKpaStoreContents] workspace_status added (default=draft, CHECK 5 values)',
      );
    }

    // ── 인덱스: workspace_status 필터 자주 사용될 예정 ─────────────────
    const idxCheck = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'kpa_store_contents'
        AND indexname = 'IDX_kpa_store_contents_workspace_status'
    `);
    if (idxCheck.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_kpa_store_contents_workspace_status"
          ON "kpa_store_contents" ("workspace_status")
      `);
      console.log(
        '[AddOperatorSourceMaterialFieldsToKpaStoreContents] index IDX_kpa_store_contents_workspace_status created',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 역순 복원
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_kpa_store_contents_workspace_status"`,
    );

    await queryRunner.query(`
      ALTER TABLE "kpa_store_contents"
        DROP CONSTRAINT IF EXISTS "CHK_kpa_store_contents_workspace_status"
    `);
    await queryRunner.query(
      `ALTER TABLE "kpa_store_contents" DROP COLUMN IF EXISTS "workspace_status"`,
    );

    await queryRunner.query(
      `ALTER TABLE "kpa_store_contents" DROP COLUMN IF EXISTS "source_metadata"`,
    );

    await queryRunner.query(`
      ALTER TABLE "kpa_store_contents"
        DROP CONSTRAINT IF EXISTS "CHK_kpa_store_contents_visibility_scope"
    `);
    await queryRunner.query(
      `ALTER TABLE "kpa_store_contents" DROP COLUMN IF EXISTS "visibility_scope"`,
    );

    await queryRunner.query(`
      ALTER TABLE "kpa_store_contents"
        DROP CONSTRAINT IF EXISTS "CHK_kpa_store_contents_author_role"
    `);
    await queryRunner.query(
      `ALTER TABLE "kpa_store_contents" DROP COLUMN IF EXISTS "author_role"`,
    );
  }
}
