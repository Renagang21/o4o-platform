import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CONTENT-ANALYTICS
 *
 * Creates content_analytics table for event tracking:
 * - view, qr_scan, quiz_submit, survey_submit, share events
 * - Fire-and-forget pattern (CreateDateColumn only, no FK)
 */
export class CreateContentAnalyticsTable1771200000014 implements MigrationInterface {
  name = 'CreateContentAnalyticsTable1771200000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE content_analytics_event_type AS ENUM ('view', 'qr_scan', 'quiz_submit', 'survey_submit', 'share');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "content_analytics" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_content_id" UUID NOT NULL,
        "event_type" content_analytics_event_type NOT NULL,
        "visitor_id" VARCHAR(100),
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_content_analytics_content_event"
        ON "content_analytics" ("store_content_id", "event_type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_content_analytics_content_date"
        ON "content_analytics" ("store_content_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_content_analytics_event_date"
        ON "content_analytics" ("event_type", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_content_analytics_event_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_content_analytics_content_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_content_analytics_content_event"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "content_analytics"`);
    await queryRunner.query(`DROP TYPE IF EXISTS content_analytics_event_type`);
  }
}
