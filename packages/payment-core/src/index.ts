/**
 * @o4o/payment-core
 *
 * Payment Core v0.2 — Platform-level payment infrastructure
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * Core 책임:
 * - PaymentStatus 상태 체계
 * - PaymentStateMachine 전이 규칙
 * - PaymentCoreService 결제 흐름 골격
 * - PaymentEventPublisher 이벤트 발행 계약
 *
 * Core가 정의하지 않는 것:
 * - ❌ PG Provider 구현 (서비스 레벨)
 * - ❌ DB 직접 접근 (서비스 레벨)
 * - ❌ 이벤트 발행 구현 (서비스 레벨)
 *
 * @packageDocumentation
 */

// Types
export * from './types/index.js';

// Interfaces
export * from './interfaces/index.js';

// Entities
export * from './entities/index.js';

// Services
export * from './services/index.js';

// Version
export const PAYMENT_CORE_VERSION = '0.2.0';
