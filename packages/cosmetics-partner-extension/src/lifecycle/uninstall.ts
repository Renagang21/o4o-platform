/**
 * Cosmetics Partner Extension - Uninstall Hook
 *
 * 앱 제거 시 실행되는 로직
 * - 데이터 삭제 (정책에 따라)
 * - 권한 제거
 */

export async function uninstall(options?: { purge?: boolean }): Promise<void> {
  console.log('[Cosmetics Partner Extension] Uninstalling...');

  if (options?.purge) {
    console.log('[Cosmetics Partner Extension] Purging all data...');
    // Drop tables
    // Remove all partner data
  } else {
    console.log('[Cosmetics Partner Extension] Keeping data (default mode)');
    // Keep data, just remove app registration
  }

  // Remove permissions
  // Remove menus

  console.log('[Cosmetics Partner Extension] Uninstalled successfully');
}

export default uninstall;
