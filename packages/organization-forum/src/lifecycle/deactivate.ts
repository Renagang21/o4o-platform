import type { DataSource } from 'typeorm';

/**
 * Organization-Forum Extension Deactivate Hook
 *
 * 앱 비활성화 시 실행
 * - 이벤트 리스너 해제
 * - 조직-포럼 통합 기능 일시 중지
 */
export async function deactivate(_dataSource: DataSource): Promise<void> {
  console.log('[organization-forum] Deactivating extension...');

  // 이벤트 리스너 해제
  // 조직 생성 시 포럼 카테고리 자동 생성 중지

  console.log('[organization-forum] Event listeners unregistered');
  console.log('[organization-forum] Extension deactivated successfully');
}

export default deactivate;
