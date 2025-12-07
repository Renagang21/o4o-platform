/**
 * Dropshipping Core Events
 *
 * Core에서 방출하는 이벤트 정의
 * Extension Apps는 이 이벤트를 구독하여 동작합니다.
 */

import { EventEmitter2 } from '@nestjs/event-emitter';

export enum DropsippingCoreEvent {
  // Product Master 이벤트
  PRODUCT_MASTER_UPDATED = 'product.master.updated',

  // Offer 이벤트
  PRODUCT_OFFER_UPDATED = 'product.offer.updated',

  // Listing 이벤트
  LISTING_CREATED = 'listing.created',

  // Order 이벤트
  ORDER_CREATED = 'order.created',
  ORDER_RELAY_DISPATCHED = 'order.relay.dispatched',
  ORDER_RELAY_FULFILLED = 'order.relay.fulfilled',

  // Settlement 이벤트
  SETTLEMENT_CLOSED = 'settlement.closed',

  // Commission 이벤트
  COMMISSION_APPLIED = 'commission.applied',
}

/**
 * 이벤트 페이로드 타입 정의
 */

export interface ProductMasterUpdatedPayload {
  productMasterId: string;
  changes: Record<string, any>;
  updatedAt: Date;
}

export interface ProductOfferUpdatedPayload {
  offerId: string;
  supplierId: string;
  productMasterId: string;
  changes: Record<string, any>;
  updatedAt: Date;
}

export interface ListingCreatedPayload {
  listingId: string;
  sellerId: string;
  offerId: string;
  channel: string;
  createdAt: Date;
}

export interface OrderCreatedPayload {
  orderRelayId: string;
  listingId: string;
  sellerId: string;
  totalPrice: number;
  createdAt: Date;
}

export interface OrderRelayDispatchedPayload {
  orderRelayId: string;
  listingId: string;
  sellerId: string;
  supplierId: string;
  relayedAt: Date;
}

export interface OrderRelayFulfilledPayload {
  orderRelayId: string;
  listingId: string;
  sellerId: string;
  supplierId: string;
  deliveredAt: Date;
}

export interface SettlementClosedPayload {
  settlementBatchId: string;
  periodStart: Date;
  periodEnd: Date;
  totalSettlementAmount: number;
  processedAt: Date;
}

export interface CommissionAppliedPayload {
  commissionTransactionId: string;
  orderRelayId: string;
  commissionAmount: number;
  appliedRate?: number;
  createdAt: Date;
}

/**
 * Event Emitter Helper
 *
 * Extension Apps가 이벤트를 구독할 때 사용할 수 있는 헬퍼 함수
 */
export class DropsippingCoreEventEmitter {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Product Master 업데이트 이벤트 발행
   */
  emitProductMasterUpdated(payload: ProductMasterUpdatedPayload): void {
    this.eventEmitter.emit(
      DropsippingCoreEvent.PRODUCT_MASTER_UPDATED,
      payload
    );
  }

  /**
   * Product Offer 업데이트 이벤트 발행
   */
  emitProductOfferUpdated(payload: ProductOfferUpdatedPayload): void {
    this.eventEmitter.emit(
      DropsippingCoreEvent.PRODUCT_OFFER_UPDATED,
      payload
    );
  }

  /**
   * Listing 생성 이벤트 발행
   */
  emitListingCreated(payload: ListingCreatedPayload): void {
    this.eventEmitter.emit(DropsippingCoreEvent.LISTING_CREATED, payload);
  }

  /**
   * Order 생성 이벤트 발행
   */
  emitOrderCreated(payload: OrderCreatedPayload): void {
    this.eventEmitter.emit(DropsippingCoreEvent.ORDER_CREATED, payload);
  }

  /**
   * Order Relay 발송 이벤트 발행
   */
  emitOrderRelayDispatched(payload: OrderRelayDispatchedPayload): void {
    this.eventEmitter.emit(
      DropsippingCoreEvent.ORDER_RELAY_DISPATCHED,
      payload
    );
  }

  /**
   * Order Relay 완료 이벤트 발행
   */
  emitOrderRelayFulfilled(payload: OrderRelayFulfilledPayload): void {
    this.eventEmitter.emit(
      DropsippingCoreEvent.ORDER_RELAY_FULFILLED,
      payload
    );
  }

  /**
   * Settlement 완료 이벤트 발행
   */
  emitSettlementClosed(payload: SettlementClosedPayload): void {
    this.eventEmitter.emit(DropsippingCoreEvent.SETTLEMENT_CLOSED, payload);
  }

  /**
   * Commission 적용 이벤트 발행
   */
  emitCommissionApplied(payload: CommissionAppliedPayload): void {
    this.eventEmitter.emit(DropsippingCoreEvent.COMMISSION_APPLIED, payload);
  }
}
