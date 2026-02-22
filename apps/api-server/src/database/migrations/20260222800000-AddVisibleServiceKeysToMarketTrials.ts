import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1
 *
 * Add visibleServiceKeys JSONB column to market_trials
 * for service-scoped visibility filtering.
 */
export class AddVisibleServiceKeysToMarketTrials1740222800000 implements MigrationInterface {
  name = 'AddVisibleServiceKeysToMarketTrials1740222800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "market_trials"
        ADD COLUMN IF NOT EXISTS "visibleServiceKeys" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_market_trials_visibleServiceKeys"
        ON "market_trials" USING GIN ("visibleServiceKeys")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_market_trials_visibleServiceKeys"`);
    await queryRunner.query(`ALTER TABLE "market_trials" DROP COLUMN IF EXISTS "visibleServiceKeys"`);
  }
}
