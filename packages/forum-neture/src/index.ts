/**
 * Forum Neture Extension App
 *
 * Entry point for the Neture cosmetics forum extension.
 * This app extends forum-core with beauty-specific features.
 */

// Export manifest
export * from './manifest.js';

// Export services
export * from './backend/services/index.js';

// Note: Admin UI components will be imported directly by admin-dashboard via:
// import('@o4o-apps/forum-neture/src/admin-ui/pages/ForumNetureApp')
