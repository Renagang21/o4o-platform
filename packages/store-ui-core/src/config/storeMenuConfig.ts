/**
 * Store Dashboard Menu Configuration
 * WO-STORE-CORE-MENU-ALIGNMENT-V1 Phase 2 Step 1
 *
 * Store Core v1.0 기준 8개 메뉴 고정 + 서비스별 활성화 설정
 *
 * 이전 키 → 신규 키 매핑:
 *   overview   → dashboard
 *   identity   → (settings 하위로 강등)
 *   storefront → (settings 하위로 강등)
 *   settlement → billing
 *   display    → signage
 *   services   → (settings 하위로 강등)
 *   (신규)      → channels
 *
 * WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1 (2026-06-05): 운영/활성화 축 1차 정렬.
 * WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2 (2026-06-05):
 *   O4O-STORE-MENU-CANONICAL-TREE-V1 §9.3 의 W9 구현 (매장 메뉴 축 정렬 — 라벨/그룹/순서 최종 정리).
 *   3개 서비스(KPA / GlycoPharm / K-Cosmetics) 사이드 메뉴 canonical 축:
 *     (무라벨)        홈 / 대시보드
 *     상품·거래        상품(거래·주문 대상) · [거래 신청] · 주문 관리        ← 최상단
 *     활성화          내 매장(약국) 제품 ★(제작 기준 데이터) · [자체 상품] · 상품 설명 · 블로그 · POP · QR
 *     자료함          콘텐츠 · 자료 · 제작 자료
 *     디지털 사이니지   플레이리스트 · 동영상 · 스케줄 · TV 재생   (변경 없음 — 제품 파생 아님)
 *     채널/마케팅     채널 관리 · [태블릿 · 상담요청 · 퍼널 · 콘텐츠 가져오기]
 *     분석           마케팅 분석 · [매출 요약]
 *     [경영(GP)]      약국 경영 · 정산
 *     설정           매장(약국) 정보 · 설정
 *   용어 구분: "상품" = 거래·주문 대상(상품·거래 그룹), "제품" = 활성화 자료 제작 기준 데이터(활성화 그룹).
 *   원칙: 데드링크 생성 0 / 실기능 메뉴 은폐 0. 라우트 없는 항목(거래 신청·상품 성과·노출 설정 등)은
 *        해당 서비스에서 미추가. 실기능 메뉴(퍼널/경영/정산/태블릿/상담요청)는 가까운 그룹에 보존.
 *   라벨: KPA/GlycoPharm = "약국 상품·거래/약국 활성화/약국 자료함", K-Cosmetics = "매장 상품·거래/매장 활성화/내 자료함".
 *   정리된 데드링크: GP /products(미마운트), GP /market-trial(미마운트) 제거.
 */

export type StoreMenuKey =
  | 'dashboard'
  | 'products'
  | 'local-products'
  | 'channels'
  | 'orders'
  | 'content'
  | 'signage'
  | 'billing'
  | 'settings';

/** Section-based menu item (WO-O4O-STORE-HUB-STRUCTURE-REFACTOR-V1) */
export interface StoreMenuSectionItem {
  key: string;
  label: string;
  subPath: string;
}

/** Grouped menu section with optional header label */
export interface StoreMenuSection {
  label: string;  // 빈 문자열이면 헤더 미표시
  items: StoreMenuSectionItem[];
}

export interface StoreDashboardConfig {
  serviceKey: string;
  serviceName: string;
  basePath: string;
  enabledMenus: StoreMenuKey[];
  /** Section-based menu (제공 시 flat enabledMenus 대신 사용) */
  menuSections?: StoreMenuSection[];
}

export interface StoreMenuItemDef {
  key: StoreMenuKey;
  label: string;
  subPath: string; // '' for index route
}

