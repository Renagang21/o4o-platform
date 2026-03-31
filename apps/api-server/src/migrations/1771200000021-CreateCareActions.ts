import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CARE-ACTION-ENGINE-V2.2
 * care_actions 테이블 생성 — Action 생명주기 추적
 */
export class CreateCareActions1771200000021 implements MigrationInterface {
  name = 'CreateCareActions1771200000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS care_actions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        patient_id UUID NOT NULL,
        pharmacy_id UUID NOT NULL,
        action_type VARCHAR(30) NOT NULL,
        source_type VARCHAR(30) NOT NULL,
        source_key VARCHAR(100) NOT NULL,
        priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        payload JSONB,
        status VARCHAR(15) NOT NULL DEFAULT 'suggested',
        created_by_system BOOLEAN NOT NULL DEFAULT true,
        acted_by UUID,
        acted_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        dismissed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_care_actions_patient ON care_actions (patient_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_care_actions_pharmacy ON care_actions (pharmacy_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_care_actions_dedup ON care_actions (patient_id, action_type, source_type, source_key)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_care_actions_status ON care_actions (status, created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS care_actions`);
  }
}
