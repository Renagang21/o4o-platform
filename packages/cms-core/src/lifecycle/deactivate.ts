import { DeactivateContext } from '../types/context.js';
import {
  viewRegistry,
  navigationRegistry,
  dynamicRouter,
} from '../view-system/index.js';

/**
 * Deactivate Hook
 *
 * cms-core 앱 비활성화 시 실행됩니다.
 * - ViewSystem에서 등록 해제
 * - 라우트 해제
 * - 이벤트 리스너 해제
 * - 상태 업데이트
 */
export async function deactivate(context: DeactivateContext): Promise<void> {
  const { dataSource, manifest, logger } = context;

  logger.info(`[${manifest.appId}] Deactivating...`);

  try {
    // 1. Unregister from View System
    await cleanupViewSystem(context);

    // 2. Unregister routes
    await unregisterRoutes(context);

    // 3. Update app status
    await updateAppStatus(dataSource, manifest.appId, 'inactive');

    logger.info(`[${manifest.appId}] Deactivated successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Deactivation failed:`, error);
    throw error;
  }
}

/**
 * ViewSystem에서 이 앱의 등록 해제
 */
async function cleanupViewSystem(context: DeactivateContext): Promise<void> {
  const { manifest, logger } = context;
  const appId = manifest.appId;

  // 1. Unregister views
  const unregisteredViews = viewRegistry.unregisterByApp(appId);
  if (unregisteredViews > 0) {
    logger.info(`[${appId}] Unregistered ${unregisteredViews} views`);
  }

  // 2. Unregister navigation items
  const unregisteredNav = navigationRegistry.unregisterByApp(appId);
  if (unregisteredNav > 0) {
    logger.info(`[${appId}] Unregistered ${unregisteredNav} navigation items`);
  }

  // 3. Unregister dynamic routes (by view IDs)
  const viewTemplates = manifest.viewTemplates as Array<{ viewId: string; route: string }> | undefined;
  if (viewTemplates) {
    for (const template of viewTemplates) {
      dynamicRouter.unregisterRoute(template.route);
    }
    logger.info(`[${appId}] Unregistered ${viewTemplates.length} dynamic routes`);
  }
}

async function unregisterRoutes(context: DeactivateContext): Promise<void> {
  const { logger } = context;

  logger.info('Unregistering CMS routes...');

  // Routes are unregistered by AppManager
  // This hook can perform cleanup if needed

  logger.info('CMS routes unregistered.');
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

  // Note: TypeORM uses quoted camelCase column names
  await dataSource.query(
    `
    UPDATE app_registry
    SET status = $1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "appId" = $2
  `,
    [status, appId]
  );
}
