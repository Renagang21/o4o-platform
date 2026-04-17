import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MONITOR-1: 포럼 연계 모니터링 강화
 *
 * Market Trial 포럼 자동 연계 실패 이력 테이블 생성.
 * 운영자가 누락 건을 조회하고 resolved 처리할 수 있도록 한다.
 */
export class CreateMarketTrialForumSyncFailures1771200000020 implements MigrationInterface {
  name = 'CreateMarketTrialForumSyncFailures1771200000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_forum_sync_failures" (
        "id"               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "trial_id"         UUID        NOT NULL,
        "trial_title"      VARCHAR(500) NOT NULL,
        "stage"            VARCHAR(50) NOT NULL,
        "severity"         VARCHAR(20) NOT NULL DEFAULT 'critical',
        "error_message"    TEXT        NOT NULL,
        "error_stack"      TEXT,
        "occurred_at"      TIMESTAMP   NOT NULL DEFAULT NOW(),
        "resolved_at"      TIMESTAMP,
        "resolution_note"  TEXT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mtfsf_trial"
        ON "market_trial_forum_sync_failures" ("trial_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mtfsf_resolved"
        ON "market_trial_forum_sync_failures" ("resolved_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mtfsf_resolved"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mtfsf_trial"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_forum_sync_failures"`);
  }
}
