/**
 * AppreciationService — 기여 감사 포인트
 * WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
 *
 * 철학:
 *   좋아요 = 감정 표현 (비용 없음)
 *   감사 포인트 = 가치 표현 (사용자 포인트 차감 → 제작자 증가)
 *
 * service_point_budgets 완전 무관 (serviceKey 미전달).
 * 원자성: AppDataSource.transaction() 내에서 spendPoint + grantPoint 처리.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  AppreciationSend,
  APPRECIATION_TARGET_TYPES,
  type AppreciationTargetType,
} from '../entities/AppreciationSend.js';
import { PointService } from '../../point/services/PointService.js';
import { CreditBalance } from '../../credit/entities/CreditBalance.js';
import { CreditTransaction, TransactionType } from '../../credit/entities/CreditTransaction.js';
import type { SendAppreciationDto, AppreciationSummary } from '../dto/appreciation.dto.js';
import logger from '../../../utils/logger.js';

export class AppreciationService {
  private static instance: AppreciationService;
  private repo: Repository<AppreciationSend>;

  private constructor() {
    this.repo = AppDataSource.getRepository(AppreciationSend);
  }

  static getInstance(): AppreciationService {
    if (!AppreciationService.instance) AppreciationService.instance = new AppreciationService();
    return AppreciationService.instance;
  }

  /**
   * 감사 포인트 전송.
   * 1. 제작자 조회 (targetType별 resolver)
   * 2. 유효성 검사 (자기 자신, 금액, 잔액)
   * 3. 트랜잭션: spendPoint(from) + grantPoint(to) + appreciation_sends 저장
   */
  async sendAppreciation(
    fromUserId: string,
    data: SendAppreciationDto,
  ): Promise<AppreciationSend> {
    const { targetType, targetId, amount, message } = data;

    if (!APPRECIATION_TARGET_TYPES.includes(targetType)) {
      throw new Error('APPRECIATION_TARGET_INVALID');
    }
    if (!Number.isInteger(amount) || amount < 1) {
      throw new Error('INVALID_AMOUNT');
    }

    // 제작자 조회
    const toUserId = await this._resolveCreator(targetType, targetId);
    if (!toUserId) throw new Error('APPRECIATION_TARGET_INVALID');

    // 자기 자신 차단
    if (fromUserId === toUserId) throw new Error('APPRECIATION_SELF_SEND');

    const referenceBase = `appreciation:${fromUserId}:${targetType}:${targetId}:${Date.now()}`;

    return AppDataSource.transaction(async (manager) => {
      const balanceRepo = manager.getRepository(CreditBalance);
      const txRepo = manager.getRepository(CreditTransaction);

      // 잔액 확인 + pessimistic lock
      const balance = await balanceRepo
        .createQueryBuilder('b')
        .setLock('pessimistic_write')
        .where('b.userId = :userId', { userId: fromUserId })
        .getOne();

      if (!balance || balance.balance < amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // 송신자 차감
      balance.balance -= amount;
      await balanceRepo.save(balance);

      const spendTx = txRepo.create({
        userId: fromUserId,
        amount: -amount,
        transactionType: TransactionType.SPEND,
        sourceType: 'appreciation_send' as any,
        sourceId: targetId,
        referenceKey: `${referenceBase}:spend`,
        description: `감사 포인트 전송 (${targetType}/${targetId.slice(0, 8)})`,
      });
      await txRepo.save(spendTx);

      // 수신자 적립 (ensureBalance)
      let toBalance = await balanceRepo.findOne({ where: { userId: toUserId } });
      if (!toBalance) {
        toBalance = balanceRepo.create({ userId: toUserId, balance: 0 });
      }
      toBalance.balance += amount;
      await balanceRepo.save(toBalance);

      const earnTx = txRepo.create({
        userId: toUserId,
        amount,
        transactionType: TransactionType.EARN,
        sourceType: 'appreciation_receive' as any,
        sourceId: targetId,
        referenceKey: `${referenceBase}:receive`,
        description: `감사 포인트 수령 (${targetType}/${targetId.slice(0, 8)})${message ? ` — ${message.slice(0, 50)}` : ''}`,
      });
      await txRepo.save(earnTx);

      // 이력 저장
      const send = manager.getRepository(AppreciationSend).create({
        fromUserId,
        toUserId,
        targetType,
        targetId,
        amount,
        message: message?.trim() || undefined,
      });
      const saved = await manager.getRepository(AppreciationSend).save(send);

      logger.info('[Appreciation] Sent', {
        fromUserId,
        toUserId,
        targetType,
        targetId,
        amount,
      });

      return saved;
    });
  }

  /** 대상 콘텐츠의 감사 포인트 집계 */
  async getSummary(targetType: AppreciationTargetType, targetId: string): Promise<AppreciationSummary> {
    const result = await this.repo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.amount), 0)::int', 'totalAmount')
      .addSelect('COUNT(*)::int', 'count')
      .where('a.targetType = :targetType AND a.targetId = :targetId', { targetType, targetId })
      .getRawOne();

    return {
      targetType,
      targetId,
      totalAmount: result?.totalAmount ?? 0,
      count: result?.count ?? 0,
    };
  }

  /** 내가 보낸 감사 목록 */
  async getMySent(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: AppreciationSend[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  /** 내가 받은 감사 목록 */
  async getMyReceived(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: AppreciationSend[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { toUserId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  // ─── Private: 도메인별 제작자 ID 추출 ────────────────────────────────────

  private async _resolveCreator(
    targetType: AppreciationTargetType,
    targetId: string,
  ): Promise<string | null> {
    try {
      switch (targetType) {
        case 'forum_post': {
          const rows = await AppDataSource.query(
            `SELECT author_id FROM forum_post WHERE id = $1 LIMIT 1`,
            [targetId],
          );
          return rows[0]?.author_id ?? null;
        }
        case 'content': {
          // cms_contents (createdBy) 우선, kpa_contents (created_by) fallback
          const cms = await AppDataSource.query(
            `SELECT "createdBy" FROM cms_contents WHERE id = $1 LIMIT 1`,
            [targetId],
          );
          if (cms[0]?.createdBy) return cms[0].createdBy;
          const kpa = await AppDataSource.query(
            `SELECT created_by FROM kpa_contents WHERE id = $1 LIMIT 1`,
            [targetId],
          );
          return kpa[0]?.created_by ?? null;
        }
        case 'lms_course': {
          const rows = await AppDataSource.query(
            `SELECT "instructorId" FROM lms_courses WHERE id = $1 LIMIT 1`,
            [targetId],
          );
          return rows[0]?.instructorId ?? null;
        }
        default:
          return null;
      }
    } catch (err) {
      logger.warn('[Appreciation] _resolveCreator error', { targetType, targetId, error: (err as Error).message });
      return null;
    }
  }
}
