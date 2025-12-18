/**
 * Groupbuy-Yaksa Uninstall Hook
 *
 * 앱 제거 시 실행
 */

import type { DataSource } from 'typeorm';

export interface UninstallOptions {
  preserveData?: boolean;
}

export async function uninstall(
  dataSource: DataSource,
  options?: UninstallOptions
): Promise<void> {
  console.log('[groupbuy-yaksa] Uninstalling...');

  if (options?.preserveData) {
    console.log('[groupbuy-yaksa] Data preservation enabled, skipping cleanup');
    return;
  }

  // 데이터 정리는 명시적 요청 시에만 수행
  // 기본적으로는 데이터 보존

  console.log('[groupbuy-yaksa] Uninstallation complete');
}
