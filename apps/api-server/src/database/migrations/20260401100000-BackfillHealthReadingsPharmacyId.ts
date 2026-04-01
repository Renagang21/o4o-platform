import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CARE-PATIENT-SELF-INPUT-PHARMACY-VISIBILITY-FIX-V1
 *
 * health_readings.pharmacy_id가 null인 레코드 중
 * 환자-약국 연결(glucoseview_customers)이 존재하는 데이터를 backfill.
 *
 * 조건:
 * - health_readings.pharmacy_id IS NULL
 * - health_readings.patient_id = glucoseview_customers.user_id
 * - glucoseview_customers.organization_id IS NOT NULL
 */
export class BackfillHealthReadingsPharmacyId1712000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(`
      UPDATE health_readings hr
      SET pharmacy_id = gc.organization_id
      FROM glucoseview_customers gc
      WHERE hr.patient_id = gc.user_id
        AND gc.organization_id IS NOT NULL
        AND hr.pharmacy_id IS NULL
    `);
    console.log(`[Migration] Backfilled health_readings.pharmacy_id: ${result[1] ?? 0} rows`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: null로 되돌리기 (source_type = 'patient_self'인 것만)
    await queryRunner.query(`
      UPDATE health_readings
      SET pharmacy_id = NULL
      WHERE source_type = 'patient_self'
        AND pharmacy_id IS NOT NULL
    `);
  }
}
