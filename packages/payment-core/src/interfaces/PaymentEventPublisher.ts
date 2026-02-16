/**
 * Payment Event Publisher Interface
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * Core가 정의하는 이벤트 발행 계약.
 * 서비스(api-server)가 구현하여 주입한다.
 *
 * Core는 이 인터페이스를 통해 이벤트를 발행하지만,
 * 발행 메커니즘(EventEmitter, DB 저장 등)은 구현체 책임.
 */

import type { PaymentEvent } from '../types/PaymentEvents.js';

/**
 * 결제 이벤트 발행자 인터페이스
 *
 * 서비스 레벨에서 구현:
 * - EventEmitter2 기반 발행
 * - PaymentEventLog DB 저장
 * - 외부 메시지 큐 전달 등
 */
export interface PaymentEventPublisher {
  /**
   * 이벤트 발행
   *
   * @param event - 발행할 결제 이벤트
   */
  publish(event: PaymentEvent): Promise<void>;
}
