import type { MigrationInterface, QueryRunner } from "typeorm";
export class AddFundingOfflineState1792212000000 implements MigrationInterface {
  name = "AddFundingOfflineState1792212000000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE public.market_trials ADD COLUMN "offlineState" jsonb NOT NULL DEFAULT '{"version":0,"decision":"pending"}'::jsonb CHECK(jsonb_typeof("offlineState")='object')`,
    );
    await q.query(
      `ALTER TABLE public.market_trial_participants ADD COLUMN "offlineState" jsonb NOT NULL DEFAULT '{"version":0,"withdrawn":false,"refundAmount":0}'::jsonb CHECK(jsonb_typeof("offlineState")='object')`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE public.market_trial_participants DROP COLUMN "offlineState"',
    );
    await q.query(
      'ALTER TABLE public.market_trials DROP COLUMN "offlineState"',
    );
  }
}
