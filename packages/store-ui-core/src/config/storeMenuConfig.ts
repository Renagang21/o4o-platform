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
 *   KPA canonical 기준 5섹션 구조
 * WO-O4O-TABLET-MENU-STRUCTURE-ALIGN-V1:
 *   - "콘텐츠/태블릿" 그룹 → "매장 실행" (콘텐츠 항목 부재로 정합성 회복)
 *   - "태블릿 진열" → "태블릿" (매장 내 device 단위 통합 표현)
 */
export const COSMETICS_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'cosmetics',
  serviceName: 'K-Cosmetics',
  basePath: '/store',
  enabledMenus: ['dashboard'],   // section 모드에서는 미사용, 하위 호환용으로 유지
  menuSections: [
    { label: '', items: [
      { key: 'home',     label: '홈',       subPath: '' },
      { key: 'channels', label: '채널 관리', subPath: '/channels' },
    ]},
    { label: '상품', items: [
      // WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: ProductMaster 기반 매장 진열
      { key: 'my-products',    label: '내 매장 상품', subPath: '/my-products' },
      { key: 'local-products', label: '자체 상품',    subPath: '/local-products' },
    ]},
    { label: '디지털 사이니지', items: [
      { key: 'signage', label: '사이니지', subPath: '/signage' },
    ]},
    { label: '매장 실행', items: [
      { key: 'tablet-displays', label: '태블릿', subPath: '/tablet-displays' },
    ]},
    { label: '설정', items: [
      { key: 'settings', label: '매장 설정', subPath: '/settings' },
    ]},
  ],
};

/**
 * GlycoPharm Store Config
 * WO-O4O-GLYCOPHARM-NAVIGATION-AND-STORE-STRUCTURE-REFINE-V1:
 *   flat enabledMenus → 섹션형 menuSections (4개 그룹)
 *   개요 / 운영 / 마케팅·콘텐츠 / 경영 / 설정
 * WO-O4O-TABLET-MENU-STRUCTURE-ALIGN-V1:
 *   - "태블릿 진열" → "태블릿" (매장 내 device 단위 통합 표현)
 *   - 사이니지 "재생" → "TV 재생" (TV fullscreen playback 의미 명확화)
 */
export const GLYCOPHARM_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'glycopharm',
  serviceName: 'GlycoPharm 약국',
  basePath: '/store',
  enabledMenus: ['dashboard'],   // section 모드에서는 미사용, 하위 호환용으로 유지
  menuSections: [
    {
      label: '',
      items: [
        // WO-O4O-GLYCO-STORE-CANONICAL-ENTRY-ALIGN-V1: /store 인덱스 = 운영 홈 (canonical 정렬)
        { key: 'dashboard', label: '대시보드', subPath: '' },
      ],
    },
    {
      label: '운영',
      items: [
        { key: 'products',        label: '상품 관리',    subPath: '/products' },
        // WO-O4O-STORE-PRODUCTS-SERVICE-ROUTING-V1: ProductMaster 기반 매장 진열
        { key: 'my-products',     label: '내 매장 상품', subPath: '/my-products' },
        { key: 'local-products',  label: '자체 상품',    subPath: '/local-products' },
        { key: 'b2b-order',       label: 'B2B 주문',     subPath: '/b2b-order' },
        { key: 'orders',          label: '주문 내역',    subPath: '/orders' },
        { key: 'tablet-displays', label: '태블릿',        subPath: '/tablet-displays' },
        { key: 'requests',        label: '고객 요청',    subPath: '/requests' },
      ],
    },
    {
      label: '디지털 사이니지',
      items: [
        { key: 'signage-playlist',  label: '플레이리스트', subPath: '/signage/playlist' },
        { key: 'signage-videos',    label: '동영상',       subPath: '/signage/videos' },
        { key: 'signage-schedules', label: '스케줄',       subPath: '/signage/schedules' },
        { key: 'signage-player',    label: 'TV 재생',      subPath: '/signage/player' },
      ],
    },
    {
      label: '마케팅·콘텐츠',
      items: [
        { key: 'market-trial', label: '유통 참여형 펀딩', subPath: '/market-trial' },
        { key: 'funnel',       label: '전환 퍼널',      subPath: '/funnel' },
        { key: 'content',      label: '콘텐츠 가져오기', subPath: '/content' },
        // WO-O4O-GLYCO-BLOG-INTRODUCE-V1: 전문 매장 운영자의 공개 콘텐츠 채널
        { key: 'content-blog', label: '블로그',         subPath: '/content/blog' },
        { key: 'channels',     label: '채널 관리',      subPath: '/channels' },
      ],
    },
    {
      label: '경영',
      items: [
        { key: 'management', label: '약국 경영', subPath: '/management' },
        { key: 'billing',    label: '정산/인보이스', subPath: '/billing' },
      ],
    },
    {
      label: '설정',
      items: [
        { key: 'settings', label: '설정', subPath: '/settings' },
      ],
    },
  ],
};

