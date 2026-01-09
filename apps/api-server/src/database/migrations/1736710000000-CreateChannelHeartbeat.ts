import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateChannelHeartbeat Migration
 * WO-P5-CHANNEL-HEARTBEAT-P1
 *
 * Creates the channel_heartbeats table for tracking
 * device health and online status from signage players.
 */
export class CreateChannelHeartbeat1736710000000 implements MigrationInterface {
  name = 'CreateChannelHeartbeat1736710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create channel_heartbeats table
    await queryRunner.query(`
      CREATE TABLE "channel_heartbeats" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "channel_id" UUID NOT NULL,
        "service_key" VARCHAR(50),
        "organization_id" UUID,
        "player_version" VARCHAR(50),
        "device_type" VARCHAR(50),
        "platform" VARCHAR(50),
        "ip_address" VARCHAR(100),
        "is_online" BOOLEAN NOT NULL DEFAULT TRUE,
        "uptime_sec" INTEGER,
        "metrics" JSONB NOT NULL DEFAULT '{}',
        "received_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_channel_heartbeats" PRIMARY KEY ("id")
      )
    `);

    // Index for channel-time queries (most common query pattern)
    await queryRunner.query(`
      CREATE INDEX "IDX_heartbeat_channel_time"
        ON "channel_heartbeats" ("channel_id", "received_at" DESC)
    `);

    // Index for service/organization queries
    await queryRunner.query(`
      CREATE INDEX "IDX_heartbeat_service_org"
        ON "channel_heartbeats" ("service_key", "organization_id")
    `);

    // Add comment for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "channel_heartbeats" IS 'Records heartbeat signals from signage players for device health tracking (WO-P5-CHANNEL-HEARTBEAT-P1)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_heartbeat_service_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_heartbeat_channel_time"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channel_heartbeats"`);
  }
}
