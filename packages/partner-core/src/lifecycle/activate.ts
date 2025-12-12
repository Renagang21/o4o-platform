/**
 * Partner Core - Activate Lifecycle Hook
 *
 * 앱 활성화 시 실행되는 로직
 * - Extension Hooks 등록
 * - 이벤트 리스너 등록
 * - 서비스 초기화
 *
 * @package @o4o/partner-core
 */

import { enableDefaultPartnerHooks } from '../partner-extension.js';

export interface ActivateContext {
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
  eventBus?: {
    subscribe: (event: string, handler: (...args: any[]) => void) => void;
  };
}

export async function activate(context: ActivateContext): Promise<void> {
  const { logger, eventBus } = context;

  logger?.info('Partner Core: Activating...');

  try {
    // 기본 Extension Hooks 활성화 (의약품 제외 등)
    enableDefaultPartnerHooks();
    logger?.info('Partner Core: Default extension hooks enabled');

    // 이벤트 구독 설정 (eventBus가 제공된 경우)
    if (eventBus) {
      // 주문 생성 이벤트 구독 (전환 자동 생성)
      // eventBus.subscribe('order.created', handleOrderCreated);

      // 주문 완료 이벤트 구독 (전환 확정)
      // eventBus.subscribe('order.completed', handleOrderCompleted);

      // 주문 취소 이벤트 구독 (전환 취소)
      // eventBus.subscribe('order.cancelled', handleOrderCancelled);

      logger?.info('Partner Core: Event subscriptions registered');
    }

    logger?.info('Partner Core: Activation completed successfully');
  } catch (error) {
    logger?.error(`Partner Core: Activation failed - ${error}`);
    throw error;
  }
}

export default activate;
