/**
 * Cosmetics Partner Extension Deactivate Hook
 *
 * 비활성화 시 실행되는 작업
 */

export interface DeactivateContext {
  appId: string;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { appId } = context;
  console.log(`[${appId}] Deactivating cosmetics-partner-extension...`);

  // 비활성화 시 수행할 작업
  // - Admin 메뉴 제거
  // - API 라우트 비활성화
  // - 이벤트 리스너 제거

  console.log(`[${appId}] cosmetics-partner-extension deactivated successfully.`);
}

export default deactivate;
