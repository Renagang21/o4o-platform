import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuidelineContentIdToCoaching20260328500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE care_coaching_sessions
      ADD COLUMN IF NOT EXISTS guideline_content_id UUID NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE care_coaching_sessions
      DROP COLUMN IF EXISTS guideline_content_id
    `);
  }
}
