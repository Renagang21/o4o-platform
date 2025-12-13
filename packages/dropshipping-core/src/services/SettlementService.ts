/**
 * SettlementService
 *
 * 정산 배치 생성 및 수수료 계산
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import {
  SettlementBatch,
  SettlementBatchStatus,
  SettlementType,
} from '../entities/SettlementBatch.entity.js';
import { CommissionTransaction } from '../entities/CommissionTransaction.entity.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(SettlementBatch)
    private readonly settlementRepository: Repository<SettlementBatch>,
    @InjectRepository(CommissionTransaction)
    private readonly commissionRepository: Repository<CommissionTransaction>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 정산 배치 생성
   */
  async createSettlementBatch(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SettlementBatch> {
    const batchNumber = this.generateBatchNumber();

    // 해당 판매자와 기간의 수수료 트랜잭션 조회
    const transactions = await this.commissionRepository.find({
      where: {
        createdAt: Between(periodStart, periodEnd),
        settlementBatchId: IsNull(),
      },
      relations: ['orderRelay'],
    });

    // 합계 계산
    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.orderAmount),
      0
    );
    const commissionAmount = transactions.reduce(
      (sum, t) => sum + Number(t.commissionAmount),
      0
    );
    const netAmount = totalAmount - commissionAmount;

    const batch = this.settlementRepository.create({
      sellerId,
      batchNumber,
      periodStart,
      periodEnd,
      totalAmount,
      commissionAmount,
      netAmount,
      status: SettlementBatchStatus.OPEN,
    });

    const savedBatch = await this.settlementRepository.save(batch);

    // 수수료 트랜잭션에 배치 ID 연결
    if (transactions.length > 0) {
      const transactionIds = transactions.map((t) => t.id);
      await this.commissionRepository
        .createQueryBuilder()
        .update()
        .set({ settlementBatchId: savedBatch.id })
        .whereInIds(transactionIds)
        .execute();
    }

    return savedBatch;
  }

  /**
   * 정산 배치 조회
   */
  async findById(id: string): Promise<SettlementBatch | null> {
    return await this.settlementRepository.findOne({
      where: { id },
      relations: ['commissionTransactions'],
    });
  }

  /**
   * 정산 배치 목록 조회
   */
  async findAll(filters?: {
    status?: SettlementBatchStatus;
    settlementType?: SettlementType;
    sellerId?: string;
    supplierId?: string;
  }): Promise<SettlementBatch[]> {
    const query = this.settlementRepository.createQueryBuilder('batch');

    if (filters?.status) {
      query.andWhere('batch.status = :status', { status: filters.status });
    }

    if (filters?.settlementType) {
      query.andWhere('batch.settlementType = :settlementType', {
        settlementType: filters.settlementType,
      });
    }

    if (filters?.sellerId) {
      query.andWhere('batch.sellerId = :sellerId', { sellerId: filters.sellerId });
    }

    if (filters?.supplierId) {
      query.andWhere('batch.supplierId = :supplierId', { supplierId: filters.supplierId });
    }

    return await query.orderBy('batch.createdAt', 'DESC').getMany();
  }

  /**
   * 정산 배치 마감 (OPEN → CLOSED)
   */
  async closeSettlement(id: string): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new Error('Settlement batch not found');
    }

    if (batch.status !== SettlementBatchStatus.OPEN) {
      throw new Error('Settlement batch is not in open status');
    }

    batch.status = SettlementBatchStatus.CLOSED;
    batch.closedAt = new Date();
    const savedBatch = await this.settlementRepository.save(batch);

    // 이벤트 발행
    this.eventEmitter.emit('settlement.closed', savedBatch);

    return savedBatch;
  }

  /**
   * 정산 지급 처리 (CLOSED → PAID)
   */
  async paySettlement(id: string): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new Error('Settlement batch not found');
    }

    if (batch.status !== SettlementBatchStatus.CLOSED) {
      throw new Error('Settlement batch is not in closed status');
    }

    // 여기서 실제 정산 프로세스 실행 (예: 은행 송금 API 호출)
    // ...

    batch.status = SettlementBatchStatus.PAID;
    batch.paidAt = new Date();
    const savedBatch = await this.settlementRepository.save(batch);

    // 이벤트 발행
    this.eventEmitter.emit('settlement.paid', savedBatch);

    return savedBatch;
  }

  /**
   * 정산 배치 번호 생성
   */
  private generateBatchNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `STL-${year}${month}${day}-${random}`;
  }
}
