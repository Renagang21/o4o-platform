/**
 * SettlementEngine
 * R-8-8-2: SettlementEngine v1 - Automatic settlement generation
 * R-8-8-4: Add refund/reversal settlement handling
 *
 * Purpose:
 * - Facade/orchestrator for settlement generation
 * - Triggered when orders reach DELIVERED status
 * - Handles refund/cancellation reversals
 * - Coordinates SettlementCalculator and SettlementAggregator
 *
 * Features:
 * - Automatically generates settlements for completed orders
 * - Creates settlement items for seller, supplier, platform, and partner
 * - Aggregates items into daily settlements per party
 * - Reverses settlements for refunded/cancelled orders
 * - Invalidates settlement caches (R-8-7 integration)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { Order } from '../../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../../entities/OrderItem.js';
import { Settlement } from '../../entities/Settlement.js';
import { SettlementItem } from '../../entities/SettlementItem.js';
import { SettlementCalculator } from './SettlementCalculator.js';
import { SettlementAggregator } from './SettlementAggregator.js';
import logger from '../../utils/logger.js';

export class SettlementEngine {
  private orderRepository: Repository<Order>;
  private settlementItemRepository: Repository<SettlementItem>;
  private calculator: SettlementCalculator;
  private aggregator: SettlementAggregator;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.settlementItemRepository = AppDataSource.getRepository(SettlementItem);
    this.calculator = new SettlementCalculator();
    this.aggregator = new SettlementAggregator();
  }

  /**
   * Generate settlements for a completed order
   * Called when order status changes to DELIVERED
   *
   * @param orderId - Order UUID
   * @returns Array of created/updated settlements
   */
  async runOnOrderCompleted(orderId: string): Promise<Settlement[]> {
    logger.info(`[SettlementEngine] Processing order ${orderId} for settlement generation`);

    try {
      // 1. Load Order with OrderItems
      const order = await this.loadOrderWithItems(orderId);

      if (!order.itemsRelation || order.itemsRelation.length === 0) {
        logger.warn(`[SettlementEngine] Order ${orderId} has no items, skipping settlement generation`);
        return [];
      }

      // 2. Calculate settlement items
      const settlementItemInputs = this.calculator.calculateFromOrderItems(
        order,
        order.itemsRelation
      );

      if (settlementItemInputs.length === 0) {
        logger.warn(`[SettlementEngine] No settlement items generated for order ${orderId}`);
        return [];
      }

      // 3. Aggregate into settlements
      const settlements = await this.aggregator.aggregate(order, settlementItemInputs);

      logger.info(
        `[SettlementEngine] Successfully generated ${settlements.length} settlements for order ${orderId}`
      );

      // 4. Invalidate settlement caches (R-8-7)
      // TODO: Integrate with R-8-7 cache invalidation when available
      // await this.invalidateSettlementCache(settlements);

      return settlements;
    } catch (error) {
      logger.error(`[SettlementEngine] Failed to process order ${orderId} for settlement:`, error);
      throw error;
    }
  }

  /**
   * Load order with related items
   */
  private async loadOrderWithItems(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['itemsRelation'], // Load OrderItem entities
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return order;
  }

  /**
   * R-8-8-4: Reverse settlements for refunded/cancelled order
   * Called when order status changes to CANCELLED or REFUNDED
   *
   * @param orderId - Order UUID
   * @returns Array of updated settlements
   */
  async runOnRefund(orderId: string): Promise<Settlement[]> {
    logger.info(`[SettlementEngine] Processing refund for order ${orderId}`);

    try {
      // 1. Load Order with OrderItems
      const order = await this.loadOrderWithItems(orderId);

      // 2. Find original settlement items for this order
      const originalItems = await this.settlementItemRepository.find({
        where: {
          orderId,
          reasonCode: 'order_completed',
        },
      });

      if (originalItems.length === 0) {
        logger.warn(
          `[SettlementEngine] No original settlement items found for order ${orderId}, skipping refund`
        );
        return [];
      }

      logger.debug(
        `[SettlementEngine] Found ${originalItems.length} original settlement items for order ${orderId}`
      );

      // 3. Calculate reversal settlement items
      const reversalItemInputs = this.calculator.calculateReversalForOrder(order, originalItems);

      if (reversalItemInputs.length === 0) {
        logger.warn(`[SettlementEngine] No reversal items generated for order ${orderId}`);
        return [];
      }

      // 4. Apply reversals to settlements
      const settlements = await this.aggregator.applyReversalForOrder(order, reversalItemInputs);

      logger.info(
        `[SettlementEngine] Successfully applied refund reversal to ${settlements.length} settlements for order ${orderId}`
      );

      // 5. Invalidate settlement caches (R-8-7)
      // TODO: Integrate with R-8-7 cache invalidation when available
      // await this.invalidateSettlementCache(settlements);

      return settlements;
    } catch (error) {
      logger.error(`[SettlementEngine] Failed to process refund for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate settlement caches
   * R-8-7: Cache invalidation integration point
   *
   * @param settlements - Settlements to invalidate caches for
   */
  private async invalidateSettlementCache(settlements: Settlement[]): Promise<void> {
    // TODO: Implement when R-8-7 cache system is available
    // For each settlement:
    // - Invalidate seller/supplier/platform dashboard caches
    // - Invalidate settlement list caches
    // - Invalidate settlement detail caches

    logger.debug(
      `[SettlementEngine] Cache invalidation called for ${settlements.length} settlements (not yet implemented)`
    );
  }
}
