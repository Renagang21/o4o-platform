/**
 * SettlementReadService
 * R-8 Phase 1 - Task 3: Consolidate Settlement/Commission Read Logic
 *
 * Centralizes reading of settlement and commission data for:
 * - Seller commission summaries
 * - Supplier revenue/commission summaries
 * - Settlement record queries
 *
 * NOTE: This service ONLY reads data - it does NOT calculate commissions or settlements.
 * Calculation logic remains in SettlementService and SettlementManagementService.
 *
 * Created: 2025-01-23
 */

import { Repository, Between, In } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { Order, OrderStatus, PaymentStatus } from '../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../entities/OrderItem.js';
import { Settlement, SettlementStatus } from '../../dropshipping/entities/Settlement.js';
import logger from '../../../utils/logger.js';
import { cacheService, CacheKeys, getCacheConfig, generateRangeKey } from '../../../cache/index.js';

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

/**
 * Commission summary for a seller
 */
export interface SellerCommissionSummary {
  totalCommission: number;
  totalSales: number;
  totalOrders: number;
  totalItems: number;
  averageCommissionRate: number;
  commissionByOrder: Array<{
    orderNumber: string;
    orderDate: Date;
    salesAmount: number;
    commissionAmount: number;
    commissionRate: number;
    status: OrderStatus;
  }>;
}

/**
 * Revenue/commission summary for a supplier
 */
export interface SupplierCommissionSummary {
  totalRevenue: number; // Total base price revenue
  totalMargin: number; // Total margin (if available)
  totalOrders: number;
  totalItems: number;
  revenueByOrder: Array<{
    orderNumber: string;
    orderDate: Date;
    revenueAmount: number;
    itemCount: number;
    status: OrderStatus;
  }>;
}

/**
 * Settlement summary aggregated data
 */
export interface SettlementSummary {
  totalPending: number;
  totalPaid: number;
  totalProcessing: number;
  settlementCount: number;
  lastSettlementDate?: Date;
}

export class SettlementReadService {
  private orderRepository: Repository<Order>;
  private settlementRepository: Repository<Settlement>;

  constructor() {
    this.orderRepository = AppDataSource.getRepository(Order);
    this.settlementRepository = AppDataSource.getRepository(Settlement);
  }

  /**
   * Get commission summary for a seller
   * Consolidates logic from SellerDashboardService.getCommissionDetailsForSeller()
   *
   * R-8-6: Load orders with itemsRelation
   * R-8-7: Added caching with 5-minute TTL
   */
  async getSellerCommissionSummary(
    sellerId: string,
    dateRange?: DateRangeFilter
  ): Promise<SellerCommissionSummary> {
    try {
      // R-8-7: Check cache first
      const rangeKey = generateRangeKey(dateRange);
      const cacheKey = CacheKeys.SELLER_COMMISSION_SUMMARY(
        sellerId,
        dateRange?.from?.toISOString().split('T')[0],
        dateRange?.to?.toISOString().split('T')[0]
      );

      const cached = await cacheService.get<SellerCommissionSummary>(cacheKey);
      if (cached) {
        logger.debug(`[SettlementReadService] Cache HIT for seller commission: ${sellerId}`);
        return cached;
      }

      // Build where clause
      const where: any = {
        paymentStatus: In([PaymentStatus.COMPLETED])
      };

      if (dateRange?.from || dateRange?.to) {
        where.orderDate = Between(
          dateRange.from || new Date('2020-01-01'),
          dateRange.to || new Date()
        );
      }

      // R-8-6: Fetch completed orders (with itemsRelation loaded)
      const orders = await this.orderRepository.find({
        where,
        order: { orderDate: 'DESC' },
        relations: ['itemsRelation']
      });

      // Process orders with seller's items
      const commissionByOrder = [];
      let totalCommission = 0;
      let totalSales = 0;
      let totalOrders = 0;
      let totalItems = 0;

      for (const order of orders) {
        // R-8-6: Use itemsRelation instead of items
        const orderItems = order.itemsRelation || [];
        const sellerItems = orderItems.filter(
          (item: OrderItemEntity) => item.sellerId === sellerId
        );

        if (sellerItems.length > 0) {
          totalOrders++;

          const salesAmount = sellerItems.reduce(
            (sum, item) => sum + item.totalPrice,
            0
          );
          totalSales += salesAmount;

          // Use actual commission amount from order items
          const commissionAmount = sellerItems.reduce(
            (sum, item) => sum + (item.commissionAmount || 0),
            0
          );
          totalCommission += commissionAmount;

          // Count items
          const itemCount = sellerItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          totalItems += itemCount;

          // Calculate effective commission rate for this order
          const effectiveCommissionRate = salesAmount > 0
            ? commissionAmount / salesAmount
            : 0;

          commissionByOrder.push({
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            salesAmount: Math.round(salesAmount),
            commissionAmount: Math.round(commissionAmount),
            commissionRate: effectiveCommissionRate,
            status: order.status
          });
        }
      }

      // Calculate average commission rate across all orders
      const averageCommissionRate = totalSales > 0
        ? totalCommission / totalSales
        : 0;

      logger.debug('[SettlementReadService] Seller commission summary retrieved', {
        sellerId,
        totalCommission,
        totalOrders
      });

      const summary: SellerCommissionSummary = {
        totalCommission: Math.round(totalCommission),
        totalSales: Math.round(totalSales),
        totalOrders,
        totalItems,
        averageCommissionRate,
        commissionByOrder
      };

      // R-8-7: Cache the result (5 minutes TTL)
      const config = getCacheConfig();
      await cacheService.set(cacheKey, summary, config.ttl.medium);
      logger.debug(`[SettlementReadService] Cached seller commission: ${sellerId}`);

      return summary;
    } catch (error) {
      logger.error('[SettlementReadService] Failed to get seller commission summary:', error);
      throw error;
    }
  }

