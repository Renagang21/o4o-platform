/**
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
 *
 * Create kpa_store_contents table for store-level independent content editing.
 * Snapshot content_json remains immutable (Core FROZEN).
 * Store edits stored separately; rendering uses COALESCE(store, snapshot).
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKpaStoreContents20260219000003 implements MigrationInterface {
  name = 'CreateKpaStoreContents20260219000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'kpa_store_contents'
    `);

    if (tableCheck.length > 0) {
      console.log('[Migration] kpa_store_contents already exists, skipping.');
      return;
    }

    await queryRunner.query(`
      CREATE TABLE "kpa_store_contents" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "snapshot_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "title" VARCHAR NOT NULL,
        "content_json" JSONB NOT NULL DEFAULT '{}',
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_by" UUID,
        CONSTRAINT "UQ_kpa_store_contents_snap_org"
          UNIQUE ("snapshot_id", "organization_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_store_contents_snap" ON "kpa_store_contents" ("snapshot_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_store_contents_org" ON "kpa_store_contents" ("organization_id")
    `);

    console.log('[Migration] kpa_store_contents table created.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_store_contents"`);
  }
}
