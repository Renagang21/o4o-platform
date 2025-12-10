/**
 * Cosmetics Seller Extension - Deactivate Hook
 *
 * 앱 비활성화 시 실행되는 훅
 */

export interface DeactivateContext {
  appId: string;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { appId } = context;

  console.log(`[${appId}] Deactivating cosmetics-seller-extension...`);

  // Clean up any active connections, timers, or subscriptions
  // For this extension, no special cleanup is needed

  console.log(`[${appId}] Deactivation completed.`);
}

export default deactivate;
