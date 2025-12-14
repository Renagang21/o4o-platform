/**
 * E-commerce Core Uninstall Lifecycle
 *
 * AppStore 삭제 시 실행되는 로직
 *
 * ⚠️ 주의: E-commerce Core는 판매 원장이므로 데이터 삭제를 금지합니다.
 * allowPurge: false 설정으로 데이터는 보존됩니다.
 */

import { DataSource } from 'typeorm';

export interface UninstallContext {
  dataSource: DataSource;
  purgeData?: boolean; // manifest에서 allowPurge: false이므로 항상 false
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
}

export async function uninstall(context: UninstallContext): Promise<void> {
  const { purgeData, logger } = context;

  logger?.info('[ecommerce-core] Starting uninstallation...');

  if (purgeData) {
    logger?.warn('[ecommerce-core] Data purge requested but not allowed for E-commerce Core (Source of Truth)');
    logger?.warn('[ecommerce-core] Tables will be preserved');
  }

  try {
    // E-commerce Core는 판매 원장이므로 데이터를 삭제하지 않음
    // 테이블은 그대로 유지

    // 1. 설정 초기화 (선택적)
    // await clearAppSettings(dataSource);

    // 2. 캐시 정리 (선택적)
    // await clearCaches();

    logger?.info('[ecommerce-core] Uninstallation completed (data preserved)');
  } catch (error) {
    logger?.error(`[ecommerce-core] Uninstallation failed: ${error}`);
    throw error;
  }
}

export default uninstall;
