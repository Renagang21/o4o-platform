/**
 * CommissionEngineService
 *
 * 커미션 계산 엔진
 * - 우선순위 기반 정책 조회 (product > campaign > partner > default)
 * - 정률(PERCENT) / 정액(FIXED) 계산
 * - 이벤트 타입별 커미션 처리
 */

import type { Repository } from 'typeorm';
import type { CommissionPolicy, PolicyType } from '../entities/commission-policy.entity.js';
import type { EventType } from '../entities/partner-earnings.entity.js';

export interface CommissionCalculationInput {
  partnerId: string;
  eventType: EventType;
  eventValue: number; // 구매액, 클릭 가치 등
  productId?: string;
  campaignId?: string;
  transactionId?: string;
}

export interface CommissionCalculationResult {
  amount: number;
  policy: CommissionPolicy | null;
  policyId: string | null;
  calculationDetails: {
    eventType: EventType;
    eventValue: number;
    policyType: PolicyType;
    rate?: number;
    fixedAmount?: number;
  };
}

export interface PolicyResolutionContext {
  partnerId: string;
  productId?: string;
  campaignId?: string;
  now: Date;
}

export class CommissionEngineService {
  constructor(
    private readonly policyRepository: Repository<CommissionPolicy>
  ) {}

  /**
   * 커미션 계산 실행
   *
   * @param input - 계산 입력값
   * @returns 계산 결과 (금액, 적용된 정책 등)
   */
  async calculate(input: CommissionCalculationInput): Promise<CommissionCalculationResult> {
    const { partnerId, eventType, eventValue, productId, campaignId } = input;

    // 1. 적용 가능한 정책 조회 (우선순위 순)
    const policy = await this.resolvePolicy({
      partnerId,
      productId,
      campaignId,
      now: new Date(),
    });

    // 2. 정책이 없으면 기본값 0 반환
    if (!policy) {
      return {
        amount: 0,
        policy: null,
        policyId: null,
        calculationDetails: {
          eventType,
          eventValue,
          policyType: 'PERCENT',
          rate: 0,
        },
      };
    }

    // 3. 정책 유형에 따라 커미션 계산
    const amount = this.calculateAmount(eventValue, policy);

    return {
      amount,
      policy,
      policyId: policy.id,
      calculationDetails: {
        eventType,
        eventValue,
        policyType: policy.policyType,
        rate: policy.policyType === 'PERCENT' ? Number(policy.commissionRate) : undefined,
        fixedAmount: policy.policyType === 'FIXED' ? Number(policy.fixedAmount) : undefined,
      },
    };
  }

  /**
   * 우선순위 기반 정책 조회
   *
   * 우선순위:
   * 1. 특정 상품 + 특정 파트너 정책
   * 2. 특정 캠페인 + 특정 파트너 정책
   * 3. 특정 파트너 전용 정책
   * 4. 특정 상품 전체 적용 정책
   * 5. 특정 캠페인 전체 적용 정책
   * 6. 전체 기본 정책
   *
   * @param context - 정책 조회 컨텍스트
   * @returns 가장 높은 우선순위의 활성 정책
   */
  async resolvePolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    const { partnerId, productId, campaignId, now } = context;

    // 활성 상태이고 유효 기간 내인 정책만 조회
    const queryBuilder = this.policyRepository
      .createQueryBuilder('policy')
      .where('policy.isActive = :isActive', { isActive: true })
      .andWhere(
        '(policy.effectiveFrom IS NULL OR policy.effectiveFrom <= :now)',
        { now }
      )
      .andWhere(
        '(policy.effectiveTo IS NULL OR policy.effectiveTo >= :now)',
        { now }
      )
      .orderBy('policy.priority', 'DESC')
      .addOrderBy('policy.createdAt', 'DESC');

    // 조건 배열 생성 (OR 조건들)
    const conditions: string[] = [];
    const parameters: Record<string, unknown> = { now, isActive: true };

    // 1. 특정 상품 + 특정 파트너
    if (productId) {
      conditions.push('(policy.productId = :productId AND policy.partnerId = :partnerId)');
      parameters.productId = productId;
      parameters.partnerId = partnerId;
    }

    // 2. 특정 캠페인 + 특정 파트너
    if (campaignId) {
      conditions.push('(policy.campaignId = :campaignId AND policy.partnerId = :partnerId)');
      parameters.campaignId = campaignId;
      parameters.partnerId = partnerId;
    }

