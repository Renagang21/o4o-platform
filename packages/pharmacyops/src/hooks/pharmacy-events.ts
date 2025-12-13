/**
 * PharmacyOps → Partner-Core Event Bridge
 *
 * 약국에서 발생하는 이벤트를 Partner-Core로 전달합니다.
 *
 * IMPORTANT: PHARMACEUTICAL 제품은 파트너 프로그램에서 제외됩니다.
 * 오직 COSMETICS, HEALTH, GENERAL 제품만 파트너 이벤트를 발생시킵니다.
 *
 * @package @o4o/pharmacyops
 */

import { EventEmitter } from 'events';

// 파트너 프로그램 허용 제품 타입
export const PARTNER_ALLOWED_PRODUCT_TYPES = [
  'cosmetics',
  'health',
  'general',
] as const;

// 파트너 프로그램 제외 제품 타입
export const PARTNER_EXCLUDED_PRODUCT_TYPES = ['pharmaceutical'] as const;

export type PartnerAllowedProductType =
  (typeof PARTNER_ALLOWED_PRODUCT_TYPES)[number];
export type PartnerExcludedProductType =
  (typeof PARTNER_EXCLUDED_PRODUCT_TYPES)[number];
export type ProductType = PartnerAllowedProductType | PartnerExcludedProductType;

/**
 * 약국 이벤트 페이로드 기본 타입
 */
export interface PharmacyEventBase {
  pharmacyId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 제품 조회 이벤트
 */
export interface ProductViewedEvent extends PharmacyEventBase {
  type: 'product.viewed';
  productId: string;
  productType: ProductType;
  productName?: string;
  sessionId?: string;
  referrer?: string;
}

/**
 * 제품 클릭 이벤트
 */
export interface ProductClickedEvent extends PharmacyEventBase {
  type: 'product.clicked';
  productId: string;
  productType: ProductType;
  productName?: string;
  offerId?: string;
  supplierName?: string;
  sessionId?: string;
}

/**
 * 주문 생성 이벤트
 */
export interface OrderCreatedEvent extends PharmacyEventBase {
  type: 'order.created';
  orderId: string;
  orderNumber: string;
  productId: string;
  productType: ProductType;
  productName?: string;
  offerId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  sessionId?: string;
}

/**
 * 주문 완료 이벤트
 */
export interface OrderCompletedEvent extends PharmacyEventBase {
  type: 'order.completed';
  orderId: string;
  orderNumber: string;
  productId: string;
  productType: ProductType;
  totalAmount: number;
  deliveredAt: Date;
}

/**
 * 주문 취소 이벤트
 */
export interface OrderCancelledEvent extends PharmacyEventBase {
  type: 'order.cancelled';
  orderId: string;
  orderNumber: string;
  productType: ProductType;
  reason?: string;
  cancelledAt: Date;
}

export type PharmacyEvent =
  | ProductViewedEvent
  | ProductClickedEvent
  | OrderCreatedEvent
  | OrderCompletedEvent
  | OrderCancelledEvent;

export type PartnerEligibleEvent = PharmacyEvent & {
  productType: PartnerAllowedProductType;
};

/**
 * 제품 타입이 파트너 프로그램에 참여 가능한지 확인
 */
export function isPartnerEligibleProductType(
  productType: string
): productType is PartnerAllowedProductType {
  return PARTNER_ALLOWED_PRODUCT_TYPES.includes(
    productType as PartnerAllowedProductType
  );
}

/**
 * 제품 타입이 파트너 프로그램에서 제외되는지 확인
 */
export function isPartnerExcludedProductType(
  productType: string
): productType is PartnerExcludedProductType {
  return PARTNER_EXCLUDED_PRODUCT_TYPES.includes(
    productType as PartnerExcludedProductType
  );
}

/**
 * Pharmacy Event Emitter
 *
 * 약국에서 발생하는 이벤트를 관리하고 Partner-Core로 전달합니다.
 */
class PharmacyEventEmitter extends EventEmitter {
  private static instance: PharmacyEventEmitter;
  private partnerBridgeEnabled = false;
  private eventQueue: PartnerEligibleEvent[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  static getInstance(): PharmacyEventEmitter {
    if (!PharmacyEventEmitter.instance) {
      PharmacyEventEmitter.instance = new PharmacyEventEmitter();
    }
    return PharmacyEventEmitter.instance;
  }

  /**
   * Partner-Core 브리지 활성화
   */
  enablePartnerBridge(): void {
    this.partnerBridgeEnabled = true;
    this.startEventProcessing();
    console.log('[PharmacyEvents] Partner bridge enabled');
  }

  /**
   * Partner-Core 브리지 비활성화
   */
  disablePartnerBridge(): void {
    this.partnerBridgeEnabled = false;
    this.stopEventProcessing();
    console.log('[PharmacyEvents] Partner bridge disabled');
  }

  /**
   * 이벤트 큐 처리 시작
   */
  private startEventProcessing(): void {
    if (this.processingInterval) return;

    // 1초마다 큐 처리 (배치 처리로 성능 최적화)
    this.processingInterval = setInterval(() => {
      this.processEventQueue();
    }, 1000);
  }

  /**
   * 이벤트 큐 처리 중지
   */
  private stopEventProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * 이벤트 큐에서 Partner-Core로 이벤트 전달
   */
  private processEventQueue(): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // Partner-Core로 이벤트 전달
    for (const event of events) {
      this.emit('partner:event', event);
    }
  }

