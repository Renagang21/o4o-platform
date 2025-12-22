/**
 * CGM Pharmacist App - Activate Lifecycle
 */

export interface ActivateContext {
  dataSource?: unknown;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function activate(context: ActivateContext): Promise<void> {
  const logger = context.logger || console;

  logger.info('[cgm-pharmacist-app] Activating...');

  try {
    // 앱 활성화 시 필요한 작업
    // - 라우트 등록
    // - 권한 설정
    // - Mock 데이터 초기화 (개발 환경)

    logger.info('[cgm-pharmacist-app] Activation completed successfully');
  } catch (error) {
    logger.error(`[cgm-pharmacist-app] Activation failed: ${error}`);
    throw error;
  }
}

export default activate;
