import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStorePlaylistIdToSchedules20260425200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Make playlistId nullable (store-only schedules won't have a signage_playlists reference)
    await queryRunner.query(`
      ALTER TABLE signage_schedules ALTER COLUMN "playlistId" DROP NOT NULL
    `);

    // 2. Add storePlaylistId column (nullable — only used for store playlist schedules)
    await queryRunner.query(`
      ALTER TABLE signage_schedules
      ADD COLUMN IF NOT EXISTS "storePlaylistId" uuid NULL
    `);

    // 3. Index for storePlaylistId lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_signage_schedules_storePlaylistId"
      ON signage_schedules ("storePlaylistId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_signage_schedules_storePlaylistId"`);
    await queryRunner.query(`ALTER TABLE signage_schedules DROP COLUMN IF EXISTS "storePlaylistId"`);
    await queryRunner.query(`ALTER TABLE signage_schedules ALTER COLUMN "playlistId" SET NOT NULL`);
  }
}
