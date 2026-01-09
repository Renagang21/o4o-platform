import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateChannelPlaybackLog Migration
 * WO-P5-CHANNEL-PLAYBACK-LOG-P0
 *
 * Creates the channel_playback_logs table for recording
 * actual playback events from signage players.
 */
export class CreateChannelPlaybackLog1736700000000 implements MigrationInterface {
  name = 'CreateChannelPlaybackLog1736700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create channel_playback_logs table
    await queryRunner.query(`
      CREATE TABLE "channel_playback_logs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "channel_id" UUID NOT NULL,
        "content_id" UUID NOT NULL,
        "service_key" VARCHAR(50),
        "organization_id" UUID,
        "played_at" TIMESTAMP NOT NULL,
        "duration_sec" INTEGER NOT NULL,
        "completed" BOOLEAN NOT NULL DEFAULT TRUE,
        "source" VARCHAR(30) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_channel_playback_logs" PRIMARY KEY ("id")
      )
    `);

    // Index for channel-time queries (most common query pattern)
    await queryRunner.query(`
      CREATE INDEX "IDX_playback_channel_time"
        ON "channel_playback_logs" ("channel_id", "played_at")
    `);

    // Index for content queries
    await queryRunner.query(`
      CREATE INDEX "IDX_playback_content"
        ON "channel_playback_logs" ("content_id")
    `);

    // Index for service/organization queries
    await queryRunner.query(`
      CREATE INDEX "IDX_playback_service_org"
        ON "channel_playback_logs" ("service_key", "organization_id")
    `);

    // Add comment for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "channel_playback_logs" IS 'Records actual playback events from signage players (WO-P5-CHANNEL-PLAYBACK-LOG-P0)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_playback_service_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_playback_content"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_playback_channel_time"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channel_playback_logs"`);
  }
}
