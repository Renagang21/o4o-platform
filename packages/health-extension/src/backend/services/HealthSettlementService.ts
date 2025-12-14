/**
 * Health Settlement Service
 *
 * Health 제품 정산 관리
 * - Dropshipping Core 정산 로직 기반
 * - Health 제품 정산 필터링
 *
 * @package @o4o/health-extension
 */

import { DataSource, Repository } from 'typeorm';

// Core entity type references
interface Settlement {
  id: string;
  sellerId: string;
  supplierId?: string;
  orderId: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: string;
  settlementDate?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

interface Order {
  id: string;
  sellerId: string;
  totalAmount: number;
  status: string;
  metadata?: Record<string, any>;
}

export interface HealthSettlementDetail {
  id: string;
  sellerId: string;
  supplierId?: string;
  orderId: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: string;
  settlementDate?: string;
  createdAt?: string;
}

export interface HealthSettlementSummary {
  totalSettlements: number;
  pendingAmount: number;
  completedAmount: number;
  totalCommission: number;
  periodStart?: string;
  periodEnd?: string;
}

export class HealthSettlementService {
  private settlementRepo: Repository<Settlement>;
  private orderRepo: Repository<Order>;

  constructor(private dataSource: DataSource) {
    this.settlementRepo = dataSource.getRepository('Settlement') as Repository<Settlement>;
    this.orderRepo = dataSource.getRepository('Order') as Repository<Order>;
  }

  /**
   * Get settlement list for health products
   */
  async getSettlementList(
    filters: {
      sellerId?: string;
      supplierId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: { page: number; limit: number },
  ): Promise<{ items: HealthSettlementDetail[]; total: number }> {
    try {
      const qb = this.settlementRepo
        .createQueryBuilder('settlement')
        .where(`settlement.metadata->>'productType' = :type`, { type: 'HEALTH' });

      if (filters.sellerId) {
        qb.andWhere('settlement.sellerId = :sellerId', { sellerId: filters.sellerId });
      }

      if (filters.supplierId) {
        qb.andWhere('settlement.supplierId = :supplierId', { supplierId: filters.supplierId });
      }

      if (filters.status) {
        qb.andWhere('settlement.status = :status', { status: filters.status });
      }

      if (filters.startDate) {
        qb.andWhere('settlement.createdAt >= :startDate', { startDate: filters.startDate });
      }

      if (filters.endDate) {
        qb.andWhere('settlement.createdAt <= :endDate', { endDate: filters.endDate });
      }

      const total = await qb.getCount();
      const settlements = await qb
        .skip((pagination.page - 1) * pagination.limit)
        .take(pagination.limit)
        .orderBy('settlement.createdAt', 'DESC')
        .getMany();

      const items = settlements.map((s) => this.mapToDetail(s));

      return { items, total };
    } catch (error) {
      console.error('[HealthSettlement] Error fetching settlement list:', error);
      throw error;
    }
  }

  /**
   * Get settlement detail
   */
  async getSettlementDetail(settlementId: string): Promise<HealthSettlementDetail | null> {
    try {
      const settlement = await this.settlementRepo.findOne({
        where: { id: settlementId },
      });

      if (!settlement) {
        return null;
      }

      return this.mapToDetail(settlement);
    } catch (error) {
      console.error('[HealthSettlement] Error fetching settlement detail:', error);
      throw error;
    }
  }

  /**
   * Create settlement for health order
   */
  async createSettlement(
    orderId: string,
    commissionRate: number = 0.1,
  ): Promise<{ success: boolean; settlement?: HealthSettlementDetail; errors?: string[] }> {
    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
      });

      if (!order) {
        return { success: false, errors: ['주문을 찾을 수 없습니다'] };
      }

      if (order.metadata?.productType !== 'HEALTH') {
        return { success: false, errors: ['Health 제품 주문이 아닙니다'] };
      }

      if (order.status !== 'completed') {
        return { success: false, errors: ['완료된 주문만 정산할 수 있습니다'] };
      }

      // Check if settlement already exists
      const existingSettlement = await this.settlementRepo.findOne({
        where: { orderId },
      });

      if (existingSettlement) {
        return { success: false, errors: ['이미 정산된 주문입니다'] };
      }

      // Calculate amounts
      const amount = order.totalAmount;
      const commission = Math.round(amount * commissionRate);
      const netAmount = amount - commission;

