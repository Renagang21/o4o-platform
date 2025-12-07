/**
 * Dropshipping-Core Activate Hook
 *
 * Called when the Dropshipping-Core app is activated after installation
 */

import { DataSource } from 'typeorm';

export async function onActivate(dataSource: DataSource): Promise<void> {
  console.log('[dropshipping-core] Activating Dropshipping Core...');

  // Core 이벤트 시스템 등록
  // EventEmitter2가 이미 NestJS에서 관리되므로 여기서는 로깅만 수행
  // 실제 이벤트 등록은 서비스 레이어에서 처리됨

  console.log('[dropshipping-core] Event system registered');
  console.log('[dropshipping-core] Dropshipping Core activated successfully');
}