/** Store Core v1.0 기준 메뉴 (순서 고정, 8개) */
export const ALL_STORE_MENUS: StoreMenuItemDef[] = [
  { key: 'dashboard', label: '대시보드', subPath: '' },
  { key: 'products', label: '상품 관리', subPath: '/products' },
  { key: 'local-products', label: '자체 상품', subPath: '/local-products' },
  { key: 'channels', label: '채널 관리', subPath: '/channels' },
  { key: 'orders', label: '주문 관리', subPath: '/orders' },
  { key: 'content', label: '콘텐츠 관리', subPath: '/content' },
  { key: 'signage', label: '사이니지', subPath: '/signage' },
  { key: 'billing', label: '정산/인보이스', subPath: '/billing' },
  { key: 'settings', label: '설정', subPath: '/settings' },
];

/**
 * K-Cosmetics Store Config
 * WO-KCOS-KPA-CANONICAL-MENU-ALIGN-V1: flat → section mode 전환
 * WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1: 운영/활성화 축 1차 정렬
 * WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2 (2026-06-05):
 *   "매장 상품·거래"(거래·주문 대상)를 최상단으로, 활성화 앵커는 "내 매장 제품"(제품=제작 기준 데이터).
 *   매출 요약 → 분석 그룹으로 이동(§2.6). KC는 공급자 상품/거래 신청 라우트 부재로 상품·거래=주문 관리만.
 *   태블릿은 실기능이라 채널 그룹에 보존.
 */
export const COSMETICS_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'cosmetics',
  serviceName: 'K-Cosmetics',
  basePath: '/store',
  enabledMenus: ['dashboard'],   // section 모드에서는 미사용, 하위 호환용으로 유지
  menuSections: [
    { label: '', items: [
      { key: 'home', label: '홈', subPath: '' },
    ]},
    { label: '매장 상품·거래', items: [
      // WO-O4O-KCOSMETICS-STORE-COMMERCE-PRODUCT-PAGE-INTRODUCE-V1: 상품 화면 1차 도입.
      // 공통 카탈로그(SupplyCatalogHub) + 기존 cosmetics 상품 API 재사용, route /commerce/products mount 동반(데드링크 0).
      { key: 'products', label: '상품', subPath: '/commerce/products' },
      // WO-O4O-KCOSMETICS-STORE-ORDERS-FRONTEND-ALIGNMENT-V1: 매장 주문 관리
      { key: 'orders', label: '주문 관리', subPath: '/commerce/orders' },
      // WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1: 판매자 모집 신청 현황(조회)
      { key: 'recruitment-applications', label: '신청·승인 현황', subPath: '/commerce/recruitment-applications' },
    ]},
    { label: '매장 활성화', items: [
      // WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: 활성화 앵커 — 제품(제작 기준 데이터)
      { key: 'my-products',    label: '내 매장 제품', subPath: '/my-products' },
      // WO-O4O-KCOSMETICS-STORE-PATH-NESTED-MIGRATION-V1: 매장 자체 보유 제품
      { key: 'local-products', label: '자체 상품',    subPath: '/commerce/local-products' },
      // WO-O4O-STORE-PRODUCT-DESCRIPTIONS-CROSSSERVICE-V1: 상품 설명 제작
      { key: 'product-descriptions', label: '상품 설명', subPath: '/library/product-descriptions' },
      // WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1: 제품 파생 콘텐츠
      { key: 'content-blog', label: '블로그',  subPath: '/content/blog' },
      { key: 'pop',          label: 'POP',     subPath: '/marketing/pop' },
      { key: 'qr',           label: 'QR 코드', subPath: '/marketing/qr' },
    ]},
    // WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1 / PHASE2-C-V1: 내 자료함
    { label: '내 자료함', items: [
      { key: 'library-contents',             label: '콘텐츠',      subPath: '/library/contents' },
      { key: 'library-resources',            label: '자료',        subPath: '/library/resources' },
      { key: 'library-production-materials', label: '매장 제작 자료', subPath: '/library/production-materials' },
    ]},
    { label: '디지털 사이니지', items: [
      // WO-O4O-MY-STORE-SIGNAGE-SUBMENU-ALIGNMENT-V1 / WO-O4O-KCOSMETICS-SIGNAGE-PLAYER-V1
      { key: 'signage-playlist',  label: '플레이리스트', subPath: '/marketing/signage/playlist' },
      { key: 'signage-videos',    label: '동영상',       subPath: '/marketing/signage/videos' },
      { key: 'signage-schedules', label: '스케줄',       subPath: '/marketing/signage/schedules' },
      { key: 'signage-player',    label: 'TV 재생',      subPath: '/marketing/signage/player' },
    ]},
    { label: '채널', items: [
      { key: 'channels',        label: '채널 관리', subPath: '/channels' },
      { key: 'tablet-displays', label: '태블릿',    subPath: '/commerce/tablet-displays' },
    ]},
    // WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1: 판매 채널 확장 (유료 기능 게이트)
    { label: '판매 채널 확장', items: [
      { key: 'foreign-visitor-sales-support', label: '외국인 여행객 판매지원', subPath: '/sales-channels/foreign-visitor' },
    ]},
    // WO-O4O-STORE-MARKETING-ANALYTICS-CROSSSERVICE-V1 + V2 §2.6: 판매/매출은 분석 영역
    { label: '분석', items: [
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
      // WO-O4O-KCOSMETICS-STORE-REVENUE-SUMMARY-FRONTEND-V1: 매출 요약 (참고용, 정산 확정 아님)
      { key: 'billing',             label: '매출 요약',   subPath: '/commerce/billing' },
    ]},
    { label: '설정', items: [
      // WO-O4O-KCOSMETICS-STORE-PROFILE-EDIT-PAGE-V1: users.businessInfo SSOT
      { key: 'store-info', label: '매장/사업자 정보', subPath: '/info' },
      { key: 'settings',   label: '매장 설정',        subPath: '/settings' },
    ]},
  ],
};

