import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-SIGNAGE-FORCED-CONTENT-IMPLEMENTATION-V1
 *
 * Creates tables for operator-injected forced signage content.
 * Forced content is merged at query time into all store playlists
 * for the matching service_key.
 */
export class CreateSignageForcedContent20260418100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Main forced content table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS signage_forced_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        video_url TEXT NOT NULL,
        source_type VARCHAR(20) NOT NULL,
        embed_id VARCHAR(100),
        thumbnail_url TEXT,
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        note TEXT,
        created_by_user_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sfc_service_key_active
        ON signage_forced_content (service_key, is_active)
        WHERE deleted_at IS NULL
    `);

    // Per-playlist position overrides for forced content
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS signage_forced_content_positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        playlist_id UUID NOT NULL,
        forced_content_id UUID NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 9999,
        CONSTRAINT uq_sfcp UNIQUE (playlist_id, forced_content_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sfcp_playlist_id
        ON signage_forced_content_positions (playlist_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS signage_forced_content_positions`);
    await queryRunner.query(`DROP TABLE IF EXISTS signage_forced_content`);
  }
}
