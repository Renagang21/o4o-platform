/**
 * Cosmetics Supplier Extension - Lifecycle Hooks
 *
 * Extension 설치/활성화/비활성화/제거 시 실행되는 훅
 */

import { DataSource } from 'typeorm';

export interface LifecycleContext {
  dataSource: DataSource;
  supplierId?: string;
}

/**
 * Extension 설치 시 실행
 * - 필요한 테이블 생성 확인
 * - 초기 데이터 설정
 */
export async function onInstall(context: LifecycleContext): Promise<void> {
  console.log('[cosmetics-supplier-extension] Installing...');

  // Verify entities are available
  const entityMetadata = context.dataSource.entityMetadatas;
  const supplierEntities = entityMetadata.filter((e) =>
    e.tableName.startsWith('supplier_') || e.tableName.startsWith('price_policy') || e.tableName.startsWith('sample_supply')
  );

  console.log(`[cosmetics-supplier-extension] Found ${supplierEntities.length} supplier entities`);
  console.log('[cosmetics-supplier-extension] Installation complete');
}

/**
 * Extension 활성화 시 실행
 * - 공급사 프로필 상태 확인
 * - 필요한 서비스 초기화
 */
export async function onActivate(context: LifecycleContext): Promise<void> {
  console.log('[cosmetics-supplier-extension] Activating...');

  // TODO: Initialize supplier-specific services
  // - Check supplier profile status
  // - Initialize price monitoring
  // - Set up campaign scheduler

  console.log('[cosmetics-supplier-extension] Activation complete');
}

/**
 * Extension 비활성화 시 실행
 * - 진행 중인 작업 정리
 * - 캐시 클리어
 */
export async function onDeactivate(context: LifecycleContext): Promise<void> {
  console.log('[cosmetics-supplier-extension] Deactivating...');

  // TODO: Cleanup tasks
  // - Pause active campaigns
  // - Clear price monitoring cache
  // - Suspend notifications

  console.log('[cosmetics-supplier-extension] Deactivation complete');
}

/**
 * Extension 제거 시 실행
 * - 데이터 백업 안내
 * - 관련 리소스 정리
 */
export async function onUninstall(context: LifecycleContext): Promise<void> {
  console.log('[cosmetics-supplier-extension] Uninstalling...');

  // TODO: Cleanup tasks
  // - Archive campaign data
  // - Export approval history
  // - Remove supplier-specific configurations

  console.log('[cosmetics-supplier-extension] Uninstallation complete');
}

export const lifecycle = {
  onInstall,
  onActivate,
  onDeactivate,
  onUninstall,
};

export default lifecycle;
