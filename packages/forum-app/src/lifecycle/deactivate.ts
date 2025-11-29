/**
 * Forum Core - Deactivate Lifecycle Hook
 *
 * Executed when forum-core is deactivated (disabled).
 * Responsibilities:
 * - Unregister admin menu items
 * - Disable forum routes
 * - Clear caches
 *
 * NOTE: Does NOT delete data - only disables the app functionality
 */

import type { DeactivateContext } from '@o4o/types';

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { logger, options = {} } = context;
  const { menuManager, routeManager, cacheManager } = options;

  logger.info('[forum-core] Deactivating...');

  // 1. Unregister admin menu
  if (menuManager) {
    await unregisterForumMenu(menuManager, logger);
  }

  // 2. Disable forum routes
  if (routeManager) {
    await disableForumRoutes(routeManager, logger);
  }

  // 3. Clear caches
  if (cacheManager) {
    await clearForumCaches(cacheManager, logger);
  }

  logger.info('[forum-core] Deactivation completed successfully.');
}

/**
 * Unregister forum menu from admin dashboard
 */
async function unregisterForumMenu(menuManager: any, logger: any): Promise<void> {
  await menuManager.unregister('forum');
  logger.info('[forum-core] Menu unregistered');
}

/**
 * Disable forum routes
 */
async function disableForumRoutes(routeManager: any, logger: any): Promise<void> {
  const forumRoutes = [
    '/admin/forum',
    '/admin/forum/posts',
    '/admin/forum/posts/:id',
    '/admin/forum/posts/:id/edit',
    '/admin/forum/posts/new',
    '/admin/forum/categories',
    '/admin/forum/reports',
  ];

  for (const route of forumRoutes) {
    await routeManager.disable(route);
  }

  logger.info('[forum-core] Routes disabled');
}

/**
 * Clear forum-related caches
 */
async function clearForumCaches(cacheManager: any, logger: any): Promise<void> {
  const cacheKeys = [
    'forum:categories',
    'forum:stats',
    'forum:recent-posts',
    'forum:active-users',
  ];

  for (const key of cacheKeys) {
    await cacheManager.delete(key);
  }

  logger.info('[forum-core] Caches cleared');
}

export default deactivate;
