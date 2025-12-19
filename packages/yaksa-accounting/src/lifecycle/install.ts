/**
 * yaksa-accounting Install Lifecycle
 *
 * Phase 0: No database tables to create
 * - 구조 고정 & 범위 봉인만 수행
 * - DB 생성 ❌
 * - Seed ❌
 */

import type { DataSource } from 'typeorm';

export async function install(_dataSource: DataSource): Promise<void> {
  console.log('[yaksa-accounting] Installing...');
  console.log('[yaksa-accounting] Phase 0: No database tables to create');
  console.log('[yaksa-accounting] This is a Digital Cashbook, NOT an ERP');
  console.log('[yaksa-accounting] Install completed');
}

export default install;
