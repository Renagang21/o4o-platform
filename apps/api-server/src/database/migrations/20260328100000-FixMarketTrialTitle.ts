import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix garbled Korean title in market trial record.
 * The title contains mojibake characters — rename to "Trial Test 1".
 */
export class FixMarketTrialTitle20260328100000 implements MigrationInterface {
  name = 'FixMarketTrialTitle20260328100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE market_trials
       SET title = 'Trial Test 1', updated_at = NOW()
       WHERE title LIKE '%MARKET-TRIAL-PHASE1-POST-DEPLOY-VERIFY%'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: original title was corrupted
  }
}
