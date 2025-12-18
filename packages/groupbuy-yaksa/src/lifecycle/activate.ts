/**
 * Groupbuy-Yaksa Activate Hook
 *
 * 앱 활성화 시 실행
 */

import type { DataSource } from 'typeorm';

export async function activate(dataSource: DataSource): Promise<void> {
  console.log('[groupbuy-yaksa] Activating...');

  // Phase 1에서는 특별한 활성화 로직 없음
  // 추후 스케줄러 등록 등 추가 가능

  console.log('[groupbuy-yaksa] Activated');
}
