import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLOBAL-EVENT-LOG-MINIMAL-V1
 *
 * Minimal cross-service event log table (`o4o_event_logs`).
 *
 * Purpose: accumulate raw events for future AI analysis. No retrieval API,
 * no admin UI in this WO — write-only at the platform level. Initial caller
 * is the LMS approval flow only.
 *
 * Schema adaptation: `entity_id` and `actor_id` are VARCHAR(64) instead of
 * BIGINT (as per the WO sketch) to accommodate the codebase's UUID IDs
 * (Course.id, User.id are uuid). This is the only deliberate deviation from
 * the WO numeric-ID assumption.
 *
 * All DDL is IF NOT EXISTS — safe to re-run.
 */
export class CreateO4OEventLogs20260914000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS o4o_event_logs (
        id BIGSERIAL PRIMARY KEY,
        service_key VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor_id VARCHAR(64) NULL,
        actor_role VARCHAR(50) NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_event_logs_entity
        ON o4o_event_logs (entity_type, entity_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_event_logs_service
        ON o4o_event_logs (service_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_event_logs_created_at
        ON o4o_event_logs (created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_event_logs_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_event_logs_service`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_event_logs_entity`);
    await queryRunner.query(`DROP TABLE IF EXISTS o4o_event_logs`);
  }
}
