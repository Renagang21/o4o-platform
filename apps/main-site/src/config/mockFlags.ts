/**
 * Mock Mode Configuration
 * Phase 6-1: Centralized mock/real API toggle
 *
 * Controls whether to use mock data or real API calls.
 * Default behavior:
 * - Development: use mock data (for faster local development)
 * - Production: use real API (never use mock in production)
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

/**
 * Helper function to determine if mock should be used
 * @param envVarName - Environment variable name (e.g., 'VITE_USE_MOCK_SUPPLIER_PRODUCTS')
 * @param defaultValue - Default value if env var is not set
 * @returns true if mock should be used, false if real API should be used
 */
function shouldUseMock(envVarName: string, defaultValue: boolean = isDev): boolean {
  // In production, NEVER use mock (security & reliability)
  if (isProd) {
    return false;
  }

  // Check environment variable
  const envValue = import.meta.env[envVarName];

  // If explicitly set, use that value
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === true;
  }

  // Otherwise use default (true for dev, false for prod)
  return defaultValue;
}

/**
 * Mock mode flags for each module
 * Can be overridden by environment variables
 */
export const MOCK_FLAGS = {
  // Supplier modules
  SUPPLIER_PRODUCTS: shouldUseMock('VITE_USE_MOCK_SUPPLIER_PRODUCTS'),
  SUPPLIER_ORDERS: shouldUseMock('VITE_USE_MOCK_SUPPLIER_ORDERS'),

  // Seller modules
  SELLER_PRODUCTS: shouldUseMock('VITE_USE_MOCK_SELLER_PRODUCTS'),
  SELLER_ORDERS: shouldUseMock('VITE_USE_MOCK_SELLER_ORDERS'),

  // Storefront
  STOREFRONT: shouldUseMock('VITE_USE_MOCK_STOREFRONT'),

  // Partner (Phase 6-2)
  // Phase 6-5: Partner Links & Analytics now use Real API
  PARTNER_LINKS: shouldUseMock('VITE_USE_MOCK_PARTNER_LINKS', false),
  PARTNER_ANALYTICS: shouldUseMock('VITE_USE_MOCK_PARTNER_ANALYTICS', false),

  // Settlements (Phase 6-2)
  // Phase 6-5: All Settlements now use Real API
  PARTNER_SETTLEMENTS: shouldUseMock('VITE_USE_MOCK_PARTNER_SETTLEMENTS', false),
  SUPPLIER_SETTLEMENTS: shouldUseMock('VITE_USE_MOCK_SUPPLIER_SETTLEMENTS', false),
  SELLER_SETTLEMENTS: shouldUseMock('VITE_USE_MOCK_SELLER_SETTLEMENTS', false),
  ADMIN_SETTLEMENTS: shouldUseMock('VITE_USE_MOCK_ADMIN_SETTLEMENTS', false),
} as const;

/**
 * Check if ANY mock is enabled (useful for debugging)
 */
export const IS_ANY_MOCK_ENABLED = Object.values(MOCK_FLAGS).some((flag) => flag);

/**
 * Log mock status (only in development)
 * Note: Console logging removed for production builds
 */
// if (isDev && IS_ANY_MOCK_ENABLED) {
//   console.group('🔧 Mock Mode Status');
//   Object.entries(MOCK_FLAGS)
//     .filter(([, value]) => value)
//     .forEach(([key]) => {
//       console.log(`  ✓ ${key}: MOCK`);
//     });
//   console.groupEnd();
// }
