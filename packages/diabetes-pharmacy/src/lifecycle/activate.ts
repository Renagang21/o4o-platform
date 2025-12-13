/**
 * diabetes-pharmacy Activate Lifecycle
 *
 * 앱 활성화 시 호출
 *
 * @package @o4o/diabetes-pharmacy
 */

import type { AppLifecycleContext } from '@o4o/types';
import { diabetesPharmacyExtension } from '../extension.js';

export interface ActivateResult {
  success: boolean;
  message: string;
  errors?: string[];
}

/**
 * Activate Handler
 *
 * 1. 약국 역할 검증
 * 2. Extension 등록
 * 3. 이벤트 구독 설정
 */
export async function activate(context: AppLifecycleContext): Promise<ActivateResult> {
  console.log('[diabetes-pharmacy] Activating...');

  try {
    // 1. Extension 활성화
    await diabetesPharmacyExtension.onActivate({
      pharmacyId: context.appId || 'default',
      isActive: true,
    });

    // 2. diabetes-core 이벤트 구독
    await subscribeToEvents(context);

    // 3. 서비스 초기화
    await initializeServices(context);

    console.log('[diabetes-pharmacy] Activation completed successfully');
    return {
      success: true,
      message: 'diabetes-pharmacy 활성화 완료',
    };
  } catch (error) {
    console.error('[diabetes-pharmacy] Activation failed:', error);
    return {
      success: false,
      message: '활성화 중 오류 발생',
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * diabetes-core 이벤트 구독
 */
async function subscribeToEvents(context: AppLifecycleContext): Promise<void> {
  console.log('[diabetes-pharmacy] Subscribing to diabetes-core events...');

  // 구독할 이벤트:
  // - diabetes-core.pattern.detected
  // - diabetes-core.report.generated
  // - diabetes-core.coaching.session.created

  // Phase 2: EventEmitter 연동 시 구현
}

/**
 * 서비스 초기화
 */
async function initializeServices(context: AppLifecycleContext): Promise<void> {
  console.log('[diabetes-pharmacy] Initializing services...');
  // Phase 2: 서비스 인스턴스 생성
}

export default activate;
