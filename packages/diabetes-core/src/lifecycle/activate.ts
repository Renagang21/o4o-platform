import type { LifecycleContext } from '@o4o/types';

export async function activate(context: LifecycleContext): Promise<void> {
  const { logger } = context;

  logger?.info('[diabetes-core] Activating...');

  try {
    // 활성화 시 필요한 초기화 작업
    // - 스케줄러 시작 (일일 메트릭스 계산 등)
    // - 캐시 워밍업

    logger?.info('[diabetes-core] Activation completed successfully');
  } catch (error) {
    logger?.error('[diabetes-core] Activation failed:', error);
    throw error;
  }
}

export default activate;
