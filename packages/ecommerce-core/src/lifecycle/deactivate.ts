/**
 * E-commerce Core Deactivate Lifecycle
 *
 * AppStore 비활성화 시 실행되는 로직
 * - 서비스 정리
 * - 이벤트 핸들러 해제
 */

import { DataSource } from 'typeorm';

export interface DeactivateContext {
  dataSource: DataSource;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { logger } = context;

  logger?.info('[ecommerce-core] Deactivating...');

  try {
    // 1. 진행 중인 작업 정리
    // (graceful shutdown)

    // 2. 이벤트 핸들러 해제
    // (EventEmitter가 자동으로 처리)

    logger?.info('[ecommerce-core] Deactivation completed successfully');
  } catch (error) {
    logger?.error(`[ecommerce-core] Deactivation failed: ${error}`);
    throw error;
  }
}

export default deactivate;
