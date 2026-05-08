/**
 * Reserved Slugs
 *
 * WO-CORE-STORE-SLUG-SYSTEM-V1
 *
 * These slugs cannot be used by stores to prevent
 * conflicts with system routes and reserved paths.
 */

// WO-O4O-STORE-SLUG-EDITABLE-V1: slug editable 도입에 따라 시스템 라우트 충돌 가능성이 있는
// 신규 예약어 보강 — channels / signage / qr / instructor / forum / lms.
// 기존 reserved 와 중복되지 않게 적절한 카테고리에 배치한다.
export const RESERVED_SLUGS = [
  // System routes
  'admin',
  'api',
  'system',
  'health',
  'status',
  'debug',
  'metrics',

  // Store-related paths
  'store',
  'stores',
  'kiosk',
  'tablet',
  'blog',
  'storefront',
  'channels',
  'signage',
  'qr',

  // Auth routes
  'login',
  'logout',
  'signup',
  'register',
  'auth',
  'oauth',

  // Common reserved
  'www',
  'app',
  'apps',
  'static',
  'assets',
  'public',
  'cdn',

  // Role paths
  'operator',
  'partner',
  'supplier',
  'pharmacy',
  'consumer',
  'instructor',

  // Service paths
  'glycopharm',
  'cosmetics',
  'kpa',
  'neture',

  // Platform feature paths (WO-O4O-STORE-SLUG-EDITABLE-V1)
  'forum',
  'lms',

  // API versions
  'v1',
  'v2',
  'v3',

  // Misc
  'new',
  'edit',
  'delete',
  'create',
  'settings',
  'profile',
  'dashboard',
  'help',
  'support',
  'about',
  'contact',
  'terms',
  'privacy',
  'legal',
] as const;

export type ReservedSlug = typeof RESERVED_SLUGS[number];

/**
 * Check if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase() as ReservedSlug);
}