  /**
   * Get revenue/commission summary for a supplier
   * Consolidates logic from SupplierDashboardService.getRevenueDetailsForSupplier()
   *
   * R-8-6: Load orders with itemsRelation
   * R-8-7: Added caching with 5-minute TTL
   */
  async getSupplierCommissionSummary(
    supplierId: string,
    dateRange?: DateRangeFilter
  ): Promise<SupplierCommissionSummary> {
    try {
      // R-8-7: Check cache first
      const rangeKey = generateRangeKey(dateRange);
      const cacheKey = CacheKeys.SUPPLIER_COMMISSION_SUMMARY(
        supplierId,
        dateRange?.from?.toISOString().split('T')[0],
        dateRange?.to?.toISOString().split('T')[0]
      );

      const cached = await cacheService.get<SupplierCommissionSummary>(cacheKey);
      if (cached) {
        logger.debug(`[SettlementReadService] Cache HIT for supplier commission: ${supplierId}`);
        return cached;
      }

      // Build where clause
      const where: any = {
        paymentStatus: In([PaymentStatus.COMPLETED])
      };

      if (dateRange?.from || dateRange?.to) {
        where.orderDate = Between(
          dateRange.from || new Date('2020-01-01'),
          dateRange.to || new Date()
        );
      }

      // R-8-6: Fetch completed orders (with itemsRelation loaded)
      const orders = await this.orderRepository.find({
        where,
        order: { orderDate: 'DESC' },
        relations: ['itemsRelation']
      });

      // Process orders with supplier's items
      const revenueByOrder = [];
      let totalRevenue = 0;
      let totalMargin = 0;
      let totalOrders = 0;
      let totalItems = 0;

      for (const order of orders) {
        // R-8-6: Use itemsRelation instead of items
        const orderItems = order.itemsRelation || [];
        const supplierItems = orderItems.filter(
          (item: OrderItemEntity) => item.supplierId === supplierId
        );

        if (supplierItems.length > 0) {
          totalOrders++;

          // Calculate supplier's revenue (base price)
          const revenueAmount = supplierItems.reduce(
            (sum, item) => sum + (item.basePriceSnapshot || item.unitPrice) * item.quantity,
            0
          );
          totalRevenue += revenueAmount;

          // Calculate margin if available
          const marginAmount = supplierItems.reduce(
            (sum, item) => {
              const salePrice = item.salePriceSnapshot || item.unitPrice;
              const basePrice = item.basePriceSnapshot || item.unitPrice;
              return sum + (salePrice - basePrice) * item.quantity;
            },
            0
          );
          totalMargin += marginAmount;

          // Count items
          const itemCount = supplierItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          totalItems += itemCount;

          revenueByOrder.push({
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            revenueAmount: Math.round(revenueAmount),
            itemCount,
            status: order.status
          });
        }
      }

      logger.debug('[SettlementReadService] Supplier commission summary retrieved', {
        supplierId,
        totalRevenue,
        totalOrders
      });

      const summary: SupplierCommissionSummary = {
        totalRevenue: Math.round(totalRevenue),
        totalMargin: Math.round(totalMargin),
        totalOrders,
        totalItems,
        revenueByOrder
      };

      // R-8-7: Cache the result (5 minutes TTL)
      const config = getCacheConfig();
      await cacheService.set(cacheKey, summary, config.ttl.medium);
      logger.debug(`[SettlementReadService] Cached supplier commission: ${supplierId}`);

      return summary;
    } catch (error) {
      logger.error('[SettlementReadService] Failed to get supplier commission summary:', error);
      throw error;
    }
  }

