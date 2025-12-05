import { DataSource } from 'typeorm';

/**
 * Membership-Yaksa Activate Hook
 *
 * 앱 활성화 시 실행
 */
export async function activate(dataSource: DataSource): Promise<void> {
  console.log('[Membership-Yaksa] Activated');
}
