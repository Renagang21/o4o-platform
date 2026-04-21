/**
 * WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1
 *
 * store_library_items → store_execution_assets
 *
 * 매장 "자료실" 개념을 제거하고 "실행 자산(Execution Assets)" 구조로 재정의.
 * - 테이블 rename
 * - usage_type 컬럼 추가 (pop | qr | signage | banner | notice)
 * - 기존 인덱스 재생성
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameStoreLibraryToExecutionAssets20260421010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 테이블 rename
    await queryRunner.query(`ALTER TABLE store_library_items RENAME TO store_execution_assets`);

    // 2. 기존 인덱스 rename
    await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_store_library_items_org" RENAME TO "IDX_store_execution_assets_org"`);
    await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_store_library_items_org_active" RENAME TO "IDX_store_execution_assets_org_active"`);
    await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_store_library_items_asset_type" RENAME TO "IDX_store_execution_assets_asset_type"`);

    // 3. usage_type 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE store_execution_assets
      ADD COLUMN IF NOT EXISTS usage_type VARCHAR(20) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_execution_assets_usage_type"
      ON store_execution_assets (organization_id, usage_type)
      WHERE is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_execution_assets_usage_type"`);
    await queryRunner.query(`ALTER TABLE store_execution_assets DROP COLUMN IF EXISTS usage_type`);

    await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_store_execution_assets_org" RENAME TO "IDX_store_library_items_org"`);
    await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_store_execution_assets_org_active" RENAME TO "IDX_store_library_items_org_active"`);
    await queryRunner.query(`ALTER INDEX IF EXISTS "IDX_store_execution_assets_asset_type" RENAME TO "IDX_store_library_items_asset_type"`);

    await queryRunner.query(`ALTER TABLE store_execution_assets RENAME TO store_library_items`);
  }
}
