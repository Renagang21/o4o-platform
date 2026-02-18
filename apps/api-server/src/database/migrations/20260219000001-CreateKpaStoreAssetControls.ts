/**
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V1
 *
 * KPA-a Extension: Store Asset 운영 제어 테이블
 * Core(o4o_asset_snapshots) 변경 없이 KPA 전용 publish 상태 관리
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKpaStoreAssetControls20260219000001 implements MigrationInterface {
  name = 'CreateKpaStoreAssetControls20260219000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'kpa_store_asset_controls'
      ) AS "exists";
    `);

    if (tableExists[0]?.exists) {
      console.log('[Migration] kpa_store_asset_controls already exists, skipping.');
      return;
    }

    await queryRunner.query(`
      CREATE TABLE "kpa_store_asset_controls" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "snapshot_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "publish_status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_kpa_store_asset_ctrl_snap_org"
          UNIQUE ("snapshot_id", "organization_id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_store_asset_ctrl_org"
        ON "kpa_store_asset_controls" ("organization_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_store_asset_ctrl_snap"
        ON "kpa_store_asset_controls" ("snapshot_id");
    `);

    console.log('[Migration] kpa_store_asset_controls created.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_store_asset_controls"`);
  }
}
