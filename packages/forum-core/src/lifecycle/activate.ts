/**
 * Forum Core - Activate Lifecycle Hook
 *
 * Executed when forum-core is activated (enabled).
 * Responsibilities:
 * - Register admin menu items
 * - Enable forum routes
 * - Clear relevant caches
 */

import type { ActivateContext } from '@o4o/types';

export async function activate(context: ActivateContext): Promise<void> {
  const { logger, options = {} } = context;
  const { menuManager, routeManager, cacheManager } = options;

  logger.info('[forum-core] Activating...');

  // 1. Register admin menu
  if (menuManager) {
    await registerForumMenu(menuManager, logger);
  }

  // 2. Enable forum routes
  if (routeManager) {
    await enableForumRoutes(routeManager, logger);
  }

  // 3. Clear caches
  if (cacheManager) {
    await clearForumCaches(cacheManager, logger);
  }

  logger.info('[forum-core] Activation completed successfully.');
}

/**
 * Register forum menu in admin dashboard
 */
async function registerForumMenu(menuManager: any, logger: any): Promise<void> {
  const forumMenu = {
    id: 'forum',
    label: '포럼',
    icon: 'MessageSquare',
    path: '/forum',
    position: 100,
    children: [
      {
        id: 'forum-dashboard',
        label: '대시보드',
        icon: 'LayoutDashboard',
        path: '/forum',
        requiredPermission: 'forum.read',
      },
      {
        id: 'forum-posts',
        label: '게시글 관리',
        icon: 'FileText',
        path: '/forum',
        requiredPermission: 'forum.write',
      },
      {
        id: 'forum-categories',
        label: '카테고리',
        icon: 'Folder',
        path: '/forum/categories',
        requiredPermission: 'forum.admin',
      },
      {
        id: 'forum-reports',
        label: '신고 검토',
        icon: 'Shield',
        path: '/forum/reports',
        requiredPermission: 'forum.moderate',
      },
    ],
  };

  await menuManager.register(forumMenu);
  logger.info('[forum-core] Menu registered');
}

/**
 * Enable forum routes
 */
async function enableForumRoutes(routeManager: any, logger: any): Promise<void> {
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
    await routeManager.enable(route);
  }

  logger.info('[forum-core] Routes enabled');
}

/**
 * Clear forum-related caches
 */
async function clearForumCaches(cacheManager: any, logger: any): Promise<void> {
  const cacheKeys = [
    'forum:categories',
    'forum:stats',
    'forum:recent-posts',
  ];

  for (const key of cacheKeys) {
    await cacheManager.delete(key);
  }

  logger.info('[forum-core] Caches cleared');
}

export default activate;
