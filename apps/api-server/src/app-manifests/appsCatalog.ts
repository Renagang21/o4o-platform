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
  | 'diabetes-care-pharmacy' // 당뇨 케어 약국 (Diabetes Care Pharmacy)
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
    id: 'diabetes-care-pharmacy',
    name: 'Diabetes Care Pharmacy',
    nameKo: '당뇨 케어 약국',
    description: 'Specialized pharmacy services for diabetes care',
    icon: 'heart',
    color: '#3B82F6',
    priority: 3,
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
    appId: 'dropshipping-core',
    name: 'Dropshipping Core',
    version: '1.0.0',
    description: '멀티벤더 드랍쉬핑 마켓플레이스 코어 엔진',
    category: 'commerce',
    tags: ['드랍쉬핑', 'dropshipping', 'marketplace', 'ecommerce', 'vendor'],
    type: 'core',
    author: 'O4O Platform',
    serviceGroups: ['platform-core'],
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
    incompatibleWith: ['dropshipping-yaksa'], // 다른 dropshipping extension과 충돌
  },

  // ============================================
  // Yaksa Organization Apps (yaksa)
  // Pharmacist organization management
  // ============================================
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
  {
    appId: 'yaksa-scheduler',
    name: 'Yaksa Scheduler',
    version: '0.1.0',
    description: '약사회 서비스 자동화 스케줄러 - Job 관리, 실패 큐, 알림 시스템',
    category: 'infrastructure',
    tags: ['scheduler', 'automation', 'yaksa', 'cron', 'job', 'notification'],
    type: 'extension',
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

  // ============================================
  // Seller Operations Apps (sellerops)
  // Tools for sellers/vendors
  // ============================================
  {
    appId: 'sellerops',
    name: 'SellerOps',
    version: '1.0.0',
    description: '범용 판매자 운영 앱 - 공급자 승인, 리스팅 관리, 주문 추적, 정산 대시보드',
    category: 'commerce',
    tags: ['판매자', 'seller', 'vendor', 'listing', 'settlement'],
    type: 'feature',
    dependencies: { 'dropshipping-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['sellerops', 'cosmetics'],
  },

  // ============================================
  // Supplier Operations Apps (supplierops)
  // Tools for suppliers
  // ============================================
  {
    appId: 'supplierops',
    name: 'SupplierOps',
    version: '1.0.0',
    description: '범용 공급자 운영 앱 - 상품 등록, Offer 관리, 주문 Relay, 정산 관리',
    category: 'commerce',
    tags: ['공급자', 'supplier', 'product', 'offer', 'settlement'],
    type: 'feature',
    dependencies: { 'dropshipping-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['supplierops', 'cosmetics'],
  },

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
    dependencies: { 'dropshipping-core': '>=1.0.0' },
    author: 'O4O Platform',
    serviceGroups: ['partnerops', 'cosmetics'],
  },

  // ============================================
  // Marketing LMS Extension (global)
  // Product info delivery + marketing campaigns
  // ============================================
  {
    appId: 'lms-marketing',
    name: 'Marketing LMS Extension',
    version: '0.1.0',
    description: '마케팅 LMS 확장 - 제품 정보 전달, 마케팅 퀴즈/설문 캠페인, Engagement 수집',
    category: 'marketing',
    tags: ['마케팅', 'marketing', 'campaign', 'quiz', 'survey', 'engagement', 'product-info'],
    type: 'extension',
    dependencies: { 'lms-core': '>=0.1.0' },
    author: 'O4O Platform',
    serviceGroups: ['global', 'cosmetics', 'supplierops'],
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
