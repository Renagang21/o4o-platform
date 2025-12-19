/**
 * yaksa-admin Install Hook
 *
 * Phase 0 정책:
 * - DB 생성 ❌
 * - Seed ❌
 * - 로그만 출력
 *
 * yaksa-admin은 데이터를 생성하지 않는다.
 * 다른 서비스의 데이터를 조회/승인만 한다.
 */

import type { DataSource } from 'typeorm';

export async function install(_dataSource: DataSource): Promise<void> {
  console.log('[yaksa-admin] Installing...');
  console.log('[yaksa-admin] Phase 0: No database tables to create');
  console.log('[yaksa-admin] yaksa-admin does not own any data - it only reads/approves from other services');
  console.log('[yaksa-admin] Installation completed');
}

export default install;
