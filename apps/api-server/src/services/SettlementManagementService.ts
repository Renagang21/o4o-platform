/**
 * Phase PD-5: Settlement Management Service
 *
 * Handles settlement calculation and management for sellers, suppliers, and platform
 * This is separate from SettlementService which handles commission calculation
 */

import { Repository, Between, In } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import {
  Settlement,
  SettlementPartyType,
  SettlementStatus,
} from '../entities/Settlement.js';
import { SettlementItem } from '../entities/SettlementItem.js';
import { Order, OrderStatus } from '../entities/Order.js';
import { notificationService } from './NotificationService.js';
import logger from '../utils/logger.js';

export interface SettlementFilters {
  page?: number;
  limit?: number;
  status?: SettlementStatus;
  partyType?: SettlementPartyType;
  periodStart?: Date;
  periodEnd?: Date;
  search?: string; // Search by party name or ID
}

export interface SettlementPreview {
  partyType: SettlementPartyType;
  partyId: string;
  periodStart: Date;
  periodEnd: Date;
  totalSaleAmount: number;
  totalBaseAmount: number;
  totalCommissionAmount: number;
  totalMarginAmount: number;
  payableAmount: number;
  orderCount: number;
  itemCount: number;
}

export interface CreateSettlementRequest {
  partyType: SettlementPartyType;
  partyId: string;
  periodStart: Date;
  periodEnd: Date;
  notes?: string;
}

export class SettlementManagementService {
  private settlementRepo: Repository<Settlement>;
  private settlementItemRepo: Repository<SettlementItem>;
  private orderRepo: Repository<Order>;

  constructor() {
    this.settlementRepo = AppDataSource.getRepository(Settlement);
    this.settlementItemRepo = AppDataSource.getRepository(SettlementItem);
    this.orderRepo = AppDataSource.getRepository(Order);
  }

