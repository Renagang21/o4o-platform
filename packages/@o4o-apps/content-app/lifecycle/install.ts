/**
 * Content App Install Hook
 *
 * Called when the app is first installed
 */
export async function install(): Promise<void> {
  console.log('[Content App] Installing...');
  // Content App uses cms-core tables, no custom tables needed
  console.log('[Content App] Installation complete');
}

export default install;
