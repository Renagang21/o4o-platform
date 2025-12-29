/**
 * CGM GlucoseView - Install Lifecycle
 *
 * Creates tables and seeds hypothesis-based test data
 */

import { QueryRunner } from 'typeorm';

export async function install(queryRunner: QueryRunner): Promise<void> {
    console.log('[cgm-glucoseview] Installing...');

    // Create tables
    await createTables(queryRunner);

    // Seed hypothesis data
    await seedHypothesisData(queryRunner);

    console.log('[cgm-glucoseview] Installation complete');
}

async function createTables(queryRunner: QueryRunner): Promise<void> {
    // Table 1: cgm_patients
    await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS cgm_patients (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id uuid NOT NULL,
      pharmacy_id uuid,
      name varchar(100) NOT NULL,
      registered_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Table 2: cgm_patient_summaries
    await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS cgm_patient_summaries (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      patient_id uuid NOT NULL REFERENCES cgm_patients(id) ON DELETE CASCADE,
      period_start date NOT NULL,
      period_end date NOT NULL,
      status varchar(20) NOT NULL CHECK (status IN ('normal', 'warning', 'risk')),
      avg_glucose integer NOT NULL,
      time_in_range integer NOT NULL CHECK (time_in_range >= 0 AND time_in_range <= 100),
      time_above_range integer,
      time_below_range integer,
      summary_text text,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(patient_id, period_start, period_end)
    )
  `);

    // Table 3: cgm_glucose_insights
    await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS cgm_glucose_insights (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      patient_id uuid NOT NULL REFERENCES cgm_patients(id) ON DELETE CASCADE,
      insight_type varchar(50) NOT NULL,
      description text NOT NULL,
      generated_by varchar(20) NOT NULL CHECK (generated_by IN ('system', 'pharmacist', 'ai')),
      reference_period varchar(100),
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create indexes
    await queryRunner.query(`
    CREATE INDEX IF NOT EXISTS idx_cgm_patients_user_id ON cgm_patients(user_id);
    CREATE INDEX IF NOT EXISTS idx_cgm_summaries_patient_period ON cgm_patient_summaries(patient_id, period_start DESC);
    CREATE INDEX IF NOT EXISTS idx_cgm_insights_patient ON cgm_glucose_insights(patient_id, created_at DESC);
  `);

    console.log('[cgm-glucoseview] Tables created');
}

async function seedHypothesisData(queryRunner: QueryRunner): Promise<void> {
    console.log('[cgm-glucoseview] Seeding hypothesis data...');

    // Patient A: Post-meal hyperglycemia pattern
    const patientA = await queryRunner.query(`
    INSERT INTO cgm_patients (id, user_id, name, registered_at)
    VALUES (
      'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      '김당뇨',
      '2024-12-15'
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `);

    // Patient A - Week 1 Summary (warning status)
    await queryRunner.query(`
    INSERT INTO cgm_patient_summaries (patient_id, period_start, period_end, status, avg_glucose, time_in_range, time_above_range, time_below_range, summary_text)
    VALUES (
      'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      '2024-12-15',
      '2024-12-21',
      'warning',
      165,
      62,
      35,
      3,
      '식후 반복적인 고혈당 패턴이 관찰되었습니다. 특히 점심 식사 후 혈당 상승이 두드러집니다.'
    )
    ON CONFLICT (patient_id, period_start, period_end) DO NOTHING
  `);

    // Patient A - Week 2 Summary (improvement)
    await queryRunner.query(`
    INSERT INTO cgm_patient_summaries (patient_id, period_start, period_end, status, avg_glucose, time_in_range, time_above_range, time_below_range, summary_text)
    VALUES (
      'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      '2024-12-22',
      '2024-12-28',
      'normal',
      142,
      78,
      20,
      2,
      '지난 주 대비 혈당 조절이 개선되었습니다. 식후 혈당 상승 폭이 감소했습니다.'
    )
    ON CONFLICT (patient_id, period_start, period_end) DO NOTHING
  `);

    // Patient A - Insights
    await queryRunner.query(`
    INSERT INTO cgm_glucose_insights (patient_id, insight_type, description, generated_by, reference_period)
    VALUES
      (
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'meal_pattern',
        '점심 식사 후 2시간 시점에서 평균 210mg/dL로 상승하는 패턴이 주 5회 이상 반복되었습니다.',
        'system',
        '2024-12-15 to 2024-12-21'
      ),
      (
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'improvement',
        '최근 7일간 식후 혈당 관리가 개선되었습니다. 평균 식후 혈당이 210mg/dL에서 165mg/dL로 감소했습니다.',
        'system',
        '2024-12-22 to 2024-12-28'
      ),
      (
        'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        'pharmacist_comment',
        '식사 전 혈당강하제 복용 시간을 조정한 결과 식후 혈당 스파이크가 감소한 것으로 보입니다. 현재 복약 패턴 유지를 권장합니다.',
        'pharmacist',
        '2024-12-28'
      )
  `);

    // Patient B: Nocturnal hypoglycemia tendency
    await queryRunner.query(`
    INSERT INTO cgm_patients (id, user_id, name, registered_at)
    VALUES (
      'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
      'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
      '이저혈',
      '2024-12-08'
    )
    ON CONFLICT (id) DO NOTHING
  `);

    // Patient B - 2 Week Summary (risk status)
    await queryRunner.query(`
    INSERT INTO cgm_patient_summaries (patient_id, period_start, period_end, status, avg_glucose, time_in_range, time_above_range, time_below_range, summary_text)
    VALUES (
      'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
      '2024-12-08',
      '2024-12-21',
      'risk',
      138,
      68,
      12,
      20,
      '야간 시간대(새벽 2-4시)에 저혈당 경향이 관찰되었습니다. 주의가 필요합니다.'
    )
    ON CONFLICT (patient_id, period_start, period_end) DO NOTHING
  `);

    // Patient B - Recent Week (ongoing monitoring)
    await queryRunner.query(`
    INSERT INTO cgm_patient_summaries (patient_id, period_start, period_end, status, avg_glucose, time_in_range, time_above_range, time_below_range, summary_text)
    VALUES (
      'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
      '2024-12-22',
      '2024-12-28',
      'warning',
      145,
      72,
      15,
      13,
      '야간 저혈당 빈도가 다소 감소했으나 여전히 모니터링이 필요합니다.'
    )
    ON CONFLICT (patient_id, period_start, period_end) DO NOTHING
  `);

    // Patient B - Insights
    await queryRunner.query(`
    INSERT INTO cgm_glucose_insights (patient_id, insight_type, description, generated_by, reference_period)
    VALUES
      (
        'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
        'nocturnal_pattern',
        '새벽 2-4시 사이 혈당이 70mg/dL 이하로 떨어지는 패턴이 14일 중 8회 관찰되었습니다.',
        'system',
        '2024-12-08 to 2024-12-21'
      ),
      (
        'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
        'pharmacist_comment',
        '저녁 인슐린 용량 조정 후 야간 저혈당 빈도가 감소했습니다. 향후 2주간 모니터링 후 재평가 필요합니다.',
        'pharmacist',
        '2024-12-28'
      )
  `);

    console.log('[cgm-glucoseview] Hypothesis data seeding complete');
}

export default install;
