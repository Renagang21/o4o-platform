import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSurveyRewardFields20260521120000 implements MigrationInterface {
  name = 'AddSurveyRewardFields20260521120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "lms_surveys"
        ADD COLUMN IF NOT EXISTS "reward_enabled" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "reward_amount" integer NOT NULL DEFAULT 100
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "lms_surveys"
        DROP COLUMN IF EXISTS "reward_enabled",
        DROP COLUMN IF EXISTS "reward_amount"
    `);
  }
}
