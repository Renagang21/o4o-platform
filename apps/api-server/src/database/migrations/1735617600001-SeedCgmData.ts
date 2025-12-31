import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed CGM Demo Data
 *
 * Phase C-3: GlucoseView Demo Data
 * Creates sample patients, summaries, and insights for testing
 */
export class SeedCgmData1735617600001 implements MigrationInterface {
  name = 'SeedCgmData1735617600001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert sample patients
    await queryRunner.query(`
      INSERT INTO "cgm_patients" (id, user_id, name, registered_at, is_active)
      VALUES
        ('11111111-1111-1111-1111-111111111111', 'demo-user-1', '김철수', '2024-11-01', true),
        ('22222222-2222-2222-2222-222222222222', 'demo-user-2', '이영희', '2024-10-15', true),
        ('33333333-3333-3333-3333-333333333333', 'demo-user-3', '박민수', '2024-12-01', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // Insert sample summaries for patient 1 (김철수 - normal)
    await queryRunner.query(`
      INSERT INTO "cgm_patient_summaries" (id, patient_id, period_start, period_end, status, avg_glucose, time_in_range, time_above_range, time_below_range, summary_text)
      VALUES
        ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2024-12-15', '2024-12-29', 'normal', 118.5, 78.5, 15.0, 6.5, '혈당 관리가 안정적입니다. 목표 범위 내 시간이 78%로 양호합니다.'),
        ('aaaa1111-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', '2024-12-01', '2024-12-14', 'normal', 122.3, 75.0, 18.0, 7.0, '이전 기간과 유사한 패턴을 보입니다.')
      ON CONFLICT (id) DO NOTHING
    `);

    // Insert sample summaries for patient 2 (이영희 - warning)
    await queryRunner.query(`
      INSERT INTO "cgm_patient_summaries" (id, patient_id, period_start, period_end, status, avg_glucose, time_in_range, time_above_range, time_below_range, summary_text)
      VALUES
        ('bbbb2222-2222-2222-2222-111111111111', '22222222-2222-2222-2222-222222222222', '2024-12-15', '2024-12-29', 'warning', 145.2, 62.0, 32.0, 6.0, '고혈당 시간이 증가했습니다. 식후 혈당 관리가 필요합니다.'),
        ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '2024-12-01', '2024-12-14', 'normal', 128.5, 72.0, 22.0, 6.0, '양호한 상태를 유지하고 있습니다.')
      ON CONFLICT (id) DO NOTHING
    `);

    // Insert sample summaries for patient 3 (박민수 - risk)
    await queryRunner.query(`
      INSERT INTO "cgm_patient_summaries" (id, patient_id, period_start, period_end, status, avg_glucose, time_in_range, time_above_range, time_below_range, summary_text)
      VALUES
        ('cccc3333-3333-3333-3333-111111111111', '33333333-3333-3333-3333-333333333333', '2024-12-15', '2024-12-29', 'risk', 168.8, 45.0, 48.0, 7.0, '혈당 변동이 큽니다. 약국 상담을 권장합니다.'),
        ('cccc3333-3333-3333-3333-222222222222', '33333333-3333-3333-3333-333333333333', '2024-12-01', '2024-12-14', 'warning', 152.0, 55.0, 38.0, 7.0, '주의가 필요한 상태입니다.')
      ON CONFLICT (id) DO NOTHING
    `);

    // Insert sample insights
    await queryRunner.query(`
      INSERT INTO "cgm_glucose_insights" (id, patient_id, insight_type, description, generated_by, reference_period)
      VALUES
        ('iiii1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'pattern', '아침 공복 혈당이 안정적으로 유지되고 있습니다.', 'ai', '2024-12-15 ~ 2024-12-29'),
        ('iiii1111-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 'recommendation', '현재 식습관을 유지하시면 좋겠습니다.', 'pharmacist', '2024-12-15 ~ 2024-12-29'),
        ('iiii2222-2222-2222-2222-111111111111', '22222222-2222-2222-2222-222222222222', 'pattern', '저녁 식후 혈당이 높게 나타납니다.', 'ai', '2024-12-15 ~ 2024-12-29'),
        ('iiii2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'recommendation', '저녁 식사량 조절을 권장드립니다.', 'pharmacist', '2024-12-15 ~ 2024-12-29'),
        ('iiii3333-3333-3333-3333-111111111111', '33333333-3333-3333-3333-333333333333', 'alert', '야간 저혈당 빈도가 증가했습니다.', 'system', '2024-12-15 ~ 2024-12-29'),
        ('iiii3333-3333-3333-3333-222222222222', '33333333-3333-3333-3333-333333333333', 'recommendation', '취침 전 간식 섭취를 고려해보세요.', 'pharmacist', '2024-12-15 ~ 2024-12-29')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('[Migration] CGM demo data seeded successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "cgm_glucose_insights" WHERE patient_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')`);
    await queryRunner.query(`DELETE FROM "cgm_patient_summaries" WHERE patient_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')`);
    await queryRunner.query(`DELETE FROM "cgm_patients" WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')`);

    console.log('[Migration] CGM demo data removed');
  }
}
