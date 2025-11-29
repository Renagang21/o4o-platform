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
    version: '1.0.0',
    description: '매장용 디지털 사이니지 콘텐츠 관리 및 스케줄링',
    category: 'display',
    author: 'O4O Platform',
  },
  // Future: Add more apps as they become available
  // - dropshipping
  // - b2c-catalog
  // - reviews
  // etc.
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
