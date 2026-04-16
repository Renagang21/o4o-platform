import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { CreditBalance } from '../entities/CreditBalance.js';
import { CreditTransaction, TransactionType, CreditSourceType } from '../entities/CreditTransaction.js';
import logger from '../../../utils/logger.js';

/**
 * CreditService
 *
 * WO-O4O-CREDIT-SYSTEM-V1
 * Handles Neture Credit earn, balance lookup, and transaction history.
 * Earn-only system — no spend, no expire, no cash-out.
 */
export class CreditService {
  private static instance: CreditService;
  private balanceRepository: Repository<CreditBalance>;
  private transactionRepository: Repository<CreditTransaction>;

  constructor() {
    this.balanceRepository = AppDataSource.getRepository(CreditBalance);
    this.transactionRepository = AppDataSource.getRepository(CreditTransaction);
  }

  static getInstance(): CreditService {
    if (!CreditService.instance) {
      CreditService.instance = new CreditService();
    }
    return CreditService.instance;
  }

  /**
   * Ensure a balance record exists for the user.
   * Creates one with balance=0 if not found.
   */
  async ensureBalance(userId: string): Promise<CreditBalance> {
    let balance = await this.balanceRepository.findOne({ where: { userId } });
    if (!balance) {
      balance = this.balanceRepository.create({ userId, balance: 0 });
      balance = await this.balanceRepository.save(balance);
    }
    return balance;
  }

  /**
   * Earn credits for a user. Deduplicates via referenceKey.
   * Returns the created transaction, or null if already earned (dedup).
   */
  async earnCredit(
    userId: string,
    amount: number,
    sourceType: CreditSourceType,
    sourceId: string | undefined,
    referenceKey: string,
    description: string,
  ): Promise<CreditTransaction | null> {
    // ── POLICY: IR-O4O-MARKETING-CONTENT-REWARD-POLICY-V1 ─────────────────────────
    // 보상 중복 지급 방지 정책:
    //   referenceKey UNIQUE 제약 기반으로 동일 보상 이벤트에 대한 중복 지급을 방지한다.
    //   course_complete 보상의 referenceKey = `course_complete:{userId}:{courseId}`.
    //   재참여 / 재완료가 발생하더라도 동일 referenceKey가 이미 존재하면 null 반환(지급 안 함).
    // 수동 보상 정책:
    //   이 earnCredit() 메서드를 통한 수동/관리자 직접 호출은 현재 단계에서 금지한다.
    //   수동 보상 도입 시 승인 절차, 사유 기록, 감사 로그를 포함한 별도 WO가 필요하다.
    // ────────────────────────────────────────────────────────────────────────────────
    // Dedup check
    const existing = await this.transactionRepository.findOne({
      where: { referenceKey },
    });
    if (existing) {
      logger.debug(`[Credit] Dedup hit: ${referenceKey}`);
      return null;
    }

    // Create transaction
    const transaction = this.transactionRepository.create({
      userId,
      amount,
      transactionType: TransactionType.EARN,
      sourceType,
      sourceId,
      referenceKey,
      description,
    });

    await this.transactionRepository.save(transaction);

    // Update balance
    const balance = await this.ensureBalance(userId);
    balance.balance += amount;
    await this.balanceRepository.save(balance);

    logger.info(`[Credit] Earned`, {
      userId,
      amount,
      sourceType,
      referenceKey,
      newBalance: balance.balance,
    });

    return transaction;
  }

  /**
   * Get current credit balance for a user.
   */
  async getBalance(userId: string): Promise<number> {
    const balance = await this.balanceRepository.findOne({ where: { userId } });
    return balance?.balance ?? 0;
  }

  /**
   * Get paginated transaction history for a user.
   */
  async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: CreditTransaction[]; total: number }> {
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { transactions, total };
  }
}
