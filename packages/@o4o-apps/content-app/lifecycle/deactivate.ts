/**
 * Content App Deactivate Hook
 *
 * Called when the app is deactivated
 */
export async function deactivate(): Promise<void> {
  console.log('[Content App] Deactivating...');
  console.log('[Content App] Deactivation complete');
}

export default deactivate;
