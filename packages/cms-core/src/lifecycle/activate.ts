import { ActivateContext } from '../types/context.js';
import {
  viewRegistry,
  navigationRegistry,
  dynamicRouter,
  initializeViewSystem,
} from '../view-system/index.js';
import type { NavigationItem, ViewRegistrationOptions } from '../view-system/types.js';

/**
 * Menu admin item interface (nested structure with children)
 * Used by menus.admin in manifests
 */
interface MenuAdminItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  order?: number;
  permissions?: string[];
  roles?: string[];
  children?: MenuAdminItem[];
}

/**
 * Flatten nested menu items to flat structure with parentId
 * Phase P0 Task A: Convert menus.admin to navigation format
 */
function flattenMenuItems(
  items: MenuAdminItem[],
  appId: string,
  parentId?: string
): NavigationItem[] {
  const result: NavigationItem[] = [];

  for (const item of items) {
    // Create navigation item with proper ID format
    const navId = parentId ? `${appId}.${item.id}` : `${appId}.${item.id}`;
    const navParentId = parentId ? `${appId}.${parentId}` : undefined;

    const navItem: NavigationItem = {
      id: navId,
      label: item.label,
      path: item.path || '',
      icon: item.icon,
      order: item.order,
      permissions: item.permissions,
      parentId: navParentId,
      appId,
    };

    result.push(navItem);

    // Recursively flatten children
    if (item.children && item.children.length > 0) {
      const childItems = flattenMenuItems(item.children, appId, item.id);
      result.push(...childItems);
    }
  }

  return result;
}

/**
 * Activate Hook
 *
 * cms-core 앱 활성화 시 실행됩니다.
 * - ViewSystem 초기화
 * - Navigation 등록
 * - Dynamic Routes 등록
 * - 라우트 등록
 * - 상태 업데이트
 */
export async function activate(context: ActivateContext): Promise<void> {
  const { dataSource, manifest, logger } = context;

  logger.info(`[${manifest.appId}] Activating...`);

  try {
    // 1. Initialize View System
    await initializeViewSystemFromManifest(context);

    // 2. Register routes
    await registerRoutes(context);

    // 3. Update app status
    await updateAppStatus(dataSource, manifest.appId, 'active');

    // 4. Log View System stats
    initializeViewSystem();

    logger.info(`[${manifest.appId}] Activated successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Activation failed:`, error);
    throw error;
  }
}

/**
 * manifest의 viewTemplates와 navigation을 ViewSystem에 등록
 * Supports both navigation.admin (flat) and menus.admin (nested) patterns
 */
async function initializeViewSystemFromManifest(context: ActivateContext): Promise<void> {
  const { manifest, logger } = context;
  const appId = manifest.appId;

  let navCount = 0;

  // 1a. Register navigation items from navigation.admin (flat structure with parentId)
  const navigation = manifest.navigation as { admin?: Array<{
    id: string;
    label: string;
    path: string;
    icon?: string;
    parentId?: string;
    order?: number;
    permissions?: string[];
  }> } | undefined;

  if (navigation?.admin) {
    for (const navItem of navigation.admin) {
      const item: NavigationItem = {
        id: navItem.id,
        label: navItem.label,
        path: navItem.path,
        icon: navItem.icon,
        parentId: navItem.parentId,
        order: navItem.order,
        permissions: navItem.permissions,
        appId,
      };
      navigationRegistry.registerNav(item);
      navCount++;
    }
  }

  // 1b. Register navigation items from menus.admin (nested structure with children)
  // Phase P0 Task A: Support both patterns for backward compatibility
  const menus = manifest.menus as { admin?: Array<MenuAdminItem> } | undefined;

  if (menus?.admin) {
    const flattenedItems = flattenMenuItems(menus.admin, appId);
    for (const item of flattenedItems) {
      navigationRegistry.registerNav(item);
      navCount++;
    }
  }

  if (navCount > 0) {
    logger.info(`[${appId}] Registered ${navCount} navigation items`);
  }

  // 2. Register dynamic routes from viewTemplates
  const viewTemplates = manifest.viewTemplates as Array<{
    viewId: string;
    route: string;
    title?: string;
    type?: string;
    layout?: string;
    auth?: boolean;
  }> | undefined;

  if (viewTemplates) {
    dynamicRouter.registerFromManifest(appId, viewTemplates);
    logger.info(`[${appId}] Registered ${viewTemplates.length} dynamic routes`);
  }
}

async function registerRoutes(context: ActivateContext): Promise<void> {
  const { manifest, logger } = context;

  logger.info('Registering CMS routes...');

  // Routes are registered via manifest.adminRoutes
  // Actual route registration is handled by AppManager

  logger.info('CMS routes registered.');
}

async function updateAppStatus(
  dataSource: any,
  appId: string,
  status: string
): Promise<void> {
  // Check if app_registry table exists
  const hasTable = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'app_registry'
    );
  `);

  if (!hasTable[0].exists) {
    return;
  }

  // Note: TypeORM uses quoted camelCase column names ("appId", "updatedAt")
  await dataSource.query(
    `
    UPDATE app_registry
    SET status = $1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "appId" = $2
  `,
    [status, appId]
  );
}
