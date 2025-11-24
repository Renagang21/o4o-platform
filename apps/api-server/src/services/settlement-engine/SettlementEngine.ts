/**
 * SettlementEngine
 * R-8-8-2: SettlementEngine v1 - Automatic settlement generation
 *
 * Purpose:
 * - Facade/orchestrator for settlement generation
 * - Triggered when orders reach DELIVERED status
 * - Coordinates SettlementCalculator and SettlementAggregator
 *
 * Features:
 * - Automatically generates settlements for completed orders
 * - Creates settlement items for seller, supplier, platform, and partner
 * - Aggregates items into daily settlements per party
 * - Invalidates settlement caches (R-8-7 integration)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { Order } from '../../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../../entities/OrderItem.js';
import { Settlement } from '../../entities/Settlement.js';
import { SettlementCalculator } from './SettlementCalculator.js';
import { SettlementAggregator } from './SettlementAggregator.js';
import logger from '../../utils/logger.js';

export class SettlementEngine {
  private orderRepository: Repository<Order>;
  private calculator: SettlementCalculator;
  private aggregator: SettlementAggregator;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
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
