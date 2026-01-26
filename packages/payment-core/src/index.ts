/**
 * @o4o/payment-core
 *
 * Payment Core v0.1 - O4O Platform Payment Infrastructure
 *
 * WO-O4O-PAYMENT-CORE-V0.1
 *
 * 핵심 책임:
 * - PG 통합 (Toss Payments)
 * - 결제 확인 (payment confirmation)
 * - payment.completed 이벤트 발행
 *
 * 명시적 제외 (Out of Scope):
 * - 정산/분배 (Settlement)
 * - 회계 연동 (Accounting)
 * - 환불 처리 (v0.2에서 추가)
 * - Event Store / CQRS
 *
 * @packageDocumentation
 */

// Types
export * from './types/index.js';

// Entities
export * from './entities/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Version
export const PAYMENT_CORE_VERSION = '0.1.0';
