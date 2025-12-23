/**
 * CGM Pharmacist App - Install Lifecycle
 */

export interface InstallContext {
  dataSource?: unknown;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function install(context: InstallContext): Promise<void> {
  const logger = context.logger || console;

  logger.info('[cgm-pharmacist-app] Starting installation...');

  try {
    // 테이블 생성은 Migration으로 처리
    // 여기서는 초기 설정만 수행

    logger.info('[cgm-pharmacist-app] Installation completed successfully');
  } catch (error) {
    logger.error(`[cgm-pharmacist-app] Installation failed: ${error}`);
    throw error;
  }
}

export default install;
