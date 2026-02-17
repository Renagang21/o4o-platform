/**
 * Reserved Slugs
 *
 * WO-CORE-STORE-SLUG-SYSTEM-V1
 *
 * These slugs cannot be used by stores to prevent
 * conflicts with system routes and reserved paths.
 */

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

  // Service paths
  'glycopharm',
  'cosmetics',
  'kpa',
  'neture',

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
