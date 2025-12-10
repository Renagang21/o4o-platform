import { DeactivateContext } from '../types/context.js';

/**
 * Deactivate Hook
 *
 * reporting-yaksa 앱 비활성화 시 실행되는 훅
 *
 * 데이터는 유지하고 기능만 비활성화
 */
export async function deactivate(context: DeactivateContext): Promise<void> {
  const { reason } = context;

  console.log('[reporting-yaksa] Deactivating...');

  if (reason) {
    console.log(`[reporting-yaksa] Deactivation reason: ${reason}`);
  }

  // 비활성화 시 처리할 작업
  // - 메뉴 숨김 (AppStore에서 처리)
  // - 예약된 작업 취소
  // - 알림 비활성화

  console.log('[reporting-yaksa] Deactivation completed');
  console.log('[reporting-yaksa] Data is preserved. Reactivate to restore functionality.');
}

export default deactivate;
