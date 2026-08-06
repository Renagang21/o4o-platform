/**
 * App Catalog
 *
 * Central catalog of all available apps in the platform
 * V1: Local/hardcoded catalog
 * Future: Can be extended to remote catalog with download URLs
 * Phase 6: ServiceGroup-based classification (refactored from category-based)
 */

/**
 * Service Group 타입 - 서비스 기반 앱 분류
 * @description 앱이 속하는 서비스 도메인을 정의
 */
export type ServiceGroup =
  | 'cosmetics'           // 화장품 서비스 (Cosmetics eCommerce)
  | 'yaksa'               // 약사회 서비스 (Yaksa Organization)
  | 'tourist'             // 관광객 서비스 (Tourist Services)
  | 'sellerops'           // 판매자 운영 (Seller Operations)
  | 'supplierops'         // 공급자 운영 (Supplier Operations)
  | 'partnerops'          // 파트너 운영 (Partner/Affiliate Operations)
  | 'signage'             // 디지털 사이니지 (Digital Signage)
  | 'platform-core'       // 플랫폼 코어 (Platform Infrastructure)
  | 'global';             // 모든 서비스 공통 (Available to all)

/**
 * App Type - 앱의 구조적 역할
 */
export type AppType = 'core' | 'feature' | 'extension' | 'standalone';

/**
 * App Compatibility Status
 */
export type CompatibilityStatus = 'compatible' | 'incompatible' | 'requires-config';

/**
 * Service Group Metadata for UI display
 */
export interface ServiceGroupMeta {
  id: ServiceGroup;
  name: string;
  nameKo: string;
  description: string;
  icon?: string;
  color?: string;
  priority: number; // For sorting in UI
}

/**
 * Service Group Metadata Registry
 */
export const SERVICE_GROUP_META: ServiceGroupMeta[] = [
  {
    id: 'platform-core',
    name: 'Platform Core',
    nameKo: '플랫폼 코어',
    description: 'Core infrastructure apps required by all services',
    icon: 'settings',
    color: '#6B7280',
    priority: 0,
  },
  {
    id: 'cosmetics',
    name: 'Cosmetics Service',
    nameKo: '화장품 서비스',
    description: 'Cosmetics eCommerce and beauty product marketplace',
    icon: 'sparkles',
    color: '#EC4899',
    priority: 1,
  },
  {
    id: 'yaksa',
    name: 'Yaksa Organization',
    nameKo: '약사회 서비스',
    description: 'Pharmacist organization management and services',
    icon: 'building-library',
    color: '#10B981',
    priority: 2,
  },
  {
    id: 'tourist',
    name: 'Tourist Services',
    nameKo: '관광객 서비스',
    description: 'Services for tourists and international visitors',
    icon: 'globe',
    color: '#F59E0B',
    priority: 4,
  },
  {
    id: 'signage',
    name: 'Digital Signage',
    nameKo: '디지털 사이니지',
    description: 'In-store digital signage and display management',
    icon: 'tv',
    color: '#8B5CF6',
    priority: 5,
  },
  {
    id: 'sellerops',
    name: 'Seller Operations',
    nameKo: '판매자 운영',
    description: 'Tools for sellers managing products and orders',
    icon: 'shopping-bag',
    color: '#EF4444',
    priority: 10,
  },
  {
    id: 'supplierops',
    name: 'Supplier Operations',
    nameKo: '공급자 운영',
    description: 'Tools for suppliers managing inventory and offers',
    icon: 'truck',
    color: '#14B8A6',
    priority: 11,
  },
  {
    id: 'partnerops',
    name: 'Partner Operations',
    nameKo: '파트너 운영',
    description: 'Affiliate and partner management tools',
    icon: 'users',
    color: '#6366F1',
    priority: 12,
  },
  {
    id: 'global',
    name: 'Global Apps',
    nameKo: '공통 앱',
    description: 'Apps available across all service groups',
    icon: 'globe-alt',
    color: '#9CA3AF',
    priority: 99,
  },
];

