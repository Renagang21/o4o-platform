/**
 * SettlementEngine v2
 * P2-C Phase C-3: Partner Commission + DB Persistence
 *
 * Purpose:
 * - Entry point for SettlementEngine v2
 * - Policy-based, versioned settlement calculation
 * - Runs in parallel with v1 (shadow mode initially)
 *
 * Design Reference:
 * - docs/dev/R-8-8-1-SettlementEngine-v2-Design.md
 * - docs/dev/P2-C-SettlementEngine-v2-Implementation-Guide.md
 *
 * Phase C-3 Status: PARTNER COMMISSION + DB PERSISTENCE
 * - Repository dependencies injected
 * - Settlement calculation (seller/supplier/partner/platform)
 * - RuleSet application (percentage/fixed only)
 * - dryRun mode implemented
 * - DB persistence implemented (dryRun=false)
 * - Transaction handling for atomic DB writes
 * - Diagnostics populated
 *
 * Updated: 2025-11-25 (P2-C Phase C-3)
 */

import { Repository, Between, DataSource } from 'typeorm';
import { Order } from '../../modules/commerce/entities/Order.js';
import { OrderItem as OrderItemEntity } from '../../modules/commerce/entities/OrderItem.js';
import { Settlement, SettlementStatus } from '../../modules/dropshipping/entities/Settlement.js';
import { SettlementItem } from '../../modules/dropshipping/entities/SettlementItem.js';
import { Commission } from '../../modules/dropshipping/entities/Commission.js';
import {
  SettlementV2Config,
  SettlementEngineV2Result,
  SettlementPartyContext,
  CommissionRule,
  CommissionTier,
} from './SettlementTypesV2.js';
import logger from '../../utils/logger.js';
import { AppDataSource } from '../../database/connection.js';

/**
 * SettlementEngine v2 - Main orchestrator
 *
 * Responsibilities:
 * 1. Accept v2 configuration (period, parties, ruleSet)
 * 2. Query orders/events within period
 * 3. Calculate settlements using CommissionRuleSet
 * 4. Generate Settlement/SettlementItem entities
 * 5. Return results (optionally persist if dryRun=false)
 */
export class SettlementEngineV2 {
  private readonly orderRepository: Repository<Order>;
  private readonly settlementRepository: Repository<Settlement>;
  private readonly settlementItemRepository: Repository<SettlementItem>;
  private readonly commissionRepository: Repository<Commission>;

  constructor(
    orderRepository: Repository<Order>,
    settlementRepository: Repository<Settlement>,
    settlementItemRepository: Repository<SettlementItem>,
    commissionRepository: Repository<Commission>
  ) {
    this.orderRepository = orderRepository;
    this.settlementRepository = settlementRepository;
    this.settlementItemRepository = settlementItemRepository;
    this.commissionRepository = commissionRepository;

    logger.info('[SettlementEngineV2] Initialized (Phase C-3: Partner + DB Persistence)');
  }

