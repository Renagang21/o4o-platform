import { ActivateContext } from '../types/context.js';

/**
 * Activate Hook
 *
 * cms-core 앱 활성화 시 실행됩니다.
 * - 라우트 등록
 * - 이벤트 리스너 등록
 * - 상태 업데이트
 */
export async function activate(context: ActivateContext): Promise<void> {
  const { dataSource, manifest, logger } = context;

  logger.info(`[${manifest.appId}] Activating...`);

  try {
    // 1. Register routes
    await registerRoutes(context);

    // 2. Update app status
    await updateAppStatus(dataSource, manifest.appId, 'active');

    logger.info(`[${manifest.appId}] Activated successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Activation failed:`, error);
    throw error;
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