/**
 * App Status - 앱의 운영 상태
 * @description Phase C Baseline 기반 서비스 상태 체계
 */
export type AppStatus = 'active' | 'development' | 'experimental' | 'planned' | 'legacy' | 'deprecated';

export interface AppCatalogItem {
  appId: string;
  name: string;
  version: string;
  description?: string;
  /** @deprecated Use serviceGroups instead for classification */
  category?: string;
  tags?: string[]; // searchable tags
  icon?: string;
  homepage?: string;
  author?: string;
  type?: AppType;
  /** App operational status (Phase C Baseline) */
  status?: AppStatus;
  dependencies?: Record<string, string>; // { appId: versionRange }
  /** Service Groups this app belongs to */
  serviceGroups?: ServiceGroup[];
  /** Apps that are incompatible with this app */
  incompatibleWith?: string[];
}

/**
 * Extended catalog item with manifest data (cached)
 */
export interface ExtendedCatalogItem extends AppCatalogItem {
  permissions?: string[];
  cpt?: string[];
  acf?: string[];
  routes?: string[];
  hasLifecycle?: boolean;
}

// Manifest cache
let manifestCache: Map<string, ExtendedCatalogItem> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Available Apps Catalog
 *
 * Service-based classification system
 * Apps are organized by their target ServiceGroup(s)
 */