  /**
   * Generate settlements based on v2 configuration
   *
   * Phase C-3 Implementation:
   * 1. Validate config
   * 2. Query orders in period
   * 3. Calculate per-party settlements using RuleSet (seller/supplier/partner/platform)
   * 4. Generate Settlement/SettlementItem structures
   * 5. dryRun=true: Return without persisting
   * 6. dryRun=false: Persist to DB with transaction
   *
   * @param config - SettlementV2Config with period, parties, rules
   * @returns Promise<SettlementEngineV2Result> with settlements and diagnostics
   */
  async generateSettlements(
    config: SettlementV2Config
  ): Promise<SettlementEngineV2Result> {
    const startTime = Date.now();
    logger.info('[SettlementEngineV2] generateSettlements started (Phase C-2)', {
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      partiesCount: config.parties.length,
      ruleSetId: config.ruleSet.id,
      dryRun: config.dryRun ?? true,
      tag: config.tag,
    });

    try {
      // 1. Validate configuration
      this.validateConfig(config);

      // 2. Query orders in period
      const orders = await this.queryOrdersInPeriod(config.periodStart, config.periodEnd);

      if (orders.length === 0) {
        logger.info('[SettlementEngineV2] No orders found in period', {
          periodStart: config.periodStart,
          periodEnd: config.periodEnd,
        });
        return this.emptyResult();
      }

      logger.debug(`[SettlementEngineV2] Found ${orders.length} orders in period`);

      // 3. Calculate settlements for each party
      const settlementItems: SettlementItem[] = [];
      const ruleHits: Record<string, number> = {};
      const tiersApplied: Record<string, number> = {}; // Phase C-4: Track tiered rule usage

      for (const party of config.parties) {
        const partyItems = await this.calculatePartySettlements(
          orders,
          party,
          config.ruleSet.rules,
          ruleHits,
          tiersApplied // Phase C-4: Pass tiersApplied tracking
        );
        settlementItems.push(...partyItems);
      }

      // 4. Aggregate SettlementItems into Settlements
      const settlements = this.aggregateSettlements(
        config.periodStart,
        config.periodEnd,
        settlementItems,
        config.parties
      );

      // 5. Calculate diagnostics
      const totalsByParty = this.calculateTotalsByParty(settlements);

      // 6. Persist to DB if not dryRun
      // Phase C-3: DB persistence implementation
      let persistedSettlements = settlements;
      let persistedItems = settlementItems;

      if (!config.dryRun) {
        logger.warn('[SettlementEngineV2] ⚠️  dryRun=false - PERSISTING TO DATABASE');
        logger.warn('[SettlementEngineV2] ⚠️  This will write Settlement and SettlementItem records');

        // TODO P2-C Phase C-4: Check for duplicate settlements (v1/v2 conflict)
        // For now, we assume no conflicts in shadow mode testing

        const persisted = await this.persistSettlementsToDb(settlements, settlementItems);
        persistedSettlements = persisted.settlements;
        persistedItems = persisted.items;

        logger.info('[SettlementEngineV2] ✅ DB persistence completed', {
          settlementsCount: persistedSettlements.length,
          itemsCount: persistedItems.length,
        });
      }

      const duration = Date.now() - startTime;
      logger.info('[SettlementEngineV2] generateSettlements completed', {
        duration,
        settlementsCount: persistedSettlements.length,
        settlementItemsCount: persistedItems.length,
        dryRun: config.dryRun ?? true,
      });

      return {
        settlements: persistedSettlements,
        settlementItems: persistedItems,
        commissions: [], // Phase C-3: Commission entity integration to be added if needed
        diagnostics: {
          ruleHits,
          totalsByParty,
          duplicatesDetected: false, // Phase C-4: Will be set by duplicate detection logic
          tiersApplied, // Phase C-4: Tiered rule usage tracking
          // Phase C-4: v1vsV2Diff will be populated if compareWithV1=true
        },
      };
    } catch (error) {
      logger.error('[SettlementEngineV2] generateSettlements failed', {
        error: error instanceof Error ? error.message : String(error),
        config,
      });
      throw error;
    }
  }

  /**
   * Validate configuration before processing
   */
  private validateConfig(config: SettlementV2Config): void {
    if (!config.periodStart || !config.periodEnd) {
      throw new Error('Period start and end dates are required');
    }

    if (config.periodEnd < config.periodStart) {
      throw new Error('Period end must be after period start');
    }

    if (!config.parties || config.parties.length === 0) {
      throw new Error('At least one party must be specified');
    }

    if (!config.ruleSet || !config.ruleSet.rules || config.ruleSet.rules.length === 0) {
      throw new Error('RuleSet must contain at least one rule');
    }

    logger.debug('[SettlementEngineV2] Config validation passed');
  }