      // Create settlement
      const settlement = this.settlementRepo.create({
        sellerId: order.sellerId,
        orderId: order.id,
        amount,
        commission,
        netAmount,
        status: 'pending',
        metadata: {
          productType: 'HEALTH',
          commissionRate,
        },
      });

      const savedSettlement = await this.settlementRepo.save(settlement);

      console.log(`[health-extension] Health Settlement created: ${savedSettlement.id}`);

      return {
        success: true,
        settlement: this.mapToDetail(savedSettlement),
      };
    } catch (error) {
      console.error('[HealthSettlement] Error creating settlement:', error);
      throw error;
    }
  }

  /**
   * Process settlement (mark as completed)
   */
  async processSettlement(
    settlementId: string,
    user: { id: string; role: string },
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const settlement = await this.settlementRepo.findOne({
        where: { id: settlementId },
      });

      if (!settlement) {
        return { success: false, errors: ['정산 내역을 찾을 수 없습니다'] };
      }

      if (settlement.status !== 'pending') {
        return { success: false, errors: ['대기 중인 정산만 처리할 수 있습니다'] };
      }

      await this.settlementRepo.update(settlementId, {
        status: 'completed',
        settlementDate: new Date(),
      });

      console.log(`[health-extension] Health Settlement ${settlementId} processed`);

      return { success: true };
    } catch (error) {
      console.error('[HealthSettlement] Error processing settlement:', error);
      throw error;
    }
  }

  /**
   * Get settlement summary for seller
   */
  async getSellerSettlementSummary(
    sellerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<HealthSettlementSummary> {
    try {
      const qb = this.settlementRepo
        .createQueryBuilder('settlement')
        .where('settlement.sellerId = :sellerId', { sellerId })
        .andWhere(`settlement.metadata->>'productType' = :type`, { type: 'HEALTH' });

      if (startDate) {
        qb.andWhere('settlement.createdAt >= :startDate', { startDate });
      }

      if (endDate) {
        qb.andWhere('settlement.createdAt <= :endDate', { endDate });
      }

      const settlements = await qb.getMany();

      const summary: HealthSettlementSummary = {
        totalSettlements: settlements.length,
        pendingAmount: settlements
          .filter((s) => s.status === 'pending')
          .reduce((sum, s) => sum + s.netAmount, 0),
        completedAmount: settlements
          .filter((s) => s.status === 'completed')
          .reduce((sum, s) => sum + s.netAmount, 0),
        totalCommission: settlements.reduce((sum, s) => sum + s.commission, 0),
        periodStart: startDate?.toISOString(),
        periodEnd: endDate?.toISOString(),
      };

      return summary;
    } catch (error) {
      console.error('[HealthSettlement] Error fetching settlement summary:', error);
      throw error;
    }
  }

  /**
   * Get supplier settlement summary
   */
  async getSupplierSettlementSummary(
    supplierId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<HealthSettlementSummary> {
    try {
      const qb = this.settlementRepo
        .createQueryBuilder('settlement')
        .where('settlement.supplierId = :supplierId', { supplierId })
        .andWhere(`settlement.metadata->>'productType' = :type`, { type: 'HEALTH' });

      if (startDate) {
        qb.andWhere('settlement.createdAt >= :startDate', { startDate });
      }

      if (endDate) {
        qb.andWhere('settlement.createdAt <= :endDate', { endDate });
      }

      const settlements = await qb.getMany();

      return {
        totalSettlements: settlements.length,
        pendingAmount: settlements
          .filter((s) => s.status === 'pending')
          .reduce((sum, s) => sum + s.amount, 0),
        completedAmount: settlements
          .filter((s) => s.status === 'completed')
          .reduce((sum, s) => sum + s.amount, 0),
        totalCommission: settlements.reduce((sum, s) => sum + s.commission, 0),
        periodStart: startDate?.toISOString(),
        periodEnd: endDate?.toISOString(),
      };
    } catch (error) {
      console.error('[HealthSettlement] Error fetching supplier settlement summary:', error);
      throw error;
    }
  }

  /**
   * Map settlement to detail
   */
  private mapToDetail(settlement: Settlement): HealthSettlementDetail {
    return {
      id: settlement.id,
      sellerId: settlement.sellerId,
      supplierId: settlement.supplierId,
      orderId: settlement.orderId,
      amount: settlement.amount,
      commission: settlement.commission,
      netAmount: settlement.netAmount,
      status: settlement.status,
      settlementDate: settlement.settlementDate?.toISOString(),
      createdAt: settlement.createdAt?.toISOString(),
    };
  }
}

export default HealthSettlementService;
