/**
 * ServicePointBudgetService
 *
 * WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1
 *
 * 서비스별 포인트 예산 관리.
 *   - allocateBudget: 예산 추가 (관리자가 서비스에 포인트 예산을 입금)
 *   - checkBudget: 잔여 예산 확인 (지급 전 검증용)
 *   - deductBudget: 예산 차감 (포인트 지급 시 원자적 차감)
 *   - getSummary: 예산 현황 조회
 *   - listTransactions: 예산 변경 이력 조회
 *
 * 동시성: deductBudget은 pessimistic write lock + DB 트랜잭션으로 보호.
 * referenceKey UNIQUE 제약으로 중복 차감 방지.
 */

import { AppDataSource } from '../../../database/connection.js';
import { ServicePointBudget } from '../entities/ServicePointBudget.js';
import {
  ServicePointBudgetTransaction,
  BudgetTxType,
} from '../entities/ServicePointBudgetTransaction.js';
import logger from '../../../utils/logger.js';

export interface BudgetSummary {
  serviceKey: string;
  allocatedAmount: number;
  usedAmount: number;
  remainingAmount: number;
  memo?: string;
  updatedAt: Date;
}

export class ServicePointBudgetService {
  private static instance: ServicePointBudgetService;

  static getInstance(): ServicePointBudgetService {
    if (!ServicePointBudgetService.instance) {
      ServicePointBudgetService.instance = new ServicePointBudgetService();
    }
    return ServicePointBudgetService.instance;
  }

  /**
   * 예산 추가. 서비스가 없으면 새로 생성.
   * @returns 업데이트 후 예산 현황
   */
  async allocateBudget(params: {
    serviceKey: string;
    amount: number;
    memo?: string;
    operatorId?: string;
  }): Promise<BudgetSummary> {
    const { serviceKey, amount, memo, operatorId } = params;
    if (amount <= 0) throw new Error('INVALID_AMOUNT');

    return AppDataSource.transaction(async (manager) => {
      const budgetRepo = manager.getRepository(ServicePointBudget);
      const txRepo = manager.getRepository(ServicePointBudgetTransaction);

      let budget = await budgetRepo
        .createQueryBuilder('b')
        .setLock('pessimistic_write')
        .where('b.serviceKey = :serviceKey', { serviceKey })
        .getOne();

      if (!budget) {
        budget = budgetRepo.create({ serviceKey, allocatedAmount: 0, usedAmount: 0 });
      }

      budget.allocatedAmount += amount;
      if (memo) budget.memo = memo;
      if (operatorId) budget.createdBy = operatorId;
      await budgetRepo.save(budget);

      const tx = txRepo.create({
        serviceKey,
        amount,
        txType: BudgetTxType.ALLOCATE,
        description: memo ?? `예산 추가 (${amount.toLocaleString()}P)`,
        operatorId,
      });
      await txRepo.save(tx);

      logger.info('[Budget] Allocated', { serviceKey, amount, newAllocated: budget.allocatedAmount });

      return this._toSummary(budget);
    });
  }

  /**
   * 잔여 예산 확인. 예산 row가 없거나 부족하면 false.
   */
  async checkBudget(serviceKey: string, amount: number): Promise<boolean> {
    const budgetRepo = AppDataSource.getRepository(ServicePointBudget);
    const budget = await budgetRepo.findOne({ where: { serviceKey } });
    if (!budget) return false;
    return budget.hasSufficientBudget(amount);
  }

  /**
   * 예산 원자적 차감. 중복 방지를 위해 referenceKey 필수.
   * @throws BUDGET_NOT_FOUND — 예산 row 없음
   * @throws INSUFFICIENT_BUDGET — 잔여 부족
   * @throws DEDUP — referenceKey 이미 처리됨
   */
  async deductBudget(params: {
    serviceKey: string;
    amount: number;
    referenceKey: string;
    description?: string;
    operatorId?: string;
  }): Promise<void> {
    const { serviceKey, amount, referenceKey, description, operatorId } = params;

    await AppDataSource.transaction(async (manager) => {
      const budgetRepo = manager.getRepository(ServicePointBudget);
      const txRepo = manager.getRepository(ServicePointBudgetTransaction);

      // referenceKey dedup
      const existing = await txRepo.findOne({ where: { referenceKey } });
      if (existing) {
        logger.debug('[Budget] deductBudget dedup', { referenceKey });
        return; // 이미 처리됨 — 멱등
      }

      // pessimistic lock
      const budget = await budgetRepo
        .createQueryBuilder('b')
        .setLock('pessimistic_write')
        .where('b.serviceKey = :serviceKey', { serviceKey })
        .getOne();

      if (!budget) throw new Error('BUDGET_NOT_FOUND');
      if (!budget.hasSufficientBudget(amount)) throw new Error('INSUFFICIENT_BUDGET');

      budget.usedAmount += amount;
      await budgetRepo.save(budget);

      const tx = txRepo.create({
        serviceKey,
        amount,
        txType: BudgetTxType.DEDUCT,
        referenceKey,
        description: description ?? `포인트 지급 차감`,
        operatorId,
      });
      await txRepo.save(tx);

      logger.info('[Budget] Deducted', {
        serviceKey,
        amount,
        referenceKey,
        remaining: budget.remainingAmount,
      });
    });
  }

  /**
   * 예산 현황 조회. 예산 row가 없으면 0 상태로 반환.
   */
  async getSummary(serviceKey: string): Promise<BudgetSummary> {
    const budgetRepo = AppDataSource.getRepository(ServicePointBudget);
    const budget = await budgetRepo.findOne({ where: { serviceKey } });

    if (!budget) {
      return {
        serviceKey,
        allocatedAmount: 0,
        usedAmount: 0,
        remainingAmount: 0,
        updatedAt: new Date(),
      };
    }

    return this._toSummary(budget);
  }

  /**
   * 예산 변경 이력 목록.
   */
  async listTransactions(
    serviceKey: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: ServicePointBudgetTransaction[]; total: number }> {
    const txRepo = AppDataSource.getRepository(ServicePointBudgetTransaction);
    const [transactions, total] = await txRepo.findAndCount({
      where: { serviceKey },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { transactions, total };
  }

  /**
   * 전체 서비스 예산 목록 (관리자 대시보드용).
   */
  async listAll(): Promise<BudgetSummary[]> {
    const budgetRepo = AppDataSource.getRepository(ServicePointBudget);
    const budgets = await budgetRepo.find({ order: { serviceKey: 'ASC' } });
    return budgets.map((b) => this._toSummary(b));
  }

  private _toSummary(budget: ServicePointBudget): BudgetSummary {
    return {
      serviceKey: budget.serviceKey,
      allocatedAmount: budget.allocatedAmount,
      usedAmount: budget.usedAmount,
      remainingAmount: budget.remainingAmount,
      memo: budget.memo,
      updatedAt: budget.updatedAt,
    };
  }
}
