import type { DataSource } from 'typeorm';
import type { AppLifecycleContext } from '@o4o/types';

export async function install(context: AppLifecycleContext): Promise<void> {
  const { dataSource, logger } = context;

  logger?.info('[diabetes-core] Starting installation...');

  try {
    // 엔티티 테이블 생성은 TypeORM synchronize 또는 migration으로 처리
    // 여기서는 초기 설정 데이터 등을 생성

    logger?.info('[diabetes-core] Installation completed successfully');
  } catch (error) {
    logger?.error('[diabetes-core] Installation failed:', error);
    throw error;
  }
}

export default install;
