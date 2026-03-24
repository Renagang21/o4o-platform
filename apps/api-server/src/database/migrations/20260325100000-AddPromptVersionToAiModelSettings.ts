import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-AI-PROMPT-VERSIONING-V1
 * ai_model_settings 테이블에 prompt_version 컬럼 추가
 */
export class AddPromptVersionToAiModelSettings20260325100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_model_settings
      ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(20) DEFAULT 'v1'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_model_settings DROP COLUMN IF EXISTS prompt_version
    `);
  }
}