    // 3. 특정 파트너 전용 정책
    conditions.push('(policy.partnerId = :partnerId AND policy.productId IS NULL AND policy.campaignId IS NULL)');
    parameters.partnerId = partnerId;

    // 4. 특정 상품 전체 적용
    if (productId) {
      conditions.push('(policy.productId = :productId AND policy.partnerId IS NULL)');
    }

    // 5. 특정 캠페인 전체 적용
    if (campaignId) {
      conditions.push('(policy.campaignId = :campaignId AND policy.partnerId IS NULL)');
    }

    // 6. 전체 기본 정책
    conditions.push('(policy.partnerId IS NULL AND policy.productId IS NULL AND policy.campaignId IS NULL)');

    // 조건 적용
    if (conditions.length > 0) {
      queryBuilder.andWhere(`(${conditions.join(' OR ')})`, parameters);
    }

    // 가장 높은 우선순위 정책 반환
    const policy = await queryBuilder.getOne();
    return policy;
  }

  /**
   * 커미션 금액 계산
   *
   * @param eventValue - 이벤트 값 (구매액 등)
   * @param policy - 적용 정책
   * @returns 계산된 커미션 금액
   */
  private calculateAmount(eventValue: number, policy: CommissionPolicy): number {
    if (policy.policyType === 'FIXED') {
      // 정액: 고정 금액 반환
      return Number(policy.fixedAmount);
    }

    // 정률: eventValue * commissionRate
    const rate = Number(policy.commissionRate);
    let amount = eventValue * rate;

    // 최대 커미션 제한 적용 (metadata에서 확인)
    if (policy.metadata?.maxCommission && amount > policy.metadata.maxCommission) {
      amount = policy.metadata.maxCommission;
    }

    // 소수점 이하 2자리로 반올림
    return Math.round(amount * 100) / 100;
  }

  /**
   * 여러 이벤트에 대한 일괄 커미션 계산
   *
   * @param inputs - 계산 입력값 배열
   * @returns 계산 결과 배열
   */
  async calculateBatch(inputs: CommissionCalculationInput[]): Promise<CommissionCalculationResult[]> {
    const results: CommissionCalculationResult[] = [];

    for (const input of inputs) {
      const result = await this.calculate(input);
      results.push(result);
    }

    return results;
  }

  /**
   * 특정 파트너의 적용 가능한 모든 정책 조회
   *
   * @param partnerId - 파트너 ID
   * @returns 적용 가능한 정책 목록 (우선순위 순)
   */
  async getApplicablePolicies(partnerId: string): Promise<CommissionPolicy[]> {
    const now = new Date();

    return this.policyRepository
      .createQueryBuilder('policy')
      .where('policy.isActive = :isActive', { isActive: true })
      .andWhere(
        '(policy.effectiveFrom IS NULL OR policy.effectiveFrom <= :now)',
        { now }
      )
      .andWhere(
        '(policy.effectiveTo IS NULL OR policy.effectiveTo >= :now)',
        { now }
      )
      .andWhere(
        '(policy.partnerId = :partnerId OR policy.partnerId IS NULL)',
        { partnerId }
      )
      .orderBy('policy.priority', 'DESC')
      .addOrderBy('policy.createdAt', 'DESC')
      .getMany();
  }

  /**
   * 커미션 시뮬레이션 (실제 저장 없이 계산만)
   *
   * @param input - 계산 입력값
   * @returns 시뮬레이션 결과
   */
  async simulate(input: CommissionCalculationInput): Promise<CommissionCalculationResult & { breakdown: string }> {
    const result = await this.calculate(input);

    let breakdown = '';
    if (result.policy) {
      if (result.calculationDetails.policyType === 'PERCENT') {
        const rate = result.calculationDetails.rate || 0;
        breakdown = `${input.eventValue.toLocaleString()}원 × ${(rate * 100).toFixed(2)}% = ${result.amount.toLocaleString()}원`;
      } else {
        breakdown = `고정 금액: ${result.amount.toLocaleString()}원`;
      }
    } else {
      breakdown = '적용 가능한 정책 없음 (0원)';
    }

    return {
      ...result,
      breakdown,
    };
  }
}
