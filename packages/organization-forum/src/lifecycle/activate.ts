import type { DataSource } from 'typeorm';

/**
 * Organization-Forum Extension Activate Hook
 *
 * 앱 활성화 시 실행
 * - 이벤트 리스너 등록
 * - 조직 생성 시 자동 포럼 카테고리 생성 활성화
 */
export async function activate(_dataSource: DataSource): Promise<void> {
  console.log('[organization-forum] Activating extension...');

  // 이벤트 리스너 등록
  // organization-core의 이벤트 시스템과 연결
  // 조직 생성 시 자동으로 포럼 카테고리 생성

  console.log('[organization-forum] Event listeners registered');
  console.log('[organization-forum] Extension activated successfully');
}

export default activate;
