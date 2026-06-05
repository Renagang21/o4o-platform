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
 * WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1 (2026-06-05):
 *   O4O-STORE-MENU-CANONICAL-TREE-V1 §9.3 의 W9 구현 (매장 메뉴 축 정렬).
 *   3개 서비스(KPA / GlycoPharm / K-Cosmetics) 사이드 메뉴를 동일 축으로 재배치:
 *     (무라벨)        홈 / 대시보드
 *     운영           공급자(O4O) 상품 · 주문 · [매출/정산]
 *     활성화          내 매장(약국) 상품 ★ · [자체 상품] · [상품 상세설명] · 블로그 · POP · QR
 *     자료함          콘텐츠 · 자료 · 매장 제작 자료
 *     디지털 사이니지   플레이리스트 · 동영상 · 스케줄 · TV 재생   (변경 없음)
 *     채널/마케팅     채널 관리 · 태블릿 · 상담요청 · [펀딩/퍼널 등]
 *     분석           마케팅 분석
 *     [경영(GP)]      약국 경영 · 정산
 *     설정           매장(약국) 정보 · 매장 설정
 *   핵심 이동: 내 매장(약국) 상품을 commerce(운영) → "활성화" 그룹 앵커로 이동,
 *             제품 파생 콘텐츠(블로그/POP/QR/상품설명)를 그 아래로 모음.
 *   모든 항목의 subPath(라우트)는 불변 — 섹션 그룹/순서/라벨만 재배치.
 *   라벨: KPA/GlycoPharm = "약국 운영/약국 활성화/약국 자료함", K-Cosmetics = "매장 운영/매장 활성화/내 자료함".
 *   사이니지는 분리 유지(제품 파생 아님) — 변경 없음.
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
 * WO-O4O-TABLET-MENU-STRUCTURE-ALIGN-V1: 태블릿 표현 통합
 * WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1 (2026-06-05):
 *   매장 운영(주문·매출) / 매장 활성화(내 매장 상품·자체 상품·상품설명·블로그·POP·QR) 축 정렬.
 *   태블릿 → 채널 그룹으로 이동.
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
    { label: '매장 운영', items: [
      // WO-O4O-KCOSMETICS-STORE-ORDERS-FRONTEND-ALIGNMENT-V1: 매장 주문 관리
      { key: 'orders',  label: '주문 내역', subPath: '/commerce/orders' },
      // WO-O4O-KCOSMETICS-STORE-REVENUE-SUMMARY-FRONTEND-V1: 매출 요약 (참고용, 정산 확정 아님)
      { key: 'billing', label: '매출 요약', subPath: '/commerce/billing' },
    ]},
    { label: '매장 활성화', items: [
      // WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: ProductMaster 기반 매장 진열 — 활성화 앵커
      { key: 'my-products',    label: '내 매장 상품', subPath: '/my-products' },
      // WO-O4O-KCOSMETICS-STORE-PATH-NESTED-MIGRATION-V1: 매장 자체 보유 제품
      { key: 'local-products', label: '자체 상품',    subPath: '/commerce/local-products' },
      // WO-O4O-STORE-PRODUCT-DESCRIPTIONS-CROSSSERVICE-V1: 상품 상세설명 관리
      { key: 'product-descriptions', label: '상품 상세설명', subPath: '/library/product-descriptions' },
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
    // WO-O4O-STORE-MARKETING-ANALYTICS-CROSSSERVICE-V1: 마케팅 분석
    { label: '분석', items: [
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
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
 * WO-O4O-TABLET-MENU-STRUCTURE-ALIGN-V1: 태블릿/사이니지 표현 통합
 * WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1 (2026-06-05):
 *   약국 운영(상품 관리·B2B·주문) / 약국 활성화(내 약국 상품·자체 상품·상품설명·블로그·POP·QR) 축 정렬.
 *   마케팅·콘텐츠 그룹의 제품 파생 콘텐츠 → 활성화로 이동, 펀딩/퍼널/채널은 마케팅·채널 그룹 유지.
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
    { label: '약국 운영', items: [
      { key: 'products',  label: '공급자 상품', subPath: '/products' },
      { key: 'b2b-order', label: 'B2B 주문',   subPath: '/b2b-order' },
      { key: 'orders',    label: '주문 내역',   subPath: '/commerce/orders' },
    ]},
    { label: '약국 활성화', items: [
      // WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: ProductMaster 기반 매장 진열 — 활성화 앵커
      { key: 'my-products',    label: '내 약국 상품', subPath: '/my-products' },
      // WO-O4O-GLYCOPHARM-STORE-PATH-NESTED-MIGRATION-V1: 매장 자체 보유 제품
      { key: 'local-products', label: '자체 상품',    subPath: '/commerce/local-products' },
      // WO-O4O-STORE-PRODUCT-DESCRIPTIONS-CROSSSERVICE-V1: 상품 상세설명 관리
      { key: 'product-descriptions', label: '상품 상세설명', subPath: '/library/product-descriptions' },
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
      { key: 'market-trial', label: '유통 참여형 펀딩', subPath: '/market-trial' },
      { key: 'funnel',       label: '전환 퍼널',      subPath: '/funnel' },
      { key: 'content',      label: '콘텐츠 가져오기', subPath: '/content' },
      { key: 'channels',     label: '채널 관리',      subPath: '/channels' },
    ]},
    // WO-O4O-STORE-MARKETING-ANALYTICS-CROSSSERVICE-V1: 마케팅 분석
    { label: '분석', items: [
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
    ]},
    { label: '경영', items: [
      { key: 'management',    label: '약국 경영',       subPath: '/management' },
      // WO-O4O-GLYCOPHARM-PHARMACY-PROFILE-EDIT-PAGE-V1: users.businessInfo SSOT
      { key: 'pharmacy-info', label: '약국/사업자 정보', subPath: '/info' },
      { key: 'billing',       label: '정산/인보이스',    subPath: '/billing' },
    ]},
    { label: '설정', items: [
      { key: 'settings', label: '설정', subPath: '/settings' },
    ]},
  ],
};

/**
 * KPA-Society Store Config (canonical reference)
 * WO-STORE-SIDEBAR-RESTRUCTURE-V1 / WO-KPA-STORE-MENU-NORMALIZATION-V1 등 이전 정렬 이력 생략.
 * WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1 (2026-06-05):
 *   O4O-STORE-MENU-CANONICAL-TREE-V1 §9.3 W9 — 3개 서비스 메뉴 축 정렬의 기준(reference).
 *   "상품 관리" 그룹 분해 → 약국 운영(공급자 상품·주문) + 약국 활성화(내 약국 상품·블로그·POP·QR).
 *   기존 "매장 실행"(블로그/POP/QR) 그룹은 약국 활성화로 흡수.
 *   상품 상세설명은 KPA 라우트 마운트 미확인으로 활성화에서 제외(데드링크 방지) — 2차 후보.
 *   사이니지/채널/분석/설정 유지. 모든 subPath 불변.
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
    { label: '약국 운영', items: [
      { key: 'products',    label: '공급자 상품', subPath: '/commerce/products' },
      { key: 'orders',      label: '주문 내역',   subPath: '/commerce/orders' },
    ]},
    // 약국 활성화 — 내 약국 상품을 앵커로, 제품 파생 콘텐츠(블로그/POP/QR)를 함께 배치.
    // WO-O4O-KPA-STORE-MENU-BLOG-POP-QR-ALIGNMENT-V1 의 라우트/페이지/API 그대로 사용.
    { label: '약국 활성화', items: [
      { key: 'my-products',  label: '내 약국 상품', subPath: '/my-products' },
      { key: 'content-blog', label: '블로그',      subPath: '/content/blog' },
      { key: 'pop',          label: 'POP',        subPath: '/marketing/pop' },
      { key: 'qr',           label: 'QR-code',    subPath: '/marketing/qr' },
    ]},
    // WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-LIBRARY-TAB-V1: "매장 제작 자료" 항목 포함
    { label: '약국 자료함', items: [
      { key: 'library-contents',              label: '콘텐츠',       subPath: '/library/contents' },
      { key: 'library-resources',             label: '자료',         subPath: '/library/resources' },
      { key: 'library-production-materials',  label: '매장 제작 자료', subPath: '/library/production-materials' },
    ]},
    { label: '디지털 사이니지', items: [
      { key: 'signage-playlist',  label: '플레이리스트', subPath: '/marketing/signage/playlist' },
      { key: 'signage-videos',    label: '동영상',       subPath: '/marketing/signage/videos' },
      { key: 'signage-schedules', label: '스케줄',       subPath: '/marketing/signage/schedules' },
      { key: 'signage-player',    label: 'TV 재생',      subPath: '/marketing/signage/player' },
    ]},
    // 채널 — 매장 운영 보조 기능 (채널 관리 / 태블릿 / 상담 요청).
    { label: '채널', items: [
      { key: 'channels',         label: '채널 관리', subPath: '/channels' },
      { key: 'tablet-displays',  label: '태블릿',    subPath: '/commerce/tablet-displays' },
      { key: 'requests',         label: '상담 요청', subPath: '/requests' },
    ]},
    { label: '분석', items: [
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
    ]},
    { label: '설정', items: [
      { key: 'pharmacy-info',  label: '약국 정보', subPath: '/info' },
      { key: 'store-settings', label: '매장 설정', subPath: '/settings' },
    ]},
  ],
};
