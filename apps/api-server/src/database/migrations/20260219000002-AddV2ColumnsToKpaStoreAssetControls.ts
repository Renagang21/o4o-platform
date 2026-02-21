/**
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V2
 *
 * Add channel_map, forced injection, period control, locked status columns
 * to kpa_store_asset_controls table.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddV2ColumnsToKpaStoreAssetControls20260219000002 implements MigrationInterface {
  name = 'AddV2ColumnsToKpaStoreAssetControls20260219000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists (idempotent)
    const colCheck = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'kpa_store_asset_controls'
        AND column_name = 'channel_map'
    `);

    if (colCheck.length > 0) {
      console.log('[Migration] V2 columns already exist on kpa_store_asset_controls, skipping.');
      return;
    }

    await queryRunner.query(`
      ALTER TABLE "kpa_store_asset_controls"
        ADD COLUMN "channel_map" JSONB NOT NULL DEFAULT '{}',
        ADD COLUMN "is_forced" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN "forced_by_admin_id" UUID,
        ADD COLUMN "forced_start_at" TIMESTAMP,
        ADD COLUMN "forced_end_at" TIMESTAMP,
        ADD COLUMN "is_locked" BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_store_asset_ctrl_forced"
        ON "kpa_store_asset_controls" ("is_forced")
        WHERE "is_forced" = true
    `);

    console.log('[Migration] V2 columns added to kpa_store_asset_controls.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kpa_store_asset_ctrl_forced"`);
    await queryRunner.query(`
      ALTER TABLE "kpa_store_asset_controls"
        DROP COLUMN IF EXISTS "channel_map",
        DROP COLUMN IF EXISTS "is_forced",
        DROP COLUMN IF EXISTS "forced_by_admin_id",
        DROP COLUMN IF EXISTS "forced_start_at",
        DROP COLUMN IF EXISTS "forced_end_at",
        DROP COLUMN IF EXISTS "is_locked"
    `);
  }
}
