/**
 * Migration: SeedNetureData
 *
 * WO-NETURE-SMOKE-STABILIZATION-V1
 *
 * Creates seed data for Neture smoke test:
 * - 3 Suppliers with products
 * - 3 Partnership Requests with products
 * - 3 CMS Contents (serviceKey: 'neture')
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedNetureData1737100300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. SUPPLIERS
    // ========================================

    // Check if suppliers already exist
    const existingSuppliers = await queryRunner.query(
      `SELECT COUNT(*) as count FROM neture_suppliers`
    );

    if (parseInt(existingSuppliers[0].count) === 0) {
      // Supplier 1: 농산물 공급
      const supplier1Id = await this.insertSupplier(queryRunner, {
        slug: 'farmfresh-korea',
        name: '팜프레시코리아',
        logoUrl: 'https://picsum.photos/seed/farmfresh/200',
        category: '농산물',
        shortDescription: '신선한 국산 농산물을 공급합니다',
        description:
          '팜프레시코리아는 전국 농가와 직접 계약하여 신선한 농산물을 공급하는 전문 유통업체입니다. 친환경 농법으로 재배된 프리미엄 농산물을 합리적인 가격에 제공합니다.',
        pricingPolicy: '도매가 기준, 수량에 따른 단계별 할인 적용',
        moq: '10박스 이상',
        shippingStandard: '당일 출고 (오전 주문 시)',
        shippingIsland: '도서 지역 +2일, 추가 배송비 5,000원',
        shippingMountain: '산간 지역 +1일, 추가 배송비 3,000원',
        contactEmail: 'partner@farmfresh.kr',
        contactPhone: '02-1234-5678',
        contactWebsite: 'https://farmfresh.kr',
        contactKakao: 'https://pf.kakao.com/farmfresh',
        status: 'ACTIVE',
      });

      await this.insertSupplierProducts(queryRunner, supplier1Id, [
        { name: '친환경 사과', category: '과일', description: '충북 충주산 부사 사과' },
        { name: '유기농 배추', category: '채소', description: '강원도 고랭지 배추' },
        { name: '무농약 쌀', category: '곡물', description: '경기도 이천 쌀 10kg' },
      ]);

      // Supplier 2: 건강식품
      const supplier2Id = await this.insertSupplier(queryRunner, {
        slug: 'health-plus',
        name: '헬스플러스',
        logoUrl: 'https://picsum.photos/seed/healthplus/200',
        category: '건강식품',
        shortDescription: '프리미엄 건강기능식품 전문',
        description:
          '헬스플러스는 GMP 인증 시설에서 생산되는 건강기능식품을 공급합니다. 비타민, 미네랄, 프로바이오틱스 등 다양한 제품 라인업을 보유하고 있습니다.',
        pricingPolicy: '정가제, 대량 구매 시 10-20% 할인',
        moq: '100개 이상',
        shippingStandard: '주문 후 2-3일 이내 출고',
        shippingIsland: '도서 지역 +3일',
        shippingMountain: '산간 지역 +2일',
        contactEmail: 'biz@healthplus.co.kr',
        contactPhone: '1588-1234',
        contactWebsite: 'https://healthplus.co.kr',
        contactKakao: 'https://pf.kakao.com/healthplus',
        status: 'ACTIVE',
      });

      await this.insertSupplierProducts(queryRunner, supplier2Id, [
        { name: '종합비타민', category: '비타민', description: '하루 한 알로 충분한 멀티비타민' },
        { name: '오메가3', category: '오메가', description: 'rTG 오메가3 1000mg' },
      ]);

      // Supplier 3: 생활용품
      const supplier3Id = await this.insertSupplier(queryRunner, {
        slug: 'daily-essentials',
        name: '데일리에센셜',
        logoUrl: 'https://picsum.photos/seed/dailyessential/200',
        category: '생활용품',
        shortDescription: '친환경 생활용품 공급',
        description:
          '데일리에센셜은 환경을 생각하는 친환경 생활용품을 공급합니다. 천연 원료 사용, 재활용 가능한 포장재 사용을 원칙으로 합니다.',
        pricingPolicy: '개별 협의, 연간 계약 시 추가 할인',
        moq: '50개 이상',
        shippingStandard: '주문 후 1-2일 출고',
        shippingIsland: '도서 지역 별도 문의',
        shippingMountain: '산간 지역 +1일',
        contactEmail: 'supply@dailyessentials.kr',
        contactPhone: '02-9876-5432',
        contactWebsite: 'https://dailyessentials.kr',
        contactKakao: 'https://pf.kakao.com/dailyessentials',
        status: 'ACTIVE',
      });

      await this.insertSupplierProducts(queryRunner, supplier3Id, [
        { name: '천연 세제', category: '세탁용품', description: '코코넛 오일 베이스 천연 세제' },
        { name: '대나무 칫솔', category: '욕실용품', description: '생분해성 대나무 칫솔 4개입' },
        { name: '면 행주', category: '주방용품', description: '유기농 면 100% 행주 세트' },
      ]);

      console.log('Created 3 Neture suppliers with products');
    } else {
      console.log('Neture suppliers already exist, skipping...');
    }

    // ========================================
    // 2. PARTNERSHIP REQUESTS
    // ========================================

    const existingRequests = await queryRunner.query(
      `SELECT COUNT(*) as count FROM neture_partnership_requests`
    );

    if (parseInt(existingRequests[0].count) === 0) {
      // Request 1: OPEN
      const request1Id = await this.insertPartnershipRequest(queryRunner, {
        sellerId: 'seller-glycopharm-001',
        sellerName: '글라이코팜 강남점',
        sellerServiceType: 'glycopharm',
        sellerStoreUrl: 'https://glycopharm.kr/store/gangnam',
        productCount: 5,
        periodStart: '2026-02-01',
        periodEnd: '2026-04-30',
        revenueStructure: '판매 수수료 15%, 월 정산',
        status: 'OPEN',
        promotionSns: true,
        promotionContent: true,
        promotionBanner: false,
        promotionOther: '약국 내 POP 광고 가능',
        contactEmail: 'partner@glycopharm-gangnam.kr',
        contactPhone: '02-555-1234',
        contactKakao: 'https://pf.kakao.com/glycopharm-gangnam',
      });

      await this.insertPartnershipProducts(queryRunner, request1Id, [
        { name: '혈당측정기', category: '의료기기' },
        { name: '혈당검사지', category: '의료소모품' },
        { name: '비타민D 영양제', category: '건강기능식품' },
      ]);

      // Request 2: OPEN
      const request2Id = await this.insertPartnershipRequest(queryRunner, {
        sellerId: 'seller-kcosmetics-001',
        sellerName: '뷰티랩 코스메틱',
        sellerServiceType: 'k-cosmetics',
        sellerStoreUrl: 'https://k-cosmetics.kr/store/beautylab',
        productCount: 10,
        periodStart: '2026-03-01',
        periodEnd: '2026-08-31',
        revenueStructure: '위탁 판매, 판매가의 20% 수수료',
        status: 'OPEN',
        promotionSns: true,
        promotionContent: true,
        promotionBanner: true,
        promotionOther: '인플루언서 협업 가능',
        contactEmail: 'biz@beautylab.co.kr',
        contactPhone: '1588-9999',
        contactKakao: 'https://pf.kakao.com/beautylab',
      });

      await this.insertPartnershipProducts(queryRunner, request2Id, [
        { name: '수분 크림', category: '스킨케어' },
        { name: '선크림 SPF50+', category: '선케어' },
        { name: '클렌징 오일', category: '클렌징' },
        { name: '시트 마스크', category: '마스크팩' },
      ]);

      // Request 3: MATCHED (completed)
      const request3Id = await this.insertPartnershipRequest(queryRunner, {
        sellerId: 'seller-pharmacy-001',
        sellerName: '우리동네약국',
        sellerServiceType: 'glycopharm',
        sellerStoreUrl: 'https://glycopharm.kr/store/local',
        productCount: 3,
        periodStart: '2025-10-01',
        periodEnd: '2026-01-31',
        revenueStructure: '고정 월 광고비 100만원 + 판매 수수료 10%',
        status: 'MATCHED',
        promotionSns: false,
        promotionContent: true,
        promotionBanner: true,
        promotionOther: '',
        contactEmail: 'owner@localpharmacy.kr',
        contactPhone: '02-333-4444',
        contactKakao: '',
        matchedAt: '2025-09-15',
      });

      await this.insertPartnershipProducts(queryRunner, request3Id, [
        { name: '감기약', category: '일반의약품' },
        { name: '소화제', category: '일반의약품' },
      ]);

      console.log('Created 3 Neture partnership requests with products');
    } else {
      console.log('Neture partnership requests already exist, skipping...');
    }

    // ========================================
    // 3. CMS CONTENTS (serviceKey: 'neture')
    // ========================================

    const existingContents = await queryRunner.query(
      `SELECT COUNT(*) as count FROM cms_contents WHERE "serviceKey" = 'neture'`
    );

    if (parseInt(existingContents[0].count) === 0) {
      await queryRunner.query(
        `INSERT INTO cms_contents (
          id, "serviceKey", type, title, summary, body, status,
          "isPinned", "sortOrder", "createdAt", "updatedAt", "publishedAt"
        ) VALUES
        (
          gen_random_uuid(), 'neture', 'notice',
          '네뚜레 플랫폼 오픈 안내',
          '유통 정보 플랫폼 네뚜레가 정식 오픈했습니다.',
          '안녕하세요. 네뚜레 플랫폼이 정식 오픈했습니다. 공급자와 파트너를 연결하는 유통 정보 플랫폼으로서 투명한 거래 환경을 제공하겠습니다. 많은 관심 부탁드립니다.',
          'published', true, 1, NOW(), NOW(), NOW()
        ),
        (
          gen_random_uuid(), 'neture', 'notice',
          '공급자 등록 가이드',
          '공급자로 등록하는 방법을 안내합니다.',
          '공급자 등록을 원하시면 참여 신청 페이지에서 문의해 주세요. 담당자가 검토 후 연락드리겠습니다. 필요 서류: 사업자등록증, 제품 카탈로그, 거래 조건표',
          'published', false, 2, NOW(), NOW(), NOW()
        ),
        (
          gen_random_uuid(), 'neture', 'notice',
          '파트너십 신청 안내',
          '제휴 파트너십 신청 방법과 혜택을 알려드립니다.',
          '네뚜레 파트너십을 통해 검증된 공급자와 안전하게 거래하세요. 파트너 혜택: 신뢰할 수 있는 공급자 연결, 거래 조건 투명 공개, 분쟁 중재 서비스',
          'published', false, 3, NOW(), NOW(), NOW()
        )`
      );

      console.log('Created 3 Neture CMS contents');
    } else {
      console.log('Neture CMS contents already exist, skipping...');
    }

    console.log('');
    console.log('=== Neture Seed Data Complete ===');
    console.log('Suppliers: 3');
    console.log('Partnership Requests: 3');
    console.log('CMS Contents: 3');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove CMS contents
    await queryRunner.query(`DELETE FROM cms_contents WHERE "serviceKey" = 'neture'`);

    // Remove partnership products and requests
    await queryRunner.query(`DELETE FROM neture_partnership_products`);
    await queryRunner.query(`DELETE FROM neture_partnership_requests`);

    // Remove supplier products and suppliers
    await queryRunner.query(`DELETE FROM neture_supplier_products`);
    await queryRunner.query(`DELETE FROM neture_suppliers`);

    console.log('Removed all Neture seed data');
  }

  // Helper methods
  private async insertSupplier(
    queryRunner: QueryRunner,
    data: {
      slug: string;
      name: string;
      logoUrl: string;
      category: string;
      shortDescription: string;
      description: string;
      pricingPolicy: string;
      moq: string;
      shippingStandard: string;
      shippingIsland: string;
      shippingMountain: string;
      contactEmail: string;
      contactPhone: string;
      contactWebsite: string;
      contactKakao: string;
      status: string;
    }
  ): Promise<string> {
    const result = await queryRunner.query(
      `INSERT INTO neture_suppliers (
        id, slug, name, logo_url, category, short_description, description,
        pricing_policy, moq, shipping_standard, shipping_island, shipping_mountain,
        contact_email, contact_phone, contact_website, contact_kakao,
        status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, NOW(), NOW()
      ) RETURNING id`,
      [
        data.slug,
        data.name,
        data.logoUrl,
        data.category,
        data.shortDescription,
        data.description,
        data.pricingPolicy,
        data.moq,
        data.shippingStandard,
        data.shippingIsland,
        data.shippingMountain,
        data.contactEmail,
        data.contactPhone,
        data.contactWebsite,
        data.contactKakao,
        data.status,
      ]
    );
    return result[0].id;
  }

  private async insertSupplierProducts(
    queryRunner: QueryRunner,
    supplierId: string,
    products: Array<{ name: string; category: string; description: string }>
  ): Promise<void> {
    for (const product of products) {
      await queryRunner.query(
        `INSERT INTO neture_supplier_products (
          id, supplier_id, name, category, description, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, NOW()
        )`,
        [supplierId, product.name, product.category, product.description]
      );
    }
  }

  private async insertPartnershipRequest(
    queryRunner: QueryRunner,
    data: {
      sellerId: string;
      sellerName: string;
      sellerServiceType: string;
      sellerStoreUrl: string;
      productCount: number;
      periodStart: string;
      periodEnd: string;
      revenueStructure: string;
      status: string;
      promotionSns: boolean;
      promotionContent: boolean;
      promotionBanner: boolean;
      promotionOther: string;
      contactEmail: string;
      contactPhone: string;
      contactKakao: string;
      matchedAt?: string;
    }
  ): Promise<string> {
    const result = await queryRunner.query(
      `INSERT INTO neture_partnership_requests (
        id, seller_id, seller_name, seller_service_type, seller_store_url,
        product_count, period_start, period_end, revenue_structure, status,
        promotion_sns, promotion_content, promotion_banner, promotion_other,
        contact_email, contact_phone, contact_kakao,
        created_at, matched_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        NOW(), $17
      ) RETURNING id`,
      [
        data.sellerId,
        data.sellerName,
        data.sellerServiceType,
        data.sellerStoreUrl,
        data.productCount,
        data.periodStart,
        data.periodEnd,
        data.revenueStructure,
        data.status,
        data.promotionSns,
        data.promotionContent,
        data.promotionBanner,
        data.promotionOther,
        data.contactEmail,
        data.contactPhone,
        data.contactKakao,
        data.matchedAt || null,
      ]
    );
    return result[0].id;
  }

  private async insertPartnershipProducts(
    queryRunner: QueryRunner,
    partnershipRequestId: string,
    products: Array<{ name: string; category: string }>
  ): Promise<void> {
    for (const product of products) {
      await queryRunner.query(
        `INSERT INTO neture_partnership_products (
          id, partnership_request_id, name, category
        ) VALUES (
          gen_random_uuid(), $1, $2, $3
        )`,
        [partnershipRequestId, product.name, product.category]
      );
    }
  }
}
