import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1 (IR Phase 2-B-2, 2026-06-05)
 *
 * store_asset_derivations 테이블 신설 — 원본(source) ↔ 파생 결과물(derived) 관계 추적.
 *
 * 비파괴(non-destructive):
 *  - 기존 테이블 변경 없음 / 백필 없음 / nullable 컬럼 유지.
 *  - polymorphic relation → FK 미사용 (source/derived 가 여러 테이블·boundary·삭제정책 상이).
 *
 * 컬럼: id / service_key / organization_id / source_kind / source_id / source_title
 *       / derived_kind / derived_id / derived_title / created_by / metadata / created_at / updated_at
 *
 * 인덱스: org / source(복합) / derived(복합)
 * UNIQUE: (service_key, organization_id, source_kind, source_id, derived_kind, derived_id)
 *   → 동일 원본-결과물 관계 중복 방지. 동일 source 에서 서로 다른 결과물(derived_id 상이)은 허용.
 *
 * 참조: docs/investigations/IR-KPA-STORE-ASSET-DERIVED-LINK-AND-UNIFIED-VIEW-SCHEMA-V1.md
 */
export class CreateStoreAssetDerivations20261103000000 implements MigrationInterface {
  name = 'CreateStoreAssetDerivations20261103000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'store_asset_derivations'
    `);
    if (tableCheck.length > 0) {
      console.log('[CreateStoreAssetDerivations] store_asset_derivations already exists, skipping.');
      return;
    }

    await queryRunner.query(`
      CREATE TABLE "store_asset_derivations" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "service_key"     varchar(100) NOT NULL,
        "organization_id" uuid NOT NULL,
        "source_kind"     varchar(50) NOT NULL,
        "source_id"       uuid NOT NULL,
        "source_title"    varchar(255),
        "derived_kind"    varchar(50) NOT NULL,
        "derived_id"      uuid NOT NULL,
        "derived_title"   varchar(255),
        "created_by"      uuid,
        "metadata"        jsonb,
        "created_at"      timestamp NOT NULL DEFAULT now(),
        "updated_at"      timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_asset_derivations_org"
        ON "store_asset_derivations" ("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_asset_derivations_source"
        ON "store_asset_derivations" ("service_key", "organization_id", "source_kind", "source_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_store_asset_derivations_derived"
        ON "store_asset_derivations" ("service_key", "organization_id", "derived_kind", "derived_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_store_asset_derivations_relation"
        ON "store_asset_derivations"
        ("service_key", "organization_id", "source_kind", "source_id", "derived_kind", "derived_id")
    `);

    console.log('[CreateStoreAssetDerivations] store_asset_derivations created with indexes + unique relation.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_store_asset_derivations_relation"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_asset_derivations_derived"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_asset_derivations_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_asset_derivations_org"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_asset_derivations"`);
  }
}