  /**
   * Get settlement summary statistics for a party
   * Useful for dashboard overview cards
   * R-8-7: Added caching with 5-minute TTL
   */
  async getSettlementSummary(
    partyType: 'seller' | 'supplier' | 'platform',
    partyId: string,
    dateRange?: DateRangeFilter
  ): Promise<SettlementSummary> {
    try {
      // R-8-7: Check cache first
      const rangeKey = generateRangeKey(dateRange);
      const cacheKey = `${CacheKeys.SETTLEMENT_SUMMARY(partyType, partyId)}:${rangeKey}`;

      const cached = await cacheService.get<SettlementSummary>(cacheKey);
      if (cached) {
        logger.debug(`[SettlementReadService] Cache HIT for settlement summary: ${partyType}:${partyId}`);
        return cached;
      }

      // Build where clause
      const where: any = {
        partyType,
        partyId
      };

      if (dateRange?.from || dateRange?.to) {
        where.periodStart = Between(
          dateRange.from || new Date('2020-01-01'),
          dateRange.to || new Date()
        );
      }

      // Fetch settlements
      const settlements = await this.settlementRepository.find({
        where,
        order: { createdAt: 'DESC' }
      });

      // Aggregate by status
      let totalPending = 0;
      let totalPaid = 0;
      let totalProcessing = 0;
      let lastSettlementDate: Date | undefined = undefined;

      for (const settlement of settlements) {
        const amount = parseFloat(settlement.payableAmount);

        switch (settlement.status) {
          case SettlementStatus.PENDING:
            totalPending += amount;
            break;
          case SettlementStatus.PAID:
            totalPaid += amount;
            break;
          case SettlementStatus.PROCESSING:
            totalProcessing += amount;
            break;
        }

        // Track most recent settlement date
        if (!lastSettlementDate || settlement.createdAt > lastSettlementDate) {
          lastSettlementDate = settlement.createdAt;
        }
      }

      logger.debug('[SettlementReadService] Settlement summary retrieved', {
        partyType,
        partyId,
        settlementCount: settlements.length
      });

      const summary: SettlementSummary = {
        totalPending: Math.round(totalPending),
        totalPaid: Math.round(totalPaid),
        totalProcessing: Math.round(totalProcessing),
        settlementCount: settlements.length,
        lastSettlementDate
      };

      // R-8-7: Cache the result (5 minutes TTL)
      const config = getCacheConfig();
      await cacheService.set(cacheKey, summary, config.ttl.medium);
      logger.debug(`[SettlementReadService] Cached settlement summary: ${partyType}:${partyId}`);

      return summary;
    } catch (error) {
      logger.error('[SettlementReadService] Failed to get settlement summary:', error);
      throw error;
    }
  }

