import type { DataSource } from 'typeorm';

/**
 * Member-Yaksa Deactivate Hook
 *
 * 앱 비활성화 시 실행
 *
 * Phase 0:
 * - 라우트 비활성화
 * - 리소스 정리
 */
export async function deactivate(dataSource: DataSource): Promise<void> {
  console.log('[Member-Yaksa] Deactivating...');

  // Phase 0: 라우트 비활성화 로그
  console.log('[Member-Yaksa] Routes deactivated:');
  console.log('  - /member/home');
  console.log('  - /member/profile');
  console.log('  - /member/pharmacy');

  // Phase 0: 리소스 정리
  console.log('[Member-Yaksa] No resources to clean up');

  console.log('[Member-Yaksa] Deactivated');
}
