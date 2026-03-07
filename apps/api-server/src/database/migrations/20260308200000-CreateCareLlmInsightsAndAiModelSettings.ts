import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CARE-LLM-INSIGHT-V1
 *
 * 1. care_llm_insights — LLM 결과 캐시 (snapshot 당 1건)
 * 2. ai_model_settings — 서비스별 모델 설정
 */
export class CreateCareLlmInsightsAndAiModelSettings20260308200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. care_llm_insights
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS care_llm_insights (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        snapshot_id UUID NOT NULL,
        pharmacy_id UUID NOT NULL,
        patient_id UUID NOT NULL,
        pharmacy_insight TEXT NOT NULL,
        patient_message TEXT NOT NULL,
        model VARCHAR(100) NOT NULL,
        prompt_tokens INT NOT NULL DEFAULT 0,
        completion_tokens INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_llm_insights_patient
        ON care_llm_insights (patient_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_llm_insights_snapshot
        ON care_llm_insights (snapshot_id)
    `);

    // 2. ai_model_settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_model_settings (
        id SERIAL PRIMARY KEY,
        service VARCHAR(50) NOT NULL UNIQUE,
        model VARCHAR(100) NOT NULL DEFAULT 'gemini-2.0-flash',
        temperature NUMERIC(3,2) NOT NULL DEFAULT 0.3,
        max_tokens INT NOT NULL DEFAULT 2048,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default care setting
    await queryRunner.query(`
      INSERT INTO ai_model_settings (service, model, temperature, max_tokens)
      VALUES ('care', 'gemini-2.0-flash', 0.3, 2048)
      ON CONFLICT (service) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS care_llm_insights`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_model_settings`);
  }
}
