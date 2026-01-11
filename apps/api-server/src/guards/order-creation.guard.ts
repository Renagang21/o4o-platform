/**
 * Order Creation Guard
 *
 * Phase 5-D: O4O 표준 주문 구조 강제 고정
 *
 * ## 목적
 * "어떤 서비스도 E-commerce Core를 우회해 주문을 만들 수 없게 한다."
 *
 * ## 3중 방어 체계
 * 1. 런타임 차단 (이 파일)
 * 2. OrderType 강제 검증
 * 3. DB 레벨 경계 (스키마 정책)
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @see CLAUDE.md §21 - Order Guardrails (Phase 5-D)
 * @see docs/_platform/E-COMMERCE-ORDER-CONTRACT.md
 *
 * @since Phase 5-D (2026-01-11)
 */

import { OrderType } from '../entities/checkout/CheckoutOrder.entity.js';
import logger from '../utils/logger.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * 허용된 OrderType 목록
 *
 * 이 목록에 없는 OrderType은 주문 생성이 거부됩니다.
 * 새로운 서비스 추가 시 여기에 등록해야 합니다.
 */
export const ALLOWED_ORDER_TYPES: readonly OrderType[] = [
  OrderType.GENERIC,
  OrderType.DROPSHIPPING,
  OrderType.COSMETICS,
  OrderType.TOURISM,
  OrderType.GLYCOPHARM, // Read-only (기존 주문 조회용)
] as const;

/**
 * 주문 생성이 금지된 OrderType
 *
 * 이 목록의 OrderType은 주문 생성이 완전 차단됩니다.
 */
export const BLOCKED_ORDER_TYPES: readonly OrderType[] = [
  OrderType.GLYCOPHARM, // Phase 5-A에서 차단됨
] as const;

/**
 * 금지된 테이블 패턴
 *
 * 이 패턴과 일치하는 테이블명은 생성이 금지됩니다.
 */
export const FORBIDDEN_TABLE_PATTERNS: readonly string[] = [
  'cosmetics_orders',
  'tourism_orders',
  'glycopharm_orders',
  'yaksa_orders',
  'neture_orders',
  // 일반 패턴
  '*_orders',      // 서비스별 주문 테이블
  '*_payments',    // 서비스별 결제 테이블
] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * 주문 생성 컨텍스트
 *
 * 주문이 어디서 생성되었는지 추적하기 위한 컨텍스트입니다.
 */
export interface OrderCreationContext {
  /** E-commerce Core checkoutService를 통한 생성 여부 */
  viaCheckoutService: boolean;
  /** 호출자 서비스 식별자 */
  callerService: string;
  /** 요청 ID (추적용) */
  requestId?: string;
  /** 타임스탬프 */
  timestamp: Date;
}

/**
 * Guardrail 검증 결과
 */
export interface GuardrailValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * 주문 생성 차단 에러
 */
export class OrderCreationBlockedError extends Error {
  public readonly code: string;
  public readonly context?: OrderCreationContext;

  constructor(message: string, code: string, context?: OrderCreationContext) {
    super(message);
    this.name = 'OrderCreationBlockedError';
    this.code = code;
    this.context = context;

    // 로깅
    logger.warn('[OrderGuard] Order creation blocked:', {
      code,
      message,
      callerService: context?.callerService,
      requestId: context?.requestId,
    });
  }
}

/**
 * OrderType 검증 에러
 */
export class InvalidOrderTypeError extends Error {
  public readonly code: string;
  public readonly providedType: string | undefined;

  constructor(providedType: string | undefined) {
    super(`Invalid or blocked OrderType: ${providedType || 'undefined'}`);
    this.name = 'InvalidOrderTypeError';
    this.code = 'INVALID_ORDER_TYPE';
    this.providedType = providedType;

    logger.warn('[OrderGuard] Invalid OrderType:', { providedType });
  }
}

// ============================================================================
// Guard Functions
// ============================================================================

/**
 * OrderType 유효성 검증
 *
 * @param orderType 검증할 OrderType
 * @returns 검증 결과
 *
 * @example
 * const result = validateOrderType(OrderType.COSMETICS);
 * if (!result.valid) {
 *   throw new InvalidOrderTypeError(orderType);
 * }
 */
export function validateOrderType(orderType: OrderType | undefined): GuardrailValidationResult {
  // Phase 5-D: OrderType 필수화 (Hard Fail)
  if (orderType === undefined || orderType === null) {
    return {
      valid: false,
      error: 'OrderType is required. All orders must specify a service type.',
      code: 'ORDER_TYPE_REQUIRED',
    };
  }

  // 유효한 enum 값인지 확인
  if (!Object.values(OrderType).includes(orderType)) {
    return {
      valid: false,
      error: `Invalid OrderType: ${orderType}. Must be one of: ${Object.values(OrderType).join(', ')}`,
      code: 'ORDER_TYPE_INVALID',
    };
  }

  // 차단된 OrderType인지 확인
  if (BLOCKED_ORDER_TYPES.includes(orderType)) {
    return {
      valid: false,
      error: `OrderType ${orderType} is blocked for new order creation. Use E-commerce Core directly or check service status.`,
      code: 'ORDER_TYPE_BLOCKED',
    };
  }

  return { valid: true };
}

