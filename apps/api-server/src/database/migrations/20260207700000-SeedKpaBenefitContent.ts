/**
 * Migration: SeedKpaBenefitContent
 *
 * WO-KPA-A-CONTENT-SEED-PHASE3 — 쿠폰·혜택 콘텐츠
 *
 * Creates CMS benefit/coupon content for KPA-a service.
 * CTA-driven content with actionType (link/coupon/qr) and actionValue.
 *
 * Quantities:
 *   - KPA-a 운영자: 8
 *   - 공급자: 10
 *   - 약사 이용자: 6
 *   Total: 24 (type: 'promo')
 *
 * Slot placements: kpa-dashboard-benefit, kpa-main-benefit
 * Idempotent via ON CONFLICT (id) DO NOTHING.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// ============================================================================
// Constants
// ============================================================================

const SERVICE_KEY = 'kpa-society';

const ORG_IDS = {
  ASSOCIATION: 'a0000000-0a00-4000-a000-000000000001',
  JONGNO_GROUP: 'a0000000-0a00-4000-a000-000000000003',
};

const OPERATOR_EMAIL = 'yaksa31@o4o.com';
const SUPPLIER_EMAIL = 'yaksa41@o4o.com';
const PHARMACIST_EMAIL = 'yaksa01@o4o.com';

// ============================================================================
// UUID Scheme — offset from Phase 1 (001-028) to avoid collision
// Content: e0000000-0a00-4000-e000-000000000{101..124}
// Slots:   e1000000-0a00-4000-e100-000000000{101..112}
// ============================================================================

function contentId(n: number): string {
  return `e0000000-0a00-4000-e000-${(100 + n).toString().padStart(12, '0')}`;
}
function slotId(n: number): string {
  return `e1000000-0a00-4000-e100-${(100 + n).toString().padStart(12, '0')}`;
}

// ============================================================================
// Benefit Data
// ============================================================================

interface BenefitSeed {
  id: string;
  title: string;
  summary: string;         // benefitText equivalent (short benefit description)
  linkUrl: string;          // actionValue for link type
  linkText: string;         // CTA button text
  creatorType: 'operator' | 'supplier' | 'pharmacist';
  organizationId: string | null;
  sortOrder: number;
  isPinned: boolean;
  metadata: Record<string, any>;
}

// --- Operator Benefits (8) ---
const operatorBenefits: BenefitSeed[] = [
  {
    id: contentId(1), title: '신규 가입 약사 보수교육비 지원',
    summary: '2026년 신규 가입 약사에게 보수교육 수강료 전액을 지원합니다.',
    linkUrl: '/benefits/new-member-education', linkText: '지원 신청',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 1, isPinned: true,
    metadata: {
      creatorType: 'operator', benefitText: '보수교육비 전액 지원',
      actionType: 'link', actionValue: '/benefits/new-member-education',
      validUntil: '2026-12-31', backgroundColor: '#1a5276', category: '교육지원',
    },
  },
  {
    id: contentId(2), title: '약국 디지털 사이니지 설치비 50% 지원',
    summary: '디지털 사이니지 신규 설치 시 비용의 50%를 지원합니다. 선착순 100개소.',
    linkUrl: '/benefits/signage-subsidy', linkText: '신청하기',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 2, isPinned: true,
    metadata: {
      creatorType: 'operator', benefitText: '설치비 50% 지원 (선착순 100개소)',
      actionType: 'link', actionValue: '/benefits/signage-subsidy',
      validUntil: '2026-06-30', backgroundColor: '#2e86c1', category: '시설지원',
    },
  },
  {
    id: contentId(3), title: '약사 건강검진 무료 쿠폰',
    summary: '협약 검진센터에서 종합건강검진을 무료로 받으실 수 있습니다.',
    linkUrl: '/benefits/health-checkup', linkText: '쿠폰 받기',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 3, isPinned: false,
    metadata: {
      creatorType: 'operator', benefitText: '종합건강검진 무료',
      actionType: 'coupon', actionValue: 'KPA-HEALTH-2026',
      validUntil: '2026-12-31', backgroundColor: '#1a5276', category: '복지',
    },
  },
  {
    id: contentId(4), title: 'O4O 플랫폼 프리미엄 3개월 무료',
    summary: 'O4O 플랫폼 프리미엄 플랜을 3개월간 무료로 이용하세요.',
    linkUrl: '/benefits/o4o-premium-trial', linkText: '무료 체험',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 4, isPinned: false,
    metadata: {
      creatorType: 'operator', benefitText: '프리미엄 3개월 무료',
      actionType: 'coupon', actionValue: 'O4O-PREM-3M-FREE',
      validUntil: '2026-03-31', backgroundColor: '#2874a6', category: '서비스',
    },
  },
  {
    id: contentId(5), title: '약국 경영 컨설팅 무료 1회',
    summary: '전문 컨설턴트의 약국 경영 진단을 1회 무료로 받으실 수 있습니다.',
    linkUrl: '/benefits/consulting-free', linkText: '예약하기',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 5, isPinned: false,
    metadata: {
      creatorType: 'operator', benefitText: '경영 컨설팅 1회 무료',
      actionType: 'link', actionValue: '/benefits/consulting-free',
      validUntil: '2026-06-30', backgroundColor: '#1b4f72', category: '경영지원',
    },
  },
  {
    id: contentId(6), title: '온라인 보수교육 수강료 30% 할인',
    summary: '약사회 회원 대상 온라인 보수교육 수강료 30% 할인 쿠폰입니다.',
    linkUrl: '/benefits/education-discount', linkText: '할인 쿠폰',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 6, isPinned: false,
    metadata: {
      creatorType: 'operator', benefitText: '보수교육 수강료 30% 할인',
      actionType: 'coupon', actionValue: 'EDU-30OFF-2026',
      validUntil: '2026-12-31', backgroundColor: '#1a5276', category: '교육지원',
    },
  },
  {
    id: contentId(7), title: '약사회 단체보험 가입 할인',
    summary: '약사회 회원 전용 단체보험 가입 시 보험료 15% 할인 혜택.',
    linkUrl: '/benefits/group-insurance', linkText: '가입 안내',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 7, isPinned: false,
    metadata: {
      creatorType: 'operator', benefitText: '단체보험 보험료 15% 할인',
      actionType: 'link', actionValue: '/benefits/group-insurance',
      validUntil: null, backgroundColor: '#154360', category: '복지',
    },
  },
  {
    id: contentId(8), title: '전국 약사 학술대회 조기등록 할인',
    summary: '2026 전국 약사 학술대회 조기등록 시 참가비 40% 할인.',
    linkUrl: '/benefits/conference-early', linkText: '조기등록',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 8, isPinned: false,
    metadata: {
      creatorType: 'operator', benefitText: '학술대회 참가비 40% 할인',
      actionType: 'coupon', actionValue: 'CONF-EARLY-40',
      validUntil: '2026-04-30', backgroundColor: '#2e86c1', category: '학술',
    },
  },
];

// --- Supplier Benefits (10) ---
const supplierBenefits: BenefitSeed[] = [
  {
    id: contentId(9), title: '[한미약품] 신규 거래 약국 첫 주문 10% 할인',
    summary: '한미약품과 첫 거래 시 주문 금액의 10%를 할인합니다.',
    linkUrl: '/suppliers/hanmi/first-order', linkText: '할인 적용',
    creatorType: 'supplier', organizationId: null, sortOrder: 1, isPinned: false,
    metadata: {
      creatorType: 'supplier', supplierName: '한미약품', benefitText: '첫 주문 10% 할인',
      actionType: 'coupon', actionValue: 'HANMI-FIRST10',
      validUntil: '2026-06-30', backgroundColor: '#7d3c98', category: '할인',
    },
  },
  {
    id: contentId(10), title: '[대웅제약] 우루사 5박스 구매 시 1박스 무료',
    summary: '우루사 시리즈 5+1 프로모션. 약국 전용 행사.',
    linkUrl: '/suppliers/daewoong/ursa-promo', linkText: '주문하기',
    creatorType: 'supplier', organizationId: null, sortOrder: 2, isPinned: false,
    metadata: {
      creatorType: 'supplier', supplierName: '대웅제약', benefitText: '우루사 5+1 행사',
      actionType: 'link', actionValue: '/suppliers/daewoong/ursa-promo',
      validUntil: '2026-03-31', backgroundColor: '#6c3483', category: '프로모션',
    },
  },
  {
    id: contentId(11), title: '[유한양행] 봄 시즌 소화제 15% 할인 쿠폰',
    summary: '유한양행 소화제 전 품목 15% 할인 쿠폰을 드립니다.',
    linkUrl: '/suppliers/yuhan/spring-coupon', linkText: '쿠폰 받기',
    creatorType: 'supplier', organizationId: null, sortOrder: 3, isPinned: false,
    metadata: {
      creatorType: 'supplier', supplierName: '유한양행', benefitText: '소화제 전품목 15% 할인',
      actionType: 'coupon', actionValue: 'YUHAN-SPRING15',
      validUntil: '2026-05-31', backgroundColor: '#7d3c98', category: '할인',
    },
  },
  {
    id: contentId(12), title: '[종근당] 건강기능식품 세트 20% 할인',
    summary: '종근당 건강기능식품 세트 구매 시 20% 할인. 약국 전용.',
    linkUrl: '/suppliers/chongkundang/set-discount', linkText: '세트 보기',
    creatorType: 'supplier', organizationId: null, sortOrder: 4, isPinned: false,
    metadata: {
      creatorType: 'supplier', supplierName: '종근당', benefitText: '건기식 세트 20% 할인',
      actionType: 'coupon', actionValue: 'CKD-SET20',
      validUntil: '2026-04-30', backgroundColor: '#5b2c6f', category: '할인',
    },
  },
  {
    id: contentId(13), title: '[일동제약] 아로나민 대용량 특별가',
    summary: '아로나민골드 120정 약국 전용 특별가격으로 제공합니다.',
    linkUrl: '/suppliers/ildong/aronamin-deal', linkText: '특별가 확인',
    creatorType: 'supplier', organizationId: null, sortOrder: 5, isPinned: false,
    metadata: {
      creatorType: 'supplier', supplierName: '일동제약', benefitText: '아로나민 대용량 특별가',
      actionType: 'link', actionValue: '/suppliers/ildong/aronamin-deal',
      validUntil: '2026-03-31', backgroundColor: '#6c3483', category: '특가',
    },
  },
  {
    id: contentId(14), title: '[녹십자] 독감 백신 조기 예약 할인',
    summary: '2026-2027 시즌 독감 백신 조기 예약 시 10% 할인.',
    linkUrl: '/suppliers/greencross/flu-early', linkText: '조기 예약',
    creatorType: 'supplier', organizationId: null, sortOrder: 6, isPinned: true,
    metadata: {
      creatorType: 'supplier', supplierName: '녹십자', benefitText: '독감 백신 조기예약 10% 할인',
      actionType: 'coupon', actionValue: 'GC-FLU-EARLY10',
      validUntil: '2026-08-31', backgroundColor: '#7d3c98', category: '예약할인',
    },
  },
  {
    id: contentId(15), title: '[동아제약] 박카스 약국 전용 3+1 행사',
    summary: '박카스 3박스 구매 시 1박스 추가 증정. 봄 한정.',
    linkUrl: '/suppliers/donga/bacchus-3plus1', linkText: '행사 참여',
    creatorType: 'supplier', organizationId: null, sortOrder: 7, isPinned: false,
    metadata: {
      creatorType: 'supplier', supplierName: '동아제약', benefitText: '박카스 3+1 행사',
      actionType: 'link', actionValue: '/suppliers/donga/bacchus-3plus1',
      validUntil: '2026-04-30', backgroundColor: '#5b2c6f', category: '프로모션',
    },
  },
  {
    id: contentId(16), title: '[보령제약] 겔포스 시리즈 번들 할인',
    summary: '겔포스 3종 번들 구매 시 25% 할인. 약국 전용 기획.',
    linkUrl: '/suppliers/boryung/gelfos-bundle', linkText: '번들 주문',
    creatorType: 'supplier', organizationId: null, sortOrder: 8, isPinned: false,
    metadata: {
      creatorType: 'supplier', supplierName: '보령제약', benefitText: '겔포스 번들 25% 할인',
      actionType: 'coupon', actionValue: 'BR-BUNDLE25',
      validUntil: '2026-05-31', backgroundColor: '#7d3c98', category: '할인',
    },
  },
  {
    id: contentId(17), title: '[제일약품] 건기식 신규 거래 쿠폰',
    summary: '제일약품 건강기능식품 첫 거래 시 사용 가능한 15% 할인 쿠폰.',
    linkUrl: '/suppliers/jeil/new-deal-coupon', linkText: '쿠폰 받기',
    creatorType: 'supplier', organizationId: null, sortOrder: 9, isPinned: false,
    metadata: {
      creatorType: 'supplier', supplierName: '제일약품', benefitText: '건기식 첫 거래 15% 할인',
      actionType: 'coupon', actionValue: 'JEIL-NEW15',
      validUntil: '2026-06-30', backgroundColor: '#6c3483', category: '할인',
    },
  },
  {
    id: contentId(18), title: '[한독] 훼스탈 대량구매 리베이트',
    summary: '훼스탈 월 50박스 이상 구매 시 5% 리베이트 적용.',
    linkUrl: '/suppliers/handok/festal-rebate', linkText: '리베이트 안내',
    creatorType: 'supplier', organizationId: null, sortOrder: 10, isPinned: false,
    metadata: {
      creatorType: 'supplier', supplierName: '한독', benefitText: '월 50박스 이상 5% 리베이트',
      actionType: 'link', actionValue: '/suppliers/handok/festal-rebate',
      validUntil: '2026-12-31', backgroundColor: '#5b2c6f', category: '리베이트',
    },
  },
];

// --- Pharmacist Benefits (6) ---
const pharmacistBenefits: BenefitSeed[] = [
  {
    id: contentId(19), title: '첫 방문 고객 건강검진 무료',
    summary: '종로중앙약국 첫 방문 고객에게 혈압·혈당 검진을 무료로 제공합니다.',
    linkUrl: '/pharmacy/jongno-central/first-visit', linkText: '안내 보기',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 1, isPinned: true,
    metadata: {
      creatorType: 'pharmacist', pharmacyName: '종로중앙약국', benefitText: '첫 방문 건강검진 무료',
      actionType: 'qr', actionValue: 'JC-FIRST-FREE',
      validUntil: null, backgroundColor: '#1e8449', category: '이벤트',
    },
  },
  {
    id: contentId(20), title: '복약상담 예약 시 비타민 샘플 증정',
    summary: '복약상담을 예약하시면 비타민 샘플 세트를 증정합니다.',
    linkUrl: '/pharmacy/jongno-central/consult-gift', linkText: '예약하기',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 2, isPinned: false,
    metadata: {
      creatorType: 'pharmacist', pharmacyName: '종로중앙약국', benefitText: '비타민 샘플 증정',
      actionType: 'link', actionValue: '/pharmacy/jongno-central/consult-gift',
      validUntil: '2026-03-31', backgroundColor: '#239b56', category: '증정',
    },
  },
  {
    id: contentId(21), title: '만성질환 관리 프로그램 등록비 면제',
    summary: '고혈압·당뇨 관리 프로그램 등록비가 면제됩니다. 선착순 30명.',
    linkUrl: '/pharmacy/jongno-central/chronic-free', linkText: '등록 신청',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 3, isPinned: false,
    metadata: {
      creatorType: 'pharmacist', pharmacyName: '종로중앙약국', benefitText: '등록비 면제 (선착순 30명)',
      actionType: 'coupon', actionValue: 'JC-CHRONIC-FREE',
      validUntil: '2026-06-30', backgroundColor: '#1e8449', category: '프로그램',
    },
  },
  {
    id: contentId(22), title: '건강기능식품 첫 구매 10% 할인',
    summary: '종로중앙약국에서 건강기능식품 첫 구매 시 10% 할인 쿠폰.',
    linkUrl: '/pharmacy/jongno-central/supplement-first', linkText: '쿠폰 받기',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 4, isPinned: false,
    metadata: {
      creatorType: 'pharmacist', pharmacyName: '종로중앙약국', benefitText: '건기식 첫구매 10% 할인',
      actionType: 'coupon', actionValue: 'JC-SUPP-FIRST10',
      validUntil: '2026-04-30', backgroundColor: '#196f3d', category: '할인',
    },
  },
  {
    id: contentId(23), title: '어린이 건강상담 예약 무료',
    summary: '소아 환자 건강상담 예약이 무료입니다. 매주 수요일 오후.',
    linkUrl: '/pharmacy/jongno-central/kids-consult', linkText: '예약하기',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 5, isPinned: false,
    metadata: {
      creatorType: 'pharmacist', pharmacyName: '종로중앙약국', benefitText: '어린이 건강상담 무료',
      actionType: 'link', actionValue: '/pharmacy/jongno-central/kids-consult',
      validUntil: null, backgroundColor: '#1e8449', category: '상담',
    },
  },
  {
    id: contentId(24), title: '배달 서비스 첫 이용 배송비 무료',
    summary: '의약품 배달 서비스 첫 이용 시 배송비를 면제합니다.',
    linkUrl: '/pharmacy/jongno-central/delivery-free', linkText: '배달 주문',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 6, isPinned: false,
    metadata: {
      creatorType: 'pharmacist', pharmacyName: '종로중앙약국', benefitText: '첫 배달 배송비 무료',
      actionType: 'coupon', actionValue: 'JC-DELI-FREE',
      validUntil: '2026-12-31', backgroundColor: '#239b56', category: '배달',
    },
  },
];

const allBenefits = [...operatorBenefits, ...supplierBenefits, ...pharmacistBenefits];

// ============================================================================
// Slot Placements
// ============================================================================

interface SlotSeed {
  id: string;
  slotKey: string;
  contentId: string;
  sortOrder: number;
}

const slotPlacements: SlotSeed[] = [
  // kpa-dashboard-benefit: 운영자 대시보드 혜택 영역
  { id: slotId(1), slotKey: 'kpa-dashboard-benefit', contentId: contentId(1), sortOrder: 1 },
  { id: slotId(2), slotKey: 'kpa-dashboard-benefit', contentId: contentId(2), sortOrder: 2 },
  { id: slotId(3), slotKey: 'kpa-dashboard-benefit', contentId: contentId(3), sortOrder: 3 },
  { id: slotId(4), slotKey: 'kpa-dashboard-benefit', contentId: contentId(14), sortOrder: 4 },
  { id: slotId(5), slotKey: 'kpa-dashboard-benefit', contentId: contentId(9), sortOrder: 5 },

  // kpa-main-benefit: 메인/홈 혜택 카드
  { id: slotId(6), slotKey: 'kpa-main-benefit', contentId: contentId(1), sortOrder: 1 },
  { id: slotId(7), slotKey: 'kpa-main-benefit', contentId: contentId(4), sortOrder: 2 },
  { id: slotId(8), slotKey: 'kpa-main-benefit', contentId: contentId(14), sortOrder: 3 },
  { id: slotId(9), slotKey: 'kpa-main-benefit', contentId: contentId(10), sortOrder: 4 },
  { id: slotId(10), slotKey: 'kpa-main-benefit', contentId: contentId(19), sortOrder: 5 },
  { id: slotId(11), slotKey: 'kpa-main-benefit', contentId: contentId(22), sortOrder: 6 },
];

// ============================================================================
// Migration
// ============================================================================

export class SeedKpaBenefitContent20260207700000 implements MigrationInterface {
  name = 'SeedKpaBenefitContent20260207700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Look up creator user IDs
    const operatorRow = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`, [OPERATOR_EMAIL]
    );
    const supplierRow = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`, [SUPPLIER_EMAIL]
    );
    const pharmacistRow = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`, [PHARMACIST_EMAIL]
    );

    if (!operatorRow.length || !supplierRow.length || !pharmacistRow.length) {
      console.log('[SeedKpaBenefitContent] Skipping: test users not found. Run SeedKpaTestAccounts first.');
      return;
    }

    const userIdMap: Record<string, string> = {
      operator: operatorRow[0].id,
      supplier: supplierRow[0].id,
      pharmacist: pharmacistRow[0].id,
    };

    // --- Insert CMS content records (type: promo) ---
    let inserted = 0;
    for (const b of allBenefits) {
      await queryRunner.query(`
        INSERT INTO cms_contents (
          id, "organizationId", "serviceKey",
          type, title, summary, body,
          "imageUrl", "linkUrl", "linkText",
          status, "publishedAt", "expiresAt",
          "sortOrder", "isPinned", "isOperatorPicked",
          metadata, "createdBy",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3,
          'promo', $4, $5, NULL,
          NULL, $6, $7,
          'published', NOW(), $8,
          $9, $10, false,
          $11, $12,
          NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `, [
        b.id, b.organizationId, SERVICE_KEY,
        b.title, b.summary,
        b.linkUrl, b.linkText,
        b.metadata.validUntil ? new Date(b.metadata.validUntil) : null,
        b.sortOrder, b.isPinned,
        JSON.stringify(b.metadata), userIdMap[b.creatorType],
      ]);
      inserted++;
    }

    // --- Insert slot placements ---
    let slotsInserted = 0;
    for (const s of slotPlacements) {
      const benefit = allBenefits.find(b => b.id === s.contentId);

      await queryRunner.query(`
        INSERT INTO cms_content_slots (
          id, "organizationId", "serviceKey",
          "slotKey", "contentId",
          "sortOrder", "isActive",
          "startsAt", "endsAt",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3,
          $4, $5,
          $6, true,
          NULL, NULL,
          NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `, [
        s.id, benefit?.organizationId ?? null, SERVICE_KEY,
        s.slotKey, s.contentId,
        s.sortOrder,
      ]);
      slotsInserted++;
    }

    console.log(`[SeedKpaBenefitContent] Done: ${inserted} benefits, ${slotsInserted} slot placements`);
    console.log(`  Operator: 8, Supplier: 10, Pharmacist: 6`);
    console.log(`  Slots: kpa-dashboard-benefit(5), kpa-main-benefit(6)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const contentIds = allBenefits.map(b => `'${b.id}'`).join(',');
    const slIds = slotPlacements.map(s => `'${s.id}'`).join(',');

    await queryRunner.query(`DELETE FROM cms_content_slots WHERE id IN (${slIds})`);
    await queryRunner.query(`DELETE FROM cms_contents WHERE id IN (${contentIds})`);

    console.log('[SeedKpaBenefitContent] Down: benefit content and slots removed');
  }
}
