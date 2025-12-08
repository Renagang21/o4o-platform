/**
 * SupplierOps Event Handlers
 *
 * Subscribes to dropshipping-core events
 */

import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SupplierOpsEventHandlers {
  /**
   * Handle order created event
   * Notify supplier of new order
   */
  @OnEvent('order.created')
  async handleOrderCreated(data: {
    orderId: string;
    supplierId: string;
    productName: string;
    quantity: number;
  }) {
    console.log(`[SupplierOps] New order ${data.orderId} for supplier ${data.supplierId}`);
    // In production: Create notification for supplier
  }

  /**
   * Handle order relay dispatched
   */
  @OnEvent('order.relay.dispatched')
  async handleRelayDispatched(data: {
    relayId: string;
    orderId: string;
    supplierId: string;
  }) {
    console.log(`[SupplierOps] Order ${data.orderId} dispatched`);
  }

  /**
   * Handle listing created event
   * Notify supplier when seller creates listing from their offer
   */
  @OnEvent('listing.created')
  async handleListingCreated(data: {
    listingId: string;
    offerId: string;
    supplierId: string;
    sellerId: string;
  }) {
    console.log(`[SupplierOps] New listing ${data.listingId} from offer ${data.offerId}`);
    // In production: Create notification for supplier
  }

  /**
   * Handle settlement closed
   */
  @OnEvent('settlement.closed')
  async handleSettlementClosed(data: {
    batchId: string;
    supplierId: string;
    totalAmount: number;
  }) {
    console.log(`[SupplierOps] Settlement batch ${data.batchId} closed for supplier ${data.supplierId}`);
    // In production: Create notification for supplier
  }
}
