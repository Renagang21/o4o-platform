/**
 * App Catalog
 *
 * Central catalog of all available apps in the platform
 * V1: Local/hardcoded catalog
 * Future: Can be extended to remote catalog with download URLs
 */

export interface AppCatalogItem {
  appId: string;
  name: string;
  version: string;
  description?: string;
  category?: string; // 'commerce', 'content', 'community', 'display', etc.
  icon?: string;
  homepage?: string;
  author?: string;
}

/**
 * Available Apps Catalog
 *
 * This is the "app store" - apps that can be installed
 */
export const APPS_CATALOG: AppCatalogItem[] = [
  {
    appId: 'forum',
    name: 'Forum',
    version: '1.0.0',
    description: '커뮤니티 게시판 기능 - 게시글, 댓글, 카테고리, 태그 지원',
    category: 'community',
    author: 'O4O Platform',
  },
  {
    appId: 'digitalsignage',
    name: 'Digital Signage',
    version: '1.1.0',
    description: '매장용 디지털 사이니지 콘텐츠 관리 및 스케줄링',
    category: 'display',
    author: 'O4O Platform',
  },
  {
    appId: 'forum-neture',
    name: 'Forum Extension – Neture Cosmetics',
    version: '1.0.0',
    description: '화장품 매장 특화 포럼 (피부타입, 루틴, 제품 연동)',
    category: 'community',
    author: 'O4O Platform',
  },
  {
    appId: 'dropshipping-core',
    name: 'Dropshipping Core',
    version: '1.0.0',
    description: '멀티벤더 드랍쉬핑 마켓플레이스 코어 엔진',
    category: 'commerce',
    author: 'O4O Platform',
  },
  {
    appId: 'dropshipping-cosmetics',
    name: 'Dropshipping Cosmetics Extension',
    version: '1.0.0',
    description: '화장품 특화 드랍쉬핑 기능 - 피부타입, 성분, 루틴 추천',
    category: 'commerce',
    author: 'O4O Platform',
  },
  {
    appId: 'lms-core',
    name: 'LMS Core',
    version: '0.1.0',
    description: '학습 관리 시스템 - 강좌, 수강, 진도, 수료증 관리',
    category: 'education',
    author: 'O4O Platform',
  },
  {
    appId: 'organization-core',
    name: 'Organization Core',
    version: '1.0.0',
    description: '전사 조직 관리 시스템 - 계층 구조, 멤버 관리, 조직 스코프 권한',
    category: 'organization',
    author: 'O4O Platform',
  },
  {
    appId: 'organization-dropshipping',
    name: 'Organization-Dropshipping Integration',
    version: '0.1.0',
    description: '조직 단위 드랍쉬핑 통합 - 조직별 공동구매, 조직 가격 정책',
    category: 'integration',
    author: 'O4O Platform',
  },
  {
    appId: 'organization-forum',
    name: 'Organization-Forum Integration',
    version: '0.1.0',
    description: '조직 단위 포럼 통합 - 조직별 게시판, 계층 권한 관리',
    category: 'integration',
    author: 'O4O Platform',
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