  /**
   * Get settlements for a party with pagination
   * Simplified read-only version of SettlementManagementService.getSettlements()
   */
  async getSettlementsForParty(
    partyType: 'seller' | 'supplier' | 'platform',
    partyId: string,
    options: {
      status?: SettlementStatus;
      dateRange?: DateRangeFilter;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ settlements: Settlement[]; total: number; totalPages: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      // Build query
      const queryBuilder = this.settlementRepository
        .createQueryBuilder('settlement')
        .where('settlement.partyType = :partyType', { partyType })
        .andWhere('settlement.partyId = :partyId', { partyId });

      if (options.status) {
        queryBuilder.andWhere('settlement.status = :status', {
          status: options.status
        });
      }

      if (options.dateRange?.from || options.dateRange?.to) {
        queryBuilder.andWhere('settlement.periodStart >= :from', {
          from: options.dateRange.from || new Date('2020-01-01')
        });
        queryBuilder.andWhere('settlement.periodEnd <= :to', {
          to: options.dateRange.to || new Date()
        });
      }

      queryBuilder
        .orderBy('settlement.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [settlements, total] = await queryBuilder.getManyAndCount();

      logger.debug('[SettlementReadService] Settlements retrieved for party', {
        partyType,
        partyId,
        total,
        page
      });

      return {
        settlements,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('[SettlementReadService] Failed to get settlements for party:', error);
      throw error;
    }
  }

  /**
   * Get settlement overview for dashboard
   * Phase B-4 Step 6: Aggregate settlement statistics across all parties
   *
   * Provides high-level overview for admin dashboard:
   * - Total settlements count
   * - Total amount by status (pending, processing, paid)
   * - Settlement distribution by party type
   */
  async getSettlementOverview(
    dateRange?: DateRangeFilter
  ): Promise<{
    totalSettlements: number;
    totalPendingAmount: number;
    totalProcessingAmount: number;
    totalPaidAmount: number;
    settlementsByPartyType: Record<string, number>;
    settlementsByStatus: Record<string, number>;
  }> {
    try {
      // Build where clause
      const where: any = {};

      if (dateRange?.from || dateRange?.to) {
        where.periodStart = Between(
          dateRange.from || new Date('2020-01-01'),
          dateRange.to || new Date()
        );
      }

      // Fetch all settlements in range
      const settlements = await this.settlementRepository.find({ where });

      // Aggregate statistics
      let totalPendingAmount = 0;
      let totalProcessingAmount = 0;
      let totalPaidAmount = 0;
      const settlementsByPartyType: Record<string, number> = {};
      const settlementsByStatus: Record<string, number> = {};

      for (const settlement of settlements) {
        const amount = parseFloat(settlement.payableAmount || '0');

        // Aggregate by status
        switch (settlement.status) {
          case SettlementStatus.PENDING:
            totalPendingAmount += amount;
            break;
          case SettlementStatus.PROCESSING:
            totalProcessingAmount += amount;
            break;
          case SettlementStatus.PAID:
            totalPaidAmount += amount;
            break;
        }

        // Count by party type
        settlementsByPartyType[settlement.partyType] =
          (settlementsByPartyType[settlement.partyType] || 0) + 1;

        // Count by status
        settlementsByStatus[settlement.status] =
          (settlementsByStatus[settlement.status] || 0) + 1;
      }

      logger.debug('[SettlementReadService] Settlement overview retrieved', {
        totalSettlements: settlements.length,
        totalPendingAmount,
        totalPaidAmount
      });

      return {
        totalSettlements: settlements.length,
        totalPendingAmount: Math.round(totalPendingAmount),
        totalProcessingAmount: Math.round(totalProcessingAmount),
        totalPaidAmount: Math.round(totalPaidAmount),
        settlementsByPartyType,
        settlementsByStatus
      };
    } catch (error) {
      logger.error('[SettlementReadService] Failed to get settlement overview:', error);
      throw error;
    }
  }

  /**
   * Get daily settlement totals for trend analysis
   * Phase B-4 Step 6: Group settlements by day for dashboard charts
   *
   * Useful for:
   * - Revenue trend charts
   * - Daily settlement volume tracking
   * - Settlement processing patterns
   */
  async getDailySettlementTotals(
    dateRange: DateRangeFilter
  ): Promise<Array<{
    date: string;
    totalAmount: number;
    totalSettlements: number;
    pendingAmount: number;
    processingAmount: number;
    paidAmount: number;
  }>> {
    try {
      const startDate = dateRange.from || new Date('2020-01-01');
      const endDate = dateRange.to || new Date();

      // Fetch settlements in date range
      const settlements = await this.settlementRepository.find({
        where: {
          periodStart: Between(startDate, endDate)
        },
        order: { periodStart: 'ASC' }
      });

      // Group by date
      const dailyTotals = new Map<string, {
        totalAmount: number;
        totalSettlements: number;
        pendingAmount: number;
        processingAmount: number;
        paidAmount: number;
      }>();

      for (const settlement of settlements) {
        const dateKey = settlement.periodStart.toISOString().split('T')[0];
        const amount = parseFloat(settlement.payableAmount || '0');

        if (!dailyTotals.has(dateKey)) {
          dailyTotals.set(dateKey, {
            totalAmount: 0,
            totalSettlements: 0,
            pendingAmount: 0,
            processingAmount: 0,
            paidAmount: 0
          });
        }

        const day = dailyTotals.get(dateKey)!;
        day.totalAmount += amount;
        day.totalSettlements += 1;

        switch (settlement.status) {
          case SettlementStatus.PENDING:
            day.pendingAmount += amount;
            break;
          case SettlementStatus.PROCESSING:
            day.processingAmount += amount;
            break;
          case SettlementStatus.PAID:
            day.paidAmount += amount;
            break;
        }
      }

      // Convert map to array
      const result = Array.from(dailyTotals.entries()).map(([date, totals]) => ({
        date,
        totalAmount: Math.round(totals.totalAmount),
        totalSettlements: totals.totalSettlements,
        pendingAmount: Math.round(totals.pendingAmount),
        processingAmount: Math.round(totals.processingAmount),
        paidAmount: Math.round(totals.paidAmount)
      }));

      logger.debug('[SettlementReadService] Daily settlement totals retrieved', {
        daysCount: result.length,
        startDate,
        endDate
      });

      return result;
    } catch (error) {
      logger.error('[SettlementReadService] Failed to get daily settlement totals:', error);
      throw error;
    }
  }
}
