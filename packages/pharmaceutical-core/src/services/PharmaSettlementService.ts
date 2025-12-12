/**
 * PharmaSettlementService
 *
 * 의약품 B2B 정산 관리 서비스
 *
 * @package @o4o/pharmaceutical-core
 */

import { Repository, Between, In } from 'typeorm';
import {
  PharmaSettlementBatch,
  PharmaSettlementStatus,
  PharmaSettlementType,
} from '../entities/PharmaSettlementBatch.entity.js';
import { PharmaOrder, PharmaOrderStatus, PharmaPaymentStatus } from '../entities/PharmaOrder.entity.js';

export interface CreateSettlementBatchDto {
  settlementType: PharmaSettlementType;
  targetId: string;
  periodStart: Date;
  periodEnd: Date;
  platformFeeRate?: number; // 기본 2%
}

export interface SettlementBatchFilter {
  settlementType?: PharmaSettlementType;
  targetId?: string;
  status?: PharmaSettlementStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class PharmaSettlementService {
  private readonly DEFAULT_PLATFORM_FEE_RATE = 0.02; // 2%

  constructor(
    private settlementRepository: Repository<PharmaSettlementBatch>,
    private orderRepository: Repository<PharmaOrder>
  ) {}

  /**
   * 배치 번호 생성
   */
  private generateBatchNumber(type: PharmaSettlementType): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 7).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = type === PharmaSettlementType.PHARMACY ? 'PHR' : 'SUP';
    return `STL-${prefix}-${dateStr}-${random}`;
  }

  /**
   * 정산 배치 생성
   */
  async createBatch(data: CreateSettlementBatchDto): Promise<PharmaSettlementBatch> {
    const platformFeeRate = data.platformFeeRate ?? this.DEFAULT_PLATFORM_FEE_RATE;

    // 해당 기간의 주문 조회
    const orderQuery = this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.offer', 'offer')
      .where('order.status = :status', { status: PharmaOrderStatus.DELIVERED })
      .andWhere('order.settlementBatchId IS NULL')
      .andWhere('order.deliveredAt BETWEEN :start AND :end', {
        start: data.periodStart,
        end: data.periodEnd,
      });

    if (data.settlementType === PharmaSettlementType.PHARMACY) {
      orderQuery.andWhere('order.pharmacyId = :targetId', {
        targetId: data.targetId,
      });
    } else {
      orderQuery.andWhere('offer.supplierId = :targetId', {
        targetId: data.targetId,
      });
    }

    const orders = await orderQuery.getMany();

    if (orders.length === 0) {
      throw new Error('No orders found for the specified period');
    }

    // 금액 계산
    const totalOrderAmount = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );
    const totalDiscountAmount = orders.reduce(
      (sum, order) => sum + Number(order.discountAmount),
      0
    );
    const platformFee = totalOrderAmount * platformFeeRate;
    const netAmount = totalOrderAmount - platformFee;

    // 정산 배치 생성
    const batch = this.settlementRepository.create({
      settlementType: data.settlementType,
      targetId: data.targetId,
      batchNumber: this.generateBatchNumber(data.settlementType),
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      orderCount: orders.length,
      totalOrderAmount,
      totalDiscountAmount,
      platformFee,
      netAmount,
      orderIds: orders.map((o) => o.id),
      status: PharmaSettlementStatus.OPEN,
    });

    const savedBatch = await this.settlementRepository.save(batch);

    // 주문에 정산 배치 ID 연결
    await this.orderRepository.update(
      { id: In(orders.map((o) => o.id)) },
      { settlementBatchId: savedBatch.id }
    );

    return savedBatch;
  }

  /**
   * 정산 배치 조회 (ID)
   */
  async findById(id: string): Promise<PharmaSettlementBatch | null> {
    return this.settlementRepository.findOne({ where: { id } });
  }

  /**
   * 정산 배치 조회 (배치번호)
   */
  async findByBatchNumber(
    batchNumber: string
  ): Promise<PharmaSettlementBatch | null> {
    return this.settlementRepository.findOne({ where: { batchNumber } });
  }

  /**
   * 정산 배치 목록 조회
   */
  async findAll(filter: SettlementBatchFilter = {}): Promise<{
    items: PharmaSettlementBatch[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, ...where } = filter;

    const qb = this.settlementRepository.createQueryBuilder('batch');

    if (where.settlementType) {
      qb.andWhere('batch.settlementType = :settlementType', {
        settlementType: where.settlementType,
      });
    }

    if (where.targetId) {
      qb.andWhere('batch.targetId = :targetId', { targetId: where.targetId });
    }

    if (where.status) {
      qb.andWhere('batch.status = :status', { status: where.status });
    }

    if (where.startDate) {
      qb.andWhere('batch.periodStart >= :startDate', {
        startDate: where.startDate,
      });
    }

    if (where.endDate) {
      qb.andWhere('batch.periodEnd <= :endDate', { endDate: where.endDate });
    }

    qb.orderBy('batch.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 정산 배치 마감
   */
  async closeBatch(id: string): Promise<PharmaSettlementBatch | null> {
    const batch = await this.findById(id);
    if (!batch) return null;

    if (batch.status !== PharmaSettlementStatus.OPEN) {
      throw new Error('Batch is not in OPEN status');
    }

    batch.status = PharmaSettlementStatus.CLOSED;
    batch.closedAt = new Date();

    // 결제 예정일 설정 (마감 후 7일)
    const paymentDueDate = new Date();
    paymentDueDate.setDate(paymentDueDate.getDate() + 7);
    batch.paymentDueDate = paymentDueDate;

    return this.settlementRepository.save(batch);
  }

  /**
   * 결제 완료 처리
   */
  async markAsPaid(
    id: string,
    paymentInfo: {
      method?: string;
      accountNumber?: string;
      bankName?: string;
      reference?: string;
    }
  ): Promise<PharmaSettlementBatch | null> {
    const batch = await this.findById(id);
    if (!batch) return null;

    if (batch.status !== PharmaSettlementStatus.CLOSED &&
        batch.status !== PharmaSettlementStatus.PENDING_PAYMENT) {
      throw new Error('Batch must be CLOSED or PENDING_PAYMENT to mark as paid');
    }

    batch.status = PharmaSettlementStatus.PAID;
    batch.paidAt = new Date();
    batch.paymentInfo = paymentInfo;

    // 관련 주문의 결제 상태도 업데이트
    if (batch.orderIds && batch.orderIds.length > 0) {
      await this.orderRepository.update(
        { id: In(batch.orderIds) },
        { paymentStatus: PharmaPaymentStatus.PAID }
      );
    }

    return this.settlementRepository.save(batch);
  }

  /**
   * 정산 통계
   */
  async getStats(targetId: string, settlementType: PharmaSettlementType): Promise<{
    totalBatches: number;
    openBatches: number;
    closedBatches: number;
    paidBatches: number;
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
  }> {
    const qb = this.settlementRepository
      .createQueryBuilder('batch')
      .where('batch.targetId = :targetId', { targetId })
      .andWhere('batch.settlementType = :settlementType', { settlementType });

    const totalBatches = await qb.getCount();

    const openBatches = await qb
      .clone()
      .andWhere('batch.status = :status', { status: PharmaSettlementStatus.OPEN })
      .getCount();

    const closedBatches = await qb
      .clone()
      .andWhere('batch.status = :status', { status: PharmaSettlementStatus.CLOSED })
      .getCount();

    const paidBatches = await qb
      .clone()
      .andWhere('batch.status = :status', { status: PharmaSettlementStatus.PAID })
      .getCount();

    const totalAmountResult = await qb
      .clone()
      .select('SUM(batch.netAmount)', 'total')
      .getRawOne();

    const pendingAmountResult = await qb
      .clone()
      .andWhere('batch.status IN (:...statuses)', {
        statuses: [PharmaSettlementStatus.OPEN, PharmaSettlementStatus.CLOSED],
      })
      .select('SUM(batch.netAmount)', 'total')
      .getRawOne();

    const paidAmountResult = await qb
      .clone()
      .andWhere('batch.status = :status', { status: PharmaSettlementStatus.PAID })
      .select('SUM(batch.netAmount)', 'total')
      .getRawOne();

    return {
      totalBatches,
      openBatches,
      closedBatches,
      paidBatches,
      totalAmount: parseFloat(totalAmountResult?.total || '0'),
      pendingAmount: parseFloat(pendingAmountResult?.total || '0'),
      paidAmount: parseFloat(paidAmountResult?.total || '0'),
    };
  }
}
