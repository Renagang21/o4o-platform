/**
 * SettlementService
 *
 * 정산 배치 생성 및 수수료 계산
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  SettlementBatch,
  SettlementStatus,
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
    periodStart: Date,
    periodEnd: Date
  ): Promise<SettlementBatch> {
    const batchNumber = this.generateBatchNumber();

    // 해당 기간의 수수료 트랜잭션 조회
    const transactions = await this.commissionRepository.find({
      where: {
        createdAt: Between(periodStart, periodEnd),
        settlementBatchId: undefined as any, // 아직 정산되지 않은 것만
      },
      relations: ['orderRelay'],
    });

    // 합계 계산
    const totalOrderAmount = transactions.reduce(
      (sum, t) => sum + Number(t.orderAmount),
      0
    );
    const totalCommissionAmount = transactions.reduce(
      (sum, t) => sum + Number(t.commissionAmount),
      0
    );
    const totalSettlementAmount = totalOrderAmount - totalCommissionAmount;

    const batch = this.settlementRepository.create({
      batchNumber,
      periodStart,
      periodEnd,
      totalOrderAmount,
      totalCommissionAmount,
      totalSettlementAmount,
      status: SettlementStatus.PENDING,
    });

    const savedBatch = await this.settlementRepository.save(batch);

    // 수수료 트랜잭션에 배치 ID 연결
    await this.commissionRepository.update(
      { id: transactions.map((t) => t.id) as any },
      { settlementBatchId: savedBatch.id }
    );

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
    status?: SettlementStatus;
  }): Promise<SettlementBatch[]> {
    const query = this.settlementRepository.createQueryBuilder('batch');

    if (filters?.status) {
      query.andWhere('batch.status = :status', { status: filters.status });
    }

    return await query.orderBy('batch.createdAt', 'DESC').getMany();
  }

  /**
   * 정산 배치 처리
   */
  async processSettlement(id: string): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new Error('Settlement batch not found');
    }

    if (batch.status !== SettlementStatus.PENDING) {
      throw new Error('Settlement batch is not in pending status');
    }

    batch.status = SettlementStatus.PROCESSING;
    await this.settlementRepository.save(batch);

    try {
      // 여기서 실제 정산 프로세스 실행 (예: 은행 송금 API 호출)
      // ...

      batch.status = SettlementStatus.COMPLETED;
      batch.processedAt = new Date();
      const savedBatch = await this.settlementRepository.save(batch);

      // 이벤트 발행
      this.eventEmitter.emit('settlement.closed', savedBatch);

      return savedBatch;
    } catch (error) {
      batch.status = SettlementStatus.FAILED;
      await this.settlementRepository.save(batch);
      throw error;
    }
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
