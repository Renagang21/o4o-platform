import type { DataSource } from 'typeorm';

/**
 * Organization-Forum Extension Uninstall Hook
 *
 * 앱 제거 시 실행
 * - 이벤트 리스너 해제
 * - 자체 테이블 없음 (통합 Extension)
 */
export async function uninstall(_dataSource: DataSource): Promise<void> {
  console.log('[organization-forum] Uninstalling extension...');

  // 통합 Extension이므로 자체 테이블 없음
  // 이벤트 리스너만 해제

  console.log('[organization-forum] Extension uninstalled successfully');
}

export default uninstall;
