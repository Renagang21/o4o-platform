/**
 * diabetes-pharmacy Deactivate Lifecycle
 *
 * 앱 비활성화 시 호출
 *
 * @package @o4o/diabetes-pharmacy
 */

import type { AppLifecycleContext } from '@o4o/types';
import { diabetesPharmacyExtension } from '../extension.js';

export interface DeactivateResult {
  success: boolean;
  message: string;
  warnings?: string[];
  errors?: string[];
}

/**
 * Deactivate Handler
 *
 * 1. 진행 중인 Action 확인
 * 2. 이벤트 구독 해제
 * 3. Extension 비활성화
 */
export async function deactivate(context: AppLifecycleContext): Promise<DeactivateResult> {
  console.log('[diabetes-pharmacy] Deactivating...');

  const warnings: string[] = [];

  try {
    // 1. 진행 중인 Action 확인
    const pendingActions = await checkPendingActions(context);
    if (pendingActions > 0) {
      warnings.push(`진행 중인 Action이 ${pendingActions}개 있습니다.`);
    }

    // 2. 이벤트 구독 해제
    await unsubscribeFromEvents(context);

    // 3. Extension 비활성화
    await diabetesPharmacyExtension.onDeactivate({
      pharmacyId: context.appId || 'default',
      isActive: false,
    });

    // 4. 서비스 정리
    await disposeServices(context);

    console.log('[diabetes-pharmacy] Deactivation completed');
    return {
      success: true,
      message: 'diabetes-pharmacy 비활성화 완료',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('[diabetes-pharmacy] Deactivation failed:', error);
    return {
      success: false,
      message: '비활성화 중 오류 발생',
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * 진행 중인 Action 확인
 */
async function checkPendingActions(context: AppLifecycleContext): Promise<number> {
  console.log('[diabetes-pharmacy] Checking pending actions...');
  // Phase 2: Action 로그 조회 시 구현
  return 0;
}

/**
 * 이벤트 구독 해제
 */
async function unsubscribeFromEvents(context: AppLifecycleContext): Promise<void> {
  console.log('[diabetes-pharmacy] Unsubscribing from events...');
  // Phase 2: EventEmitter 연동 해제
}

/**
 * 서비스 정리
 */
async function disposeServices(context: AppLifecycleContext): Promise<void> {
  console.log('[diabetes-pharmacy] Disposing services...');
  // Phase 2: 서비스 인스턴스 정리
}

export default deactivate;