/**
 * GlycoPharm Store Config
 * WO-O4O-GLYCOPHARM-NAVIGATION-AND-STORE-STRUCTURE-REFINE-V1: flat → 섹션형
 * WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1: 운영/활성화 축 1차 정렬
 * WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2 (2026-06-05):
 *   "약국 상품·거래"(거래·주문 대상)를 최상단으로, 활성화 앵커는 "내 약국 제품"(제품=제작 기준 데이터).
 *   상품 = 공급자 거래 상품(B2B). GlycoPharm 의 owner 상품 화면은 /commerce/products(PharmacyB2BProducts, legacy /management/b2b redirect 보존),
 *   거래 신청은 /b2b-order. 기존 데드링크 정리: /products(미마운트), /market-trial(미마운트) 제거.
 *   퍼널/콘텐츠 가져오기/채널은 마케팅·채널, 약국 경영/정산은 경영 그룹에 보존(실기능 — 은폐 금지).
 */
export const GLYCOPHARM_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'glycopharm',
  serviceName: 'GlycoPharm 약국',
  basePath: '/store',
  enabledMenus: ['dashboard'],   // section 모드에서는 미사용, 하위 호환용으로 유지
  menuSections: [
    { label: '', items: [
      // WO-O4O-GLYCO-STORE-CANONICAL-ENTRY-ALIGN-V1: /store 인덱스 = 운영 홈
      { key: 'dashboard', label: '대시보드', subPath: '' },
    ]},
    { label: '약국 상품·거래', items: [
      // WO-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY-V1: canonical route 정렬.
      // 상품 = 공급자 거래 상품(B2B). owner 화면 = PharmacyB2BProducts(/commerce/products, KPA/KC 동형).
      // legacy /management/b2b 는 App.tsx 에서 redirect 보존(데드링크 0).
      { key: 'products',  label: '상품',     subPath: '/commerce/products' },
      // 거래 신청 = B2BOrderPage(/b2b-order)
      { key: 'b2b-order', label: '거래 신청', subPath: '/b2b-order' },
      { key: 'orders',    label: '주문 관리', subPath: '/commerce/orders' },
      // WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1: 판매자 모집 신청 현황(조회)
      { key: 'recruitment-applications', label: '신청·승인 현황', subPath: '/commerce/recruitment-applications' },
    ]},
    { label: '약국 활성화', items: [
      // WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: 활성화 앵커 — 제품(제작 기준 데이터)
      { key: 'my-products',    label: '내 약국 제품', subPath: '/my-products' },
      // WO-O4O-GLYCOPHARM-STORE-PATH-NESTED-MIGRATION-V1: 매장 자체 보유 제품
      { key: 'local-products', label: '자체 상품',    subPath: '/commerce/local-products' },
      // WO-O4O-STORE-PRODUCT-DESCRIPTIONS-CROSSSERVICE-V1: 상품 설명 제작
      { key: 'product-descriptions', label: '상품 설명', subPath: '/library/product-descriptions' },
      // WO-O4O-GLYCO-BLOG-INTRODUCE-V1 / marketing nested canonical: 제품 파생 콘텐츠
      { key: 'content-blog', label: '블로그',  subPath: '/content/blog' },
      { key: 'pop',          label: 'POP',     subPath: '/marketing/pop' },
      { key: 'qr',           label: 'QR 코드', subPath: '/marketing/qr' },
    ]},
    // WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1 / PHASE2-C-V1: 약국 자료함
    { label: '약국 자료함', items: [
      { key: 'library-contents',             label: '콘텐츠',   subPath: '/library/contents' },
      { key: 'library-resources',            label: '자료',     subPath: '/library/resources' },
      { key: 'library-production-materials', label: '제작 자료', subPath: '/library/production-materials' },
    ]},
    { label: '디지털 사이니지', items: [
      { key: 'signage-playlist',  label: '플레이리스트', subPath: '/marketing/signage/playlist' },
      { key: 'signage-videos',    label: '동영상',       subPath: '/marketing/signage/videos' },
      { key: 'signage-schedules', label: '스케줄',       subPath: '/marketing/signage/schedules' },
      { key: 'signage-player',    label: 'TV 재생',      subPath: '/marketing/signage/player' },
    ]},
    { label: '마케팅·채널', items: [
      { key: 'funnel',   label: '전환 퍼널',      subPath: '/funnel' },
      { key: 'content',  label: '콘텐츠 가져오기', subPath: '/content' },
      { key: 'channels', label: '채널 관리',      subPath: '/channels' },
    ]},
    // WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1: 판매 채널 확장 (유료 기능 게이트)
    { label: '판매 채널 확장', items: [
      { key: 'foreign-visitor-sales-support', label: '외국인 여행객 판매지원', subPath: '/sales-channels/foreign-visitor' },
    ]},
    // WO-O4O-STORE-MARKETING-ANALYTICS-CROSSSERVICE-V1: 마케팅 분석
    { label: '분석', items: [
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
    ]},
    { label: '경영', items: [
      { key: 'management', label: '약국 경영',    subPath: '/management' },
      { key: 'billing',    label: '정산/인보이스', subPath: '/billing' },
    ]},
    { label: '설정', items: [
      // WO-O4O-GLYCOPHARM-PHARMACY-PROFILE-EDIT-PAGE-V1: users.businessInfo SSOT
      { key: 'pharmacy-info', label: '약국/사업자 정보', subPath: '/info' },
      { key: 'settings',      label: '설정',           subPath: '/settings' },
    ]},
  ],
};

