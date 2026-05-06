import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-MARKET-TRIAL-LIFECYCLE-AUTO-TRANSITION-V1
 *
 * Adds lifecycle tracking columns to market_trials so the automatic
 * lifecycle job can record transitions without re-using FAILED state
 * (per WO: 실패도 CLOSED 상태로 유지).
 *
 * Columns:
 *   - lastTransitionAt   : timestamp of the latest status transition
 *   - autoClosedAt       : timestamp at which the cron auto-closed/auto-advanced
 *   - closeReason        : machine-readable transition reason
 *                          ('auto_target_reached' | 'auto_target_missed' | 'manual' | NULL)
 *   - statusHistory      : append-only audit trail of status transitions (jsonb)
 *
 * Index: (status, fundingEndAt) — speeds up cron's "RECRUITING + expired" scan.
 */
export class AddLifecycleTrackingToMarketTrials20260506000000 implements MigrationInterface {
  name = 'AddLifecycleTrackingToMarketTrials20260506000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trials
        ADD COLUMN IF NOT EXISTS "lastTransitionAt" TIMESTAMP DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE market_trials
        ADD COLUMN IF NOT EXISTS "autoClosedAt" TIMESTAMP DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE market_trials
        ADD COLUMN IF NOT EXISTS "closeReason" VARCHAR(50) DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE market_trials
        ADD COLUMN IF NOT EXISTS "statusHistory" JSONB NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_market_trials_status_fundingEndAt"
        ON market_trials ("status", "fundingEndAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_market_trials_status_fundingEndAt"`);
    await queryRunner.query(`ALTER TABLE market_trials DROP COLUMN IF EXISTS "statusHistory"`);
    await queryRunner.query(`ALTER TABLE market_trials DROP COLUMN IF EXISTS "closeReason"`);
    await queryRunner.query(`ALTER TABLE market_trials DROP COLUMN IF EXISTS "autoClosedAt"`);
    await queryRunner.query(`ALTER TABLE market_trials DROP COLUMN IF EXISTS "lastTransitionAt"`);
  }
}
