/**
 * Dropshipping-Core Deactivate Hook
 *
 * Called when the Dropshipping-Core app is deactivated
 */

import { DataSource } from 'typeorm';

export async function onDeactivate(dataSource: DataSource): Promise<void> {
  console.log('[dropshipping-core] Deactivating Dropshipping Core...');

  // 이벤트 언바인딩
  // 런타임 리소스 정리
  // Note: Database tables are NOT removed on deactivate

  console.log('[dropshipping-core] Event system unregistered');
  console.log('[dropshipping-core] Dropshipping Core deactivated successfully');
}
