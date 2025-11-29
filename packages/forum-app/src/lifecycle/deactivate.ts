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

export interface DeactivateContext {
  appId: string;
  version: string;
  menuManager?: any;
  routeManager?: any;
  cacheManager?: any;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { menuManager, routeManager, cacheManager } = context;

  console.log('[forum-core] Deactivating...');

  // 1. Unregister admin menu
  if (menuManager) {
    await unregisterForumMenu(menuManager);
  }

  // 2. Disable forum routes
  if (routeManager) {
    await disableForumRoutes(routeManager);
  }

  // 3. Clear caches
  if (cacheManager) {
    await clearForumCaches(cacheManager);
  }

  console.log('[forum-core] Deactivation completed successfully.');
}

/**
 * Unregister forum menu from admin dashboard
 */
async function unregisterForumMenu(menuManager: any): Promise<void> {
  await menuManager.unregister('forum');
  console.log('[forum-core] Menu unregistered');
}

/**
 * Disable forum routes
 */
async function disableForumRoutes(routeManager: any): Promise<void> {
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

  console.log('[forum-core] Routes disabled');
}

/**
 * Clear forum-related caches
 */
async function clearForumCaches(cacheManager: any): Promise<void> {
  const cacheKeys = [
    'forum:categories',
    'forum:stats',
    'forum:recent-posts',
    'forum:active-users',
  ];

  for (const key of cacheKeys) {
    await cacheManager.delete(key);
  }

  console.log('[forum-core] Caches cleared');
}

export default deactivate;
