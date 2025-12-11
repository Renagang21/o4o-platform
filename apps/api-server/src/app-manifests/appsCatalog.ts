/**
 * App Catalog
 *
 * Central catalog of all available apps in the platform
 * V1: Local/hardcoded catalog
 * Future: Can be extended to remote catalog with download URLs
 * Phase 6: ServiceGroup filtering support
 */

/**
 * Service Group 타입 (Phase 6)
 */
export type ServiceGroup =
  | 'cosmetics'    // 화장품 서비스
  | 'yaksa'        // 약사회 서비스
  | 'tourist'      // 관광객 서비스
  | 'sellerops'    // 판매자 운영
  | 'supplierops'  // 공급자 운영
  | 'global';      // 모든 서비스 공통

export interface AppCatalogItem {
  appId: string;
  name: string;
  version: string;
  description?: string;
  category?: string; // 'commerce', 'content', 'community', 'display', etc.
  tags?: string[]; // searchable tags
  icon?: string;
  homepage?: string;
  author?: string;
  type?: 'core' | 'extension' | 'standalone';
  dependencies?: Record<string, string>; // { appId: versionRange }
  /** Service Groups this app belongs to (Phase 6) */
  serviceGroups?: ServiceGroup[];
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
 * This is the "app store" - apps that can be installed
 */
export const APPS_CATALOG: AppCatalogItem[] = [
  {
    appId: 'forum-core',
    name: 'Forum Core',
    version: '1.0.0',
    description: '커뮤니티 게시판 기능 - 게시글, 댓글, 카테고리, 태그 지원',
    category: 'community',
    tags: ['게시판', 'community', 'board', 'post', 'comment'],
    type: 'core',
    author: 'O4O Platform',
  },
  {
    appId: 'signage',
    name: 'Digital Signage',
    version: '1.0.0',
    description: '매장용 디지털 사이니지 콘텐츠 관리 및 스케줄링',
    category: 'display',
    tags: ['signage', '디지털사이니지', 'display', 'schedule'],
    type: 'standalone',
    author: 'O4O Platform',
  },
  {
    appId: 'dropshipping-core',
    name: 'Dropshipping Core',
    version: '1.0.0',
    description: '멀티벤더 드랍쉬핑 마켓플레이스 코어 엔진',
    category: 'commerce',
    tags: ['드랍쉬핑', 'dropshipping', 'marketplace', 'ecommerce', 'vendor'],
    type: 'core',
    author: 'O4O Platform',
  },
  {
    appId: 'dropshipping-cosmetics',
    name: 'Dropshipping Cosmetics Extension',
    version: '1.0.0',
    description: '화장품 특화 드랍쉬핑 기능 - 피부타입, 성분, 루틴 추천',
    category: 'commerce',
    tags: ['화장품', 'cosmetics', 'dropshipping', 'skincare'],
    type: 'extension',
    dependencies: { 'dropshipping-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['cosmetics'],
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
  },
  {
    appId: 'organization-forum',
    name: 'Organization-Forum Integration',
    version: '0.1.0',
    description: '조직 단위 포럼 통합 - 조직별 게시판, 계층 권한 관리',
    category: 'integration',
    tags: ['조직', 'organization', 'forum', 'board'],
    type: 'extension',
    dependencies: { 'organization-core': '>=1.0.0', 'forum-core': '>=1.0.0' },
    author: 'O4O Platform',
  },
  {
    appId: 'sellerops',
    name: 'SellerOps',
    version: '1.0.0',
    description: '범용 판매자 운영 앱 - 공급자 승인, 리스팅 관리, 주문 추적, 정산 대시보드',
    category: 'commerce',
    tags: ['판매자', 'seller', 'vendor', 'listing', 'settlement'],
    type: 'extension',
    dependencies: { 'dropshipping-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['sellerops', 'cosmetics'],
  },
  {
    appId: 'supplierops',
    name: 'SupplierOps',
    version: '1.0.0',
    description: '범용 공급자 운영 앱 - 상품 등록, Offer 관리, 주문 Relay, 정산 관리',
    category: 'commerce',
    tags: ['공급자', 'supplier', 'product', 'offer', 'settlement'],
    type: 'extension',
    dependencies: { 'dropshipping-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['supplierops', 'cosmetics'],
  },
  {
    appId: 'partnerops',
    name: 'PartnerOps',
    version: '1.0.0',
    description: '파트너/어필리에이트 운영 앱 - 링크 추적, 전환 분석, 커미션 정산',
    category: 'commerce',
    tags: ['파트너', 'partner', 'affiliate', 'commission', 'referral'],
    type: 'extension',
    dependencies: { 'dropshipping-core': '>=1.0.0' },
    author: 'O4O Platform',
  },
  {
    appId: 'membership-yaksa',
    name: 'Membership Extension – Yaksa Organization',
    version: '1.0.0',
    description: '약사회 회원 관리 시스템 - 회원정보, 자격검증, 소속관리, 연회비',
    category: 'organization',
    tags: ['회원', 'membership', 'yaksa', 'verification', 'license'],
    type: 'extension',
    dependencies: { 'organization-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['yaksa'],
  },
  {
    appId: 'forum-yaksa',
    name: 'Forum Extension – Yaksa Organization',
    version: '1.0.0',
    description: '약사 조직 특화 포럼 (복약지도, 케이스 스터디, 약물 정보)',
    category: 'community',
    tags: ['약사', 'yaksa', 'forum', 'pharmacy', 'medication'],
    type: 'extension',
    dependencies: { 'forum-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['yaksa'],
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
  },
  {
    appId: 'reporting-yaksa',
    name: 'Annual Reporting Extension – Yaksa Organization',
    version: '1.0.0',
    description: '약사회 신상신고 시스템 - 연간 신고서, 승인 워크플로우, 자동 동기화',
    category: 'organization',
    tags: ['신상신고', 'reporting', 'yaksa', 'annual', 'membership'],
    type: 'extension',
    dependencies: { 'organization-core': '>=1.0.0', 'membership-yaksa': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['yaksa'],
  },
  {
    appId: 'lms-yaksa',
    name: 'LMS Extension – Yaksa Organization',
    version: '1.0.0',
    description: '약사 면허 교육 학습 관리 시스템 - 필수교육, 학점관리, 수료증, 면허갱신',
    category: 'education',
    tags: ['LMS', '학습', 'yaksa', 'education', 'credit', 'license', 'certification'],
    type: 'extension',
    dependencies: { 'lms-core': '>=0.1.0', 'organization-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['yaksa'],
  },
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
