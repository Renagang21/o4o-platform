/**
 * yaksa-accounting Deactivate Lifecycle
 *
 * - 메뉴 비활성화
 * - 리소스 정리
 */

export interface DeactivateContext {
  appRegistry?: {
    unregister: (appId: string) => void;
  };
  menuRegistry?: {
    unregister: (path: string) => void;
  };
}

export async function deactivate(context?: DeactivateContext): Promise<void> {
  console.log('[yaksa-accounting] Deactivating...');

  // AppRegistry 해제
  if (context?.appRegistry) {
    context.appRegistry.unregister('yaksa-accounting');
    console.log('[yaksa-accounting] Unregistered from AppRegistry');
  }

  // Admin 메뉴 해제
  if (context?.menuRegistry) {
    context.menuRegistry.unregister('/admin/yaksa/accounting');
    console.log('[yaksa-accounting] Admin menu unregistered');
  }

  console.log('[yaksa-accounting] Deactivation completed');
}

export default deactivate;
