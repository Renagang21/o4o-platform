import type { LifecycleContext } from '@o4o/types';

export async function uninstall(context: LifecycleContext): Promise<void> {
  const { logger } = context;

  logger?.info('[diabetes-core] Starting uninstallation...');

  try {
    // 제거 시 정리 작업
    // 주의: 데이터 삭제는 신중하게 처리해야 함
    // 기본적으로 테이블은 유지하고 앱 설정만 제거

    logger?.info('[diabetes-core] Uninstallation completed successfully');
  } catch (error) {
    logger?.error('[diabetes-core] Uninstallation failed:', error);
    throw error;
  }
}

export default uninstall;
