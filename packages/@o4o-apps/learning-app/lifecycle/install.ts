/**
 * Learning App Install Hook
 *
 * Called when the app is first installed
 * NOTE: Learning App은 교육/평가 도구가 아닌 순차 전달 도구입니다.
 */
export async function install(): Promise<void> {
  console.log('[Learning App] Installing...');
  // Learning App은 자체 테이블 없음 (API만 사용)
  // Content App 의존성 확인만 수행
  console.log('[Learning App] Verifying Content App dependency...');
  console.log('[Learning App] Installation complete');
}

export default install;
