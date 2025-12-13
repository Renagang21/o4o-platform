import type { LifecycleContext } from '@o4o/types';

export async function deactivate(context: LifecycleContext): Promise<void> {
  const { logger } = context;

  logger?.info('[diabetes-core] Deactivating...');

  try {
    // 비활성화 시 정리 작업
    // - 스케줄러 중지
    // - 리소스 해제

    logger?.info('[diabetes-core] Deactivation completed successfully');
  } catch (error) {
    logger?.error('[diabetes-core] Deactivation failed:', error);
    throw error;
  }
}

export default deactivate;
