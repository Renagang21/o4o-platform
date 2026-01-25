/**
 * Learning App Uninstall Hook
 *
 * Called when the app is uninstalled
 */
export async function uninstall(): Promise<void> {
  console.log('[Learning App] Uninstalling...');
  // 자체 테이블 없음, 정리할 것 없음
  console.log('[Learning App] Uninstallation complete');
}

export default uninstall;
