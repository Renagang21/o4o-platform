/**
 * PointService — O4O Platform 공통 보상 진입점 (facade + spend)
 *
 * WO-O4O-POINT-CORE-SEPARATION-V1: facade 도입 (grantPoint)
 * WO-O4O-POINT-CORE-EXTENSION-V1: spend 도입 + 운영자 지급/차감 지원
 *
 * 본 모듈은 LMS Quiz 적립과 운영자 수동 지급/차감 모두의 단일 진입점을 제공한다.
 * 내부적으로 credit_balances / credit_transactions 테이블을 사용하지만,
 * 호출자는 PointService만 알면 된다.
 *
 * 이번 단계에서 하지 않는 것:
 *   - DB 명명 리네이밍 (credit_* → point_*)
 *   - wallet 다중 분리 (서비스별 잔액)
 *   - supplier 비용 부담 추적 (sponsorOrgId 등)
 *   - reward 정책 DB화
 */

import { AppDataSource } from '../../../database/connection.js';
import { CreditBalance } from '../../credit/entities/CreditBalance.js';
import {
  CreditTransaction,
  CreditSourceType,
  TransactionType,
} from '../../credit/entities/CreditTransaction.js';
import { CreditService } from '../../credit/services/CreditService.js';
import logger from '../../../utils/logger.js';

/**
 * sourceType 타입.
 *   - 자동 적립(LMS Quiz): CreditSourceType enum 값 (lesson_complete / quiz_pass / course_complete)
 *   - 운영자 일반 조작: 'admin_grant' / 'admin_spend' / 'admin_adjust'
 *   - 운영자 보상 정산(차감): 'reward_payout_*' — 실제 보상 지급 완료 유형
 *     (WO-O4O-POINT-PAYOUT-TYPE-BACKEND-V1)
 *
 * 향후 PointSourceType 전용 enum으로 승격 예정. 현재는 union으로 호환 유지.
 * DB 컬럼은 varchar(50)이라 마이그레이션 없이 새 값 저장 가능.
 */
export type PointPayoutType =
  | 'reward_payout_offline'
  | 'reward_payout_voucher'
  | 'reward_payout_survey'
  | 'reward_payout_course'
  | 'reward_payout_other';

export const POINT_PAYOUT_TYPES: readonly PointPayoutType[] = [
  'reward_payout_offline',
  'reward_payout_voucher',
  'reward_payout_survey',
  'reward_payout_course',
  'reward_payout_other',
] as const;

export type PointSourceType =
  | CreditSourceType
  | 'admin_grant'
  | 'admin_spend'
  | 'admin_adjust'
  | PointPayoutType;

export interface GrantPointParams {
  userId: string;
  amount: number;
  sourceType: PointSourceType;
  sourceId?: string;
  /** 중복 지급 방지 키. 동일 보상 이벤트에 결정성 있게 생성. */
  referenceKey: string;
  description: string;
}

export interface SpendPointParams {
  userId: string;
  amount: number;
  sourceType: PointSourceType;
  sourceId?: string;
  /** 중복 차감 방지 키. */
  referenceKey: string;
  description: string;
}

export class PointService {
  private static instance: PointService;

  static getInstance(): PointService {
    if (!PointService.instance) {
      PointService.instance = new PointService();
    }
    return PointService.instance;
  }

  /**
   * 사용자에게 포인트 지급. 동일 referenceKey가 이미 존재하면 null 반환(dedup).
   * CreditService.earnCredit()로 위임 — 동작·DB·로그 모두 기존과 동일.
   */
  async grantPoint(params: GrantPointParams): Promise<CreditTransaction | null> {
    return CreditService.getInstance().earnCredit(
      params.userId,
      params.amount,
      params.sourceType as CreditSourceType,
      params.sourceId,
      params.referenceKey,
      params.description,
    );
  }

  /**
   * 사용자 포인트 차감.
   *
   * 정책:
   *   - amount는 양수만 허용. 음수 차감(=지급)은 grantPoint를 사용해야 함.
   *   - balance < amount 인 경우 INSUFFICIENT_BALANCE 에러.
   *   - referenceKey 중복 시 dedup (이미 차감 처리된 요청은 멱등).
   *   - DB 트랜잭션 + pessimistic lock으로 동시성 안전 보장.
   *
   * 본 메서드는 CreditService를 거치지 않고 entity repo를 직접 사용한다.
   * 사유: CreditService는 earn 전용 설계이므로 spend 로직을 추가하면
   *      "Earn-only" 계약이 깨짐. 분리 유지를 위해 PointService에서 직접 처리.
   *
   * @returns 차감 후 잔액 + 트랜잭션 ID
   * @throws INVALID_AMOUNT — amount <= 0
   * @throws INSUFFICIENT_BALANCE — 잔액 부족
   */
  async spendPoint(
    params: SpendPointParams,
  ): Promise<{ balance: number; transactionId: string }> {
    if (params.amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    return AppDataSource.transaction(async (manager) => {
      const balanceRepo = manager.getRepository(CreditBalance);
      const txRepo = manager.getRepository(CreditTransaction);

      // referenceKey 중복 차감 방지 (멱등성)
      const existing = await txRepo.findOne({
        where: { referenceKey: params.referenceKey },
      });
      if (existing) {
        const cur = await balanceRepo.findOne({
          where: { userId: params.userId },
        });
        logger.debug(`[Point] spend dedup hit: ${params.referenceKey}`);
        return {
          balance: cur?.balance ?? 0,
          transactionId: existing.id,
        };
      }

      // pessimistic write lock으로 동시성 보호
      const balance = await balanceRepo
        .createQueryBuilder('b')
        .setLock('pessimistic_write')
        .where('b.userId = :userId', { userId: params.userId })
        .getOne();

      if (!balance || balance.balance < params.amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      balance.balance -= params.amount;
      await balanceRepo.save(balance);

      const tx = txRepo.create({
        userId: params.userId,
        amount: -params.amount, // 음수로 기록 (ledger 방향성)
        transactionType: TransactionType.SPEND,
        sourceType: params.sourceType as CreditSourceType,
        sourceId: params.sourceId,
        referenceKey: params.referenceKey,
        description: params.description,
      });
      await txRepo.save(tx);

      logger.info('[Point] Spent', {
        userId: params.userId,
        amount: params.amount,
        sourceType: params.sourceType,
        referenceKey: params.referenceKey,
        newBalance: balance.balance,
      });

      return { balance: balance.balance, transactionId: tx.id };
    });
  }
}
