/**
 * Dropshipping Core Events
 *
 * Core에서 방출하는 이벤트 정의
 * Extension Apps는 이 이벤트를 구독하여 동작합니다.
 */

import { EventEmitter2 } from '@nestjs/event-emitter';

export enum DropshippingCoreEvent {
  // Product Master 이벤트
  PRODUCT_MASTER_CREATED = 'dropshipping.product.master.created',
  PRODUCT_MASTER_UPDATED = 'dropshipping.product.master.updated',

  // Offer 이벤트 (before/after 패턴)
  BEFORE_OFFER_CREATE = 'dropshipping.offer.before-create',
  OFFER_CREATED = 'dropshipping.offer.created',
  AFTER_OFFER_CREATE = 'dropshipping.offer.after-create',
  PRODUCT_OFFER_UPDATED = 'dropshipping.offer.updated',

  // Listing 이벤트 (before/after 패턴)
  BEFORE_LISTING_CREATE = 'dropshipping.listing.before-create',
  LISTING_CREATED = 'dropshipping.listing.created',
  AFTER_LISTING_CREATE = 'dropshipping.listing.after-create',

  // Order 이벤트 (before/after 패턴)
  BEFORE_ORDER_CREATE = 'dropshipping.order.before-create',
  ORDER_CREATED = 'dropshipping.order.created',
  AFTER_ORDER_CREATE = 'dropshipping.order.after-create',
  ORDER_RELAY_DISPATCHED = 'dropshipping.order.relay.dispatched',
  ORDER_RELAY_FULFILLED = 'dropshipping.order.relay.fulfilled',

  // Settlement 이벤트 (before/after 패턴)
  BEFORE_SETTLEMENT_CREATE = 'dropshipping.settlement.before-create',
  SETTLEMENT_CREATED = 'dropshipping.settlement.created',
  AFTER_SETTLEMENT_CREATE = 'dropshipping.settlement.after-create',
  SETTLEMENT_CLOSED = 'dropshipping.settlement.closed',

  // Commission 이벤트
  COMMISSION_APPLIED = 'dropshipping.commission.applied',
}

/**
 * @deprecated Use DropshippingCoreEvent instead
 */
export const DropsippingCoreEvent = DropshippingCoreEvent;

/**
 * 이벤트 페이로드 타입 정의
 */

// ============================================
// Product Master Payloads
// ============================================

export interface ProductMasterCreatedPayload {
  productMasterId: string;
  name: string;
  productType: string;
  createdAt: Date;
}

export interface ProductMasterUpdatedPayload {
  productMasterId: string;
  changes: Record<string, any>;
  updatedAt: Date;
}

// ============================================
// Offer Payloads (before/after 패턴)
// ============================================

export interface BeforeOfferCreatePayload {
  productMasterId: string;
  supplierId: string;
  productType: string;
  offerData: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface OfferCreatedPayload {
  offerId: string;
  productMasterId: string;
  supplierId: string;
  productType: string;
  createdAt: Date;
}

export interface ProductOfferUpdatedPayload {
  offerId: string;
  supplierId: string;
  productMasterId: string;
  changes: Record<string, any>;
  updatedAt: Date;
}

// ============================================
// Listing Payloads (before/after 패턴)
// ============================================

export interface BeforeListingCreatePayload {
  offerId: string;
  sellerId: string;
  productType: string;
  listingData: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ListingCreatedPayload {
  listingId: string;
  sellerId: string;
  offerId: string;
  channel: string;
  productType: string;
  createdAt: Date;
}

// ============================================
// Order Payloads (before/after 패턴)
// ============================================

export interface BeforeOrderCreatePayload {
  listingId: string;
  sellerId: string;
  productType: string;
  orderData: Record<string, any>;
  buyerInfo?: {
    userId?: string;
    userType?: string;
    organizationId?: string;
    organizationType?: string;
  };
  metadata?: Record<string, any>;
}

export interface OrderCreatedPayload {
  orderRelayId: string;
  listingId: string;
  sellerId: string;
  productType: string;
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

// ============================================
// Settlement Payloads (before/after 패턴)
// ============================================

export interface BeforeSettlementCreatePayload {
  settlementType: 'seller' | 'supplier' | 'platform-extension';
  targetId: string; // sellerId, supplierId, or partnerId
  periodStart: Date;
  periodEnd: Date;
  metadata?: Record<string, any>;
}

export interface SettlementCreatedPayload {
  settlementBatchId: string;
  settlementType: 'seller' | 'supplier' | 'platform-extension';
  targetId: string;
  totalAmount: number;
  createdAt: Date;
}

export interface SettlementClosedPayload {
  settlementBatchId: string;
  periodStart: Date;
  periodEnd: Date;
  totalSettlementAmount: number;
  processedAt: Date;
}

// ============================================
// Commission Payloads
// ============================================

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
export class DropshippingCoreEventEmitter {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ===== Product Master Events =====

  emitProductMasterCreated(payload: ProductMasterCreatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.PRODUCT_MASTER_CREATED, payload);
  }

  emitProductMasterUpdated(payload: ProductMasterUpdatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.PRODUCT_MASTER_UPDATED, payload);
  }

  // ===== Offer Events (before/after) =====

  emitBeforeOfferCreate(payload: BeforeOfferCreatePayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.BEFORE_OFFER_CREATE, payload);
  }

  emitOfferCreated(payload: OfferCreatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.OFFER_CREATED, payload);
  }

  emitAfterOfferCreate(payload: OfferCreatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.AFTER_OFFER_CREATE, payload);
  }

  emitProductOfferUpdated(payload: ProductOfferUpdatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.PRODUCT_OFFER_UPDATED, payload);
  }

  // ===== Listing Events (before/after) =====

  emitBeforeListingCreate(payload: BeforeListingCreatePayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.BEFORE_LISTING_CREATE, payload);
  }

  emitListingCreated(payload: ListingCreatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.LISTING_CREATED, payload);
  }

  emitAfterListingCreate(payload: ListingCreatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.AFTER_LISTING_CREATE, payload);
  }

  // ===== Order Events (before/after) =====

  emitBeforeOrderCreate(payload: BeforeOrderCreatePayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.BEFORE_ORDER_CREATE, payload);
  }

  emitOrderCreated(payload: OrderCreatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.ORDER_CREATED, payload);
  }

  emitAfterOrderCreate(payload: OrderCreatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.AFTER_ORDER_CREATE, payload);
  }

  emitOrderRelayDispatched(payload: OrderRelayDispatchedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.ORDER_RELAY_DISPATCHED, payload);
  }

  emitOrderRelayFulfilled(payload: OrderRelayFulfilledPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.ORDER_RELAY_FULFILLED, payload);
  }

  // ===== Settlement Events (before/after) =====

  emitBeforeSettlementCreate(payload: BeforeSettlementCreatePayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.BEFORE_SETTLEMENT_CREATE, payload);
  }

  emitSettlementCreated(payload: SettlementCreatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.SETTLEMENT_CREATED, payload);
  }

  emitAfterSettlementCreate(payload: SettlementCreatedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.AFTER_SETTLEMENT_CREATE, payload);
  }

  emitSettlementClosed(payload: SettlementClosedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.SETTLEMENT_CLOSED, payload);
  }

  // ===== Commission Events =====

  emitCommissionApplied(payload: CommissionAppliedPayload): void {
    this.eventEmitter.emit(DropshippingCoreEvent.COMMISSION_APPLIED, payload);
  }
}

/**
 * @deprecated Use DropshippingCoreEventEmitter instead
 */
export const DropsippingCoreEventEmitter = DropshippingCoreEventEmitter;
