/**
 * Learning App Deactivate Hook
 *
 * Called when the app is deactivated
 */
export async function deactivate(): Promise<void> {
  console.log('[Learning App] Deactivating...');
  console.log('[Learning App] Flow management tool deactivated');
}

export default deactivate;