export const APPS_CATALOG: AppCatalogItem[] = [
  // ============================================
  // Platform Core Apps (platform-core)
  // Required infrastructure for all services
  // ============================================
  {
    appId: 'auth-core',
    name: 'Authentication & RBAC Core',
    version: '1.0.0',
    description: '사용자 인증, 역할 기반 접근 제어(RBAC), 권한 관리 핵심 시스템',
    category: 'core',
    tags: ['인증', 'authentication', 'RBAC', 'authorization', 'user', 'role', 'permission'],
    type: 'core',
    author: 'O4O Platform',
    serviceGroups: ['platform-core'],
  },
  {
    appId: 'platform-core',
    name: 'Platform Core Services',
    version: '1.0.0',
    description: '앱 레지스트리, 플랫폼 설정, 활동 로깅 등 핵심 플랫폼 서비스',
    category: 'core',
    tags: ['platform', 'settings', 'registry', 'activity', 'logging'],
    type: 'core',
    author: 'O4O Platform',
    dependencies: { 'auth-core': '>=1.0.0' },
    serviceGroups: ['platform-core'],
  },
  {
    appId: 'cms-core',
    name: 'CMS Core Engine',
    version: '1.0.0',
    description: 'CMS 핵심 엔진 - 템플릿, CPT, ACF, 뷰, 메뉴, 미디어',
    category: 'content',
    tags: ['CMS', '템플릿', 'template', 'CPT', 'ACF', 'menu', 'media'],
    type: 'core',
    author: 'O4O Platform',
    serviceGroups: ['platform-core'],
  },
  {
    appId: 'forum-core',
    name: 'Forum Core',
    version: '1.0.0',
    description: '커뮤니티 게시판 기능 - 게시글, 댓글, 카테고리, 태그 지원',
    category: 'community',
    tags: ['게시판', 'community', 'board', 'post', 'comment'],
    type: 'core',
    author: 'O4O Platform',
    serviceGroups: ['platform-core'],
  },
  {
    appId: 'organization-core',
    name: 'Organization Core',
    version: '1.0.0',
    description: '전사 조직 관리 시스템 - 계층 구조, 멤버 관리, 조직 스코프 권한',
    category: 'organization',
    tags: ['조직', 'organization', 'team', 'hierarchy', 'member'],
    type: 'core',
    author: 'O4O Platform',
    serviceGroups: ['platform-core'],
  },
  {
    appId: 'lms-core',
    name: 'LMS Core',
    version: '0.1.0',
    description: '학습 관리 시스템 - 강좌, 수강, 진도, 수료증 관리',
    category: 'education',
    tags: ['LMS', '학습', 'education', 'course', 'learning'],
    type: 'core',
    author: 'O4O Platform',
    serviceGroups: ['platform-core'],
  },
  {
    appId: 'ecommerce-core',
    name: 'E-commerce Core Engine',
    version: '1.0.0',
    description: '판매 원장(Source of Truth) - 주문/결제/판매유형 통합 관리',
    category: 'commerce',
    tags: ['ecommerce', '주문', 'order', 'payment', '결제', 'sales'],
    type: 'core',
    author: 'O4O Platform',
    serviceGroups: ['platform-core'],
  },
  {
    appId: 'partner-core',
    name: 'Partner Core',
    version: '1.0.0',
    description: '파트너 프로그램 엔진 - 클릭→전환→커미션→정산 워크플로우 관리',
    category: 'commerce',
    tags: ['파트너', 'partner', 'affiliate', 'commission', 'conversion', 'settlement'],
    type: 'core',
    author: 'O4O Platform',
    serviceGroups: ['platform-core', 'partnerops'],
  },
  {
    appId: 'digital-signage-core',
    name: 'Digital Signage Core',
    version: '0.1.0',
    description: '디지털 사이니지 코어 - 미디어, 디스플레이, 스케줄, 액션 관리',
    category: 'display',
    tags: ['signage', '사이니지', 'display', 'media', 'schedule'],
    type: 'core',
    dependencies: { 'platform-core': '>=1.0.0', 'cms-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['signage'],
  },

  // ============================================
  // Global Feature Apps (global)
  // Features available to all service groups
  // ============================================
  {
    appId: 'organization-forum',
    name: 'Organization-Forum Integration',
    version: '0.1.0',
    description: '조직 단위 포럼 통합 - 조직별 게시판, 계층 권한 관리',
    category: 'integration',
    tags: ['조직', 'organization', 'forum', 'board'],
    type: 'feature',
    dependencies: { 'organization-core': '>=1.0.0', 'forum-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['global'],
  },

  // ============================================
  // Cosmetics Service Apps (cosmetics)
  // Cosmetics eCommerce and beauty marketplace
  // ============================================
  // WO-O4O-LEGACY-COSMETICS-PARTNER-REMOVAL-V1:
  //   'cosmetics-partner' (화장품 파트너/인플루언서 관리) 카탈로그 항목을 제거했다.
  //   본체 패키지 @o4o/cosmetics-partner-extension 은 이미 삭제되었고 관리자 화면·백엔드
  //   라우트도 남아 있지 않아 설치 가능한 실체가 없는 항목이었다.
  //   Partner 는 Neture 서비스의 활동 주체이며 Cosmetics 는 분야이므로,
  //   별도 Cosmetics Partner 앱을 다시 등록하지 않는다.
  {
    appId: 'cosmetics-seller-extension',
    name: '화장품 판매원 관리',
    version: '1.0.0',
    description: '화장품 매장 판매원 운영 기능 - 진열, 샘플, 재고, 상담, KPI 관리',
    category: 'commerce',
    tags: ['화장품', 'cosmetics', 'seller', 'display', 'sample', 'inventory', 'kpi'],
    type: 'extension',
    status: 'active', // Phase 1 완료 - 2024-12 Active 전환
    dependencies: {},
    author: 'O4O Platform',
    serviceGroups: ['cosmetics', 'sellerops'],
  },
  {
    appId: 'cosmetics-supplier-extension',
    name: 'Cosmetics Supplier Extension',
    version: '1.0.0',
    description: '브랜드(공급사) 관리 - 가격정책, 샘플공급, 승인, 캠페인 관리',
    category: 'commerce',
    tags: ['화장품', 'cosmetics', 'supplier', 'brand', 'price', 'campaign'],
    type: 'extension',
    // WO-O4O-LEGACY-COSMETICS-PARTNER-REMOVAL-V1: 제거된 'cosmetics-partner' 의존 참조 삭제
    dependencies: {},
    author: 'O4O Platform',
    serviceGroups: ['cosmetics', 'supplierops'],
  },
  {
    appId: 'cosmetics-sample-display-extension',
    name: 'Cosmetics Sample & Display Extension',
    version: '1.0.0',
    description: '샘플/테스터, 진열(Display), 전환율 관리 - Seller와 Supplier 연결 운영 모듈',
    category: 'commerce',
    tags: ['화장품', 'cosmetics', 'sample', 'display', 'tester', 'conversion'],
    type: 'extension',
    dependencies: { 'cosmetics-seller-extension': '>=1.0.0', 'cosmetics-supplier-extension': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['cosmetics'],
  },

  // ============================================
  // Yaksa Organization Apps (yaksa)
  // WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1:
  //   membership-yaksa · reporting-yaksa · lms-yaksa · yaksa-scheduler · annualfee-yaksa
  //   카탈로그 등록 제거 (패키지 삭제).
  // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
  //   forum-yaksa 카탈로그 등록 제거 (HOLD 해제 — 감사 결과 실행 소비처 0건).
  //   약사 조직의 포럼은 공용 forum-core / /api/v1/kpa/forum 구조로 운영된다.
  // ============================================
  {
    appId: 'pharmacy-ai-insight',
    name: 'Pharmacy AI Insight',
    version: '0.1.0',
    description: '약사 전용 AI 인사이트 도구 - 데이터 해석, 패턴 설명, 제품 연계',
    category: 'healthcare',
    tags: ['AI', 'pharmacy', 'insight', 'glucose', 'pattern', '약사', 'CGM', 'BGM'],
    type: 'feature',
    status: 'active',
    dependencies: { 'organization-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['yaksa'],
  },


  // ============================================
  // Signage Apps (signage)
  // Digital signage and display management
  // ============================================
  {
    appId: 'signage',
    name: 'Digital Signage',
    version: '1.0.0',
    description: '매장용 디지털 사이니지 콘텐츠 관리 및 스케줄링',
    category: 'display',
    tags: ['signage', '디지털사이니지', 'display', 'schedule'],
    type: 'standalone',
    author: 'O4O Platform',
    serviceGroups: ['signage'],
  },

  // serviceGroup id 'sellerops' / 'supplierops' 는 화장품 확장이 사용 중이라 유지한다.
  // admin-dashboard 의 동명 로컬 페이지(src/pages/{sellerops,supplierops})는 별개 자산이다.

  // ============================================
  // Partner Operations Apps (partnerops)
  // Affiliate and partner management
  // ============================================
  {
    appId: 'partnerops',
    name: 'PartnerOps',
    version: '1.0.0',
    description: '파트너/어필리에이트 운영 앱 - 링크 추적, 전환 분석, 커미션 정산',
    category: 'commerce',
    tags: ['파트너', 'partner', 'affiliate', 'commission', 'referral'],
    type: 'feature',
    // partnerops 본체는 @o4o/partner-core 기반이다.
    dependencies: {},
    author: 'O4O Platform',
    serviceGroups: ['partnerops', 'cosmetics'],
  },

  // ============================================
  // Market Trial App (Experimental)
  // Supplier product trial funding
  // WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1: Experimental 선언
  // ============================================
  {
    appId: 'market-trial',
    name: '유통 참여형 펀딩 (Market Trial)',
    version: '1.0.0',
    description: '공급자 상품 유통 참여형 펀딩 - 판매자/파트너 참여형 시장 테스트 (운영 실험 목적, 자동화 기능 미포함, 정책 변경 가능성 있음)',
    category: 'commerce',
    tags: ['market-trial', '유통-참여형-펀딩', 'trial', 'funding', '펀딩', 'supplier', 'seller', 'partner', 'experimental'],
    type: 'extension',
    status: 'experimental',
    dependencies: {},
    author: 'O4O Platform',
    serviceGroups: ['cosmetics', 'supplierops', 'sellerops'],
  },

  // ============================================
  // Development/Experimental Apps (Hidden)
  // Phase C Baseline - Low Priority
  // ============================================
  {
    appId: 'organization-lms',
    name: '조직-LMS 연동',
    version: '1.0.0',
    description: '조직별 LMS 연동 - 조직 스코프 교육, 수료증 관리',
    category: 'education',
    tags: ['조직', 'organization', 'LMS', 'education', 'training'],
    type: 'extension',
    dependencies: { 'organization-core': '>=1.0.0', 'lms-core': '>=0.1.0' },
    author: 'O4O Platform',
    serviceGroups: ['global'],
    // Note: Hidden - Development status
  },
  {
    appId: 'forum-cosmetics',
    name: '뷰티 포럼',
    version: '1.0.0',
    description: '화장품/뷰티 특화 포럼 - 피부타입, 고민, 제품 리뷰, 성분 정보',
    category: 'community',
    tags: ['화장품', 'cosmetics', 'forum', 'beauty', 'skincare', 'review'],
    type: 'extension',
    dependencies: { 'forum-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['cosmetics'],
    // Note: Hidden - Development status
  },
  // 건강기능식품 기능은 apps/api-server/src/modules/neture/drug-import/health-functional-food-* 가 담당한다.
];

/**
 * Get app catalog item by ID
 *
 * @param appId - App identifier
 * @returns AppCatalogItem or undefined
 */
export function getCatalogItem(appId: string): AppCatalogItem | undefined {
  return APPS_CATALOG.find((app) => app.appId === appId);
}

/**
 * Check if app exists in catalog
 *
 * @param appId - App identifier
 * @returns true if app is in catalog
 */
export function isInCatalog(appId: string): boolean {
  return APPS_CATALOG.some((app) => app.appId === appId);
}

/**
 * Search apps by query string
 * Searches in name, description, and tags
 *
 * @param query - Search query
 * @returns Array of matching catalog items
 */
export function searchCatalog(query: string): AppCatalogItem[] {
  if (!query || query.trim() === '') {
    return APPS_CATALOG;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return APPS_CATALOG.filter((app) => {
    // Search in name
    if (app.name.toLowerCase().includes(normalizedQuery)) return true;

    // Search in description
    if (app.description?.toLowerCase().includes(normalizedQuery)) return true;

    // Search in appId
    if (app.appId.toLowerCase().includes(normalizedQuery)) return true;

    // Search in tags
    if (app.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery))) return true;

    return false;
  });
}

/**
 * Filter apps by category
 *
 * @param category - Category to filter by
 * @returns Array of matching catalog items
 */
export function filterByCategory(category: string): AppCatalogItem[] {
  if (!category || category === 'all') {
    return APPS_CATALOG;
  }

  return APPS_CATALOG.filter((app) => app.category === category);
}

/**
 * Get all unique categories in catalog
 *
 * @returns Array of category names
 */
export function getCategories(): string[] {
  const categories = new Set<string>();

  for (const app of APPS_CATALOG) {
    if (app.category) {
      categories.add(app.category);
    }
  }

  return Array.from(categories).sort();
}

/**
 * Get apps that depend on a specific app
 *
 * @param appId - App identifier
 * @returns Array of apps that depend on this app
 */
export function getDependentApps(appId: string): AppCatalogItem[] {
  return APPS_CATALOG.filter((app) => {
    if (!app.dependencies) return false;
    return Object.keys(app.dependencies).includes(appId);
  });
}

/**
 * Filter apps by service group (Phase 6)
 * Returns apps that belong to the specified service group or have no service group restriction
 *
 * @param serviceGroup - Service group to filter by
 * @returns Array of matching catalog items
 */
export function filterByServiceGroup(serviceGroup: ServiceGroup): AppCatalogItem[] {
  return APPS_CATALOG.filter((app) => {
    // Apps with no serviceGroups are available to all (global)
    if (!app.serviceGroups || app.serviceGroups.length === 0) {
      return true;
    }
    // Check if app belongs to the specified service group or is global
    return app.serviceGroups.includes(serviceGroup) || app.serviceGroups.includes('global');
  });
}

/**
 * Get all apps for a specific service group with their dependencies resolved
 * This ensures that if an app is included, all its dependencies are also included
 *
 * @param serviceGroup - Service group to filter by
 * @returns Array of catalog items with resolved dependencies
 */
export function getAppsForServiceGroupWithDependencies(serviceGroup: ServiceGroup): AppCatalogItem[] {
  const serviceApps = filterByServiceGroup(serviceGroup);
  const result = new Map<string, AppCatalogItem>();

  // Add all service apps
  for (const app of serviceApps) {
    result.set(app.appId, app);
  }

  // Resolve dependencies
  const resolveDeps = (app: AppCatalogItem): void => {
    if (!app.dependencies) return;

    for (const depId of Object.keys(app.dependencies)) {
      if (!result.has(depId)) {
        const depApp = getCatalogItem(depId);
        if (depApp) {
          result.set(depId, depApp);
          resolveDeps(depApp);
        }
      }
    }
  };

  for (const app of serviceApps) {
    resolveDeps(app);
  }

  return Array.from(result.values());
}

/**
 * Get all unique service groups in catalog
 *
 * @returns Array of service group names
 */
export function getServiceGroups(): ServiceGroup[] {
  const groups = new Set<ServiceGroup>();

  for (const app of APPS_CATALOG) {
    if (app.serviceGroups) {
      for (const sg of app.serviceGroups) {
        groups.add(sg);
      }
    }
  }

  return Array.from(groups).sort();
}

/**
 * Invalidate manifest cache
 * Call this after install/uninstall/update operations
 */
export function invalidateManifestCache(): void {
  manifestCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if cache is valid
 */
export function isCacheValid(): boolean {
  if (!manifestCache) return false;
  return Date.now() - cacheTimestamp < CACHE_TTL;
}

// ============================================
// Service Group Enhanced API (Phase 6)
// ============================================

/**
 * Get apps grouped by service group
 * @returns Map of service group to apps
 */
export function getAppsByServiceGroup(): Map<ServiceGroup, AppCatalogItem[]> {
  const groupedApps = new Map<ServiceGroup, AppCatalogItem[]>();

  // Initialize all groups
  for (const meta of SERVICE_GROUP_META) {
    groupedApps.set(meta.id, []);
  }

  // Group apps
  for (const app of APPS_CATALOG) {
    if (app.serviceGroups && app.serviceGroups.length > 0) {
      for (const sg of app.serviceGroups) {
        const group = groupedApps.get(sg);
        if (group) {
          group.push(app);
        }
      }
    }
  }

  return groupedApps;
}

/**
 * Get all service group metadata sorted by priority
 * @returns Array of ServiceGroupMeta sorted by priority
 */
export function getAllServiceGroupMeta(): ServiceGroupMeta[] {
  return [...SERVICE_GROUP_META].sort((a, b) => a.priority - b.priority);
}

/**
 * Get service group metadata by ID
 * @param serviceGroup - Service group ID
 * @returns ServiceGroupMeta or undefined
 */
export function getServiceGroupMeta(serviceGroup: ServiceGroup): ServiceGroupMeta | undefined {
  return SERVICE_GROUP_META.find((meta) => meta.id === serviceGroup);
}

/**
 * Get apps by type within a service group
 * @param serviceGroup - Service group to filter by
 * @param appType - App type to filter by
 * @returns Array of matching apps
 */
export function getAppsByType(serviceGroup: ServiceGroup, appType: AppType): AppCatalogItem[] {
  return filterByServiceGroup(serviceGroup).filter((app) => app.type === appType);
}

/**
 * Get core apps required for a service group
 * Platform-core apps + specific service extensions
 */
export function getCoreAppsForService(serviceGroup: ServiceGroup): AppCatalogItem[] {
  const platformCore = APPS_CATALOG.filter(
    (app) => app.type === 'core' && app.serviceGroups?.includes('platform-core')
  );
  const serviceSpecific = APPS_CATALOG.filter(
    (app) => app.serviceGroups?.includes(serviceGroup) && app.type !== 'standalone'
  );

  // Merge without duplicates
  const result = new Map<string, AppCatalogItem>();
  for (const app of [...platformCore, ...serviceSpecific]) {
    result.set(app.appId, app);
  }

  return Array.from(result.values());
}

/**
 * Check if two apps are compatible
 * @param appId1 - First app ID
 * @param appId2 - Second app ID
 * @returns CompatibilityStatus
 */
export function checkAppCompatibility(appId1: string, appId2: string): CompatibilityStatus {
  const app1 = getCatalogItem(appId1);
  const app2 = getCatalogItem(appId2);

  if (!app1 || !app2) {
    return 'incompatible';
  }

  // Check explicit incompatibility
  if (app1.incompatibleWith?.includes(appId2) || app2.incompatibleWith?.includes(appId1)) {
    return 'incompatible';
  }

  return 'compatible';
}

/**
 * Get all apps incompatible with a given app
 * @param appId - App ID to check
 * @returns Array of incompatible app IDs
 */
export function getIncompatibleApps(appId: string): string[] {
  const app = getCatalogItem(appId);
  if (!app) return [];

  const incompatible = new Set<string>();

  // Add explicitly incompatible apps
  if (app.incompatibleWith) {
    for (const incompatibleAppId of app.incompatibleWith) {
      incompatible.add(incompatibleAppId);
    }
  }

  // Find apps that declare this app as incompatible
  for (const otherApp of APPS_CATALOG) {
    if (otherApp.incompatibleWith?.includes(appId)) {
      incompatible.add(otherApp.appId);
    }
  }

  return Array.from(incompatible);
}

/**
 * Get compatible apps for a given app
 * @param appId - App ID to check
 * @returns Array of compatible app items
 */
export function getCompatibleApps(appId: string): AppCatalogItem[] {
  const incompatibleIds = getIncompatibleApps(appId);

  return APPS_CATALOG.filter(
    (app) => app.appId !== appId && !incompatibleIds.includes(app.appId)
  );
}

/**
 * Get service groups that an app belongs to
 * @param appId - App ID
 * @returns Array of service groups
 */
export function getAppServiceGroups(appId: string): ServiceGroup[] {
  const app = getCatalogItem(appId);
  return app?.serviceGroups || [];
}

/**
 * Check if an app is available for a service group
 * @param appId - App ID
 * @param serviceGroup - Service group to check
 * @returns true if app is available for the service group
 */
export function isAppAvailableForService(appId: string, serviceGroup: ServiceGroup): boolean {
  const app = getCatalogItem(appId);
  if (!app) return false;

  // Platform-core apps are available to all
  if (app.serviceGroups?.includes('platform-core')) return true;

  // Global apps are available to all
  if (app.serviceGroups?.includes('global')) return true;

  // Check specific service group
  return app.serviceGroups?.includes(serviceGroup) || false;
}

/**
 * Get app statistics by service group
 */
export function getServiceGroupStats(): Array<{
  serviceGroup: ServiceGroup;
  meta: ServiceGroupMeta;
  coreCount: number;
  featureCount: number;
  extensionCount: number;
  totalCount: number;
}> {
  const groupedApps = getAppsByServiceGroup();
  const result = [];

  for (const meta of getAllServiceGroupMeta()) {
    const apps = groupedApps.get(meta.id) || [];
    result.push({
      serviceGroup: meta.id,
      meta,
      coreCount: apps.filter((a) => a.type === 'core').length,
      featureCount: apps.filter((a) => a.type === 'feature').length,
      extensionCount: apps.filter((a) => a.type === 'extension').length,
      totalCount: apps.length,
    });
  }

  return result;
}
