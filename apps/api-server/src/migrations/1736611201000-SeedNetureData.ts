import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Neture P1 Migration - Seed Sample Data
 *
 * Work Order: WO-NETURE-CORE-P1
 * Phase: P1 (Backend Integration)
 *
 * Inserts sample data for testing:
 * - 4 suppliers with products
 * - 3 partnership requests with products
 *
 * Data based on P0 mock data for consistency
 */
export class SeedNetureData1736611201000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // 1. Insert Suppliers
    // ============================================================================

    // ABC 제약
    await queryRunner.query(`
      INSERT INTO neture_suppliers (
        slug, name, logo_url, category, short_description, description,
        pricing_policy, moq, shipping_standard, shipping_island, shipping_mountain,
        contact_email, contact_phone, contact_website, contact_kakao, status
      ) VALUES (
        'abc-pharma',
        'ABC 제약',
        'https://via.placeholder.com/150',
        '의약품',
        '검증된 의약품 공급자',
        'ABC 제약은 20년 경력의 의약품 전문 공급자입니다. 품질과 신뢰를 최우선으로 하며, 다양한 의약품을 공급하고 있습니다.',
        '도매가 기준 20% 할인',
        '50개 이상',
        '무료 배송',
        '3,000원',
        '5,000원',
        'contact@abc-pharma.com',
        '02-1234-5678',
        'https://abc-pharma.com',
        'https://pf.kakao.com/abc-pharma',
        'ACTIVE'
      )
    `);

    const abcPharmaId = await queryRunner.query(`
      SELECT id FROM neture_suppliers WHERE slug = 'abc-pharma'
    `);

    await queryRunner.query(`
      INSERT INTO neture_supplier_products (supplier_id, name, category, description) VALUES
      ('${abcPharmaId[0].id}', '비타민 C', '건강기능식품', '고함량 비타민 C'),
      ('${abcPharmaId[0].id}', '오메가3', '건강기능식품', '프리미엄 오메가3'),
      ('${abcPharmaId[0].id}', '유산균', '건강기능식품', '장 건강 유산균')
    `);

    // XYZ 헬스케어
    await queryRunner.query(`
      INSERT INTO neture_suppliers (
        slug, name, logo_url, category, short_description, description,
        pricing_policy, moq, shipping_standard, shipping_island, shipping_mountain,
        contact_email, contact_phone, contact_website, contact_kakao, status
      ) VALUES (
        'xyz-health',
        'XYZ 헬스케어',
        'https://via.placeholder.com/150',
        '건강기능식품',
        '프리미엄 건강기능식품 전문',
        'XYZ 헬스케어는 프리미엄 건강기능식품을 전문으로 공급하는 기업입니다.',
        '도매가 기준 15% 할인',
        '30개 이상',
        '무료 배송',
        '3,000원',
        '5,000원',
        'info@xyz-health.com',
        '02-9876-5432',
        'https://xyz-health.com',
        'https://pf.kakao.com/xyz-health',
        'ACTIVE'
      )
    `);

    const xyzHealthId = await queryRunner.query(`
      SELECT id FROM neture_suppliers WHERE slug = 'xyz-health'
    `);

    await queryRunner.query(`
      INSERT INTO neture_supplier_products (supplier_id, name, category, description) VALUES
      ('${xyzHealthId[0].id}', '콜라겐', '건강기능식품', '피부 건강 콜라겐'),
      ('${xyzHealthId[0].id}', '루테인', '건강기능식품', '눈 건강 루테인')
    `);

    // 웰빙랩
    await queryRunner.query(`
      INSERT INTO neture_suppliers (
        slug, name, logo_url, category, short_description, description,
        pricing_policy, moq, shipping_standard, shipping_island, shipping_mountain,
        contact_email, contact_phone, contact_website, contact_kakao, status
      ) VALUES (
        'wellbeing-lab',
        '웰빙랩',
        'https://via.placeholder.com/150',
        '의료기기',
        '디지털 헬스케어 기기 전문',
        '웰빙랩은 최신 디지털 헬스케어 기기를 공급하는 전문 기업입니다.',
        '도매가 기준 25% 할인',
        '20개 이상',
        '무료 배송',
        '5,000원',
        '7,000원',
        'support@wellbeing-lab.com',
        '02-5555-6666',
        'https://wellbeing-lab.com',
        'https://pf.kakao.com/wellbeing-lab',
        'ACTIVE'
      )
    `);

    const wellbeingLabId = await queryRunner.query(`
      SELECT id FROM neture_suppliers WHERE slug = 'wellbeing-lab'
    `);

    await queryRunner.query(`
      INSERT INTO neture_supplier_products (supplier_id, name, category, description) VALUES
      ('${wellbeingLabId[0].id}', '혈당 측정기', '의료기기', '정확한 혈당 측정'),
      ('${wellbeingLabId[0].id}', '혈압계', '의료기기', '가정용 혈압계')
    `);

    // 그린네이처
    await queryRunner.query(`
      INSERT INTO neture_suppliers (
        slug, name, logo_url, category, short_description, description,
        pricing_policy, moq, shipping_standard, shipping_island, shipping_mountain,
        contact_email, contact_phone, contact_website, contact_kakao, status
      ) VALUES (
        'green-nature',
        '그린네이처',
        'https://via.placeholder.com/150',
        '건강기능식품',
        '천연 원료 건강식품',
        '그린네이처는 천연 원료로 만든 프리미엄 건강식품을 공급합니다.',
        '도매가 기준 18% 할인',
        '40개 이상',
        '무료 배송',
        '3,000원',
        '5,000원',
        'hello@green-nature.com',
        '02-7777-8888',
        'https://green-nature.com',
        'https://pf.kakao.com/green-nature',
        'ACTIVE'
      )
    `);

    const greenNatureId = await queryRunner.query(`
      SELECT id FROM neture_suppliers WHERE slug = 'green-nature'
    `);

    await queryRunner.query(`
      INSERT INTO neture_supplier_products (supplier_id, name, category, description) VALUES
      ('${greenNatureId[0].id}', '홍삼', '건강기능식품', '6년근 홍삼'),
      ('${greenNatureId[0].id}', '프로폴리스', '건강기능식품', '면역력 프로폴리스')
    `);

    // ============================================================================
    // 2. Insert Partnership Requests
    // ============================================================================

    // 서울약국 - OPEN
    await queryRunner.query(`
      INSERT INTO neture_partnership_requests (
        seller_id, seller_name, seller_service_type, seller_store_url,
        product_count, period_start, period_end, revenue_structure, status,
        promotion_sns, promotion_content, promotion_banner, promotion_other,
        contact_email, contact_phone, contact_kakao, created_at
      ) VALUES (
        'seller-1',
        '서울약국',
        'glycopharm',
        'https://glycopharm.co.kr/store/seoul-pharmacy',
        12,
        '2026-02-01',
        '2026-07-31',
        '매출의 5% 수익 배분 (홍보 활동 기준)',
        'OPEN',
        true,
        true,
        false,
        '월 1회 뉴스레터 발송',
        'seoul@pharmacy.com',
        '010-1234-5678',
        'https://pf.kakao.com/seoul-pharmacy',
        '2026-01-15T00:00:00Z'
      )
    `);

    const seoulPharmacyId = await queryRunner.query(`
      SELECT id FROM neture_partnership_requests WHERE seller_id = 'seller-1'
    `);

    await queryRunner.query(`
      INSERT INTO neture_partnership_products (partnership_request_id, name, category) VALUES
      ('${seoulPharmacyId[0].id}', '당뇨 영양제', '건강기능식품'),
      ('${seoulPharmacyId[0].id}', '혈당 측정기', '의료기기'),
      ('${seoulPharmacyId[0].id}', '당뇨 간식', '건강식품')
    `);

    // 부산약국 - OPEN
    await queryRunner.query(`
      INSERT INTO neture_partnership_requests (
        seller_id, seller_name, seller_service_type, seller_store_url,
        product_count, period_start, period_end, revenue_structure, status,
        promotion_sns, promotion_content, promotion_banner, promotion_other,
        contact_email, contact_phone, contact_kakao, created_at
      ) VALUES (
        'seller-2',
        '부산약국',
        'glycopharm',
        'https://glycopharm.co.kr/store/busan-pharmacy',
        8,
        '2026-01-20',
        '2026-06-30',
        '매출의 7% 수익 배분 (SNS 홍보 기준)',
        'OPEN',
        true,
        false,
        true,
        '',
        'busan@pharmacy.com',
        '010-9876-5432',
        'https://pf.kakao.com/busan-pharmacy',
        '2026-01-10T00:00:00Z'
      )
    `);

    const busanPharmacyId = await queryRunner.query(`
      SELECT id FROM neture_partnership_requests WHERE seller_id = 'seller-2'
    `);

    await queryRunner.query(`
      INSERT INTO neture_partnership_products (partnership_request_id, name, category) VALUES
      ('${busanPharmacyId[0].id}', '비타민 D', '건강기능식품'),
      ('${busanPharmacyId[0].id}', '오메가3', '건강기능식품')
    `);

    // 뷰티코스메틱 - MATCHED
    await queryRunner.query(`
      INSERT INTO neture_partnership_requests (
        seller_id, seller_name, seller_service_type, seller_store_url,
        product_count, period_start, period_end, revenue_structure, status,
        promotion_sns, promotion_content, promotion_banner, promotion_other,
        contact_email, contact_phone, contact_kakao, created_at, matched_at
      ) VALUES (
        'seller-3',
        '뷰티코스메틱',
        'k-cosmetics',
        'https://k-cosmetics.co.kr/store/beauty-cosmetic',
        15,
        '2026-02-15',
        '2026-08-15',
        '매출의 10% 수익 배분 (전체 판매 기준)',
        'MATCHED',
        true,
        true,
        true,
        '인스타그램 스토리 주 2회',
        'beauty@cosmetic.com',
        '010-5555-6666',
        'https://pf.kakao.com/beauty-cosmetic',
        '2026-01-05T00:00:00Z',
        '2026-01-18T00:00:00Z'
      )
    `);

    const beautyId = await queryRunner.query(`
      SELECT id FROM neture_partnership_requests WHERE seller_id = 'seller-3'
    `);

    await queryRunner.query(`
      INSERT INTO neture_partnership_products (partnership_request_id, name, category) VALUES
      ('${beautyId[0].id}', '비타민C 세럼', '화장품'),
      ('${beautyId[0].id}', '콜라겐 크림', '화장품'),
      ('${beautyId[0].id}', '선크림', '화장품')
    `);

    console.log('✅ Neture sample data seeded successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete in reverse order to respect FK constraints
    await queryRunner.query(`DELETE FROM neture_partnership_products`);
    await queryRunner.query(`DELETE FROM neture_partnership_requests`);
    await queryRunner.query(`DELETE FROM neture_supplier_products`);
    await queryRunner.query(`DELETE FROM neture_suppliers`);

    console.log('✅ Neture sample data removed successfully');
  }
}
