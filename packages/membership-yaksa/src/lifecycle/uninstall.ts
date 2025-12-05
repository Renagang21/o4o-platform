import { DataSource } from 'typeorm';

/**
 * Membership-Yaksa Uninstall Hook
 *
 * 앱 제거 시 실행
 * 데이터는 유지 (uninstallPolicy.defaultMode = 'keep-data')
 */
export async function uninstall(dataSource: DataSource): Promise<void> {
  console.log('[Membership-Yaksa] Uninstalling...');
  console.log('[Membership-Yaksa] Data will be preserved (keep-data mode)');
  console.log('[Membership-Yaksa] Uninstallation completed');
}