  /**
   * 이벤트 발행 (내부용)
   *
   * PHARMACEUTICAL 제품은 파트너 이벤트에서 자동 제외됩니다.
   */
  emitPharmacyEvent(event: PharmacyEvent): void {
    // 1. 모든 이벤트는 로컬로 발행
    this.emit('pharmacy:' + event.type, event);
    this.emit('pharmacy:all', event);

    // 2. PHARMACEUTICAL 제품은 파트너 이벤트에서 제외
    if (isPartnerExcludedProductType(event.productType)) {
      console.log(
        `[PharmacyEvents] Skipping partner event for pharmaceutical product: ${event.type}`
      );
      return;
    }

    // 3. 파트너 허용 제품만 Partner-Core로 전달
    if (
      this.partnerBridgeEnabled &&
      isPartnerEligibleProductType(event.productType)
    ) {
      this.eventQueue.push(event as PartnerEligibleEvent);
    }
  }

  /**
   * 큐 크기 조회
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * 큐 비우기 (테스트용)
   */
  clearQueue(): void {
    this.eventQueue = [];
  }
}

// 싱글톤 인스턴스
export const pharmacyEvents = PharmacyEventEmitter.getInstance();

// =====================================================
// 이벤트 발행 헬퍼 함수
// =====================================================

/**
 * 제품 조회 이벤트 발행
 */
export function emitProductViewed(params: {
  pharmacyId: string;
  productId: string;
  productType: ProductType;
  productName?: string;
  sessionId?: string;
  referrer?: string;
  metadata?: Record<string, any>;
}): void {
  pharmacyEvents.emitPharmacyEvent({
    type: 'product.viewed',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * 제품 클릭 이벤트 발행
 */
export function emitProductClicked(params: {
  pharmacyId: string;
  productId: string;
  productType: ProductType;
  productName?: string;
  offerId?: string;
  supplierName?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}): void {
  pharmacyEvents.emitPharmacyEvent({
    type: 'product.clicked',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * 주문 생성 이벤트 발행
 */
export function emitOrderCreated(params: {
  pharmacyId: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productType: ProductType;
  productName?: string;
  offerId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}): void {
  pharmacyEvents.emitPharmacyEvent({
    type: 'order.created',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * 주문 완료 이벤트 발행
 */
export function emitOrderCompleted(params: {
  pharmacyId: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productType: ProductType;
  totalAmount: number;
  deliveredAt: Date;
  metadata?: Record<string, any>;
}): void {
  pharmacyEvents.emitPharmacyEvent({
    type: 'order.completed',
    timestamp: new Date(),
    ...params,
  });
}

/**
 * 주문 취소 이벤트 발행
 */
export function emitOrderCancelled(params: {
  pharmacyId: string;
  orderId: string;
  orderNumber: string;
  productType: ProductType;
  reason?: string;
  cancelledAt: Date;
  metadata?: Record<string, any>;
}): void {
  pharmacyEvents.emitPharmacyEvent({
    type: 'order.cancelled',
    timestamp: new Date(),
    ...params,
  });
}

// =====================================================
// Partner-Core 리스너 등록 헬퍼
// =====================================================

export type PartnerEventHandler = (event: PartnerEligibleEvent) => void;

/**
 * Partner-Core 이벤트 리스너 등록
 *
 * Partner-Core에서 이 함수를 호출하여 약국 이벤트를 수신합니다.
 */
export function onPartnerEvent(handler: PartnerEventHandler): () => void {
  pharmacyEvents.on('partner:event', handler);
  return () => pharmacyEvents.off('partner:event', handler);
}

/**
 * 특정 이벤트 타입 리스너 등록
 */
export function onPharmacyEvent<T extends PharmacyEvent['type']>(
  eventType: T,
  handler: (event: Extract<PharmacyEvent, { type: T }>) => void
): () => void {
  const eventName = 'pharmacy:' + eventType;
  pharmacyEvents.on(eventName, handler);
  return () => pharmacyEvents.off(eventName, handler);
}

/**
 * 모든 약국 이벤트 리스너 등록
 */
export function onAllPharmacyEvents(
  handler: (event: PharmacyEvent) => void
): () => void {
  pharmacyEvents.on('pharmacy:all', handler);
  return () => pharmacyEvents.off('pharmacy:all', handler);
}
