/**
 * Cosmetics Partner Extension - Install Hook
 *
 * 앱 설치 시 실행되는 로직
 * - 테이블 생성 (TypeORM 마이그레이션 사용)
 * - 초기 데이터 설정
 */

export async function install(): Promise<void> {
  console.log('[Cosmetics Partner Extension] Installing...');

  // TypeORM will handle table creation via migrations
  // This hook is for additional setup logic

  console.log('[Cosmetics Partner Extension] Installed successfully');
}

export default install;
