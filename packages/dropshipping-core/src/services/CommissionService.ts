/**
 * CommissionService
 *
 * 조건 기반 수수료 계산 엔진
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import {
  CommissionRule,
  CommissionType,
  CommissionRuleStatus,
} from '../entities/CommissionRule.entity.js';
import { CommissionTransaction } from '../entities/CommissionTransaction.entity.js';
import { OrderRelay } from '../entities/OrderRelay.entity.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly ruleRepository: Repository<CommissionRule>,
    @InjectRepository(CommissionTransaction)
    private readonly transactionRepository: Repository<CommissionTransaction>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 수수료 규칙 생성
   */
  async createRule(data: Partial<CommissionRule>): Promise<CommissionRule> {
    const rule = this.ruleRepository.create({
      ...data,
      status: data.status || CommissionRuleStatus.ACTIVE,
    });
    return await this.ruleRepository.save(rule);
  }

  /**
   * 수수료 규칙 조회
   */
  async findRuleById(id: string): Promise<CommissionRule | null> {
    return await this.ruleRepository.findOne({
      where: { id },
    });
  }

  /**
   * 수수료 규칙 목록 조회
   */
  async findAllRules(filters?: {
    status?: CommissionRuleStatus;
  }): Promise<CommissionRule[]> {
    const query = this.ruleRepository.createQueryBuilder('rule');

    if (filters?.status) {
      query.andWhere('rule.status = :status', { status: filters.status });
    }

    return await query.orderBy('rule.priority', 'ASC').getMany();
  }

  /**
   * 적용 가능한 수수료 규칙 찾기
   */
  async findApplicableRule(
    orderAmount: number,
    category?: string,
    sellerId?: string
  ): Promise<CommissionRule | null> {
    const today = new Date();

    const query = this.ruleRepository
      .createQueryBuilder('rule')
      .where('rule.status = :status', { status: CommissionRuleStatus.ACTIVE })
      .andWhere(
        '(rule.validFrom IS NULL OR rule.validFrom <= :today)',
        { today }
      )
      .andWhere(
        '(rule.validUntil IS NULL OR rule.validUntil >= :today)',
        { today }
      );

    // 카테고리 필터
    if (category) {
      query.andWhere(
        '(rule.applicableCategory IS NULL OR rule.applicableCategory = :category)',
        { category }
      );
    }

    // 판매자 필터
    if (sellerId) {
      query.andWhere(
        '(rule.applicableSellerId IS NULL OR rule.applicableSellerId = :sellerId)',
        { sellerId }
      );
    }

    // 우선순위 순으로 정렬
    query.orderBy('rule.priority', 'ASC');

    const rules = await query.getMany();

    // 첫 번째 매칭되는 규칙 반환
    return rules.length > 0 ? rules[0] : null;
  }

  /**
   * 수수료 계산
   */
  calculateCommission(orderAmount: number, rule: CommissionRule): number {
    switch (rule.type) {
      case CommissionType.PERCENTAGE:
        if (!rule.rate) return 0;
        return (orderAmount * rule.rate) / 100;

      case CommissionType.FIXED:
        return rule.fixedAmount || 0;

      case CommissionType.TIERED:
        if (!rule.tieredRates || rule.tieredRates.length === 0) return 0;

        // 금액 구간별 수수료 적용
        const sortedTiers = rule.tieredRates.sort(
          (a, b) => a.threshold - b.threshold
        );

        for (let i = sortedTiers.length - 1; i >= 0; i--) {
          if (orderAmount >= sortedTiers[i].threshold) {
            return (orderAmount * sortedTiers[i].rate) / 100;
          }
        }
        return 0;

      default:
        return 0;
    }
  }

  /**
   * 주문에 대한 수수료 트랜잭션 생성
   */
  async createCommissionTransaction(
    orderRelay: OrderRelay,
    category?: string,
    sellerId?: string
  ): Promise<CommissionTransaction> {
    const orderAmount = Number(orderRelay.totalPrice);

    // 적용 가능한 규칙 찾기
    const rule = await this.findApplicableRule(orderAmount, category, sellerId);

    let commissionAmount = 0;
    let appliedRate: number | undefined;
    let calculationDetails: Record<string, any> = {};

    if (rule) {
      commissionAmount = this.calculateCommission(orderAmount, rule);
      appliedRate = rule.rate;
      calculationDetails = {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        appliedRate: rule.rate,
        fixedAmount: rule.fixedAmount,
      };
    }

    const transaction = this.transactionRepository.create({
      orderRelayId: orderRelay.id,
      commissionRuleId: rule?.id,
      orderAmount,
      commissionAmount,
      appliedRate,
      calculationDetails,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // 이벤트 발행
    this.eventEmitter.emit('commission.applied', savedTransaction);

    return savedTransaction;
  }

  /**
   * 수수료 트랜잭션 조회
   */
  async findTransactionById(id: string): Promise<CommissionTransaction | null> {
    return await this.transactionRepository.findOne({
      where: { id },
      relations: ['orderRelay', 'commissionRule', 'settlementBatch'],
    });
  }

  /**
   * 수수료 트랜잭션 목록 조회
   */
  async findAllTransactions(filters?: {
    orderRelayId?: string;
    settlementBatchId?: string;
  }): Promise<CommissionTransaction[]> {
    const query = this.transactionRepository.createQueryBuilder('transaction');

    if (filters?.orderRelayId) {
      query.andWhere('transaction.orderRelayId = :orderRelayId', {
        orderRelayId: filters.orderRelayId,
      });
    }

    if (filters?.settlementBatchId) {
      query.andWhere('transaction.settlementBatchId = :settlementBatchId', {
        settlementBatchId: filters.settlementBatchId,
      });
    }

    return await query
      .leftJoinAndSelect('transaction.orderRelay', 'orderRelay')
      .leftJoinAndSelect('transaction.commissionRule', 'commissionRule')
      .orderBy('transaction.createdAt', 'DESC')
      .getMany();
  }

  /**
   * 수수료 규칙 업데이트
   */
  async updateRule(
    id: string,
    data: Partial<CommissionRule>
  ): Promise<CommissionRule> {
    const rule = await this.findRuleById(id);
    if (!rule) {
      throw new Error('Commission rule not found');
    }

    Object.assign(rule, data);
    return await this.ruleRepository.save(rule);
  }

  /**
   * 수수료 규칙 삭제
   */
  async deleteRule(id: string): Promise<void> {
    await this.ruleRepository.delete(id);
  }
}