/**
 * KPA-Society Store Config (canonical reference)
 * WO-STORE-SIDEBAR-RESTRUCTURE-V1 / WO-KPA-STORE-MENU-NORMALIZATION-V1 등 이전 정렬 이력 생략.
 * WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1: 운영/활성화 축 1차 정렬.
 * WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2 (2026-06-05):
 *   "약국 상품·거래"(거래·주문 대상) 최상단. 상품 설명을 경영지원에 추가(라우트 /marketing/product-descriptions 확인됨).
 *   태블릿/상담 요청은 실기능이라 채널 그룹 보존. 사이니지/분석/설정 유지. subPath 불변.
 * WO-O4O-KPA-STORE-MENU-ACTIVATION-RELABEL-AND-MY-PRODUCTS-MOVE-V1:
 *   "약국 활성화" → "약국 경영지원" 라벨 변경 + "내 약국 제품"을 "약국 상품·거래" 그룹으로 이동(route 무변경).
 *   KPA 섹션 한정 — GP/KCos 무변경.
 */
export const KPA_SOCIETY_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'kpa-society',
  serviceName: '약국 경영지원',
  basePath: '/store',
  enabledMenus: ['dashboard'],
  menuSections: [
    { label: '', items: [
      { key: 'home', label: '홈', subPath: '' },
    ]},
    { label: '약국 상품·거래', items: [
      // 상품 = 공급자 거래 상품(B2B). PharmacyB2BPage(/commerce/products).
      // 거래 신청 전용 라우트는 KPA에 없음 → 별도 항목 미추가(데드링크 방지).
      // WO-O4O-KPA-STORE-MENU-PRODUCTS-RELABEL-TO-O4O-PRODUCTS-V1:
      //   라벨만 '상품' → 'O4O 제품'(플랫폼 제공·신청·주문 가능 제품). '내 약국 제품'(자체 취급)과 구분.
      //   key/subPath/route/권한/기능 무변경. KPA 블록 한정(GP/KCos 무영향).
      { key: 'products', label: 'O4O 제품', subPath: '/commerce/products' },
      // WO-O4O-KPA-STORE-PRODUCT-MENU-IA-REORG-V1:
      //   제품 기준 관리(내 매장 제품=organization_product_listings / 매장 자체 제품=store_local_products)를
      //   '약국 상품·거래'(제품 기준 영역)에 모은다. 기존 '타블렛' 그룹에서 이동(타블렛=노출 채널만 남김).
      //   route/page/API/DB 무변경 — 메뉴 위치만 정리.
      { key: 'my-products',     label: '내 매장 제품',   subPath: '/my-products' },
      { key: 'local-products',  label: '매장 자체 제품', subPath: '/commerce/local-products' },
      // WO-O4O-KPA-ONLINE-SALES-ORDER-MANAGEMENT-AND-BUYER-ORDER-RELABEL-V1:
      //   /commerce/orders 는 매장이 공급자에게 주문한 '구매/발주' 내역(buyer) → '발주 내역'으로 라벨 정비.
      //   고객에게 판매한 주문(seller)은 '온라인 판매 > 주문 관리'(/online-sales/orders)로 분리.
      { key: 'orders',   label: '발주 내역', subPath: '/commerce/orders' },
      // WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1: 판매자 모집 신청 현황(조회)
      { key: 'recruitment-applications', label: '신청·승인 현황', subPath: '/commerce/recruitment-applications' },
    ]},
    // 약국 경영지원 — 제품 파생 콘텐츠(상품 설명/블로그/POP/QR) 배치.
    // WO-O4O-KPA-STORE-MENU-ACTIVATION-RELABEL-AND-MY-PRODUCTS-MOVE-V1:
    //   "약국 활성화" → "약국 경영지원" 라벨 변경. "내 약국 제품"은 "약국 상품·거래" 그룹으로 이동(위 참조).
    // WO-O4O-KPA-STORE-MENU-BLOG-POP-QR-ALIGNMENT-V1 의 라우트/페이지/API 그대로 사용.
    { label: '약국 경영지원', items: [
      // WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS-CANONICAL-ALIGN-V1: StoreProductDescriptionsPage
      { key: 'product-descriptions', label: '상품 설명', subPath: '/marketing/product-descriptions' },
      { key: 'content-blog', label: '블로그',   subPath: '/content/blog' },
      { key: 'pop',          label: 'POP',     subPath: '/marketing/pop' },
      { key: 'qr',           label: 'QR-code', subPath: '/marketing/qr' },
      // WO-O4O-KPA-STORE-PRODUCT-MENU-IA-REORG-V1:
      //   타블렛 구성은 제품 등록이 아니라 기존 제품을 고객 안내 화면(타블렛)에 노출/구성하는 활용 채널 →
      //   POP/QR/블로그와 같은 '약국 경영지원'으로 이동. route(/commerce/tablet-displays) 무변경.
      { key: 'tablet-displays', label: '타블렛 구성', subPath: '/commerce/tablet-displays' },
    ]},
    // WO-O4O-KPA-QR-POP-RESULT-SCOPE-V1: KPA 사이드바에서 "매장 제작 자료" 메뉴 숨김.
    //   POP/제작 결과물은 콘텐츠 목록(QR·POP 바로 만들기) + 결과물 메뉴 중심으로 안내한다.
    //   route(/store/library/production-materials, /new, /:id/edit)는 App.tsx 에 유지 — 딥링크/저장 후 redirect/legacy 접근 보호.
    //   GP/KCos 는 자체 '제작 자료' 메뉴 유지(미변경).
    { label: '약국 자료함', items: [
      { key: 'library-contents',              label: '콘텐츠',       subPath: '/library/contents' },
      { key: 'library-resources',             label: '자료',         subPath: '/library/resources' },
    ]},
    { label: '디지털 사이니지', items: [
      { key: 'signage-playlist',  label: '플레이리스트', subPath: '/marketing/signage/playlist' },
      { key: 'signage-videos',    label: '동영상',       subPath: '/marketing/signage/videos' },
      { key: 'signage-schedules', label: '스케줄',       subPath: '/marketing/signage/schedules' },
      { key: 'signage-player',    label: 'TV 재생',      subPath: '/marketing/signage/player' },
    ]},
    // WO-O4O-KPA-ONLINE-SALES-FIRST-CLASS-MENU-PHASE1-V1 (KPA 블록 한정):
    //   온라인 판매(B2C)를 '채널 관리'에서 분리해 1급 메뉴로 승격(판매 설정/판매 상품).
    //   '채널 관리' 항목 제거, 채널 그룹은 '고객 응대'(태블릿/상담 요청)로 개편.
    //   KIOSK 는 출시 전 placeholder 라 사용자 메뉴 미노출. /store/channels → /store/online-sales/settings redirect.
    { label: '온라인 판매', items: [
      { key: 'online-sales-settings', label: '판매 설정', subPath: '/online-sales/settings' },
      { key: 'online-sales-products', label: '판매 상품', subPath: '/online-sales/products' },
      // WO-O4O-KPA-ONLINE-SALES-ORDER-MANAGEMENT-AND-BUYER-ORDER-RELABEL-V1: 판매(seller) 주문 관리
      { key: 'online-sales-orders',   label: '주문 관리', subPath: '/online-sales/orders' },
    ]},
    // WO-O4O-KPA-STORE-CONSULTATION-REQUEST-MENU-HIDDEN-ROUTE-CLEANUP-V1 (KPA 블록 한정):
    //   상담 요청은 요청 생성 시 매장 사용자 알림이 생성되고(WO-...-NOTIFICATION-WIRING-V1, smoke PASS),
    //   알림 클릭으로 /store/requests 처리 화면에 진입한다. → 사이드바 메뉴에서 '상담 요청' 제거.
    //   /store/requests route 는 hidden(URL 직접/알림 진입)으로 유지(App.tsx). 요청 테이블·API·처리 기능 불변.
    // WO-O4O-KPA-STORE-PRODUCT-MENU-IA-REORG-V1 (KPA 블록 한정):
    //   기존 '타블렛' 그룹 제거. 선행 IR(IR-O4O-KPA-STORE-PRODUCT-MENU-AND-LOCAL-PRODUCT-IA-AUDIT-V1):
    //   '내 매장 제품'(organization_product_listings)·'매장 자체 제품'(store_local_products)은 제품 기준 관리 →
    //   '약국 상품·거래'로 이동(위). '타블렛 구성'(노출 채널)은 '약국 경영지원'으로 이동(위).
    //   route/page/API/DB 무변경, 빈 그룹 잔존 없음.
    // WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1: 판매 채널 확장 (유료 기능 게이트)
    { label: '판매 채널 확장', items: [
      { key: 'foreign-visitor-sales-support', label: '외국인 여행객 판매지원', subPath: '/sales-channels/foreign-visitor' },
    ]},
    { label: '분석', items: [
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
    ]},
    { label: '설정', items: [
      { key: 'pharmacy-info',  label: '약국 정보', subPath: '/info' },
      // WO-O4O-KPA-STORE-SETTINGS-NAME-ALIGNMENT-V1: /settings 는 일반 설정이 아니라
      //   공개 매장 홈(storefront) 레이아웃/디자인 편집기 → 라벨을 '매장 홈 디자인' 으로 정합.
      //   URL(/settings)·기능은 불변. (KPA 전용 config — GP/KCos 무영향)
      { key: 'store-settings', label: '매장 홈 디자인', subPath: '/settings' },
    ]},
  ],
};
