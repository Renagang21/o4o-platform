import { DataSource } from 'typeorm';
import { jobRegistry } from '@o4o/yaksa-scheduler';

/**
 * Membership-Yaksa Deactivate Hook
 *
 * 앱 비활성화 시 실행
 * Phase R1.1: JobRegistry에서 Job 정의 해제
 */
export async function deactivate(dataSource: DataSource): Promise<void> {
  console.log('[Membership-Yaksa] Deactivating...');

  // Phase R1.1: JobRegistry에서 Job 정의 해제
  const unregistered = jobRegistry.unregisterAllForService('membership-yaksa');
  console.log(`[Membership-Yaksa] Unregistered ${unregistered} job definitions`);

  console.log('[Membership-Yaksa] Deactivated');
}
