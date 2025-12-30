import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GlucoseView Seed Data Migration
 *
 * Phase C-2: GlucoseView DB Schema Implementation
 * Seeds initial vendors and view profiles
 *
 * NOTE: This is metadata only. No raw CGM data or patient information.
 */
export class SeedGlucoseViewData1735566000001 implements MigrationInterface {
  name = 'SeedGlucoseViewData1735566000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // Seed Vendors (CGM Manufacturers)
    // ============================================================================
    await queryRunner.query(`
      INSERT INTO "glucoseview_vendors" (
        "id", "name", "code", "description", "logo_url", "website_url",
        "supported_devices", "integration_type", "status", "sort_order"
      )
      VALUES
        (
          'v1000001-0001-0001-0001-000000000001',
          'Abbott',
          'ABBOTT',
          'FreeStyle Libre 시리즈 제조사. 세계 최대 CGM 제조업체.',
          NULL,
          'https://www.freestyle.abbott',
          '["FreeStyle Libre 2", "FreeStyle Libre 3"]',
          'manual',
          'active',
          1
        ),
        (
          'v1000001-0001-0001-0001-000000000002',
          'Dexcom',
          'DEXCOM',
          'Dexcom G6, G7 시리즈 제조사. 실시간 연속 혈당 모니터링 전문.',
          NULL,
          'https://www.dexcom.com',
          '["Dexcom G6", "Dexcom G7"]',
          'manual',
          'active',
          2
        ),
        (
          'v1000001-0001-0001-0001-000000000003',
          'Medtronic',
          'MEDTRONIC',
          'Guardian 시리즈 제조사. 인슐린 펌프 통합 시스템.',
          NULL,
          'https://www.medtronic.com',
          '["Guardian 3", "Guardian 4"]',
          'manual',
          'planned',
          3
        ),
        (
          'v1000001-0001-0001-0001-000000000004',
          'Senseonics',
          'SENSEONICS',
          'Eversense 이식형 CGM 제조사. 장기 착용형 센서.',
          NULL,
          'https://www.senseonics.com',
          '["Eversense E3"]',
          'manual',
          'planned',
          4
        )
      ON CONFLICT (code) DO NOTHING
    `);

    // ============================================================================
    // Seed View Profiles (Display Configurations)
    // ============================================================================
    await queryRunner.query(`
      INSERT INTO "glucoseview_view_profiles" (
        "id", "name", "code", "description", "summary_level", "chart_type",
        "time_range_days", "show_tir", "show_average", "show_variability",
        "target_low", "target_high", "status", "is_default", "sort_order"
      )
      VALUES
        (
          'vp000001-0001-0001-0001-000000000001',
          '기본 일간 뷰',
          'DAILY_BASIC',
          '약사 상담용 기본 일간 혈당 요약. 평균값과 TIR만 표시.',
          'simple',
          'daily',
          7,
          true,
          true,
          false,
          70,
          180,
          'active',
          true,
          1
        ),
        (
          'vp000001-0001-0001-0001-000000000002',
          '표준 주간 뷰',
          'WEEKLY_STANDARD',
          '주간 혈당 패턴 분석. 평균, TIR, 변동성 포함.',
          'standard',
          'weekly',
          14,
          true,
          true,
          true,
          70,
          180,
          'active',
          false,
          2
        ),
        (
          'vp000001-0001-0001-0001-000000000003',
          '트렌드 분석 뷰',
          'TREND_DETAILED',
          '장기 트렌드 분석. 30일 데이터 기반 상세 분석.',
          'detailed',
          'trend',
          30,
          true,
          true,
          true,
          70,
          180,
          'active',
          false,
          3
        ),
        (
          'vp000001-0001-0001-0001-000000000004',
          'AGP 리포트',
          'AGP_REPORT',
          'Ambulatory Glucose Profile. 표준화된 혈당 패턴 리포트.',
          'detailed',
          'agp',
          14,
          true,
          true,
          true,
          70,
          180,
          'draft',
          false,
          4
        )
      ON CONFLICT (code) DO NOTHING
    `);

    console.log('[Migration] GlucoseView seed data inserted successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "glucoseview_connections"
    `);

    await queryRunner.query(`
      DELETE FROM "glucoseview_view_profiles" WHERE code IN (
        'DAILY_BASIC',
        'WEEKLY_STANDARD',
        'TREND_DETAILED',
        'AGP_REPORT'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "glucoseview_vendors" WHERE code IN (
        'ABBOTT',
        'DEXCOM',
        'MEDTRONIC',
        'SENSEONICS'
      )
    `);

    console.log('[Migration] GlucoseView seed data removed');
  }
}
