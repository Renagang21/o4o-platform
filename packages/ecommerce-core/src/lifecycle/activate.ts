/**
 * E-commerce Core Activate Lifecycle
 *
 * AppStore 활성화 시 실행되는 로직
 * - 서비스 등록
 * - 이벤트 핸들러 등록
 */

import { DataSource } from 'typeorm';

export interface ActivateContext {
  dataSource: DataSource;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function activate(context: ActivateContext): Promise<void> {
  const { logger } = context;

  logger?.info('[ecommerce-core] Activating...');

  try {
    // 1. 서비스 활성화
    // (NestJS DI가 자동으로 처리)

    // 2. 이벤트 핸들러 등록
    // (EventEmitter가 자동으로 처리)

    logger?.info('[ecommerce-core] Activation completed successfully');
  } catch (error) {
    logger?.error(`[ecommerce-core] Activation failed: ${error}`);
    throw error;
  }
}

export default activate;
