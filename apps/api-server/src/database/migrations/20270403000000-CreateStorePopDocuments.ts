import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 * 정본 계약: docs/architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md
 *
 * POP V2 의 1급 개체인 **POP Document** 원장 1개를 신설한다.
 *
 * 왜 `store_pops` 를 재사용하지 않는가 (계약 문서 §3)
 *   `store_pops` 는 `(store_id, slug)` UNIQUE · `published_at` · `author_role` +
 *   `IDX_store_pops_hub_query` 를 가진 **발행(publishing) 아티클 모델**이다.
 *   operator → HUB → 매장 배포 의미를 인코딩하고 있어 매장 내부 인쇄물의
 *   저작(authoring) 축과 직교한다. `content text NOT NULL` 에 POP 필드 JSON 을
 *   밀어넣는 것은 legacy physical table 오버로딩이다 (CLAUDE.md §5).
 *   **`store_pops` 는 삭제하지 않는다** — 콘텐츠 축으로 살아 있고 V2 의 source 가 된다.
 *
 * 안전 계약
 *   - 신규 테이블 1개만. 기존 테이블·컬럼·행 **무변경**.
 *   - `store_execution_assets(usage_type='pop')` 기존 행은 과거 output history 로 보존한다.
 *     backfill 0 — 과거 산출물에서 Document 를 역산하지 않는다(원본 입력이 남아 있지 않다).
 *   - FK 는 QR 계열 관행대로 물리 FK 없이 논리 참조 + 경계 index 로 보장한다
 *     (Boundary Guard Rule 3 — Store Ops 경계 = organization_id).
 *
 * 불변식 I1(Source-Required) 은 DB CHECK 로 강제한다 —
 * POP Document 가 "POP 전용 콘텐츠 원장"으로 변질되는 것을 막는 유일한 구조적 장치다.
 */
export class CreateStorePopDocuments20270403000000 implements MigrationInterface {
  name = 'CreateStorePopDocuments20270403000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_pop_documents (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id       UUID NOT NULL,
        service_key           VARCHAR(50) NOT NULL,
        title                 VARCHAR(255) NOT NULL,
        pop_kind              VARCHAR(20) NOT NULL,
        content_type          VARCHAR(40) NULL,
        sources               JSONB NOT NULL DEFAULT '[]'::jsonb,
        fields                JSONB NOT NULL DEFAULT '{}'::jsonb,
        template_id           VARCHAR(60) NOT NULL,
        layout                VARCHAR(10) NOT NULL DEFAULT 'A4',
        qr_code_id            UUID NULL,
        status                VARCHAR(20) NOT NULL DEFAULT 'draft',
        last_output_asset_id  UUID NULL,
        created_by            UUID NULL,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      COMMENT ON TABLE store_pop_documents IS
        'POP V2 저작 문서 원장(canonical). store_pops(발행 아티클)와 다른 축. 출력물 이력은 store_execution_assets(usage_type=pop).'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN store_pop_documents.sources IS
        'PopV2Source[] — {origin,id,title}. origin=direct|snapshot|library|local|store_pop|spd|listing. 불변식 I1: 항상 1개 이상(콘텐츠 원장이 아님을 강제).'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN store_pop_documents.qr_code_id IS
        '지면에 삽입할 QR. 불변식 I5 — 매장 배치(Placement) 사실을 뜻하지 않는다. Placement 는 store_qr_placements 축이며 V2 범위 밖.'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN store_pop_documents.service_key IS
        '표시·라우팅용 adapter 축. 경계 판정에 쓰지 않는다 — Store Ops 경계는 organization_id (CLAUDE.md §7).'
    `);

    // 불변식 I1 — Source-Required. POP 전용 콘텐츠 원장화 방지.
    await queryRunner.query(`
      ALTER TABLE store_pop_documents
      ADD CONSTRAINT CHK_spd_sources_nonempty
      CHECK (jsonb_typeof(sources) = 'array' AND jsonb_array_length(sources) >= 1)
    `);
    await queryRunner.query(`
      ALTER TABLE store_pop_documents
      ADD CONSTRAINT CHK_spd_kind CHECK (pop_kind IN ('product', 'content'))
    `);
    await queryRunner.query(`
      ALTER TABLE store_pop_documents
      ADD CONSTRAINT CHK_spd_status CHECK (status IN ('draft', 'ready', 'archived'))
    `);
    await queryRunner.query(`
      ALTER TABLE store_pop_documents
      ADD CONSTRAINT CHK_spd_layout CHECK (layout IN ('A4', 'A5'))
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_store_pop_documents_org_status
      ON store_pop_documents (organization_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_store_pop_documents_org_updated
      ON store_pop_documents (organization_id, updated_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_store_pop_documents_org_updated`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_store_pop_documents_org_status`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_pop_documents`);
  }
}
