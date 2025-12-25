/**
 * yaksa-admin Uninstall Hook
 *
 * Phase 0 정책:
 * - DB 삭제 ❌
 * - 로그만 출력
 *
 * yaksa-admin은 데이터를 생성하지 않는다.
 * 다른 서비스의 데이터를 조회/승인만 한다.
 * 따라서 삭제할 데이터가 없다.
 */

import type { DataSource } from 'typeorm';

export async function uninstall(_dataSource: DataSource): Promise<void> {
  console.log('[yaksa-admin] Uninstalling...');
  console.log('[yaksa-admin] Phase 0: No database tables to drop');
  console.log('[yaksa-admin] yaksa-admin does not own any data');
  console.log('[yaksa-admin] Uninstallation completed');
}

export default uninstall;
