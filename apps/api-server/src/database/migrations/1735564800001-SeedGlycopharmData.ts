import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Glycopharm Seed Data Migration
 *
 * Phase B-2: Glycopharm DB Schema Implementation
 * Seeds initial pharmacies and sample products
 */
export class SeedGlycopharmData1735564800001 implements MigrationInterface {
  name = 'SeedGlycopharmData1735564800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // Seed Pharmacies
    // ============================================================================
    await queryRunner.query(`
      INSERT INTO "glycopharm_pharmacies" ("id", "name", "code", "address", "phone", "owner_name", "status", "sort_order")
      VALUES
        ('c1b2c3d4-e5f6-7890-abcd-111111111111', '글리코팜 강남점', 'GCP-GN001', '서울특별시 강남구 테헤란로 123', '02-1234-5678', '김약사', 'active', 1),
        ('c1b2c3d4-e5f6-7890-abcd-222222222222', '글리코팜 홍대점', 'GCP-HD001', '서울특별시 마포구 홍익로 45', '02-2345-6789', '이약사', 'active', 2),
        ('c1b2c3d4-e5f6-7890-abcd-333333333333', '글리코팜 판교점', 'GCP-PG001', '경기도 성남시 분당구 판교로 256', '031-345-6789', '박약사', 'active', 3)
      ON CONFLICT (code) DO NOTHING
    `);

    // ============================================================================
    // Seed Products
    // ============================================================================
    await queryRunner.query(`
      INSERT INTO "glycopharm_products" (
        "id", "pharmacy_id", "name", "sku", "category", "description",
        "price", "sale_price", "stock_quantity", "manufacturer", "status", "is_featured"
      )
      VALUES
        (
          'd1b2c3d4-e5f6-7890-abcd-111111111111',
          'c1b2c3d4-e5f6-7890-abcd-111111111111',
          'FreeStyle Libre 3 센서',
          'FSL3-SENSOR-001',
          'cgm_device',
          '연속 혈당 측정 시스템. 14일간 실시간 혈당 모니터링 가능. 스마트폰 앱 연동 지원.',
          89000,
          79000,
          50,
          'Abbott',
          'active',
          true
        ),
        (
          'd1b2c3d4-e5f6-7890-abcd-222222222222',
          'c1b2c3d4-e5f6-7890-abcd-111111111111',
          'FreeStyle Libre 3 리더기',
          'FSL3-READER-001',
          'cgm_device',
          'FreeStyle Libre 3 센서와 호환되는 전용 리더기',
          120000,
          NULL,
          30,
          'Abbott',
          'active',
          false
        ),
        (
          'd1b2c3d4-e5f6-7890-abcd-333333333333',
          'c1b2c3d4-e5f6-7890-abcd-222222222222',
          'Dexcom G7 센서',
          'DEX-G7-SENSOR-001',
          'cgm_device',
          '차세대 연속 혈당 모니터링 시스템. 10일 사용, 60분 웜업 타임.',
          99000,
          NULL,
          25,
          'Dexcom',
          'active',
          true
        ),
        (
          'd1b2c3d4-e5f6-7890-abcd-444444444444',
          NULL,
          '혈당 측정 시험지 (50매)',
          'BGS-STRIP-050',
          'test_strip',
          '정확한 혈당 측정을 위한 시험지 50매 세트',
          25000,
          22000,
          200,
          'Roche',
          'active',
          false
        ),
        (
          'd1b2c3d4-e5f6-7890-abcd-555555555555',
          NULL,
          '란셋 펜 세트',
          'LAN-PEN-SET-001',
          'lancet',
          '혈당 측정용 채혈 란셋 펜 + 란셋 100개 세트',
          15000,
          NULL,
          100,
          '메디올',
          'active',
          false
        ),
        (
          'd1b2c3d4-e5f6-7890-abcd-666666666666',
          'c1b2c3d4-e5f6-7890-abcd-333333333333',
          '혈당 측정기 베이직',
          'BGM-BASIC-001',
          'meter',
          '가정용 혈당 측정기. 간편한 사용법, 5초 측정.',
          35000,
          29000,
          80,
          '삼성헬스케어',
          'active',
          false
        ),
        (
          'd1b2c3d4-e5f6-7890-abcd-777777777777',
          NULL,
          'CGM 센서 부착 패치 (20매)',
          'CGM-PATCH-020',
          'accessory',
          'CGM 센서 보호 및 고정용 방수 패치',
          12000,
          NULL,
          150,
          '글리코팜',
          'active',
          false
        ),
        (
          'd1b2c3d4-e5f6-7890-abcd-888888888888',
          NULL,
          '당뇨 관리 스타터 키트',
          'DM-STARTER-KIT',
          'other',
          '혈당 측정기 + 시험지 50매 + 란셋 세트 + 파우치',
          55000,
          49000,
          40,
          '글리코팜',
          'draft',
          false
        )
      ON CONFLICT (sku) DO NOTHING
    `);

    console.log('[Migration] Glycopharm seed data inserted successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "glycopharm_products" WHERE sku IN (
        'FSL3-SENSOR-001',
        'FSL3-READER-001',
        'DEX-G7-SENSOR-001',
        'BGS-STRIP-050',
        'LAN-PEN-SET-001',
        'BGM-BASIC-001',
        'CGM-PATCH-020',
        'DM-STARTER-KIT'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "glycopharm_pharmacies" WHERE code IN (
        'GCP-GN001',
        'GCP-HD001',
        'GCP-PG001'
      )
    `);

    console.log('[Migration] Glycopharm seed data removed');
  }
}
