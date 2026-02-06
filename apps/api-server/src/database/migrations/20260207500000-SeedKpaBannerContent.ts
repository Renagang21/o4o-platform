/**
 * Migration: SeedKpaBannerContent
 *
 * WO-KPA-A-CONTENT-SEED-V1 — Phase 1 (배너 콘텐츠)
 *
 * Creates CMS banner content for KPA-a service to verify dashboard/signage display.
 *
 * Quantities:
 *   - KPA-a 운영자: 10 banners
 *   - 공급자: 10 banners
 *   - 약사 이용자: 8 banners
 *   Total: 28 banners (type: 'hero')
 *
 * Also creates cms_content_slots for dashboard/signage placement.
 * Idempotent via ON CONFLICT (id) DO NOTHING.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// ============================================================================
// Constants
// ============================================================================

const SERVICE_KEY = 'kpa-society';

const ORG_IDS = {
  ASSOCIATION: 'a0000000-0a00-4000-a000-000000000001',   // 대한약사회
  JONGNO_GROUP: 'a0000000-0a00-4000-a000-000000000003',  // 종로구약사회
};

// Creator emails (from SeedKpaTestAccounts)
const OPERATOR_EMAIL = 'yaksa31@o4o.com';    // 대한약사회, 근무약사 → 운영자
const SUPPLIER_EMAIL = 'yaksa41@o4o.com';    // 대한약사회, 산업약사 → 공급자 대리
const PHARMACIST_EMAIL = 'yaksa01@o4o.com';  // 종로구, 개국약사 → 약사 이용자

// ============================================================================
// UUID Scheme (hex-safe)
// Content: e0000000-0a00-4000-e000-000000000{001..028}
// Slots:   e1000000-0a00-4000-e100-000000000{001..028}
// ============================================================================

function contentId(n: number): string {
  return `e0000000-0a00-4000-e000-${n.toString().padStart(12, '0')}`;
}
function slotId(n: number): string {
  return `e1000000-0a00-4000-e100-${n.toString().padStart(12, '0')}`;
}

// ============================================================================
// Banner Data
// ============================================================================

interface BannerSeed {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  linkUrl: string;
  linkText: string;
  creatorType: 'operator' | 'supplier' | 'pharmacist';
  organizationId: string | null;
  sortOrder: number;
  isPinned: boolean;
  isOperatorPicked: boolean;
  metadata: Record<string, any>;
}

// Color scheme for placeholders: operator=#1a5276, supplier=#7d3c98, pharmacist=#1e8449
const IMG_BASE = 'https://placehold.co/1200x400';

// --- Operator Banners (10) ---
const operatorBanners: BannerSeed[] = [
  {
    id: contentId(1), title: '대한약사회 디지털 전환 프로젝트',
    summary: 'O4O 플랫폼 기반 약국 디지털 전환 프로젝트가 시작됩니다. 지금 참여하세요.',
    imageUrl: `${IMG_BASE}/1a5276/ffffff?text=디지털+전환+프로젝트`,
    linkUrl: '/services/digital-transform', linkText: '자세히 보기',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 1,
    isPinned: true, isOperatorPicked: true,
    metadata: { creatorType: 'operator', backgroundColor: '#1a5276', category: '프로젝트' },
  },
  {
    id: contentId(2), title: '2026년 보수교육 온라인 신청 안내',
    summary: '약사 보수교육이 온라인으로 전환됩니다. 신청 일정과 방법을 확인하세요.',
    imageUrl: `${IMG_BASE}/2e86c1/ffffff?text=보수교육+신청`,
    linkUrl: '/education/continuing', linkText: '신청하기',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 2,
    isPinned: true, isOperatorPicked: false,
    metadata: { creatorType: 'operator', backgroundColor: '#2e86c1', category: '교육' },
  },
  {
    id: contentId(3), title: '약사 면허 갱신 일정 공지',
    summary: '2026년도 약사 면허 갱신 일정입니다. 기한 내에 갱신해 주세요.',
    imageUrl: `${IMG_BASE}/1a5276/ffffff?text=면허+갱신`,
    linkUrl: '/notice/license-renewal', linkText: '일정 확인',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 3,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'operator', backgroundColor: '#1a5276', category: '공지' },
  },
  {
    id: contentId(4), title: '지역약사회 가입 혜택 안내',
    summary: '지역약사회 가입 시 다양한 혜택을 제공합니다. 아직 미가입이시라면 확인하세요.',
    imageUrl: `${IMG_BASE}/2874a6/ffffff?text=약사회+가입+혜택`,
    linkUrl: '/membership/benefits', linkText: '혜택 보기',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 4,
    isPinned: false, isOperatorPicked: true,
    metadata: { creatorType: 'operator', backgroundColor: '#2874a6', category: '회원' },
  },
  {
    id: contentId(5), title: '약국 디지털 사이니지 무료 체험',
    summary: '약국 디지털 사이니지 서비스를 30일간 무료로 체험해 보세요.',
    imageUrl: `${IMG_BASE}/1b4f72/ffffff?text=사이니지+무료체험`,
    linkUrl: '/signage/trial', linkText: '신청하기',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 5,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'operator', backgroundColor: '#1b4f72', category: '서비스' },
  },
  {
    id: contentId(6), title: '약사 정신건강 상담 프로그램',
    summary: '약사를 위한 무료 정신건강 상담 프로그램을 운영합니다.',
    imageUrl: `${IMG_BASE}/1a5276/ffffff?text=정신건강+상담`,
    linkUrl: '/welfare/mental-health', linkText: '상담 신청',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 6,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'operator', backgroundColor: '#1a5276', category: '복지' },
  },
  {
    id: contentId(7), title: '2026 대한약사회 정기총회 안내',
    summary: '제72회 정기총회가 3월 15일 개최됩니다. 참석 등록을 서둘러 주세요.',
    imageUrl: `${IMG_BASE}/154360/ffffff?text=정기총회`,
    linkUrl: '/events/annual-meeting', linkText: '참석 등록',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 7,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'operator', backgroundColor: '#154360', category: '행사' },
  },
  {
    id: contentId(8), title: '약국 경영 컨설팅 서비스 오픈',
    summary: '전문 컨설턴트가 약국 경영 진단 및 개선 방안을 제시합니다.',
    imageUrl: `${IMG_BASE}/1a5276/ffffff?text=경영+컨설팅`,
    linkUrl: '/services/consulting', linkText: '신청하기',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 8,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'operator', backgroundColor: '#1a5276', category: '서비스' },
  },
  {
    id: contentId(9), title: '전국 약국 현황 데이터 보고서',
    summary: '2025년 전국 약국 현황 통계 보고서가 발간되었습니다.',
    imageUrl: `${IMG_BASE}/2e86c1/ffffff?text=약국+현황+보고서`,
    linkUrl: '/reports/pharmacy-statistics', linkText: '보고서 보기',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 9,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'operator', backgroundColor: '#2e86c1', category: '보고서' },
  },
  {
    id: contentId(10), title: '약사 직능 강화 세미나 시리즈',
    summary: '약사 역량 강화를 위한 월간 세미나를 개최합니다. 2월 주제: 만성질환 관리.',
    imageUrl: `${IMG_BASE}/1b4f72/ffffff?text=직능+강화+세미나`,
    linkUrl: '/education/seminars', linkText: '세미나 신청',
    creatorType: 'operator', organizationId: ORG_IDS.ASSOCIATION, sortOrder: 10,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'operator', backgroundColor: '#1b4f72', category: '교육' },
  },
];

// --- Supplier Banners (10) ---
const supplierBanners: BannerSeed[] = [
  {
    id: contentId(11), title: '[한미약품] 신규 제네릭 출시 안내',
    summary: '고혈압 치료제 신규 제네릭이 출시되었습니다. 약국 입고 안내.',
    imageUrl: `${IMG_BASE}/7d3c98/ffffff?text=한미약품+신규출시`,
    linkUrl: '/suppliers/hanmi/new-products', linkText: '제품 정보',
    creatorType: 'supplier', organizationId: null, sortOrder: 1,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '한미약품', backgroundColor: '#7d3c98', category: '신제품' },
  },
  {
    id: contentId(12), title: '[대웅제약] 간 건강 영양제 프로모션',
    summary: '우루사 시리즈 약국 대상 특별 프로모션. 3+1 행사 진행 중.',
    imageUrl: `${IMG_BASE}/6c3483/ffffff?text=대웅제약+프로모션`,
    linkUrl: '/suppliers/daewoong/promo', linkText: '프로모션 확인',
    creatorType: 'supplier', organizationId: null, sortOrder: 2,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '대웅제약', backgroundColor: '#6c3483', category: '프로모션' },
  },
  {
    id: contentId(13), title: '[유한양행] 소화제 리뉴얼 출시',
    summary: '유한양행 소화제 라인업이 리뉴얼되었습니다. 새로운 패키지와 성분을 확인하세요.',
    imageUrl: `${IMG_BASE}/7d3c98/ffffff?text=유한양행+리뉴얼`,
    linkUrl: '/suppliers/yuhan/renewal', linkText: '리뉴얼 정보',
    creatorType: 'supplier', organizationId: null, sortOrder: 3,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '유한양행', backgroundColor: '#7d3c98', category: '신제품' },
  },
  {
    id: contentId(14), title: '[종근당] 여름 건강 특별전',
    summary: '여름 시즌 건강관리 제품 특별 할인. 약국 전용 패키지.',
    imageUrl: `${IMG_BASE}/5b2c6f/ffffff?text=종근당+여름특별전`,
    linkUrl: '/suppliers/chongkundang/summer', linkText: '특별전 보기',
    creatorType: 'supplier', organizationId: null, sortOrder: 4,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '종근당', backgroundColor: '#5b2c6f', category: '프로모션' },
  },
  {
    id: contentId(15), title: '[일동제약] 아로나민 리뉴얼 프로모션',
    summary: '아로나민골드 리뉴얼 기념 약국 전용 프로모션.',
    imageUrl: `${IMG_BASE}/6c3483/ffffff?text=일동제약+아로나민`,
    linkUrl: '/suppliers/ildong/aronamin', linkText: '프로모션 참여',
    creatorType: 'supplier', organizationId: null, sortOrder: 5,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '일동제약', backgroundColor: '#6c3483', category: '프로모션' },
  },
  {
    id: contentId(16), title: '[녹십자] 2026 독감 백신 사전 예약',
    summary: '2026-2027 시즌 독감 백신 약국 사전 예약이 시작되었습니다.',
    imageUrl: `${IMG_BASE}/7d3c98/ffffff?text=녹십자+독감백신`,
    linkUrl: '/suppliers/greencross/flu-vaccine', linkText: '사전 예약',
    creatorType: 'supplier', organizationId: null, sortOrder: 6,
    isPinned: true, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '녹십자', backgroundColor: '#7d3c98', category: '예약' },
  },
  {
    id: contentId(17), title: '[동아제약] 박카스 약국 전용 패키지',
    summary: '박카스 약국 전용 기획 패키지. 봄 시즌 한정 판매.',
    imageUrl: `${IMG_BASE}/5b2c6f/ffffff?text=동아제약+박카스`,
    linkUrl: '/suppliers/donga/bacchus', linkText: '주문하기',
    creatorType: 'supplier', organizationId: null, sortOrder: 7,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '동아제약', backgroundColor: '#5b2c6f', category: '프로모션' },
  },
  {
    id: contentId(18), title: '[보령제약] 겔포스 봄 프로모션',
    summary: '겔포스 시리즈 봄 시즌 프로모션. 대량 구매 시 추가 할인.',
    imageUrl: `${IMG_BASE}/7d3c98/ffffff?text=보령제약+겔포스`,
    linkUrl: '/suppliers/boryung/gelfos', linkText: '프로모션 보기',
    creatorType: 'supplier', organizationId: null, sortOrder: 8,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '보령제약', backgroundColor: '#7d3c98', category: '프로모션' },
  },
  {
    id: contentId(19), title: '[제일약품] 약국 전용 건강기능식품',
    summary: '약사가 추천하는 건강기능식품 라인업. 약국 전용 마진율 안내.',
    imageUrl: `${IMG_BASE}/6c3483/ffffff?text=제일약품+건강기능식품`,
    linkUrl: '/suppliers/jeil/health-supplements', linkText: '제품 보기',
    creatorType: 'supplier', organizationId: null, sortOrder: 9,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '제일약품', backgroundColor: '#6c3483', category: '제품' },
  },
  {
    id: contentId(20), title: '[한독] 훼스탈 봄 캠페인',
    summary: '훼스탈 봄 시즌 캠페인. 약국 POP 및 디지털 사이니지 소재 제공.',
    imageUrl: `${IMG_BASE}/5b2c6f/ffffff?text=한독+훼스탈`,
    linkUrl: '/suppliers/handok/festal', linkText: '캠페인 참여',
    creatorType: 'supplier', organizationId: null, sortOrder: 10,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'supplier', supplierName: '한독', backgroundColor: '#5b2c6f', category: '캠페인' },
  },
];

// --- Pharmacist Banners (8) ---
const pharmacistBanners: BannerSeed[] = [
  {
    id: contentId(21), title: '종로중앙약국 야간 영업 안내',
    summary: '매일 오후 10시까지 야간 영업합니다. 야간 처방전 조제도 가능합니다.',
    imageUrl: `${IMG_BASE}/1e8449/ffffff?text=야간+영업+안내`,
    linkUrl: '/pharmacy/jongno-central/hours', linkText: '영업시간 보기',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 1,
    isPinned: true, isOperatorPicked: false,
    metadata: { creatorType: 'pharmacist', pharmacyName: '종로중앙약국', backgroundColor: '#1e8449', category: '안내' },
  },
  {
    id: contentId(22), title: '봄 맞이 건강검진 이벤트',
    summary: '혈압, 혈당, 체지방 무료 측정 이벤트. 2월 한 달간 진행.',
    imageUrl: `${IMG_BASE}/239b56/ffffff?text=건강검진+이벤트`,
    linkUrl: '/pharmacy/jongno-central/events', linkText: '이벤트 보기',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 2,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'pharmacist', pharmacyName: '종로중앙약국', backgroundColor: '#239b56', category: '이벤트' },
  },
  {
    id: contentId(23), title: '독감 예방접종 예약 안내',
    summary: '종로중앙약국에서 독감 예방접종 예약을 받고 있습니다.',
    imageUrl: `${IMG_BASE}/1e8449/ffffff?text=독감+예방접종`,
    linkUrl: '/pharmacy/jongno-central/flu-shot', linkText: '예약하기',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 3,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'pharmacist', pharmacyName: '종로중앙약국', backgroundColor: '#1e8449', category: '예약' },
  },
  {
    id: contentId(24), title: '복약상담 예약 서비스 오픈',
    summary: '약사와 1:1 복약상담을 예약하세요. 만성질환 관리에 도움을 드립니다.',
    imageUrl: `${IMG_BASE}/196f3d/ffffff?text=복약상담+예약`,
    linkUrl: '/pharmacy/jongno-central/consultation', linkText: '예약 신청',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 4,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'pharmacist', pharmacyName: '종로중앙약국', backgroundColor: '#196f3d', category: '서비스' },
  },
  {
    id: contentId(25), title: '어린이 건강상담 프로그램',
    summary: '소아 환자를 위한 맞춤형 건강상담 프로그램을 운영합니다.',
    imageUrl: `${IMG_BASE}/1e8449/ffffff?text=어린이+건강상담`,
    linkUrl: '/pharmacy/jongno-central/kids-health', linkText: '프로그램 보기',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 5,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'pharmacist', pharmacyName: '종로중앙약국', backgroundColor: '#1e8449', category: '프로그램' },
  },
  {
    id: contentId(26), title: '고혈압·당뇨 관리 프로그램',
    summary: '만성질환 환자 대상 월간 건강 관리 프로그램입니다.',
    imageUrl: `${IMG_BASE}/239b56/ffffff?text=만성질환+관리`,
    linkUrl: '/pharmacy/jongno-central/chronic-care', linkText: '참여 신청',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 6,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'pharmacist', pharmacyName: '종로중앙약국', backgroundColor: '#239b56', category: '프로그램' },
  },
  {
    id: contentId(27), title: '약국 배달 서비스 시작',
    summary: '종로구 내 의약품 배달 서비스가 시작되었습니다. 전화 주문 가능.',
    imageUrl: `${IMG_BASE}/1e8449/ffffff?text=배달+서비스`,
    linkUrl: '/pharmacy/jongno-central/delivery', linkText: '서비스 안내',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 7,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'pharmacist', pharmacyName: '종로중앙약국', backgroundColor: '#1e8449', category: '서비스' },
  },
  {
    id: contentId(28), title: '건강기능식품 할인 행사',
    summary: '인기 건강기능식품 최대 20% 할인. 이번 달 말까지.',
    imageUrl: `${IMG_BASE}/196f3d/ffffff?text=건기식+할인`,
    linkUrl: '/pharmacy/jongno-central/sale', linkText: '할인 제품 보기',
    creatorType: 'pharmacist', organizationId: ORG_IDS.JONGNO_GROUP, sortOrder: 8,
    isPinned: false, isOperatorPicked: false,
    metadata: { creatorType: 'pharmacist', pharmacyName: '종로중앙약국', backgroundColor: '#196f3d', category: '할인' },
  },
];

const allBanners = [...operatorBanners, ...supplierBanners, ...pharmacistBanners];

// ============================================================================
// Slot Placement Mapping
// ============================================================================

interface SlotSeed {
  id: string;
  slotKey: string;
  contentId: string;
  sortOrder: number;
}

// Place key banners in dashboard/signage slots
const slotPlacements: SlotSeed[] = [
  // kpa-main-hero: top operator banners for main page carousel
  { id: slotId(1), slotKey: 'kpa-main-hero', contentId: contentId(1), sortOrder: 1 },
  { id: slotId(2), slotKey: 'kpa-main-hero', contentId: contentId(2), sortOrder: 2 },
  { id: slotId(3), slotKey: 'kpa-main-hero', contentId: contentId(7), sortOrder: 3 },
  { id: slotId(4), slotKey: 'kpa-main-hero', contentId: contentId(4), sortOrder: 4 },

  // kpa-dashboard-banner: mixed content for operator dashboard
  { id: slotId(5), slotKey: 'kpa-dashboard-banner', contentId: contentId(1), sortOrder: 1 },
  { id: slotId(6), slotKey: 'kpa-dashboard-banner', contentId: contentId(5), sortOrder: 2 },
  { id: slotId(7), slotKey: 'kpa-dashboard-banner', contentId: contentId(11), sortOrder: 3 },
  { id: slotId(8), slotKey: 'kpa-dashboard-banner', contentId: contentId(16), sortOrder: 4 },

  // kpa-supplier-promo: supplier promotions for signage/promo section
  { id: slotId(9), slotKey: 'kpa-supplier-promo', contentId: contentId(11), sortOrder: 1 },
  { id: slotId(10), slotKey: 'kpa-supplier-promo', contentId: contentId(12), sortOrder: 2 },
  { id: slotId(11), slotKey: 'kpa-supplier-promo', contentId: contentId(15), sortOrder: 3 },
  { id: slotId(12), slotKey: 'kpa-supplier-promo', contentId: contentId(16), sortOrder: 4 },
  { id: slotId(13), slotKey: 'kpa-supplier-promo', contentId: contentId(17), sortOrder: 5 },

  // kpa-pharmacy-banner: pharmacist self-service banners
  { id: slotId(14), slotKey: 'kpa-pharmacy-banner', contentId: contentId(21), sortOrder: 1 },
  { id: slotId(15), slotKey: 'kpa-pharmacy-banner', contentId: contentId(22), sortOrder: 2 },
  { id: slotId(16), slotKey: 'kpa-pharmacy-banner', contentId: contentId(23), sortOrder: 3 },
  { id: slotId(17), slotKey: 'kpa-pharmacy-banner', contentId: contentId(27), sortOrder: 4 },
];

// ============================================================================
// Migration
// ============================================================================

export class SeedKpaBannerContent20260207500000 implements MigrationInterface {
  name = 'SeedKpaBannerContent20260207500000';

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
      console.log('[SeedKpaBannerContent] Skipping: test users not found. Run SeedKpaTestAccounts first.');
      return;
    }

    const userIdMap: Record<string, string> = {
      operator: operatorRow[0].id,
      supplier: supplierRow[0].id,
      pharmacist: pharmacistRow[0].id,
    };

    // --- Insert CMS content records ---
    let inserted = 0;
    for (const b of allBanners) {
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
          'hero', $4, $5, NULL,
          $6, $7, $8,
          'published', NOW(), NULL,
          $9, $10, $11,
          $12, $13,
          NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `, [
        b.id, b.organizationId, SERVICE_KEY,
        b.title, b.summary,
        b.imageUrl, b.linkUrl, b.linkText,
        b.sortOrder, b.isPinned, b.isOperatorPicked,
        JSON.stringify(b.metadata), userIdMap[b.creatorType],
      ]);
      inserted++;
    }

    // --- Insert slot placements ---
    let slotsInserted = 0;
    for (const s of slotPlacements) {
      // Find the banner's organizationId for slot scoping
      const banner = allBanners.find(b => b.id === s.contentId);

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
        s.id, banner?.organizationId ?? null, SERVICE_KEY,
        s.slotKey, s.contentId,
        s.sortOrder,
      ]);
      slotsInserted++;
    }

    console.log(`[SeedKpaBannerContent] Done: ${inserted} banners, ${slotsInserted} slot placements`);
    console.log(`  Operator: 10, Supplier: 10, Pharmacist: 8`);
    console.log(`  Slots: kpa-main-hero(4), kpa-dashboard-banner(4), kpa-supplier-promo(5), kpa-pharmacy-banner(4)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const contentIds = allBanners.map(b => `'${b.id}'`).join(',');
    const slotIds = slotPlacements.map(s => `'${s.id}'`).join(',');

    // 1. Delete slot placements first (FK to cms_contents)
    await queryRunner.query(`DELETE FROM cms_content_slots WHERE id IN (${slotIds})`);

    // 2. Delete content records
    await queryRunner.query(`DELETE FROM cms_contents WHERE id IN (${contentIds})`);

    console.log('[SeedKpaBannerContent] Down: banner content and slots removed');
  }
}
