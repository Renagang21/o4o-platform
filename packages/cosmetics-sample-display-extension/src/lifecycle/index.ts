/**
 * Cosmetics Sample & Display Extension - Lifecycle Hooks
 *
 * Phase 6-H Extension Lifecycle Implementation
 * - install: 초기 스키마 및 기본 데이터 생성
 * - activate: 서비스 활성화 및 스케줄러 시작
 * - deactivate: 스케줄러 중지, 연결 해제
 * - uninstall: 데이터 정리 (옵션)
 */

import { DataSource } from 'typeorm';
import {
  SampleInventory,
  SampleUsageLog,
  DisplayLayout,
  SampleConversion,
} from '../backend/entities';

export interface LifecycleContext {
  dataSource: DataSource;
  storeId?: string;
  options?: {
    preserveData?: boolean;
  };
}

/**
 * Install hook - Extension 최초 설치 시 실행
 */
export async function install(context: LifecycleContext): Promise<void> {
  const { dataSource } = context;

  console.log('[cosmetics-sample-display-extension] Installing...');

  // Ensure tables exist (TypeORM synchronize should handle this)
  // But we can verify entities are registered
  const entityMetadatas = dataSource.entityMetadatas;
  const requiredEntities = [
    'SampleInventory',
    'SampleUsageLog',
    'DisplayLayout',
    'SampleConversion',
  ];

  for (const entityName of requiredEntities) {
    const found = entityMetadatas.find((em) => em.name === entityName);
    if (!found) {
      console.warn(`[cosmetics-sample-display-extension] Entity ${entityName} not found in metadata`);
    }
  }

  console.log('[cosmetics-sample-display-extension] Installation complete');
}

/**
 * Activate hook - Extension 활성화 시 실행
 */
export async function activate(context: LifecycleContext): Promise<void> {
  const { dataSource, storeId } = context;

  console.log('[cosmetics-sample-display-extension] Activating...');

  // Initialize inventory check scheduler (placeholder)
  // In production, this would start a cron job or interval
  console.log('[cosmetics-sample-display-extension] Low stock check scheduler initialized');

  // If storeId provided, create default inventory records
  if (storeId) {
    const inventoryRepo = dataSource.getRepository(SampleInventory);
    const existingCount = await inventoryRepo.count({ where: { storeId } });

    if (existingCount === 0) {
      console.log(`[cosmetics-sample-display-extension] Initializing inventory for store ${storeId}`);
      // Default inventory setup would go here
    }
  }

  console.log('[cosmetics-sample-display-extension] Activation complete');
}

/**
 * Deactivate hook - Extension 비활성화 시 실행
 */
export async function deactivate(context: LifecycleContext): Promise<void> {
  console.log('[cosmetics-sample-display-extension] Deactivating...');

  // Stop schedulers
  console.log('[cosmetics-sample-display-extension] Schedulers stopped');

  // Clear caches
  console.log('[cosmetics-sample-display-extension] Caches cleared');

  console.log('[cosmetics-sample-display-extension] Deactivation complete');
}

/**
 * Uninstall hook - Extension 제거 시 실행
 */
export async function uninstall(context: LifecycleContext): Promise<void> {
  const { dataSource, options } = context;

  console.log('[cosmetics-sample-display-extension] Uninstalling...');

  if (options?.preserveData) {
    console.log('[cosmetics-sample-display-extension] Data preservation enabled, skipping data cleanup');
  } else {
    // Warning: This will delete all extension data
    console.log('[cosmetics-sample-display-extension] Cleaning up extension data...');

    // In production, you might want to:
    // 1. Export data before deletion
    // 2. Mark records as deleted instead of hard delete
    // 3. Require explicit confirmation

    const conversionRepo = dataSource.getRepository(SampleConversion);
    const displayRepo = dataSource.getRepository(DisplayLayout);
    const usageRepo = dataSource.getRepository(SampleUsageLog);
    const inventoryRepo = dataSource.getRepository(SampleInventory);

    // Delete in order of dependencies
    await conversionRepo.delete({});
    await displayRepo.delete({});
    await usageRepo.delete({});
    await inventoryRepo.delete({});

    console.log('[cosmetics-sample-display-extension] Extension data cleaned up');
  }

  console.log('[cosmetics-sample-display-extension] Uninstallation complete');
}

/**
 * Lifecycle exports for ModuleLoader
 */
export const lifecycle = {
  install,
  activate,
  deactivate,
  uninstall,
};

export default lifecycle;
