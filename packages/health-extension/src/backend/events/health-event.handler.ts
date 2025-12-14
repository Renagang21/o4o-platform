/**
 * Health Event Handler
 *
 * Health 제품 관련 이벤트 처리
 *
 * @package @o4o/health-extension
 */

import type { HealthMetadata } from '../../types.js';
import { isHealthProduct, isExpirationNear } from '../../types.js';

// ===== Event Types =====

export interface HealthOfferCreatedEvent {
  offerId: string;
  productId: string;
  sellerId: string;
  price: number;
  healthMetadata: {
    expirationDate: string;
    functionDescription: string;
    healthCategory: string;
  };
}

export interface HealthOrderCreatedEvent {
  orderId: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  totalAmount: number;
}

export interface HealthSettlementCreatedEvent {
  settlementId: string;
  orderId: string;
  sellerId: string;
  amount: number;
  commission: number;
  netAmount: number;
}

export interface ExpirationWarningEvent {
  productId: string;
  productName: string;
  expirationDate: string;
  daysRemaining: number;
  supplierId?: string;
  sellerId?: string;
}

// ===== Event Names =====

export const HEALTH_EVENTS = {
  OFFER_CREATED: 'health.offer.created',
  OFFER_UPDATED: 'health.offer.updated',
  OFFER_ACTIVATED: 'health.offer.activated',
  OFFER_DEACTIVATED: 'health.offer.deactivated',
  ORDER_CREATED: 'health.order.created',
  ORDER_UPDATED: 'health.order.updated',
  ORDER_COMPLETED: 'health.order.completed',
  SETTLEMENT_CREATED: 'health.settlement.created',
  SETTLEMENT_PROCESSED: 'health.settlement.processed',
  EXPIRATION_WARNING: 'health.expiration.warning',
} as const;

// ===== Event Handler Class =====

export class HealthEventHandler {
  private eventEmitter: any;

  constructor(eventEmitter?: any) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Handle health offer created event
   */
  async handleOfferCreated(event: HealthOfferCreatedEvent): Promise<void> {
    console.log(`[health-extension] Offer created: ${event.offerId}`);
    console.log(`[health-extension] Product: ${event.productId}, Seller: ${event.sellerId}`);

    // Check expiration warning
    if (event.healthMetadata.expirationDate) {
      const expDate = new Date(event.healthMetadata.expirationDate);
      const now = new Date();
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 90 && diffDays > 0) {
        console.log(`[health-extension] Warning: Product expiration in ${diffDays} days`);
      }
    }
  }

  /**
   * Handle health order created event
   */
  async handleOrderCreated(event: HealthOrderCreatedEvent): Promise<void> {
    console.log(`[health-extension] Order created: ${event.orderId}`);
    console.log(`[health-extension] Buyer: ${event.buyerId}, Amount: ${event.totalAmount}`);
  }

  /**
   * Handle health settlement created event
   */
  async handleSettlementCreated(event: HealthSettlementCreatedEvent): Promise<void> {
    console.log(`[health-extension] Settlement created: ${event.settlementId}`);
    console.log(`[health-extension] Seller: ${event.sellerId}, Net: ${event.netAmount}`);
  }

  /**
   * Handle expiration warning event
   */
  async handleExpirationWarning(event: ExpirationWarningEvent): Promise<void> {
    console.log(`[health-extension] Expiration Warning:`);
    console.log(`  Product: ${event.productName} (${event.productId})`);
    console.log(`  Expires: ${event.expirationDate} (${event.daysRemaining} days remaining)`);

    // TODO: Send notification to supplier/seller
    if (event.supplierId) {
      console.log(`  Supplier: ${event.supplierId} - notification pending`);
    }
    if (event.sellerId) {
      console.log(`  Seller: ${event.sellerId} - notification pending`);
    }
  }

  /**
   * Emit health event
   */
  emit(eventName: string, payload: any): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit(eventName, payload);
    }
    console.log(`[health-extension] Event emitted: ${eventName}`);
  }

  /**
   * Check products for expiration and emit warnings
   */
  async checkExpirations(
    products: Array<{ id: string; name: string; metadata: any; supplierId?: string }>,
    warningDays: number = 90,
  ): Promise<ExpirationWarningEvent[]> {
    const warnings: ExpirationWarningEvent[] = [];

    for (const product of products) {
      if (!isHealthProduct(product)) continue;

      const metadata = product.metadata as HealthMetadata;
      if (!metadata.expirationDate) continue;

      if (isExpirationNear(metadata.expirationDate, warningDays)) {
        const expDate = new Date(metadata.expirationDate);
        const now = new Date();
        const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const warning: ExpirationWarningEvent = {
          productId: product.id,
          productName: product.name,
          expirationDate: expDate.toISOString(),
          daysRemaining,
          supplierId: product.supplierId,
        };

        warnings.push(warning);
        await this.handleExpirationWarning(warning);
      }
    }

    return warnings;
  }
}

// ===== Singleton Export =====

let healthEventHandlerInstance: HealthEventHandler | null = null;

export function getHealthEventHandler(eventEmitter?: any): HealthEventHandler {
  if (!healthEventHandlerInstance) {
    healthEventHandlerInstance = new HealthEventHandler(eventEmitter);
  }
  return healthEventHandlerInstance;
}

export default HealthEventHandler;
