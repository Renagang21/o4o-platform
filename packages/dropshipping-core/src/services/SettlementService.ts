/**
 * SettlementService
 *
 * DS-4 준수 정산 서비스
 *
 * ## 핵심 원칙 (DS-4.2)
 * - Settlement는 계산 계약 (Payment 아님)
 * - 금전 이동 실행 금지 (Finance/Payment 시스템 책임)
 * - 결정론적 입력, 재현 가능한 계산
 * - 원본 수정 금지, 조정 거래로만 처리
 *
 * ## 상태 모델 (DS-4.3)
 * open → closed → processing → paid (terminal)
 *                     ↓
 *                  failed → processing (retry)
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, In } from 'typeorm';
import {
  SettlementBatch,
  SettlementBatchStatus,
  SettlementType,
} from '../entities/SettlementBatch.entity.js';
import { CommissionTransaction } from '../entities/CommissionTransaction.entity.js';
import { SettlementLog, SettlementLogAction } from '../entities/SettlementLog.entity.js';
import { OrderRelay, OrderRelayStatus } from '../entities/OrderRelay.entity.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  canTransitionSettlementBatch,
  isSettlementBatchTerminal,
  getAllowedSettlementBatchTransitions,
  canTriggerSettlementBatchTransition,
} from '../utils/state-machine.js';

export interface CreateSettlementBatchDto {
  sellerId?: string;
  supplierId?: string;
  settlementType: SettlementType;
  periodStart: Date;
  periodEnd: Date;
  metadata?: Record<string, any>;
}

export interface ActorInfo {
  actorId: string;
  actorType: 'admin' | 'system' | 'finance';
}

export interface CalculationResult {
  totalAmount: number;
  commissionAmount: number;
  deductionAmount: number;
  netAmount: number;
  transactionCount: number;
  calculatedAt: string;
}

@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(SettlementBatch)
    private readonly settlementRepository: Repository<SettlementBatch>,
    @InjectRepository(CommissionTransaction)
    private readonly commissionRepository: Repository<CommissionTransaction>,
    @InjectRepository(SettlementLog)
    private readonly logRepository: Repository<SettlementLog>,
    @InjectRepository(OrderRelay)
    private readonly orderRelayRepository: Repository<OrderRelay>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 정산 배치 생성 (Admin Trigger)
   */
  async create(dto: CreateSettlementBatchDto, actor: ActorInfo): Promise<SettlementBatch> {
    const batchNumber = this.generateBatchNumber();

    const batch = this.settlementRepository.create({
      sellerId: dto.sellerId,
      supplierId: dto.supplierId,
      settlementType: dto.settlementType,
      contextType: dto.settlementType, // deprecated field 호환
      batchNumber,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      totalAmount: 0,
      commissionAmount: 0,
      deductionAmount: 0,
      netAmount: 0,
      status: SettlementBatchStatus.OPEN,
      metadata: dto.metadata,
    });

    const savedBatch = await this.settlementRepository.save(batch);

    // 생성 로그 기록
    await this.createLog(savedBatch.id, {
      action: SettlementLogAction.CREATED,
      newStatus: SettlementBatchStatus.OPEN,
      actor,
      metadata: {
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        settlementType: dto.settlementType,
      },
    });

    // 이벤트 발행
    this.eventEmitter.emit('settlement.created', savedBatch);

    return savedBatch;
  }

  /**
   * 기존 createSettlementBatch 메서드 (하위 호환)
   * @deprecated Use create() instead
   */
  async createSettlementBatch(
    sellerId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SettlementBatch> {
    const batchNumber = this.generateBatchNumber();

    const transactions = await this.commissionRepository.find({
      where: {
        createdAt: Between(periodStart, periodEnd),
        settlementBatchId: IsNull(),
      },
      relations: ['orderRelay'],
    });

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
   * 정산 배치 목록 조회 (Admin)
   */
  async findAll(filters?: {
    status?: SettlementBatchStatus;
    settlementType?: SettlementType;
    sellerId?: string;
    supplierId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: SettlementBatch[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

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

    const [data, total] = await query
      .orderBy('batch.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * 정산 배치 항목 (CommissionTransaction) 조회
   */
  async findItems(batchId: string): Promise<CommissionTransaction[]> {
    return await this.commissionRepository.find({
      where: { settlementBatchId: batchId },
      relations: ['orderRelay'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 정산 계산 실행 (OPEN 상태에서만)
   *
   * DS-4.2: 결정론적 계산, 재현 가능
   */
  async calculate(id: string, actor: ActorInfo): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new NotFoundException(`SettlementBatch not found: ${id}`);
    }

    if (batch.status !== SettlementBatchStatus.OPEN) {
      throw new BadRequestException(
        `Cannot calculate: batch is not in OPEN status (current: ${batch.status})`
      );
    }

    // 해당 기간의 수수료 트랜잭션 조회 및 배치에 연결
    const transactions = await this.commissionRepository.find({
      where: {
        createdAt: Between(batch.periodStart, batch.periodEnd),
        settlementBatchId: IsNull(),
      },
      relations: ['orderRelay'],
    });

    // 계산
    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.orderAmount),
      0
    );
    const commissionAmount = transactions.reduce(
      (sum, t) => sum + Number(t.commissionAmount),
      0
    );
    const deductionAmount = Number(batch.deductionAmount) || 0;
    const netAmount = totalAmount - commissionAmount - deductionAmount;

    // 배치 업데이트
    batch.totalAmount = totalAmount;
    batch.commissionAmount = commissionAmount;
    batch.netAmount = netAmount;

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

    const calculationResult: CalculationResult = {
      totalAmount,
      commissionAmount,
      deductionAmount,
      netAmount,
      transactionCount: transactions.length,
      calculatedAt: new Date().toISOString(),
    };

    // 계산 로그 기록
    await this.createLog(savedBatch.id, {
      action: SettlementLogAction.CALCULATION_EXECUTED,
      actor,
      calculationDetails: calculationResult,
    });

    // 이벤트 발행
    this.eventEmitter.emit('settlement.calculated', {
      batch: savedBatch,
      calculationResult,
    });

    return savedBatch;
  }

  /**
   * 정산 확정 (OPEN → CLOSED)
   *
   * DS-4.3: 상태 전이 검증
   * DS-4.2: CLOSED 이후 거래 추가/금액 변경 불가
   */
  async confirm(id: string, actor: ActorInfo): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new NotFoundException(`SettlementBatch not found: ${id}`);
    }

    const currentStatus = batch.status;
    const targetStatus = SettlementBatchStatus.CLOSED;

    // 상태 전이 검증
    if (!canTransitionSettlementBatch(currentStatus, targetStatus)) {
      const allowedTransitions = getAllowedSettlementBatchTransitions(currentStatus);
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} → ${targetStatus}. ` +
        `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    // 트리거 권한 체크
    if (!canTriggerSettlementBatchTransition(currentStatus, targetStatus, actor.actorType)) {
      throw new BadRequestException(
        `Actor type '${actor.actorType}' is not allowed to trigger ` +
        `transition: ${currentStatus} → ${targetStatus}`
      );
    }

    // 관련 OrderRelay가 모두 터미널 상태인지 확인
    const items = await this.findItems(id);
    const orderRelayIds = items.map(item => item.orderRelayId);

    if (orderRelayIds.length > 0) {
      const orders = await this.orderRelayRepository.find({
        where: { id: In(orderRelayIds) },
      });

      const nonTerminalOrders = orders.filter(
        order => ![OrderRelayStatus.DELIVERED, OrderRelayStatus.CANCELLED, OrderRelayStatus.REFUNDED].includes(order.status)
      );

      if (nonTerminalOrders.length > 0) {
        throw new BadRequestException(
          `Cannot confirm: ${nonTerminalOrders.length} orders are not in terminal status`
        );
      }
    }

    batch.status = targetStatus;
    batch.closedAt = new Date();
    const savedBatch = await this.settlementRepository.save(batch);

    // 상태 변경 로그 기록
    await this.createLog(savedBatch.id, {
      action: SettlementLogAction.CONFIRMED,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      actor,
    });

    // 이벤트 발행
    this.eventEmitter.emit('settlement.confirmed', savedBatch);

    return savedBatch;
  }

  /**
   * 처리 시작 (CLOSED → PROCESSING)
   */
  async startProcessing(id: string, actor: ActorInfo): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new NotFoundException(`SettlementBatch not found: ${id}`);
    }

    const currentStatus = batch.status;
    const targetStatus = SettlementBatchStatus.PROCESSING;

    if (!canTransitionSettlementBatch(currentStatus, targetStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} → ${targetStatus}`
      );
    }

    if (!canTriggerSettlementBatchTransition(currentStatus, targetStatus, actor.actorType)) {
      throw new BadRequestException(
        `Actor type '${actor.actorType}' is not allowed to trigger this transition`
      );
    }

    batch.status = targetStatus;
    const savedBatch = await this.settlementRepository.save(batch);

    await this.createLog(savedBatch.id, {
      action: SettlementLogAction.PAYMENT_INITIATED,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      actor,
    });

    return savedBatch;
  }

  /**
   * 지급 완료 처리 (PROCESSING → PAID)
   *
   * DS-4.2: 실제 지급은 외부 시스템에서 수행, 여기서는 상태만 갱신
   */
  async markAsPaid(id: string, actor: ActorInfo): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new NotFoundException(`SettlementBatch not found: ${id}`);
    }

    const currentStatus = batch.status;
    const targetStatus = SettlementBatchStatus.PAID;

    if (!canTransitionSettlementBatch(currentStatus, targetStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} → ${targetStatus}`
      );
    }

    if (!canTriggerSettlementBatchTransition(currentStatus, targetStatus, actor.actorType)) {
      throw new BadRequestException(
        `Actor type '${actor.actorType}' is not allowed to trigger this transition`
      );
    }

    batch.status = targetStatus;
    batch.paidAt = new Date();
    const savedBatch = await this.settlementRepository.save(batch);

    await this.createLog(savedBatch.id, {
      action: SettlementLogAction.PAYMENT_COMPLETED,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      actor,
    });

    this.eventEmitter.emit('settlement.paid', savedBatch);

    return savedBatch;
  }

  /**
   * 지급 실패 처리 (PROCESSING → FAILED)
   */
  async markAsFailed(id: string, reason: string, actor: ActorInfo): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new NotFoundException(`SettlementBatch not found: ${id}`);
    }

    const currentStatus = batch.status;
    const targetStatus = SettlementBatchStatus.FAILED;

    if (!canTransitionSettlementBatch(currentStatus, targetStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} → ${targetStatus}`
      );
    }

    batch.status = targetStatus;
    batch.metadata = {
      ...batch.metadata,
      failureReason: reason,
      failedAt: new Date().toISOString(),
    };
    const savedBatch = await this.settlementRepository.save(batch);

    await this.createLog(savedBatch.id, {
      action: SettlementLogAction.PAYMENT_FAILED,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      actor,
      reason,
    });

    return savedBatch;
  }

  /**
   * 재시도 (FAILED → PROCESSING)
   */
  async retry(id: string, actor: ActorInfo): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new NotFoundException(`SettlementBatch not found: ${id}`);
    }

    const currentStatus = batch.status;
    const targetStatus = SettlementBatchStatus.PROCESSING;

    if (!canTransitionSettlementBatch(currentStatus, targetStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} → ${targetStatus}`
      );
    }

    if (!canTriggerSettlementBatchTransition(currentStatus, targetStatus, actor.actorType)) {
      throw new BadRequestException(
        `Actor type '${actor.actorType}' is not allowed to retry`
      );
    }

    batch.status = targetStatus;
    batch.metadata = {
      ...batch.metadata,
      retryCount: (batch.metadata?.retryCount || 0) + 1,
      lastRetryAt: new Date().toISOString(),
    };
    const savedBatch = await this.settlementRepository.save(batch);

    await this.createLog(savedBatch.id, {
      action: SettlementLogAction.PAYMENT_INITIATED,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      actor,
      reason: 'Retry after failure',
    });

    return savedBatch;
  }

  /**
   * 로그 조회
   */
  async findLogs(settlementBatchId: string): Promise<SettlementLog[]> {
    return await this.logRepository.find({
      where: { settlementBatchId },
      order: { createdAt: 'DESC' },
    });
  }

  // === Legacy methods ===

  /**
   * @deprecated Use confirm() instead
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

    this.eventEmitter.emit('settlement.closed', savedBatch);

    return savedBatch;
  }

  /**
   * @deprecated Use markAsPaid() instead
   */
  async paySettlement(id: string): Promise<SettlementBatch> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new Error('Settlement batch not found');
    }

    if (batch.status !== SettlementBatchStatus.CLOSED) {
      throw new Error('Settlement batch is not in closed status');
    }

    batch.status = SettlementBatchStatus.PAID;
    batch.paidAt = new Date();
    const savedBatch = await this.settlementRepository.save(batch);

    this.eventEmitter.emit('settlement.paid', savedBatch);

    return savedBatch;
  }

  /**
   * 로그 생성 (내부)
   */
  private async createLog(
    settlementBatchId: string,
    data: {
      action: SettlementLogAction;
      previousStatus?: SettlementBatchStatus;
      newStatus?: SettlementBatchStatus;
      actor: ActorInfo;
      reason?: string;
      calculationDetails?: CalculationResult;
      adjustmentDetails?: {
        adjustmentType: string;
        amount: number;
        originalTransactionId?: string;
        reason: string;
      };
      metadata?: Record<string, any>;
    }
  ): Promise<SettlementLog> {
    const log = this.logRepository.create({
      settlementBatchId,
      action: data.action,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      actor: data.actor.actorId,
      actorType: data.actor.actorType,
      reason: data.reason,
      calculationDetails: data.calculationDetails,
      adjustmentDetails: data.adjustmentDetails,
      metadata: data.metadata,
    });

    return await this.logRepository.save(log);
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
