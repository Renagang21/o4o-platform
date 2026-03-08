import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CARE-ALERT-ENGINE-V1
 *
 * care_alerts — 자동 알림 테이블
 */
export class CreateCareAlerts20260308500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS care_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        pharmacy_id UUID NOT NULL,
        patient_id UUID NOT NULL,
        alert_type VARCHAR(30) NOT NULL,
        severity VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(15) NOT NULL DEFAULT 'open',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_alerts_pharmacy_status
        ON care_alerts (pharmacy_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_alerts_patient_type_status
        ON care_alerts (patient_id, alert_type, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS care_alerts`);
  }
}
