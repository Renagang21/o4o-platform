/**
 * Forum Cosmetics Extension App
 *
 * Entry point for the cosmetics forum extension.
 * This app extends forum-core with beauty-specific features.
 */

// Export manifest
export * from './manifest.js';

// Export services
export * from './backend/services/index.js';

// Note: Admin UI components will be imported directly by admin-dashboard via:
// import('@o4o-apps/forum-cosmetics/src/admin-ui/pages/CosmeticsForumDashboard')
