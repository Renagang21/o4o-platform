/**
 * CGM Pharmacist App - Deactivate Lifecycle
 */

export interface DeactivateContext {
  dataSource?: unknown;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  const logger = context.logger || console;

  logger.info('[cgm-pharmacist-app] Deactivating...');

  try {
    // 앱 비활성화 시 필요한 작업
    // - 라우트 제거
    // - 활성 세션 정리

    logger.info('[cgm-pharmacist-app] Deactivation completed successfully');
  } catch (error) {
    logger.error(`[cgm-pharmacist-app] Deactivation failed: ${error}`);
    throw error;
  }
}

export default deactivate;
