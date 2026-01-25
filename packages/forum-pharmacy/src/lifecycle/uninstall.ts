/**
 * Forum Pharmacy Extension - Uninstall Lifecycle
 */

import type { DataSource } from 'typeorm';

export async function uninstall(
  dataSource: DataSource,
  options: { purge?: boolean } = {}
): Promise<void> {
  console.log('[forum-pharmacy] Uninstalling extension...');

  if (options.purge) {
    console.log('[forum-pharmacy] Purging data...');
    // 확장 전용 데이터 삭제
  } else {
    console.log('[forum-pharmacy] Keeping data (default)');
  }

  console.log('[forum-pharmacy] Uninstallation complete');
}

export default uninstall;