  /**
   * Calculate settlement preview for a party and period
   * Does NOT create settlement record, just calculates what it would be
   */
  async calculateSettlementPreview(
    partyType: SettlementPartyType,
    partyId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SettlementPreview> {
    // Fetch orders in the period that have been delivered (settleable)
    const orders = await this.orderRepo.find({
      where: {
        status: In([OrderStatus.DELIVERED]),
        createdAt: Between(periodStart, periodEnd),
      },
    });

    // Filter orders and items relevant to this party
    let totalSaleAmount = 0;
    let totalBaseAmount = 0;
    let totalCommissionAmount = 0;
    let totalMarginAmount = 0;
    let itemCount = 0;
    let orderCount = 0;

    const relevantOrderIds = new Set<string>();

    for (const order of orders) {
      let hasRelevantItems = false;

      for (const item of order.items) {
        // Check if item belongs to this party
        let isRelevant = false;

        if (partyType === 'seller' && item.sellerId === partyId) {
          isRelevant = true;
        } else if (partyType === 'supplier' && item.supplierId === partyId) {
          isRelevant = true;
        } else if (partyType === 'platform') {
          // Platform gets commission from all items
          isRelevant = true;
        }

        if (isRelevant) {
          hasRelevantItems = true;
          itemCount++;

          const quantity = item.quantity || 1;
          const salePrice = item.salePriceSnapshot || item.unitPrice || 0;
          const basePrice = item.basePriceSnapshot || 0;
          const commissionAmount = item.commissionAmount || 0;

          const itemSaleAmount = salePrice * quantity;
          const itemBaseAmount = basePrice * quantity;
          const itemMargin = itemSaleAmount - itemBaseAmount;

          totalSaleAmount += itemSaleAmount;
          totalBaseAmount += itemBaseAmount;
          totalCommissionAmount += commissionAmount;
          totalMarginAmount += itemMargin;

          relevantOrderIds.add(order.id);
        }
      }

      if (hasRelevantItems) {
        orderCount++;
      }
    }

    // Calculate payable amount based on party type
    let payableAmount = 0;

    if (partyType === 'seller') {
      // Seller gets: margin - commission
      payableAmount = totalMarginAmount - totalCommissionAmount;
    } else if (partyType === 'supplier') {
      // Supplier gets: base amount
      payableAmount = totalBaseAmount;
    } else if (partyType === 'platform') {
      // Platform gets: commission
      payableAmount = totalCommissionAmount;
    }

    logger.info('[PD-5] Settlement preview calculated', {
      partyType,
      partyId,
      periodStart,
      periodEnd,
      payableAmount,
      orderCount,
      itemCount,
    });

    return {
      partyType,
      partyId,
      periodStart,
      periodEnd,
      totalSaleAmount,
      totalBaseAmount,
      totalCommissionAmount,
      totalMarginAmount,
      payableAmount,
      orderCount,
      itemCount,
    };
  }

  /**
   * Create a settlement record from preview calculation
   * Also creates SettlementItem records for traceability
   */
  async createSettlement(
    request: CreateSettlementRequest
  ): Promise<Settlement> {
    const { partyType, partyId, periodStart, periodEnd, notes } = request;

    // Check if settlement already exists for this period and party
    const existing = await this.settlementRepo.findOne({
      where: {
        partyType,
        partyId,
        periodStart,
        periodEnd,
      },
    });

    if (existing) {
      throw new Error(
        `Settlement already exists for ${partyType} ${partyId} in period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`
      );
    }

    // Calculate preview
    const preview = await this.calculateSettlementPreview(
      partyType,
      partyId,
      periodStart,
      periodEnd
    );

    // Create settlement record
    const settlement = this.settlementRepo.create({
      partyType,
      partyId,
      periodStart,
      periodEnd,
      totalSaleAmount: preview.totalSaleAmount.toString(),
      totalBaseAmount: preview.totalBaseAmount.toString(),
      totalCommissionAmount: preview.totalCommissionAmount.toString(),
      totalMarginAmount: preview.totalMarginAmount.toString(),
      payableAmount: preview.payableAmount.toString(),
      status: SettlementStatus.PENDING,
      notes,
    });

    await this.settlementRepo.save(settlement);

    // Create SettlementItem records
    const orders = await this.orderRepo.find({
      where: {
        status: In([OrderStatus.DELIVERED]),
        createdAt: Between(periodStart, periodEnd),
      },
    });

    const settlementItems: SettlementItem[] = [];

    for (const order of orders) {
      for (const item of order.items) {
        // Check if item belongs to this party
        let isRelevant = false;

        if (partyType === 'seller' && item.sellerId === partyId) {
          isRelevant = true;
        } else if (partyType === 'supplier' && item.supplierId === partyId) {
          isRelevant = true;
        } else if (partyType === 'platform') {
          isRelevant = true;
        }

        if (isRelevant) {
          const quantity = item.quantity || 1;
          const salePrice = item.salePriceSnapshot || item.unitPrice || 0;
          const basePrice = item.basePriceSnapshot || 0;
          const commissionAmount = item.commissionAmount || 0;
          const marginAmount = item.marginAmountSnapshot || 0;

          // Phase SETTLE-1: Extract PD-2 commission policy fields from OrderItem
          const commissionType = item.commissionType || null;
          const commissionRate = item.commissionRate || null;

          const settlementItem = this.settlementItemRepo.create({
            settlementId: settlement.id,
            orderId: order.id,
            orderItemId: item.id,
            productName: item.productName,
            quantity,
            salePriceSnapshot: salePrice.toString(),
            basePriceSnapshot: basePrice.toString(),
            commissionAmountSnapshot: commissionAmount.toString(),
            marginAmountSnapshot: marginAmount.toString(),
            totalSaleAmount: (salePrice * quantity).toString(),
            totalBaseAmount: (basePrice * quantity).toString(),
            sellerId: item.sellerId,
            supplierId: item.supplierId,
            // Phase SETTLE-1: Store commission policy for audit trail
            commissionType: commissionType,
            commissionRate: commissionRate ? commissionRate.toString() : null,
          });

          settlementItems.push(settlementItem);
        }
      }
    }

    if (settlementItems.length > 0) {
      await this.settlementItemRepo.save(settlementItems);
    }

    logger.info('[PD-5] Settlement created', {
      settlementId: settlement.id,
      partyType,
      partyId,
      payableAmount: settlement.payableAmount,
      itemCount: settlementItems.length,
    });

    // Phase PD-7: Send settlement.new_pending notification
    if (partyType !== 'platform') {
      const partyTypeLabel = partyType === 'seller' ? '판매자' : '공급자';
      const formattedPeriod = `${periodStart.toLocaleDateString('ko-KR')} ~ ${periodEnd.toLocaleDateString('ko-KR')}`;

      notificationService.createNotification({
        userId: partyId,
        type: 'settlement.new_pending',
        title: '새로운 정산 내역이 생성되었습니다',
        message: `${partyTypeLabel} 정산 (${formattedPeriod}) - ${parseFloat(settlement.payableAmount).toLocaleString()}원`,
        metadata: {
          settlementId: settlement.id,
          partyType,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          payableAmount: settlement.payableAmount,
          orderCount: preview.orderCount,
          itemCount: settlementItems.length,
        },
        channel: 'in_app',
      }).catch((err) => {
        logger.error('[PD-7] Failed to send settlement notification:', err);
      });

      logger.info('[PD-7] Settlement notification sent', {
        settlementId: settlement.id,
        partyType,
        partyId,
      });
    }

    return settlement;
  }

  /**
   * Get settlements for a party with filters
   */
  async getSettlements(
    partyType: SettlementPartyType,
    partyId: string,
    filters: SettlementFilters = {}
  ): Promise<{ settlements: Settlement[]; total: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.settlementRepo
      .createQueryBuilder('settlement')
      .where('settlement.partyType = :partyType', { partyType })
      .andWhere('settlement.partyId = :partyId', { partyId });

    if (filters.status) {
      queryBuilder.andWhere('settlement.status = :status', {
        status: filters.status,
      });
    }

    if (filters.periodStart) {
      queryBuilder.andWhere('settlement.periodStart >= :periodStart', {
        periodStart: filters.periodStart,
      });
    }

    if (filters.periodEnd) {
      queryBuilder.andWhere('settlement.periodEnd <= :periodEnd', {
        periodEnd: filters.periodEnd,
      });
    }

    queryBuilder.orderBy('settlement.createdAt', 'DESC').skip(skip).take(limit);

    const [settlements, total] = await queryBuilder.getManyAndCount();

    return {
      settlements,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all settlements (admin only) with filters
   */
  async getAllSettlements(
    filters: SettlementFilters = {}
  ): Promise<{ settlements: Settlement[]; total: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.settlementRepo
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.party', 'party');

    if (filters.partyType) {
      queryBuilder.andWhere('settlement.partyType = :partyType', {
        partyType: filters.partyType,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('settlement.status = :status', {
        status: filters.status,
      });
    }

    if (filters.periodStart) {
      queryBuilder.andWhere('settlement.periodStart >= :periodStart', {
        periodStart: filters.periodStart,
      });
    }

    if (filters.periodEnd) {
      queryBuilder.andWhere('settlement.periodEnd <= :periodEnd', {
        periodEnd: filters.periodEnd,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(settlement.partyId ILIKE :search OR party.username ILIKE :search OR party.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    queryBuilder.orderBy('settlement.createdAt', 'DESC').skip(skip).take(limit);

    const [settlements, total] = await queryBuilder.getManyAndCount();

    return {
      settlements,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get settlement by ID with items
   */
  async getSettlementById(settlementId: string): Promise<Settlement | null> {
    return this.settlementRepo.findOne({
      where: { id: settlementId },
      relations: ['items', 'party'],
    });
  }

  /**
   * Mark settlement as paid
   */
  async markAsPaid(settlementId: string, paidAt?: Date): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    settlement.markAsPaid(paidAt);
    const saved = await this.settlementRepo.save(settlement);

    logger.info('[PD-5] Settlement marked as paid', {
      settlementId,
      paidAt: saved.paidAt,
    });

    return saved;
  }

  /**
   * Cancel settlement
   */
  async cancelSettlement(settlementId: string): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    settlement.cancel();
    const saved = await this.settlementRepo.save(settlement);

    logger.info('[PD-5] Settlement cancelled', {
      settlementId,
    });

    return saved;
  }

  /**
   * Update settlement status to processing
   */
  async markAsProcessing(settlementId: string): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    if (!settlement.canModify()) {
      throw new Error(`Settlement ${settlementId} cannot be modified`);
    }

    settlement.status = SettlementStatus.PROCESSING;
    const saved = await this.settlementRepo.save(settlement);

    logger.info('[PD-5] Settlement marked as processing', {
      settlementId,
    });

    return saved;
  }

  /**
   * Batch create settlements for all parties in a period
   * Used by admin to run monthly settlements
   */
  async batchCreateSettlements(
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    created: Settlement[];
    errors: { partyId: string; error: string }[];
  }> {
    const created: Settlement[] = [];
    const errors: { partyId: string; error: string }[] = [];

    // Get all orders in period
    const orders = await this.orderRepo.find({
      where: {
        status: In([OrderStatus.DELIVERED]),
        createdAt: Between(periodStart, periodEnd),
      },
    });

    // Collect unique party IDs
    const sellerIds = new Set<string>();
    const supplierIds = new Set<string>();

    for (const order of orders) {
      for (const item of order.items) {
        if (item.sellerId) {
          sellerIds.add(item.sellerId);
        }
        if (item.supplierId) {
          supplierIds.add(item.supplierId);
        }
      }
    }

    logger.info('[PD-5] Batch settlement creation started', {
      periodStart,
      periodEnd,
      sellerCount: sellerIds.size,
      supplierCount: supplierIds.size,
      orderCount: orders.length,
    });

    // Create settlements for each seller
    for (const sellerId of sellerIds) {
      try {
        const settlement = await this.createSettlement({
          partyType: 'seller',
          partyId: sellerId,
          periodStart,
          periodEnd,
        });
        created.push(settlement);
      } catch (error: any) {
        errors.push({
          partyId: sellerId,
          error: error.message,
        });
      }
    }

    // Create settlements for each supplier
    for (const supplierId of supplierIds) {
      try {
        const settlement = await this.createSettlement({
          partyType: 'supplier',
          partyId: supplierId,
          periodStart,
          periodEnd,
        });
        created.push(settlement);
      } catch (error: any) {
        errors.push({
          partyId: supplierId,
          error: error.message,
        });
      }
    }

    // Create platform settlement
    try {
      const platformSettlement = await this.createSettlement({
        partyType: 'platform',
        partyId: 'platform', // Special ID for platform
        periodStart,
        periodEnd,
      });
      created.push(platformSettlement);
    } catch (error: any) {
      errors.push({
        partyId: 'platform',
        error: error.message,
      });
    }

    logger.info('[PD-5] Batch settlement creation completed', {
      createdCount: created.length,
      errorCount: errors.length,
    });

    return { created, errors };
  }

  /**
   * Update settlement status (Admin only)
   * Phase SETTLE-ADMIN
   */
  async updateSettlementStatus(
    settlementId: string,
    status: SettlementStatus,
    notes?: string
  ): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    settlement.status = status;
    if (notes !== undefined) {
      settlement.notes = notes;
    }

    const saved = await this.settlementRepo.save(settlement);

    logger.info('[SETTLE-ADMIN] Settlement status updated', {
      settlementId,
      status,
      hasNotes: !!notes,
    });

    return saved;
  }

  /**
   * Update settlement memo (Admin only)
   * Phase SETTLE-ADMIN
   */
  async updateSettlementMemo(
    settlementId: string,
    memo: string
  ): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    settlement.memo = memo;
    const saved = await this.settlementRepo.save(settlement);

    logger.info('[SETTLE-ADMIN] Settlement memo updated', {
      settlementId,
      memoLength: memo.length,
    });

    return saved;
  }
}
