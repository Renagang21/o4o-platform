/**
 * Groupbuy-Yaksa Deactivate Hook
 *
 * 앱 비활성화 시 실행
 */

import type { DataSource } from 'typeorm';

export async function deactivate(dataSource: DataSource): Promise<void> {
  console.log('[groupbuy-yaksa] Deactivating...');

  // Phase 1에서는 특별한 비활성화 로직 없음

  console.log('[groupbuy-yaksa] Deactivated');
}
