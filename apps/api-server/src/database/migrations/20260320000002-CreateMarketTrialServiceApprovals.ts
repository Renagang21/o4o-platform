import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * Create market_trial_service_approvals table for per-service 2nd approval
 */
export class CreateMarketTrialServiceApprovals1771200000018 implements MigrationInterface {
  name = 'CreateMarketTrialServiceApprovals1771200000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_service_approvals" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "trial_id" UUID NOT NULL,
        "service_key" VARCHAR(50) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "reviewed_by" UUID,
        "reviewed_at" TIMESTAMP,
        "reason" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("trial_id", "service_key")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mtsa_trial"
        ON "market_trial_service_approvals" ("trial_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mtsa_service_status"
        ON "market_trial_service_approvals" ("service_key", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mtsa_service_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mtsa_trial"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_service_approvals"`);
  }
}
