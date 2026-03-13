import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-GLUCOSEVIEW-AI-GLUCOSE-INSIGHT-V1
 *
 * patient_ai_insights — 환자 전용 AI 인사이트 캐시 (1일 1회).
 */
export class CreatePatientAiInsights20260315120000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS patient_ai_insights (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id UUID NOT NULL,
        summary TEXT NOT NULL,
        warning TEXT NOT NULL DEFAULT '',
        tip TEXT NOT NULL DEFAULT '',
        model VARCHAR(100) NOT NULL,
        prompt_tokens INT NOT NULL DEFAULT 0,
        completion_tokens INT NOT NULL DEFAULT 0,
        generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_ai_insights_patient
        ON patient_ai_insights (patient_id, generated_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS patient_ai_insights`);
  }
}
