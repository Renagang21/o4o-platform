/**
 * SettlementEngine
 * R-8-8-2: SettlementEngine v1 - Automatic settlement generation
 * R-8-8-4: Add refund/reversal settlement handling
 * R-8-8-5: Add batch settlement processing
 *
 * Purpose:
 * - Facade/orchestrator for settlement generation
 * - Triggered when orders reach DELIVERED status
 * - Handles refund/cancellation reversals
 * - Processes daily batch settlements
 * - Coordinates SettlementCalculator and SettlementAggregator
 *
 * Features:
 * - Automatically generates settlements for completed orders
 * - Creates settlement items for seller, supplier, platform, and partner
 * - Aggregates items into daily settlements per party
 * - Reverses settlements for refunded/cancelled orders
 * - Finalizes daily settlements (status: PENDING → PROCESSING)
 * - Invalidates settlement caches (R-8-7 integration)
 */

import { Repository, Between } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { Order } from '../../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../../entities/OrderItem.js';
import { Settlement, SettlementStatus } from '../../entities/Settlement.js';
import { SettlementItem } from '../../entities/SettlementItem.js';
import { SettlementCalculator } from './SettlementCalculator.js';
import { SettlementAggregator } from './SettlementAggregator.js';
import logger from '../../utils/logger.js';

export class SettlementEngine {
  private orderRepository: Repository<Order>;
  private settlementRepository: Repository<Settlement>;
  private settlementItemRepository: Repository<SettlementItem>;
  private calculator: SettlementCalculator;
  private aggregator: SettlementAggregator;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.settlementRepository = AppDataSource.getRepository(Settlement);
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
   * R-8-8-5: Process daily batch settlement for a specific date
   * Finalizes all settlements for the target date
   * Called by batch job (e.g., daily cron)
   *
   * Settlement Status Flow:
   * - PENDING (draft): Created by real-time events (runOnOrderCompleted/runOnRefund)
   * - PROCESSING (ready): Finalized by batch, ready for payout
   *
   * @param targetDate - Date to process settlements for
   * @returns Number of settlements processed
   */
  async runDailySettlement(targetDate: Date): Promise<number> {
    logger.info(`[SettlementEngine] Starting daily settlement batch for ${targetDate.toISOString()}`);

    try {
      // 1. Calculate period boundaries
      const { periodStart, periodEnd } = this.calculateDayPeriod(targetDate);

      logger.debug(
        `[SettlementEngine] Processing period: ${periodStart.toISOString()} - ${periodEnd.toISOString()}`
      );

      // 2. Find all PENDING settlements for this period
      const pendingSettlements = await this.settlementRepository.find({
        where: {
          periodStart,
          periodEnd,
          status: SettlementStatus.PENDING,
        },
        relations: ['items'],
      });

      if (pendingSettlements.length === 0) {
        logger.info(`[SettlementEngine] No pending settlements found for ${targetDate.toISOString()}`);
        return 0;
      }

      logger.debug(`[SettlementEngine] Found ${pendingSettlements.length} pending settlements to finalize`);

      // 3. Validate and finalize each settlement
      let processedCount = 0;
      for (const settlement of pendingSettlements) {
        try {
          // Verify settlement amounts match settlement items
          const isValid = await this.validateSettlementAmounts(settlement);

          if (!isValid) {
            logger.error(
              `[SettlementEngine] Settlement ${settlement.id} validation failed, skipping finalization`
            );
            continue;
          }

          // Change status from PENDING (draft) to PROCESSING (ready)
          settlement.status = SettlementStatus.PROCESSING;
          await this.settlementRepository.save(settlement);

          logger.debug(
            `[SettlementEngine] Finalized settlement ${settlement.id} for ${settlement.partyType}:${settlement.partyId}`
          );

          processedCount++;
        } catch (error) {
          logger.error(`[SettlementEngine] Failed to finalize settlement ${settlement.id}:`, error);
        }
      }

      logger.info(
        `[SettlementEngine] Daily settlement batch completed: ${processedCount}/${pendingSettlements.length} settlements finalized`
      );

      // 4. Invalidate settlement caches
      // TODO: Integrate with R-8-7 cache invalidation when available
      // await this.invalidateSettlementCache(pendingSettlements);

      return processedCount;
    } catch (error) {
      logger.error(`[SettlementEngine] Failed to process daily settlement for ${targetDate.toISOString()}:`, error);
      throw error;
    }
  }

  /**
   * Calculate period boundaries for a given date (daily granularity)
   * Returns start of day (00:00:00) and end of day (23:59:59.999)
   */
  private calculateDayPeriod(date: Date): { periodStart: Date; periodEnd: Date } {
    const targetDate = new Date(date);

    // Start of day (00:00:00)
    const periodStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );

    // End of day (23:59:59.999)
    const periodEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );

    return { periodStart, periodEnd };
  }

  /**
   * Validate that settlement totals match the sum of settlement items
   * Ensures data integrity before finalizing
   */
  private async validateSettlementAmounts(settlement: Settlement): Promise<boolean> {
    if (!settlement.items || settlement.items.length === 0) {
      logger.warn(`[SettlementEngine] Settlement ${settlement.id} has no items`);
      return false;
    }

    // Calculate sums from settlement items
    let sumGross = 0;
    let sumCommission = 0;
    let sumNet = 0;

    for (const item of settlement.items) {
      sumGross += item.grossAmount ? parseFloat(item.grossAmount.toString()) : 0;
      sumCommission += item.commissionAmountSnapshot
        ? parseFloat(item.commissionAmountSnapshot.toString())
        : 0;
      sumNet += item.netAmount ? parseFloat(item.netAmount.toString()) : 0;
    }

    // Compare with settlement totals (with small tolerance for floating point)
    const tolerance = 0.01;
    const payableAmount = parseFloat(settlement.payableAmount.toString());
    const totalCommission = parseFloat(settlement.totalCommissionAmount.toString());

    const netDiff = Math.abs(sumNet - payableAmount);
    const commissionDiff = Math.abs(sumCommission - totalCommission);

    if (netDiff > tolerance || commissionDiff > tolerance) {
      logger.error(
        `[SettlementEngine] Settlement ${settlement.id} validation failed:`,
        {
          expected: { net: sumNet, commission: sumCommission },
          actual: { net: payableAmount, commission: totalCommission },
          diff: { net: netDiff, commission: commissionDiff },
        }
      );
      return false;
    }

    return true;
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
