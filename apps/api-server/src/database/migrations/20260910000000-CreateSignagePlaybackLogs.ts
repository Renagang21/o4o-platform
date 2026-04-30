import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSignagePlaybackLogs20260910000000 implements MigrationInterface {
  name = 'CreateSignagePlaybackLogs20260910000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS signage_playback_logs (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key  VARCHAR(50) NOT NULL,
        media_id     UUID        NOT NULL,
        playlist_id  UUID,
        played_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        organization_id UUID,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sp_logs_service_time
        ON signage_playback_logs (service_key, played_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sp_logs_media
        ON signage_playback_logs (media_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sp_logs_playlist
        ON signage_playback_logs (playlist_id)
        WHERE playlist_id IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sp_logs_playlist`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sp_logs_media`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sp_logs_service_time`);
    await queryRunner.query(`DROP TABLE IF EXISTS signage_playback_logs`);
  }
}
