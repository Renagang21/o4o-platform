import { DeactivateContext } from '../types/context';

/**
 * Deactivate Hook
 *
 * organization-core 앱 비활성화 시 실행됩니다.
 * - 라우트 해제
 * - 이벤트 리스너 해제
 * - 상태 업데이트
 */
export async function deactivate(context: DeactivateContext): Promise<void> {
  const { dataSource, manifest, logger } = context;

  logger.info(`[${manifest.appId}] Deactivating...`);

  try {
    // 1. 라우트 해제
    await unregisterRoutes(context);

    // 2. 이벤트 리스너 해제 (선택적)
    // await unregisterEventListeners(context);

    // 3. 상태 업데이트
    await updateAppStatus(dataSource, manifest.appId, 'inactive');

    logger.info(`[${manifest.appId}] Deactivated successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Deactivation failed:`, error);
    throw error;
  }
}

async function unregisterRoutes(context: DeactivateContext): Promise<void> {
  const { manifest, logger } = context;

  logger.info('Unregistering routes...');

  // manifest.routes 해제
  // 실제 구현은 AppManager에서 처리

  logger.info(`${manifest.routes?.length || 0} routes unregistered.`);
}

async function updateAppStatus(
  dataSource: any,
  appId: string,
  status: string
): Promise<void> {
  // app_registry 테이블 존재 여부 확인
  const hasTable = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'app_registry'
    );
  `);

  if (!hasTable[0].exists) {
    return;
  }

  await dataSource.query(
    `
    UPDATE app_registry
    SET status = $1, deactivated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE app_id = $2
  `,
    [status, appId]
  );
}
