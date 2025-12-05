import { DataSource } from 'typeorm';

/**
 * Membership-Yaksa Deactivate Hook
 *
 * 앱 비활성화 시 실행
 */
export async function deactivate(dataSource: DataSource): Promise<void> {
  console.log('[Membership-Yaksa] Deactivated');
}
