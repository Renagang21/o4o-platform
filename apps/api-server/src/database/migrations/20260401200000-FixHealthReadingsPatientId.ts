import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * health_readings.patient_id 보정
 *
 * 약국에서 입력 시 glucoseview_customers.id가 patient_id로 저장된 경우
 * users.id로 변환한다.
 *
 * 또한 care_kpi_snapshots도 동일 보정.
 */
export class FixHealthReadingsPatientId1712070000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // health_readings: glucoseview_customers.id → user_id
    const hr = await queryRunner.query(`
      UPDATE health_readings hr
      SET patient_id = gc.user_id
      FROM glucoseview_customers gc
      WHERE hr.patient_id = gc.id
        AND gc.user_id IS NOT NULL
        AND hr.patient_id != gc.user_id
    `);
    console.log(`[Migration] health_readings patient_id fixed: ${hr[1] ?? 0} rows`);

    // care_kpi_snapshots: 동일 보정
    const kpi = await queryRunner.query(`
      UPDATE care_kpi_snapshots ks
      SET patient_id = gc.user_id
      FROM glucoseview_customers gc
      WHERE ks.patient_id = gc.id
        AND gc.user_id IS NOT NULL
        AND ks.patient_id != gc.user_id
    `);
    console.log(`[Migration] care_kpi_snapshots patient_id fixed: ${kpi[1] ?? 0} rows`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 되돌리기 불가 (원래 잘못된 값으로 되돌릴 이유 없음)
  }
}
