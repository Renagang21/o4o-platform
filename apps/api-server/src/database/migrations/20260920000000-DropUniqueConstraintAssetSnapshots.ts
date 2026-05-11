import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1
 *
 * Community → 내 자료함 흐름을 "완전 복사 기반" 으로 정렬한다.
 * 동일 원본을 여러 번 자료함에 추가할 수 있어야 하며, 추가 시마다 새 library item
 * (= o4o_asset_snapshots row)이 생성된다. sourceAssetId 는 통계/출처 메타데이터로만
 * 유지되고, 운영적 dedupe 의미는 제거된다.
 *
 * 본 migration 은 20260216100001-AddUniqueConstraintAssetSnapshots 가 추가한
 * (organization_id, source_asset_id, asset_type) UNIQUE 제약을 제거한다.
 *
 * 백엔드 코드의 explicit DUPLICATE_SNAPSHOT 검사는 동일 WO 의 asset-copy.service.ts
 * 변경으로 함께 제거된다 (해당 catch path 는 controller 에서 dead code 로 남음).
 */
export class DropUniqueConstraintAssetSnapshots20260920000000 implements MigrationInterface {
  name = 'DropUniqueConstraintAssetSnapshots20260920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "o4o_asset_snapshots"
      DROP CONSTRAINT IF EXISTS "UQ_asset_snapshot_org_source_type"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 복원: 동일 (organization_id, source_asset_id, asset_type) 행이 이미 다수 존재한다면
    //       이 down 은 실패한다 — 운영자가 수동으로 중복을 정리해야 한다.
    await queryRunner.query(`
      ALTER TABLE "o4o_asset_snapshots"
      ADD CONSTRAINT "UQ_asset_snapshot_org_source_type"
      UNIQUE ("organization_id", "source_asset_id", "asset_type")
    `);
  }
}
