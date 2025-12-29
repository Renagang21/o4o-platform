/**
 * SeedCosmeticsData Migration
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * Seeds initial cosmetics data for development/testing
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCosmeticsData1735470000001 implements MigrationInterface {
  name = 'SeedCosmeticsData1735470000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only seed in development environment
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      console.log('[Migration] Skipping seed data in production');
      return;
    }

    // 1. Seed brands
    await queryRunner.query(`
      INSERT INTO cosmetics.cosmetics_brands (id, name, slug, description, is_active, sort_order)
      VALUES
        ('b1000000-0000-0000-0000-000000000001', 'Neture Beauty', 'neture-beauty', '자연에서 영감받은 프리미엄 화장품 브랜드', true, 1),
        ('b1000000-0000-0000-0000-000000000002', 'Skin Lab', 'skin-lab', '피부 과학 연구 기반 스킨케어 브랜드', true, 2),
        ('b1000000-0000-0000-0000-000000000003', 'Pure Essence', 'pure-essence', '순수 자연 성분 화장품', true, 3)
      ON CONFLICT (slug) DO NOTHING
    `);

    // 2. Seed lines
    await queryRunner.query(`
      INSERT INTO cosmetics.cosmetics_lines (id, brand_id, name, slug, description, is_active, sort_order)
      VALUES
        ('l1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '모이스처 라인', 'moisture-line', '수분 충전 스킨케어 라인', true, 1),
        ('l1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', '안티에이징 라인', 'anti-aging-line', '주름 개선 안티에이징 라인', true, 2),
        ('l1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', '민감성 라인', 'sensitive-line', '민감성 피부용 저자극 라인', true, 1),
        ('l1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', '에센셜 라인', 'essential-line', '필수 스킨케어 기본 라인', true, 1)
      ON CONFLICT DO NOTHING
    `);

    // 3. Seed products
    await queryRunner.query(`
      INSERT INTO cosmetics.cosmetics_products (
        id, brand_id, line_id, name, description, ingredients, status,
        base_price, sale_price, currency, images
      )
      VALUES
        (
          'p1000000-0000-0000-0000-000000000001',
          'b1000000-0000-0000-0000-000000000001',
          'l1000000-0000-0000-0000-000000000001',
          '하이드라 모이스처 크림',
          '24시간 수분 공급 크림. 히알루론산과 세라마이드가 풍부하게 함유되어 있습니다.',
          '["히알루론산", "세라마이드", "판테놀", "알로에 베라"]',
          'visible',
          45000,
          38000,
          'KRW',
          '[{"url": "https://example.com/images/product1.jpg", "alt": "하이드라 모이스처 크림", "is_primary": true, "order": 1}]'
        ),
        (
          'p1000000-0000-0000-0000-000000000002',
          'b1000000-0000-0000-0000-000000000001',
          'l1000000-0000-0000-0000-000000000001',
          '하이드라 세럼 에센스',
          '고농축 수분 세럼. 피부 깊숙이 수분을 전달합니다.',
          '["히알루론산", "베타글루칸", "나이아신아마이드"]',
          'visible',
          52000,
          null,
          'KRW',
          '[{"url": "https://example.com/images/product2.jpg", "alt": "하이드라 세럼 에센스", "is_primary": true, "order": 1}]'
        ),
        (
          'p1000000-0000-0000-0000-000000000003',
          'b1000000-0000-0000-0000-000000000001',
          'l1000000-0000-0000-0000-000000000002',
          '리뉴잉 안티에이징 크림',
          '주름 개선과 탄력 회복을 위한 프리미엄 안티에이징 크림',
          '["레티놀", "펩타이드", "아데노신", "콜라겐"]',
          'visible',
          89000,
          79000,
          'KRW',
          '[{"url": "https://example.com/images/product3.jpg", "alt": "리뉴잉 안티에이징 크림", "is_primary": true, "order": 1}]'
        ),
        (
          'p1000000-0000-0000-0000-000000000004',
          'b1000000-0000-0000-0000-000000000002',
          'l1000000-0000-0000-0000-000000000003',
          '센시티브 밸런싱 토너',
          '민감성 피부를 위한 저자극 토너. pH 5.5 밸런싱',
          '["병풀추출물", "마데카소사이드", "알란토인"]',
          'visible',
          28000,
          null,
          'KRW',
          '[{"url": "https://example.com/images/product4.jpg", "alt": "센시티브 밸런싱 토너", "is_primary": true, "order": 1}]'
        ),
        (
          'p1000000-0000-0000-0000-000000000005',
          'b1000000-0000-0000-0000-000000000003',
          'l1000000-0000-0000-0000-000000000004',
          '퓨어 에센셜 클렌저',
          '순한 세안제. 저자극 클렌징',
          '["티트리", "유칼립투스", "녹차추출물"]',
          'visible',
          22000,
          18000,
          'KRW',
          '[{"url": "https://example.com/images/product5.jpg", "alt": "퓨어 에센셜 클렌저", "is_primary": true, "order": 1}]'
        ),
        (
          'p1000000-0000-0000-0000-000000000006',
          'b1000000-0000-0000-0000-000000000001',
          null,
          '선 프로텍트 SPF50+',
          '자외선 차단 선크림. PA++++',
          '["티타늄디옥사이드", "징크옥사이드", "비타민E"]',
          'draft',
          35000,
          null,
          'KRW',
          null
        )
      ON CONFLICT DO NOTHING
    `);

    // 4. Seed price policies
    await queryRunner.query(`
      INSERT INTO cosmetics.cosmetics_price_policies (id, product_id, base_price, sale_price, sale_start_at, sale_end_at)
      VALUES
        ('pp100000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 45000, 38000, '2025-01-01', '2025-03-31'),
        ('pp100000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000002', 52000, null, null, null),
        ('pp100000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000003', 89000, 79000, '2025-01-01', '2025-02-28'),
        ('pp100000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000004', 28000, null, null, null),
        ('pp100000-0000-0000-0000-000000000005', 'p1000000-0000-0000-0000-000000000005', 22000, 18000, '2025-01-01', '2025-12-31'),
        ('pp100000-0000-0000-0000-000000000006', 'p1000000-0000-0000-0000-000000000006', 35000, null, null, null)
      ON CONFLICT (product_id) DO NOTHING
    `);

    console.log('[Migration] Cosmetics seed data inserted successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete seed data
    await queryRunner.query(`
      DELETE FROM cosmetics.cosmetics_price_policies
      WHERE id IN (
        'pp100000-0000-0000-0000-000000000001',
        'pp100000-0000-0000-0000-000000000002',
        'pp100000-0000-0000-0000-000000000003',
        'pp100000-0000-0000-0000-000000000004',
        'pp100000-0000-0000-0000-000000000005',
        'pp100000-0000-0000-0000-000000000006'
      )
    `);

    await queryRunner.query(`
      DELETE FROM cosmetics.cosmetics_products
      WHERE id IN (
        'p1000000-0000-0000-0000-000000000001',
        'p1000000-0000-0000-0000-000000000002',
        'p1000000-0000-0000-0000-000000000003',
        'p1000000-0000-0000-0000-000000000004',
        'p1000000-0000-0000-0000-000000000005',
        'p1000000-0000-0000-0000-000000000006'
      )
    `);

    await queryRunner.query(`
      DELETE FROM cosmetics.cosmetics_lines
      WHERE id IN (
        'l1000000-0000-0000-0000-000000000001',
        'l1000000-0000-0000-0000-000000000002',
        'l1000000-0000-0000-0000-000000000003',
        'l1000000-0000-0000-0000-000000000004'
      )
    `);

    await queryRunner.query(`
      DELETE FROM cosmetics.cosmetics_brands
      WHERE id IN (
        'b1000000-0000-0000-0000-000000000001',
        'b1000000-0000-0000-0000-000000000002',
        'b1000000-0000-0000-0000-000000000003'
      )
    `);

    console.log('[Migration] Cosmetics seed data deleted');
  }
}
