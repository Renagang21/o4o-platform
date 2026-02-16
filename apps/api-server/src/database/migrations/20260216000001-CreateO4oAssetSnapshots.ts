import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
 * Create o4o_asset_snapshots table for cross-service asset copy/snapshot
 */
export class CreateO4oAssetSnapshots20260216000001 implements MigrationInterface {
  name = 'CreateO4oAssetSnapshots20260216000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'o4o_asset_snapshots'
      ) AS "exists";
    `);

    if (tableExists[0]?.exists) {
      console.log('[CreateO4oAssetSnapshots] Table already exists, skipping.');
      return;
    }

    await queryRunner.query(`
      CREATE TABLE "o4o_asset_snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "source_service" varchar(50) NOT NULL,
        "source_asset_id" uuid NOT NULL,
        "asset_type" varchar(20) NOT NULL,
        "title" text NOT NULL,
        "content_json" jsonb NOT NULL DEFAULT '{}',
        "created_by" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_o4o_asset_snapshots" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_asset_snap_org_id" ON "o4o_asset_snapshots" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_asset_snap_asset_type" ON "o4o_asset_snapshots" ("asset_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_asset_snap_source" ON "o4o_asset_snapshots" ("source_service", "source_asset_id")
    `);

    console.log('[CreateO4oAssetSnapshots] Table and indexes created successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "o4o_asset_snapshots"`);
  }
}
