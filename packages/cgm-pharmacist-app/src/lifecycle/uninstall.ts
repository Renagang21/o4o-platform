/**
 * CGM Pharmacist App - Uninstall Lifecycle
 */

export interface UninstallContext {
  dataSource?: unknown;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function uninstall(context: UninstallContext): Promise<void> {
  const logger = context.logger || console;

  logger.info('[cgm-pharmacist-app] Starting uninstallation...');

  try {
    // 앱 제거 시 필요한 작업
    // - 설정 데이터 정리 (테이블 데이터는 별도 관리)
    // - 캐시 정리

    logger.info('[cgm-pharmacist-app] Uninstallation completed successfully');
  } catch (error) {
    logger.error(`[cgm-pharmacist-app] Uninstallation failed: ${error}`);
    throw error;
  }
}

export default uninstall;