/**
 * 주문 생성 컨텍스트 검증
 *
 * @param context 주문 생성 컨텍스트
 * @returns 검증 결과
 */
export function validateOrderCreationContext(
  context: OrderCreationContext | undefined
): GuardrailValidationResult {
  if (!context) {
    return {
      valid: false,
      error: 'Order creation context is required.',
      code: 'CONTEXT_REQUIRED',
    };
  }

  if (!context.viaCheckoutService) {
    return {
      valid: false,
      error: 'Direct order creation is forbidden. All orders must be created via E-commerce Core (checkoutService).',
      code: 'DIRECT_ORDER_BLOCKED',
    };
  }

  return { valid: true };
}

/**
 * 테이블명이 금지 패턴과 일치하는지 확인
 *
 * @param tableName 확인할 테이블명
 * @returns 금지된 테이블이면 true
 */
export function isForbiddenTableName(tableName: string): boolean {
  const normalizedName = tableName.toLowerCase();

  // 정확히 일치하는 금지 테이블
  const exactForbidden = FORBIDDEN_TABLE_PATTERNS.filter(p => !p.includes('*'));
  if (exactForbidden.some(p => normalizedName === p.toLowerCase())) {
    return true;
  }

  // 패턴 일치 확인 (*_orders, *_payments)
  if (normalizedName.endsWith('_orders') && normalizedName !== 'checkout_orders') {
    return true;
  }
  if (normalizedName.endsWith('_payments') && normalizedName !== 'checkout_payments') {
    return true;
  }

  return false;
}

/**
 * 주문 생성 전 종합 검증
 *
 * Phase 5-D Guardrail의 핵심 함수입니다.
 * 모든 주문 생성 전에 이 함수를 호출해야 합니다.
 *
 * @param orderType 주문 유형
 * @param context 생성 컨텍스트 (선택)
 * @throws OrderCreationBlockedError 검증 실패 시
 *
 * @example
 * // checkoutService.createOrder() 내부에서 호출
 * assertOrderCreationAllowed(OrderType.COSMETICS, {
 *   viaCheckoutService: true,
 *   callerService: 'cosmetics',
 *   timestamp: new Date(),
 * });
 */
export function assertOrderCreationAllowed(
  orderType: OrderType | undefined,
  context?: Partial<OrderCreationContext>
): void {
  // 1. OrderType 검증
  const typeValidation = validateOrderType(orderType);
  if (!typeValidation.valid) {
    throw new InvalidOrderTypeError(orderType);
  }

  // 2. 컨텍스트가 제공된 경우 검증
  if (context) {
    const fullContext: OrderCreationContext = {
      viaCheckoutService: context.viaCheckoutService ?? false,
      callerService: context.callerService ?? 'unknown',
      requestId: context.requestId,
      timestamp: context.timestamp ?? new Date(),
    };

    // 내부 호출 (checkoutService)인 경우 컨텍스트 검증 스킵
    if (fullContext.callerService !== 'checkoutService') {
      const contextValidation = validateOrderCreationContext(fullContext);
      if (!contextValidation.valid) {
        throw new OrderCreationBlockedError(
          contextValidation.error!,
          contextValidation.code!,
          fullContext
        );
      }
    }
  }

  logger.debug('[OrderGuard] Order creation allowed:', { orderType });
}

// ============================================================================
// Singleton Context Manager
// ============================================================================

/**
 * 현재 요청의 주문 생성 컨텍스트를 관리하는 싱글톤
 *
 * 실제 프로덕션에서는 AsyncLocalStorage를 사용해야 합니다.
 */
class OrderCreationContextManager {
  private static instance: OrderCreationContextManager;
  private currentContext: OrderCreationContext | null = null;

  private constructor() {}

  static getInstance(): OrderCreationContextManager {
    if (!OrderCreationContextManager.instance) {
      OrderCreationContextManager.instance = new OrderCreationContextManager();
    }
    return OrderCreationContextManager.instance;
  }

  /**
   * 컨텍스트 설정 (checkoutService 진입 시)
   */
  setContext(context: OrderCreationContext): void {
    this.currentContext = context;
  }

  /**
   * 컨텍스트 조회
   */
  getContext(): OrderCreationContext | null {
    return this.currentContext;
  }

  /**
   * 컨텍스트 초기화 (요청 완료 시)
   */
  clearContext(): void {
    this.currentContext = null;
  }

  /**
   * checkoutService를 통한 호출인지 확인
   */
  isViaCheckoutService(): boolean {
    return this.currentContext?.viaCheckoutService ?? false;
  }
}

export const orderCreationContextManager = OrderCreationContextManager.getInstance();

// ============================================================================
// Export Summary
// ============================================================================

export default {
  validateOrderType,
  validateOrderCreationContext,
  assertOrderCreationAllowed,
  isForbiddenTableName,
  orderCreationContextManager,
  ALLOWED_ORDER_TYPES,
  BLOCKED_ORDER_TYPES,
  FORBIDDEN_TABLE_PATTERNS,
};
