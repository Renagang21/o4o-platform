import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `tags` (jsonb string[]) column to store-side 콘텐츠 source 3 tables.
 * WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1
 *
 * `/store/library/contents` 통합 feed 의 3 source 에 태그 저장/표시 기반을 마련한다.
 *   - kpa_store_contents     (매장 직접 작성 콘텐츠)
 *   - o4o_asset_snapshots    (매장이 가져온 사본 — 기존 tags 는 content_json 에 존재, 컬럼은 향후 정규화/검색용 예약)
 *   - store_execution_assets (매장 제작 자료/실행 자산)
 *
 * 정책: jsonb string[] 배열, 빈 값은 '[]'. 기존 row 는 default '[]' 로 안전.
 * 태그 검색/필터 및 GIN index 는 후속 WO(TAG-SEARCH-FILTER)에서 처리하므로 이 migration 은 컬럼만 추가한다
 * (트랜잭션 migration 이라 CREATE INDEX CONCURRENTLY 불가 → 이번 단계에서 index 보류).
 */
export class AddTagsToStoreContentSources20261126000000 implements MigrationInterface {
  name = 'AddTagsToStoreContentSources20261126000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "kpa_store_contents" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "o4o_asset_snapshots" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_execution_assets" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    console.log('[Migration] tags jsonb added to kpa_store_contents / o4o_asset_snapshots / store_execution_assets');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "store_execution_assets" DROP COLUMN IF EXISTS "tags"`);
    await queryRunner.query(`ALTER TABLE "o4o_asset_snapshots" DROP COLUMN IF EXISTS "tags"`);
    await queryRunner.query(`ALTER TABLE "kpa_store_contents" DROP COLUMN IF EXISTS "tags"`);
    console.log('[Migration] tags column dropped from 3 store content source tables');
  }
}
