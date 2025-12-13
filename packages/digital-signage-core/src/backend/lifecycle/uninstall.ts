import { UninstallContext } from '../types/context.js';

/**
 * Uninstall Hook
 *
 * digital-signage-core 앱 삭제 시 실행됩니다.
 * - 기본적으로 데이터 유지 (keep-data)
 * - purgeData=true인 경우에만 테이블 삭제
 */
export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, manifest, logger, purgeData } = context;

  logger.info(`[${manifest.appId}] Uninstalling...`);

  try {
    if (purgeData) {
      logger.warn(`[${manifest.appId}] purgeData=true - Data will be deleted!`);
      // Note: In production, implement actual table drops here
      // For safety, this is currently a no-op
      logger.info(`[${manifest.appId}] Data purge skipped (safety measure).`);
    } else {
      logger.info(`[${manifest.appId}] Keeping data (default behavior).`);
    }

    // Update app_registry status
    await updateAppRegistry(dataSource, manifest, logger);

    logger.info(`[${manifest.appId}] Uninstalled successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Uninstallation failed:`, error);
    throw error;
  }
}

async function updateAppRegistry(dataSource: any, manifest: any, logger: any): Promise<void> {
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

  // Update status to uninstalled
  await dataSource.query(
    `
    UPDATE app_registry
    SET status = 'uninstalled', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "appId" = $1
  `,
    [manifest.appId]
  );

  logger.info(`[${manifest.appId}] App registry updated.`);
}
