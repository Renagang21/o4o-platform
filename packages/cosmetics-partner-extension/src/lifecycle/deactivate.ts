/**
 * Cosmetics Partner Extension - Deactivate Hook
 *
 * 앱 비활성화 시 실행되는 로직
 * - 메뉴 비활성화
 * - 캐시 정리
 */

export async function deactivate(): Promise<void> {
  console.log('[Cosmetics Partner Extension] Deactivating...');

  // Disable menus
  // Clear caches
  // Suspend active processes

  console.log('[Cosmetics Partner Extension] Deactivated successfully');
}

export default deactivate;
