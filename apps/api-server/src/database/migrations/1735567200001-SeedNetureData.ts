/**
 * SeedNetureData Migration
 *
 * Phase D-1: Neture API Server 골격 구축
 * Seeds initial Neture data for development/testing
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedNetureData1735567200001 implements MigrationInterface {
  name = 'SeedNetureData1735567200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed sample partners
    await queryRunner.query(`
      INSERT INTO neture.neture_partners (id, name, business_name, type, status, description, website)
      VALUES
        ('11111111-1111-1111-1111-111111111111', '헬스케어 파트너', '주식회사 헬스케어', 'partner', 'active', '건강관리 전문 파트너', 'https://healthcare-partner.example.com'),
        ('22222222-2222-2222-2222-222222222222', '뷰티 파트너', '뷰티앤코 주식회사', 'partner', 'active', '뷰티 전문 파트너', 'https://beauty-partner.example.com'),
        ('33333333-3333-3333-3333-333333333333', '푸드 공급사', '신선푸드 주식회사', 'supplier', 'active', '신선식품 공급 전문', 'https://food-supplier.example.com')
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed sample products
    await queryRunner.query(`
      INSERT INTO neture.neture_products (id, partner_id, name, subtitle, description, category, status, base_price, sale_price, stock, is_featured)
      VALUES
        ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '프리미엄 건강식품 세트', '매일 먹는 건강의 시작', '하루에 필요한 영양소를 한 번에 섭취할 수 있는 프리미엄 건강식품 세트입니다.', 'healthcare', 'visible', 89000, 69000, 100, true),
        ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '멀티비타민 프로', '과학적으로 설계된 멀티비타민', '필수 비타민과 미네랄을 한 알에 담았습니다.', 'healthcare', 'visible', 45000, NULL, 200, false),
        ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '스킨케어 에센스', '피부 깊숙이 수분 공급', '히알루론산과 세라마이드가 풍부한 고보습 에센스입니다.', 'beauty', 'visible', 68000, 54000, 50, true),
        ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '안티에이징 크림', '시간을 되돌리는 크림', '레티놀과 펩타이드 성분으로 피부 탄력 개선에 도움을 줍니다.', 'beauty', 'visible', 128000, 98000, 30, false),
        ('cccc1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '유기농 과일 박스', '매주 배달되는 신선함', '제철 유기농 과일을 엄선하여 배달해 드립니다.', 'food', 'visible', 35000, NULL, 500, true),
        ('cccc2222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '프리미엄 견과류 세트', '건강한 간식의 정석', '볶지 않은 생 견과류 5종 세트입니다.', 'food', 'visible', 28000, 23000, 300, false)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM neture.neture_products WHERE id IN (
      'aaaa1111-1111-1111-1111-111111111111',
      'aaaa2222-2222-2222-2222-222222222222',
      'bbbb1111-1111-1111-1111-111111111111',
      'bbbb2222-2222-2222-2222-222222222222',
      'cccc1111-1111-1111-1111-111111111111',
      'cccc2222-2222-2222-2222-222222222222'
    )`);
    await queryRunner.query(`DELETE FROM neture.neture_partners WHERE id IN (
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333'
    )`);
  }
}
