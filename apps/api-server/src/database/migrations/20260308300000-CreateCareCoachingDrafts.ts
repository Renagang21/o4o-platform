import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CARE-AI-COACHING-DRAFT-V1
 *
 * care_coaching_drafts — AI 코칭 초안 테이블
 */
export class CreateCareCoachingDrafts20260308300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS care_coaching_drafts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id UUID NOT NULL,
        snapshot_id UUID NOT NULL,
        pharmacy_id UUID NOT NULL,
        draft_message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_coaching_drafts_patient
        ON care_coaching_drafts (patient_id, status, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_coaching_drafts_pharmacy
        ON care_coaching_drafts (pharmacy_id, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS care_coaching_drafts`);
  }
}
