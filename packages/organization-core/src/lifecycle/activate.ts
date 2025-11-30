import { ActivateContext } from '../types/context';

/**
 * Activate Hook
 *
 * organization-core 앱 활성화 시 실행됩니다.
 * - 라우트 등록
 * - 이벤트 리스너 등록
 * - 상태 업데이트
 */
export async function activate(context: ActivateContext): Promise<void> {
  const { dataSource, manifest, logger } = context;

  logger.info(`[${manifest.appId}] Activating...`);

  try {
    // 1. 라우트 등록
    await registerRoutes(context);

    // 2. 이벤트 리스너 등록 (선택적)
    // await registerEventListeners(context);

    // 3. 상태 업데이트
    await updateAppStatus(dataSource, manifest.appId, 'active');

    logger.info(`[${manifest.appId}] Activated successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Activation failed:`, error);
    throw error;
  }
}

async function registerRoutes(context: ActivateContext): Promise<void> {
  const { manifest, logger } = context;

  logger.info('Registering routes...');

  // manifest.routes를 Express/Fastify 라우터에 등록
  // 실제 구현은 AppManager에서 처리

  logger.info(`${manifest.routes?.length || 0} routes registered.`);
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
    SET status = $1, activated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE app_id = $2
  `,
    [status, appId]
  );
}
