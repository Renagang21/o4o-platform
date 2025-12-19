/**
 * yaksa-admin Deactivate Hook
 *
 * 앱 비활성화 시 실행
 *
 * Phase 0 정책:
 * - 메뉴 비활성화
 * - 리소스 정리
 * - yaksa-admin은 데이터를 소유하지 않으므로 데이터 정리 없음
 */

import type { DataSource } from 'typeorm';

export async function deactivate(_dataSource: DataSource): Promise<void> {
  console.log('[yaksa-admin] Deactivating...');
  console.log('[yaksa-admin] Admin menu disabled');
  console.log('[yaksa-admin] No data to clean up (yaksa-admin owns no tables)');
  console.log('[yaksa-admin] Deactivated');
}

export default deactivate;
