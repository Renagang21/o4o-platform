import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
 *
 * Adds PG-ready payment lifecycle fields to market_trial_participants.
 * Settlement (보상 정산) and Payment (결제 lifecycle) are intentionally separate:
 *   - settlement* columns: reward distribution after trial outcome (existing)
 *   - payment* columns:    money-in lifecycle (new, this migration)
 *
 * No PG-specific column is introduced — provider/method are free-form varchar so
 * future Toss/KG/Naver/Kakao integrations can land without another migration.
 */
export class AddPaymentFieldsToMarketTrialParticipants20260506010000 implements MigrationInterface {
  name = 'AddPaymentFieldsToMarketTrialParticipants20260506010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    `);
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(50) DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "paymentProvider" VARCHAR(50) DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "paymentReference" VARCHAR(255) DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2) DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "paymentNote" TEXT DEFAULT NULL
    `);

    // Operator filter: list participants by trial + payment state
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_market_trial_participants_marketTrialId_paymentStatus"
        ON market_trial_participants ("marketTrialId", "paymentStatus")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_market_trial_participants_marketTrialId_paymentStatus"`);
    await queryRunner.query(`ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS "paymentNote"`);
    await queryRunner.query(`ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS "confirmedAt"`);
    await queryRunner.query(`ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS "paidAt"`);
    await queryRunner.query(`ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS "paidAmount"`);
    await queryRunner.query(`ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS "paymentReference"`);
    await queryRunner.query(`ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS "paymentProvider"`);
    await queryRunner.query(`ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS "paymentMethod"`);
    await queryRunner.query(`ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS "paymentStatus"`);
  }
}