  /**
   * Query orders within the specified period
   * Phase C-2: Query DELIVERED orders only
   */
  private async queryOrdersInPeriod(
    periodStart: Date,
    periodEnd: Date
  ): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: {
        orderDate: Between(periodStart, periodEnd),
        // Phase C-2: Only DELIVERED orders are settled
        // status: OrderStatus.DELIVERED, // TODO: Uncomment if OrderStatus enum exists
      },
      relations: ['itemsRelation'], // Load OrderItem entities
    });

    return orders;
  }

  /**
   * Calculate settlements for a specific party
   * Phase C-4: Supports seller, supplier, partner, platform + tiered rules
   */
  private async calculatePartySettlements(
    orders: Order[],
    party: SettlementPartyContext,
    rules: CommissionRule[],
    ruleHits: Record<string, number>,
    tiersApplied: Record<string, number> // Phase C-4: Track tiered rule usage
  ): Promise<SettlementItem[]> {
    const items: SettlementItem[] = [];

    for (const order of orders) {
      if (!order.itemsRelation || order.itemsRelation.length === 0) {
        continue;
      }

      for (const orderItem of order.itemsRelation) {
        // Filter items relevant to this party
        if (!this.isItemRelevantToParty(orderItem, party)) {
          continue;
        }

        // Find applicable rule
        const rule = this.findApplicableRule(orderItem, party, rules);
        if (!rule) {
          logger.warn(`[SettlementEngineV2] No applicable rule found for party ${party.partyType}:${party.partyId}`);
          continue;
        }

        // Track rule usage
        ruleHits[rule.id] = (ruleHits[rule.id] || 0) + 1;

        // Calculate amounts based on rule
        const { grossAmount, commissionAmount, netAmount } = this.calculateAmounts(
          orderItem,
          party,
          rule,
          tiersApplied // Phase C-4: Pass tiersApplied for tracking
        );

        // Create SettlementItem structure
        const item = this.createSettlementItem(
          order,
          orderItem,
          party,
          rule,
          grossAmount,
          commissionAmount,
          netAmount
        );

        items.push(item);
      }
    }

    logger.debug(`[SettlementEngineV2] Calculated ${items.length} items for party ${party.partyType}:${party.partyId}`);
    return items;
  }

  /**
   * Check if OrderItem is relevant to the party
   * Phase C-3: Includes partner logic
   */
  private isItemRelevantToParty(
    item: OrderItemEntity,
    party: SettlementPartyContext
  ): boolean {
    switch (party.partyType) {
      case 'seller':
        return item.sellerId === party.partyId;
      case 'supplier':
        return item.supplierId === party.partyId;
      case 'platform':
        return true; // Platform gets commission from all items
      case 'partner':
        // Phase C-3: Partner gets commission based on referral or partnership
        // Check if item attributes (JSONB) contains partnerId
        if (item.attributes && typeof item.attributes === 'object') {
          const attrs = item.attributes as Record<string, unknown>;
          return attrs.partnerId === party.partyId || attrs.referralPartnerId === party.partyId;
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Find applicable rule for the item and party
   * Phase C-2: Simple matching - first applicable rule wins
   */
  private findApplicableRule(
    item: OrderItemEntity,
    party: SettlementPartyContext,
    rules: CommissionRule[]
  ): CommissionRule | null {
    for (const rule of rules) {
      // Check partyType match
      if (rule.appliesTo.partyType && rule.appliesTo.partyType !== party.partyType) {
        continue;
      }

      // Check productId match
      if (rule.appliesTo.productIds && rule.appliesTo.productIds.length > 0) {
        if (!rule.appliesTo.productIds.includes(item.productId)) {
          continue;
        }
      }

      // Phase C-2: categoryId and channelId not yet implemented

      // Rule matches
      return rule;
    }

    // No specific rule found, return default if exists
    return rules.find(r => !r.appliesTo.partyType && !r.appliesTo.productIds) || null;
  }

  /**
   * Calculate gross, commission, and net amounts
   * Phase C-4: Supports percentage, fixed, and tiered rules (seller/supplier/partner/platform)
   */
  private calculateAmounts(
    item: OrderItemEntity,
    party: SettlementPartyContext,
    rule: CommissionRule,
    tiersApplied: Record<string, number> // Phase C-4: Track tiered rule usage
  ): { grossAmount: number; commissionAmount: number; netAmount: number } {
    let grossAmount = 0;
    let commissionAmount = 0;

    if (party.partyType === 'seller') {
      // Seller: gross = totalPrice, commission = calculated, net = gross - commission
      grossAmount = parseFloat(item.totalPrice.toString());

      if (rule.type === 'percentage' && rule.percentageRate !== undefined) {
        commissionAmount = (grossAmount * rule.percentageRate) / 100;
      } else if (rule.type === 'fixed' && rule.fixedAmount !== undefined) {
        commissionAmount = rule.fixedAmount * item.quantity;
      } else if (rule.type === 'tiered' && rule.tiers && rule.tiers.length > 0) {
        // Phase C-4: Tiered commission calculation
        const tier = this.findApplicableTier(grossAmount, rule.tiers);
        if (tier) {
          commissionAmount = (grossAmount * tier.percentageRate) / 100;
          tiersApplied[rule.id] = (tiersApplied[rule.id] || 0) + 1;
        }
      }
    } else if (party.partyType === 'supplier') {
      // Supplier: gross = basePrice * quantity, commission = 0, net = gross
      const basePrice = item.basePriceSnapshot ? parseFloat(item.basePriceSnapshot.toString()) : 0;
      grossAmount = basePrice * item.quantity;
      commissionAmount = 0;
    } else if (party.partyType === 'platform') {
      // Platform: gross = commission from seller, net = gross
      const sellerGross = parseFloat(item.totalPrice.toString());
      if (rule.type === 'percentage' && rule.percentageRate !== undefined) {
        grossAmount = (sellerGross * rule.percentageRate) / 100;
      } else if (rule.type === 'fixed' && rule.fixedAmount !== undefined) {
        grossAmount = rule.fixedAmount * item.quantity;
      } else if (rule.type === 'tiered' && rule.tiers && rule.tiers.length > 0) {
        // Phase C-4: Tiered commission for platform
        const tier = this.findApplicableTier(sellerGross, rule.tiers);
        if (tier) {
          grossAmount = (sellerGross * tier.percentageRate) / 100;
          tiersApplied[rule.id] = (tiersApplied[rule.id] || 0) + 1;
        }
      }
      commissionAmount = 0; // Platform doesn't pay commission
    } else if (party.partyType === 'partner') {
      // Phase C-3: Partner commission calculation
      // Partner: gross = referral commission based on seller's sale amount
      const sellerGross = parseFloat(item.totalPrice.toString());

      if (rule.type === 'percentage' && rule.percentageRate !== undefined) {
        grossAmount = (sellerGross * rule.percentageRate) / 100;
      } else if (rule.type === 'fixed' && rule.fixedAmount !== undefined) {
        grossAmount = rule.fixedAmount * item.quantity;
      } else if (rule.type === 'tiered' && rule.tiers && rule.tiers.length > 0) {
        // Phase C-4: Tiered commission for partner
        const tier = this.findApplicableTier(sellerGross, rule.tiers);
        if (tier) {
          grossAmount = (sellerGross * tier.percentageRate) / 100;
          tiersApplied[rule.id] = (tiersApplied[rule.id] || 0) + 1;
        }
      }

      commissionAmount = 0; // Partner doesn't pay commission (receives it)
    }

    const netAmount = grossAmount - commissionAmount;

    return { grossAmount, commissionAmount, netAmount };
  }

  /**
   * Create SettlementItem structure
   * Phase C-2: Memory object only (not persisted)
   */
  private createSettlementItem(
    order: Order,
    orderItem: OrderItemEntity,
    party: SettlementPartyContext,
    rule: CommissionRule,
    grossAmount: number,
    commissionAmount: number,
    netAmount: number
  ): SettlementItem {
    const item = new SettlementItem();

    // Basic fields
    item.settlementId = ''; // Will be set when Settlement is created
    item.orderId = order.id;
    item.orderItemId = orderItem.id;
    item.partyType = party.partyType;
    item.partyId = party.partyId;

    // Amounts
    item.grossAmount = grossAmount.toString();
    item.commissionAmountSnapshot = commissionAmount.toString();
    item.netAmount = netAmount.toString();

    // Product info
    item.productName = orderItem.productName;
    item.quantity = orderItem.quantity;
    item.salePriceSnapshot = orderItem.salePriceSnapshot?.toString() || orderItem.unitPrice.toString();
    item.basePriceSnapshot = orderItem.basePriceSnapshot?.toString();

    // Commission info
    item.commissionType = orderItem.commissionType;
    item.commissionRate = orderItem.commissionRate?.toString();

    // Reason and metadata
    item.reasonCode = 'order_completed';
    item.metadata = {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      productId: orderItem.productId,
    };

    // Seller/Supplier IDs
    item.sellerId = orderItem.sellerId;
    item.supplierId = orderItem.supplierId;

    // Phase C-2: Timestamps not set (memory object only)
    // item.createdAt = new Date();

    return item;
  }

  /**
   * Aggregate SettlementItems into Settlements by party
   */
  private aggregateSettlements(
    periodStart: Date,
    periodEnd: Date,
    items: SettlementItem[],
    parties: SettlementPartyContext[]
  ): Settlement[] {
    const settlements: Settlement[] = [];

    for (const party of parties) {
      const partyKey = `${party.partyType}:${party.partyId}`;
      const partyItems = items.filter(
        item => item.partyType === party.partyType && item.partyId === party.partyId
      );

      if (partyItems.length === 0) {
        continue;
      }

      // Calculate totals
      const totals = partyItems.reduce(
        (acc, item) => ({
          grossAmount: acc.grossAmount + parseFloat(item.grossAmount || '0'),
          commissionAmount: acc.commissionAmount + parseFloat(item.commissionAmountSnapshot || '0'),
          netAmount: acc.netAmount + parseFloat(item.netAmount || '0'),
        }),
        { grossAmount: 0, commissionAmount: 0, netAmount: 0 }
      );

      // Create Settlement structure
      const settlement = new Settlement();
      settlement.partyType = party.partyType;
      settlement.partyId = party.partyId;
      settlement.periodStart = periodStart;
      settlement.periodEnd = periodEnd;

      // Amounts (stored as strings for precision)
      settlement.totalSaleAmount = totals.grossAmount.toString();
      settlement.totalBaseAmount = '0'; // Phase C-2: Simple calculation
      settlement.totalCommissionAmount = totals.commissionAmount.toString();
      settlement.totalMarginAmount = (totals.grossAmount - totals.commissionAmount).toString();
      settlement.payableAmount = totals.netAmount.toString();

      // Status
      settlement.status = SettlementStatus.PENDING;

      // Metadata
      settlement.metadata = {
        settlementEngineVersion: 'v2',
        itemsCount: partyItems.length,
        currency: party.currency,
      };

      // Phase C-2: Timestamps not set (memory object only)
      // settlement.createdAt = new Date();
      // settlement.updatedAt = new Date();

      settlements.push(settlement);
    }

    return settlements;
  }

  /**
   * Calculate totals by party for diagnostics
   */
  private calculateTotalsByParty(settlements: Settlement[]): Record<string, string> {
    const totals: Record<string, string> = {};

    for (const settlement of settlements) {
      const key = `${settlement.partyType}:${settlement.partyId}`;
      totals[key] = settlement.payableAmount;
    }

    return totals;
  }

  /**
   * Return empty result structure
   */
  private emptyResult(): SettlementEngineV2Result {
    return {
      settlements: [],
      settlementItems: [],
      commissions: [],
      diagnostics: {
        ruleHits: {},
        totalsByParty: {},
        duplicatesDetected: false,
        tiersApplied: {},
      },
    };
  }

  /**
   * Find applicable tier for given amount
   * Phase C-4: Tiered commission helper
   *
   * @param amount - Gross amount to match against tiers
   * @param tiers - Array of commission tiers
   * @returns Matching tier or null
   */
  private findApplicableTier(
    amount: number,
    tiers: CommissionTier[]
  ): CommissionTier | null {
    for (const tier of tiers) {
      const minOk = amount >= tier.minAmount;
      const maxOk = tier.maxAmount == null || amount < tier.maxAmount;
      if (minOk && maxOk) {
        return tier;
      }
    }
    return null;
  }

  /**
   * Persist settlements to database with transaction
   * Phase C-3: Atomic DB write with rollback on error
   *
   * @param settlements - Settlement entities to persist
   * @param items - SettlementItem entities to persist
   * @returns Persisted entities with DB-generated IDs
   */
  private async persistSettlementsToDb(
    settlements: Settlement[],
    items: SettlementItem[]
  ): Promise<{ settlements: Settlement[]; items: SettlementItem[] }> {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      logger.info('[SettlementEngineV2] Starting DB transaction for persistence');

      // 1. Save Settlements first
      const savedSettlements: Settlement[] = [];
      for (const settlement of settlements) {
        const saved = await transactionalEntityManager.save(Settlement, settlement);
        savedSettlements.push(saved);
        logger.debug(`[SettlementEngineV2] Saved Settlement: ${saved.id} for ${saved.partyType}:${saved.partyId}`);
      }

      // 2. Link SettlementItems to saved Settlements and save
      const savedItems: SettlementItem[] = [];
      for (const item of items) {
        // Find corresponding settlement
        const settlement = savedSettlements.find(
          s => s.partyType === item.partyType && s.partyId === item.partyId
        );

        if (!settlement || !settlement.id) {
          throw new Error(
            `Cannot find saved Settlement for SettlementItem (${item.partyType}:${item.partyId})`
          );
        }

        // Link to settlement
        item.settlementId = settlement.id;

        // Save item
        const saved = await transactionalEntityManager.save(SettlementItem, item);
        savedItems.push(saved);
      }

      logger.info('[SettlementEngineV2] Transaction committed', {
        settlementsCount: savedSettlements.length,
        itemsCount: savedItems.length,
      });

      return {
        settlements: savedSettlements,
        items: savedItems,
      };
    });
  }

  /**
   * TODO P2-C Phase C-4: Calculate partner commission (standalone method)
   * Partner-specific commission calculation using v2 rules
   * This is a convenience method - actual logic is in calculatePartySettlements
   */
  // async calculatePartnerCommission(
  //   partnerId: string,
  //   period: { start: Date; end: Date },
  //   ruleSet: CommissionRuleSet
  // ): Promise<SettlementEngineV2Result> {
  //   // Implementation in Phase C-3
  // }

  /**
   * TODO P2-C Phase C-3: Calculate platform fees
   * Platform-specific fee calculation using v2 rules
   */
  // async calculatePlatformFees(
  //   period: { start: Date; end: Date },
  //   ruleSet: CommissionRuleSet
  // ): Promise<SettlementEngineV2Result> {
  //   // Implementation in Phase C-3
  // }

  /**
   * TODO P2-C Phase C-4: Compare v1 vs v2 results
   * Diagnostic method to compare v1 and v2 settlement results
   */
  // async compareWithV1(
  //   period: { start: Date; end: Date }
  // ): Promise<{
  //   v1Results: any;
  //   v2Results: SettlementEngineV2Result;
  //   differences: any[];
  // }> {
  //   // Implementation in Phase C-4
  // }
}
