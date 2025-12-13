/**
 * Partner Core - Deactivate Lifecycle Hook
 *
 * 앱 비활성화 시 실행되는 로직
 * - Extension Hooks 해제
 * - 이벤트 리스너 해제
 * - 리소스 정리
 *
 * @package @o4o/partner-core
 */

import { disableDefaultPartnerHooks, clearAllPartnerExtensions } from '../partner-extension.js';

export interface DeactivateContext {
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
  eventBus?: {
    unsubscribe: (event: string, handler: (...args: any[]) => void) => void;
  };
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { logger, eventBus } = context;

  logger?.info('Partner Core: Deactivating...');

  try {
    // 기본 Extension Hooks 비활성화
    disableDefaultPartnerHooks();
    logger?.info('Partner Core: Default extension hooks disabled');

    // 이벤트 구독 해제 (eventBus가 제공된 경우)
    if (eventBus) {
      // eventBus.unsubscribe('order.created', handleOrderCreated);
      // eventBus.unsubscribe('order.completed', handleOrderCompleted);
      // eventBus.unsubscribe('order.cancelled', handleOrderCancelled);

      logger?.info('Partner Core: Event subscriptions unregistered');
    }

    logger?.info('Partner Core: Deactivation completed successfully');
  } catch (error) {
    logger?.error(`Partner Core: Deactivation failed - ${error}`);
    throw error;
  }
}

export default deactivate;