/**
 * KPA-Society Store Config
 * WO-STORE-SIDEBAR-RESTRUCTURE-V1:
 *   - 7섹션/15항목 → 6섹션/14항목 재구성
 *   - 홈 단독 / 상품·주문 / 매장 실행 / 채널 / 자료·분석 / 설정
 *   - 자체 상품·매장 진열 상품 사이드바 제거 (라우트 유지)
 *   - 라벨 변경: QR 관리→QR 코드, 채널 현황→B2B 사이트, 매장 사이니지→디지털 사이니지
 *   - 약국 정보 설정 그룹으로 이동
 * WO-KPA-STORE-MENU-NORMALIZATION-V1:
 *   - "상품 관리" → "공급 상품" 명칭 변경
 *   - "주문 관리" → "주문 내역" 명칭 변경
 *   - "내 매장 상품" (/commerce/local-products) 메뉴 추가 (기존 라우트 활성화)
 *   - "자료실" 제거 (route 미연결 상태)
 *   - 채널 관리/상담 요청 → 매장 실행 그룹으로 이동
 *   - 태블릿 진열/블로그 → 매장 실행 그룹으로 통합
 * WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS-CANONICAL-ALIGN-V1:
 *   - "내 자료함" 그룹 정리: 강좌 제거 → 콘텐츠/자료 2개 (canonical)
 *   - 상품 상세설명 신규 라우트 (/store/marketing/product-descriptions) 연결
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1:
 *   - "내 제작물" 그룹 제거 (제작 시작 진입점은 "내 자료함"으로 통일)
 *   - POP / QR 코드 / 블로그 / 상품 상세설명 메뉴는 결과물 관리 전용으로
 *     매장 실행 그룹 내 개별 메뉴로 유지
 * WO-O4O-TABLET-MENU-STRUCTURE-ALIGN-V1:
 *   - "태블릿 진열" → "태블릿" (매장 내 device 단위 통합 표현, 매장당 복수 tablet 전제)
 *   - 사이니지 "재생" → "TV 재생" (TV fullscreen playback 의미 명확화)
 *   - Tablet은 매장 내 interactive device, Signage는 TV 전용 재생.
 *     Playlist는 두 도메인이 공통으로 사용 가능한 자산 (현재 signage 하위 유지).
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
    // WO-O4O-STORE-SIDEBAR-MENU-UX-IMPROVEMENT-V1: 섹션 라벨을 기능 중심 명칭으로 정렬
    // WO-O4O-KPA-STORE-PRODUCT-MENU-LABEL-RENAME-V1: canonical naming 정렬
    // WO-O4O-KPA-STORE-PRODUCT-MENU-SIMPLIFICATION-V1: 상품 관리 메뉴 2개로 단순화
    //   직접 등록 상품(local-products) 메뉴 제거 — route(/commerce/local-products)는 유지
    { label: '상품 관리', items: [
      { key: 'products',    label: '공급자 상품', subPath: '/commerce/products' },
      { key: 'my-products', label: '내 매장 상품', subPath: '/my-products' },
      { key: 'orders',      label: '주문 내역',   subPath: '/commerce/orders' },
    ]},
    // WO-O4O-STORE-SIDEBAR-MENU-UX-IMPROVEMENT-V1:
    //   "내 자료함" → "마케팅 자료함" (제작 시작 진입 의미 명확화)
    //   "자료" → "디지털 자료" (PDF/이미지/문서/복사 자료 등 저장 성격 명시)
    //   "콘텐츠" 라벨은 유지 (이미 사용자에 익숙, AI 콘텐츠 흐름과 연결)
    // 매장이 커뮤니티/공급자에서 가져와 보유한 source/reference 보관함.
    // 제작 시작(POP/QR/블로그/상품 상세설명)은 본 그룹에서만 진입.
    // (강좌/레슨형 콘텐츠는 콘텐츠 항목 내부에서 type 표시만, 별도 그룹 금지)
    // WO-O4O-KPA-STORE-LIBRARY-MENU-LABEL-RESTORE-V1: 그룹명 "마케팅 자료함" → "내 자료함", 항목명 "디지털 자료" → "자료"
    // WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-LIBRARY-TAB-V1: "매장 제작 자료" 항목 추가
    { label: '내 자료함', items: [
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
    // 매장 실행 — 결과물 관리(POP/QR/블로그/상품 상세설명) + 운영 기능.
    // 신규 제작 진입은 본 그룹이 아닌 "내 자료함"에서 시작.
    // 태블릿: 매장 내 interactive device. 매장당 복수 tablet 전제.
    //         (idle playlist 연결은 후속 WO에서 도입)
    // WO-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-MENU-V1: 상품 정보 제작 메뉴 추가
    { label: '매장 실행', items: [
      { key: 'channels',              label: '채널 관리',     subPath: '/channels' },
      { key: 'product-info-creator',  label: '상품 정보 제작', subPath: '/execution/product-info' },
      { key: 'tablet-displays',       label: '태블릿',        subPath: '/commerce/tablet-displays' },
      { key: 'pop',                  label: 'POP',          subPath: '/marketing/pop' },
      { key: 'qr',                   label: 'QR 코드',      subPath: '/marketing/qr' },
      { key: 'blog',                 label: '블로그',        subPath: '/content/blog' },
      { key: 'product-descriptions', label: '상품 상세설명', subPath: '/marketing/product-descriptions' },
      { key: 'requests',             label: '상담 요청',     subPath: '/requests' },
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
