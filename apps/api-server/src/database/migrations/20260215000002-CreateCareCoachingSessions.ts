import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCareCoachingSessions20260215000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS care_coaching_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id UUID NOT NULL,
        pharmacist_id UUID NOT NULL,
        snapshot_id UUID,
        summary TEXT NOT NULL,
        action_plan TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_care_coaching_patient_created ON care_coaching_sessions (patient_id, created_at DESC)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS care_coaching_sessions`);
  }
}
