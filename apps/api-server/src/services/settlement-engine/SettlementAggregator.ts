/**
 * SettlementAggregator
 * R-8-8-2: SettlementEngine v1 - Aggregate settlement items into settlements
 *
 * Purpose:
 * - Groups SettlementItemInputs by party and period
 * - Creates or updates Settlement entities
 * - Links SettlementItems to their parent Settlement
 *
 * Aggregation Strategy:
 * - Group by: partyType + partyId + period (daily)
 * - Period calculation: based on order date, daily granularity
 * - Creates one Settlement per party per day
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { Settlement, SettlementStatus } from '../../entities/Settlement.js';
import { SettlementItem } from '../../entities/SettlementItem.js';
import { Order } from '../../entities/Order.js';
import { SettlementItemInput } from './SettlementCalculator.js';
import logger from '../../utils/logger.js';

interface SettlementGroup {
  partyType: 'seller' | 'supplier' | 'platform' | 'partner';
  partyId: string;
  periodStart: Date;
  periodEnd: Date;
  items: SettlementItemInput[];
}

export class SettlementAggregator {
  private settlementRepository: Repository<Settlement>;
  private settlementItemRepository: Repository<SettlementItem>;

  constructor() {
    this.settlementRepository = AppDataSource.getRepository(Settlement);
    this.settlementItemRepository = AppDataSource.getRepository(SettlementItem);
  }

  /**
   * Aggregate settlement items into settlements
   * Returns the created/updated settlements
   */
  async aggregate(
    order: Order,
    settlementItemInputs: SettlementItemInput[]
  ): Promise<Settlement[]> {
    if (settlementItemInputs.length === 0) {
      logger.warn('[SettlementAggregator] No settlement items to aggregate');
      return [];
    }

    // Group items by party and period
    const groups = this.groupSettlementItems(order, settlementItemInputs);

    logger.debug(`[SettlementAggregator] Grouped ${settlementItemInputs.length} items into ${groups.length} settlements`);

    // Create or update settlements for each group
    const settlements: Settlement[] = [];
    for (const group of groups) {
      const settlement = await this.createOrUpdateSettlement(group);
      settlements.push(settlement);
    }

    return settlements;
  }

  /**
   * Group settlement items by party and period
   */
  private groupSettlementItems(
    order: Order,
    items: SettlementItemInput[]
  ): SettlementGroup[] {
    const groupMap = new Map<string, SettlementGroup>();

    // Calculate period from order date (daily granularity)
    const { periodStart, periodEnd } = this.calculatePeriod(order.orderDate);

    for (const item of items) {
      const key = `${item.partyType}:${item.partyId}:${periodStart.toISOString()}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          partyType: item.partyType,
          partyId: item.partyId,
          periodStart,
          periodEnd,
          items: [],
        });
      }

      groupMap.get(key)!.items.push(item);
    }

    return Array.from(groupMap.values());
  }

  /**
   * Calculate settlement period (daily granularity)
   * Returns start of day and end of day for the given date
   */
  private calculatePeriod(orderDate: Date): { periodStart: Date; periodEnd: Date } {
    const date = new Date(orderDate);

    // Start of day (00:00:00)
    const periodStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

    // End of day (23:59:59.999)
    const periodEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    return { periodStart, periodEnd };
  }

  /**
   * Create new settlement or update existing one
   */
  private async createOrUpdateSettlement(group: SettlementGroup): Promise<Settlement> {
    // Try to find existing settlement for this party and period
    const existing = await this.settlementRepository.findOne({
      where: {
        partyType: group.partyType,
        partyId: group.partyId,
        periodStart: group.periodStart,
        periodEnd: group.periodEnd,
      },
      relations: ['items'],
    });

    if (existing) {
      logger.debug(
        `[SettlementAggregator] Updating existing settlement ${existing.id} for ${group.partyType}:${group.partyId}`
      );
      return await this.updateSettlement(existing, group.items);
    } else {
      logger.debug(
        `[SettlementAggregator] Creating new settlement for ${group.partyType}:${group.partyId}`
      );
      return await this.createSettlement(group);
    }
  }

  /**
   * Create new settlement and its items
   */
  private async createSettlement(group: SettlementGroup): Promise<Settlement> {
    const settlement = new Settlement();
    settlement.partyType = group.partyType;
    settlement.partyId = group.partyId;
    settlement.periodStart = group.periodStart;
    settlement.periodEnd = group.periodEnd;
    settlement.status = SettlementStatus.PENDING;

    // Calculate aggregated amounts
    this.calculateSettlementAmounts(settlement, group.items);

    // Save settlement first
    const savedSettlement = await this.settlementRepository.save(settlement);

    // Create settlement items
    const settlementItems = group.items.map((item) => {
      return this.createSettlementItem(savedSettlement.id, item);
    });

    await this.settlementItemRepository.save(settlementItems);

    logger.info(
      `[SettlementAggregator] Created settlement ${savedSettlement.id} with ${settlementItems.length} items`
    );

    return savedSettlement;
  }

  /**
   * Update existing settlement with new items
   */
  private async updateSettlement(
    settlement: Settlement,
    newItems: SettlementItemInput[]
  ): Promise<Settlement> {
    // Create new settlement items
    const settlementItems = newItems.map((item) => {
      return this.createSettlementItem(settlement.id, item);
    });

    await this.settlementItemRepository.save(settlementItems);

    // Recalculate settlement amounts
    const allItems = [...(settlement.items || []), ...settlementItems];
    const allItemInputs = allItems.map((item) => ({
      ...item,
      grossAmount: parseFloat(item.grossAmount?.toString() || '0'),
      commissionAmount: parseFloat(item.commissionAmountSnapshot?.toString() || '0'),
      netAmount: parseFloat(item.netAmount?.toString() || '0'),
    })) as any[];

    this.calculateSettlementAmounts(settlement, allItemInputs);

    // Save updated settlement
    const updatedSettlement = await this.settlementRepository.save(settlement);

    logger.info(
      `[SettlementAggregator] Updated settlement ${settlement.id} with ${settlementItems.length} new items`
    );

    return updatedSettlement;
  }

  /**
   * Calculate aggregated amounts for settlement
   */
  private calculateSettlementAmounts(
    settlement: Settlement,
    items: SettlementItemInput[]
  ): void {
    let totalSale = 0;
    let totalBase = 0;
    let totalCommission = 0;
    let totalMargin = 0;
    let totalPayable = 0;

    for (const item of items) {
      totalPayable += item.netAmount;
      totalCommission += item.commissionAmount;

      // Calculate type-specific amounts
      if (settlement.partyType === 'seller') {
        totalSale += item.grossAmount;
        totalMargin += item.netAmount; // Seller's margin = net after commission
      } else if (settlement.partyType === 'supplier') {
        totalBase += item.grossAmount;
      } else if (settlement.partyType === 'platform') {
        totalCommission += item.grossAmount; // Platform receives commission
      } else if (settlement.partyType === 'partner') {
        // Partner commission will be added in future phases
      }
    }

    settlement.totalSaleAmount = totalSale.toFixed(2);
    settlement.totalBaseAmount = totalBase.toFixed(2);
    settlement.totalCommissionAmount = totalCommission.toFixed(2);
    settlement.totalMarginAmount = totalMargin.toFixed(2);
    settlement.payableAmount = totalPayable.toFixed(2);
  }

  /**
   * Create SettlementItem entity from input
   */
  private createSettlementItem(
    settlementId: string,
    input: SettlementItemInput
  ): SettlementItem {
    const item = new SettlementItem();

    item.settlementId = settlementId;
    item.orderId = input.orderId;
    item.orderItemId = input.orderItemId;
    item.productName = input.productName;
    item.quantity = input.quantity;

    // Pricing snapshots
    item.salePriceSnapshot = input.salePriceSnapshot.toFixed(2);
    if (input.basePriceSnapshot) {
      item.basePriceSnapshot = input.basePriceSnapshot.toFixed(2);
    }

    // Calculated totals
    item.totalSaleAmount = (input.salePriceSnapshot * input.quantity).toFixed(2);
    if (input.basePriceSnapshot) {
      item.totalBaseAmount = (input.basePriceSnapshot * input.quantity).toFixed(2);
    }

    // Commission info
    item.commissionType = input.commissionType;
    if (input.commissionRate) {
      item.commissionRate = input.commissionRate.toFixed(4);
    }
    if (input.commissionAmount) {
      item.commissionAmountSnapshot = input.commissionAmount.toFixed(2);
    }

    // Party IDs
    item.sellerId = input.sellerId;
    item.supplierId = input.supplierId;

    // R-8-8-2: New fields
    item.partyType = input.partyType;
    item.partyId = input.partyId;
    item.grossAmount = input.grossAmount.toFixed(2);
    item.netAmount = input.netAmount.toFixed(2);
    item.reasonCode = input.reasonCode;
    item.metadata = input.metadata;

    return item;
  }

  /**
   * R-8-8-4: Apply reversal settlement items for refund/cancellation
   * Updates existing settlements by adding negative (reversal) items
   *
   * @param order - The order being refunded
   * @param reversalItems - Reversal SettlementItemInputs with negative amounts
   */
  async applyReversalForOrder(
    order: Order,
    reversalItems: SettlementItemInput[]
  ): Promise<Settlement[]> {
    if (reversalItems.length === 0) {
      logger.warn('[SettlementAggregator] No reversal items to apply');
      return [];
    }

    // Group reversal items by party (partyType + partyId)
    const groups = this.groupReversalItems(order, reversalItems);

    logger.debug(
      `[SettlementAggregator] Applying ${reversalItems.length} reversal items across ${groups.length} settlements`
    );

    const updatedSettlements: Settlement[] = [];

    for (const group of groups) {
      const settlement = await this.applyReversalToSettlement(group);
      updatedSettlements.push(settlement);
    }

    return updatedSettlements;
  }

  /**
   * Group reversal items by party and period
   */
  private groupReversalItems(
    order: Order,
    items: SettlementItemInput[]
  ): SettlementGroup[] {
    const groupMap = new Map<string, SettlementGroup>();

    // Calculate period from order date (same as original settlement)
    const { periodStart, periodEnd } = this.calculatePeriod(order.orderDate);

    for (const item of items) {
      const key = `${item.partyType}:${item.partyId}:${periodStart.toISOString()}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          partyType: item.partyType,
          partyId: item.partyId,
          periodStart,
          periodEnd,
          items: [],
        });
      }

      groupMap.get(key)!.items.push(item);
    }

    return Array.from(groupMap.values());
  }

  /**
   * Apply reversal items to existing settlement
   * If settlement doesn't exist, create a new one
   */
  private async applyReversalToSettlement(group: SettlementGroup): Promise<Settlement> {
    // Try to find existing settlement for this party and period
    const existing = await this.settlementRepository.findOne({
      where: {
        partyType: group.partyType,
        partyId: group.partyId,
        periodStart: group.periodStart,
        periodEnd: group.periodEnd,
      },
      relations: ['items'],
    });

    if (existing) {
      logger.debug(
        `[SettlementAggregator] Applying reversal to existing settlement ${existing.id} for ${group.partyType}:${group.partyId}`
      );
      return await this.updateSettlementWithReversal(existing, group.items);
    } else {
      // If no existing settlement, create a new one with reversal items
      // This can happen if the order was completed in a previous period
      logger.debug(
        `[SettlementAggregator] Creating new settlement for reversal ${group.partyType}:${group.partyId}`
      );
      return await this.createSettlement(group);
    }
  }

  /**
   * Update existing settlement with reversal items
   * Adds reversal items and recalculates totals
   */
  private async updateSettlementWithReversal(
    settlement: Settlement,
    reversalItems: SettlementItemInput[]
  ): Promise<Settlement> {
    // Create reversal settlement items
    const settlementItems = reversalItems.map((item) => {
      return this.createSettlementItem(settlement.id, item);
    });

    await this.settlementItemRepository.save(settlementItems);

    // Update settlement totals by adding reversal amounts (which are negative)
    for (const item of reversalItems) {
      const currentPayable = parseFloat(settlement.payableAmount.toString());
      const currentCommission = parseFloat(settlement.totalCommissionAmount.toString());

      settlement.payableAmount = (currentPayable + item.netAmount).toFixed(2);
      settlement.totalCommissionAmount = (currentCommission + item.commissionAmount).toFixed(2);

      // Update party-specific amounts
      if (settlement.partyType === 'seller') {
        const currentSale = parseFloat(settlement.totalSaleAmount.toString());
        const currentMargin = parseFloat(settlement.totalMarginAmount.toString());
        settlement.totalSaleAmount = (currentSale + item.grossAmount).toFixed(2);
        settlement.totalMarginAmount = (currentMargin + item.netAmount).toFixed(2);
      } else if (settlement.partyType === 'supplier') {
        const currentBase = parseFloat(settlement.totalBaseAmount.toString());
        settlement.totalBaseAmount = (currentBase + item.grossAmount).toFixed(2);
      } else if (settlement.partyType === 'platform') {
        // Platform's commission is already updated above
      }
    }

    // Save updated settlement
    const updatedSettlement = await this.settlementRepository.save(settlement);

    logger.info(
      `[SettlementAggregator] Applied ${reversalItems.length} reversal items to settlement ${settlement.id}`
    );

    return updatedSettlement;
  }
}
