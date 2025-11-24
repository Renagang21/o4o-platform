/**
 * SettlementCalculator
 * R-8-8-2: SettlementEngine v1 - Calculate settlement items from order items
 *
 * Purpose:
 * - Converts OrderItem entities into SettlementItem records
 * - Calculates gross, commission, and net amounts for each party
 * - Supports seller, supplier, platform, and partner settlements
 *
 * Business Rules:
 * - Seller: gross = totalPrice, commission = calculated, net = gross - commission
 * - Supplier: gross = basePriceSnapshot * quantity, commission = 0, net = gross
 * - Platform: gross = commission from seller, net = gross
 * - Partner: gross = totalPrice, commission = partner share, net = commission
 */

import { OrderItem as OrderItemEntity } from '../../entities/OrderItem.js';
import { Order } from '../../entities/Order.js';
import logger from '../../utils/logger.js';

export interface SettlementItemInput {
  settlementId: string | null;
  orderId: string;
  orderItemId: string;
  partyType: 'seller' | 'supplier' | 'platform' | 'partner';
  partyId: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  reasonCode: string;
  metadata?: Record<string, any>;

  // Additional fields from OrderItem for SettlementItem entity
  productName: string;
  quantity: number;
  salePriceSnapshot: number;
  basePriceSnapshot?: number;
  commissionType?: 'rate' | 'fixed';
  commissionRate?: number;
  sellerId?: string;
  supplierId?: string;
}

const PLATFORM_ID = 'PLATFORM';

export class SettlementCalculator {
  /**
   * Convert OrderItems to SettlementItemInputs
   * Creates one SettlementItem per party type (seller, supplier, platform, partner if applicable)
   */
  calculateFromOrderItems(
    order: Order,
    orderItems: OrderItemEntity[]
  ): SettlementItemInput[] {
    const settlementItems: SettlementItemInput[] = [];

    for (const item of orderItems) {
      // 1. Seller settlement
      const sellerItem = this.calculateSellerSettlement(order.id, item);
      if (sellerItem) {
        settlementItems.push(sellerItem);
      }

      // 2. Supplier settlement
      const supplierItem = this.calculateSupplierSettlement(order.id, item);
      if (supplierItem) {
        settlementItems.push(supplierItem);
      }

      // 3. Platform settlement
      const platformItem = this.calculatePlatformSettlement(order.id, item);
      if (platformItem) {
        settlementItems.push(platformItem);
      }

      // 4. Partner settlement (if partner exists)
      if (order.partnerId) {
        const partnerItem = this.calculatePartnerSettlement(order.id, item, order.partnerId);
        if (partnerItem) {
          settlementItems.push(partnerItem);
        }
      }
    }

    logger.debug(`[SettlementCalculator] Generated ${settlementItems.length} settlement items for order ${order.id}`);
    return settlementItems;
  }

  /**
   * Calculate seller settlement
   * Seller receives: totalPrice - commission
   */
  private calculateSellerSettlement(
    orderId: string,
    item: OrderItemEntity
  ): SettlementItemInput | null {
    if (!item.sellerId) {
      logger.warn(`[SettlementCalculator] OrderItem ${item.id} has no sellerId`);
      return null;
    }

    const gross = parseFloat(item.totalPrice.toString());
    const commission = item.commissionAmount
      ? parseFloat(item.commissionAmount.toString())
      : 0;
    const net = gross - commission;

    return {
      settlementId: null,
      orderId,
      orderItemId: item.id,
      partyType: 'seller',
      partyId: item.sellerId,
      grossAmount: gross,
      commissionAmount: commission,
      netAmount: net,
      reasonCode: 'order_completed',
      metadata: {
        productId: item.productId,
        productName: item.productName,
      },
      productName: item.productName,
      quantity: item.quantity,
      salePriceSnapshot: parseFloat(item.salePriceSnapshot?.toString() || item.unitPrice.toString()),
      basePriceSnapshot: item.basePriceSnapshot ? parseFloat(item.basePriceSnapshot.toString()) : undefined,
      commissionType: item.commissionType,
      commissionRate: item.commissionRate ? parseFloat(item.commissionRate.toString()) : undefined,
      sellerId: item.sellerId,
      supplierId: item.supplierId,
    };
  }

  /**
   * Calculate supplier settlement
   * Supplier receives: basePriceSnapshot * quantity (no commission)
   */
  private calculateSupplierSettlement(
    orderId: string,
    item: OrderItemEntity
  ): SettlementItemInput | null {
    if (!item.supplierId) {
      logger.warn(`[SettlementCalculator] OrderItem ${item.id} has no supplierId`);
      return null;
    }

    if (!item.basePriceSnapshot) {
      logger.warn(`[SettlementCalculator] OrderItem ${item.id} has no basePriceSnapshot`);
      return null;
    }

    const basePrice = parseFloat(item.basePriceSnapshot.toString());
    const gross = basePrice * item.quantity;
    const commission = 0;
    const net = gross;

    return {
      settlementId: null,
      orderId,
      orderItemId: item.id,
      partyType: 'supplier',
      partyId: item.supplierId,
      grossAmount: gross,
      commissionAmount: commission,
      netAmount: net,
      reasonCode: 'order_completed',
      metadata: {
        productId: item.productId,
        productName: item.productName,
      },
      productName: item.productName,
      quantity: item.quantity,
      salePriceSnapshot: parseFloat(item.salePriceSnapshot?.toString() || item.unitPrice.toString()),
      basePriceSnapshot: basePrice,
      commissionType: item.commissionType,
      commissionRate: item.commissionRate ? parseFloat(item.commissionRate.toString()) : undefined,
      sellerId: item.sellerId,
      supplierId: item.supplierId,
    };
  }

  /**
   * Calculate platform settlement
   * Platform receives: commission from seller
   */
  private calculatePlatformSettlement(
    orderId: string,
    item: OrderItemEntity
  ): SettlementItemInput | null {
    const commission = item.commissionAmount
      ? parseFloat(item.commissionAmount.toString())
      : 0;

    if (commission === 0) {
      return null; // No platform settlement if no commission
    }

    const gross = commission;
    const net = commission;

    return {
      settlementId: null,
      orderId,
      orderItemId: item.id,
      partyType: 'platform',
      partyId: PLATFORM_ID,
      grossAmount: gross,
      commissionAmount: 0, // Platform doesn't pay commission
      netAmount: net,
      reasonCode: 'order_completed',
      metadata: {
        productId: item.productId,
        productName: item.productName,
        sellerId: item.sellerId,
      },
      productName: item.productName,
      quantity: item.quantity,
      salePriceSnapshot: parseFloat(item.salePriceSnapshot?.toString() || item.unitPrice.toString()),
      basePriceSnapshot: item.basePriceSnapshot ? parseFloat(item.basePriceSnapshot.toString()) : undefined,
      commissionType: item.commissionType,
      commissionRate: item.commissionRate ? parseFloat(item.commissionRate.toString()) : undefined,
      sellerId: item.sellerId,
      supplierId: item.supplierId,
    };
  }

  /**
   * Calculate partner settlement
   * Partner receives: partner commission share
   *
   * Note: Partner commission logic will be implemented in future phases
   * For now, returns null as partner commission calculation is not yet defined
   */
  private calculatePartnerSettlement(
    orderId: string,
    item: OrderItemEntity,
    partnerId: string
  ): SettlementItemInput | null {
    // TODO: Implement partner commission calculation
    // This will be added when partner commission policy is defined
    logger.debug(`[SettlementCalculator] Partner settlement not yet implemented for order ${orderId}, partner ${partnerId}`);
    return null;
  }
}
