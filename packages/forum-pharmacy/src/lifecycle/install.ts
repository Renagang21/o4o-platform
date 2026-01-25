/**
 * Forum Pharmacy Extension - Install Lifecycle
 */

import type { DataSource } from 'typeorm';

export async function install(dataSource: DataSource): Promise<void> {
  console.log('[forum-pharmacy] Installing extension...');

  // 기본 카테고리 프리셋 생성 등의 초기화 작업
  // forum-core의 ForumCategory 테이블에 약사 서비스 전용 카테고리 추가

  console.log('[forum-pharmacy] Installation complete');
}

export default install;
