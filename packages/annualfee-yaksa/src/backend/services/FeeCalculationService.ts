import { DataSource } from 'typeorm';
import {
  FeePolicy,
  PharmacistTypeRule,
  OfficialRoleRule,
  ExemptionRule,
} from '../entities/FeePolicy.js';
import { AmountBreakdown } from '../entities/FeeInvoice.js';
import { FeePolicyService } from './FeePolicyService.js';

/**
 * MemberFeeContext
 * 회비 계산에 필요한 회원 정보
 */
export interface MemberFeeContext {
  memberId: string;
  memberName: string;
  categoryId?: string;
  categoryName?: string;
  requiresAnnualFee: boolean;
  pharmacistType?: string;
  officialRole?: string;
  organizationId: string;
  organizationType?: 'national' | 'division' | 'branch';
  birthdate?: string;
  yaksaJoinDate?: string;
  isActive: boolean;
  isVerified: boolean;
  // LMS 연동
  lmsCreditsEarned?: number;
  lmsCreditsRequired?: number;
}

/**
 * FeeCalculationResult
 * 회비 계산 결과
 */
export interface FeeCalculationResult {
  memberId: string;
  year: number;
  breakdown: AmountBreakdown;
  exemptions: Array<{
    category: string;
    reason: string;
    amount: number;
  }>;
  isExempt: boolean;
  exemptReason?: string;
}

/**
 * FeeCalculationService
 *
 * 회비 계산 엔진
 * 정책에 따라 회원별 회비를 계산
 */
export class FeeCalculationService {
  private policyService: FeePolicyService;

  constructor(private dataSource: DataSource) {
    this.policyService = new FeePolicyService(dataSource);
  }

  /**
   * 회원 회비 계산
   */
  async calculateFee(
    context: MemberFeeContext,
    year?: number
  ): Promise<FeeCalculationResult> {
    const targetYear = year ?? new Date().getFullYear();

    // 정책 조회
    const policy = await this.policyService.findActiveByYear(targetYear);
    if (!policy) {
      throw new Error(`No active policy found for year ${targetYear}`);
    }

    // 회비 면제 회원 확인
    if (!context.requiresAnnualFee) {
      return this.createExemptResult(context.memberId, targetYear, '회원 카테고리 면제');
    }

    // 비활성/미검증 회원 확인
    if (!context.isActive) {
      return this.createExemptResult(context.memberId, targetYear, '비활성 회원');
    }

    // 기본 금액 설정
    const breakdown: AmountBreakdown = {
      baseAmount: policy.baseAmount,
      divisionFeeAmount: policy.divisionFeeAmount,
      branchFeeAmount: policy.branchFeeAmount,
      adjustments: [],
      totalBeforeDiscount: policy.getTotalBaseAmount(),
      totalDiscount: 0,
      finalAmount: policy.getTotalBaseAmount(),
    };

    const exemptions: FeeCalculationResult['exemptions'] = [];

    // 1. 약사 유형별 조정
    if (context.pharmacistType && policy.pharmacistTypeRules) {
      const adjustment = this.applyPharmacistTypeRule(
        policy.pharmacistTypeRules,
        context.pharmacistType,
        breakdown.totalBeforeDiscount
      );
      if (adjustment) {
        breakdown.adjustments.push(adjustment);
        if (adjustment.amount < 0) {
          breakdown.totalDiscount += Math.abs(adjustment.amount);
        }
      }
    }

    // 2. 직책별 조정
    if (context.officialRole && policy.officialRoleRules) {
      const result = this.applyOfficialRoleRule(
        policy.officialRoleRules,
        context.officialRole,
        breakdown.totalBeforeDiscount
      );
      if (result) {
        if (result.isExempt) {
          return this.createExemptResult(
            context.memberId,
            targetYear,
            `직책 면제 (${context.officialRole})`
          );
        }
        if (result.adjustment) {
          breakdown.adjustments.push(result.adjustment);
          if (result.adjustment.amount < 0) {
            breakdown.totalDiscount += Math.abs(result.adjustment.amount);
          }
        }
      }
    }

    // 3. 감면 규칙 적용
    if (policy.exemptionRules) {
      for (const rule of policy.exemptionRules) {
        const exemption = this.applyExemptionRule(
          rule,
          context,
          breakdown.totalBeforeDiscount - breakdown.totalDiscount
        );
        if (exemption) {
          if (exemption.isFullExempt) {
            return this.createExemptResult(
              context.memberId,
              targetYear,
              exemption.reason
            );
          }
          exemptions.push({
            category: rule.category,
            reason: exemption.reason,
            amount: exemption.amount,
          });
          breakdown.adjustments.push({
            type: 'exemption',
            reason: exemption.reason,
            amount: -exemption.amount,
          });
          breakdown.totalDiscount += exemption.amount;
        }
      }
    }

    // 최종 금액 계산
    breakdown.finalAmount = Math.max(
      0,
      breakdown.totalBeforeDiscount - breakdown.totalDiscount
    );

    return {
      memberId: context.memberId,
      year: targetYear,
      breakdown,
      exemptions,
      isExempt: false,
    };
  }

  /**
   * 일괄 회비 계산
   */
  async calculateBulkFees(
    contexts: MemberFeeContext[],
    year?: number
  ): Promise<FeeCalculationResult[]> {
    const results: FeeCalculationResult[] = [];

    for (const context of contexts) {
      try {
        const result = await this.calculateFee(context, year);
        results.push(result);
      } catch (error) {
        // 개별 회원 계산 실패 시 로그 후 계속 진행
        console.error(
          `Fee calculation failed for member ${context.memberId}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * 면제 결과 생성
   */
  private createExemptResult(
    memberId: string,
    year: number,
    reason: string
  ): FeeCalculationResult {
    return {
      memberId,
      year,
      breakdown: {
        baseAmount: 0,
        divisionFeeAmount: 0,
        branchFeeAmount: 0,
        adjustments: [],
        totalBeforeDiscount: 0,
        totalDiscount: 0,
        finalAmount: 0,
      },
      exemptions: [],
      isExempt: true,
      exemptReason: reason,
    };
  }

  /**
   * 약사 유형별 규칙 적용
   */
  private applyPharmacistTypeRule(
    rules: PharmacistTypeRule[],
    pharmacistType: string,
    baseAmount: number
  ): AmountBreakdown['adjustments'][0] | null {
    const rule = rules.find((r) => r.type === pharmacistType);
    if (!rule) return null;

    let adjustmentAmount: number;
    if (rule.adjustmentType === 'fixed') {
      adjustmentAmount = rule.adjustmentValue;
    } else {
      // percentage
      adjustmentAmount = Math.round(baseAmount * (rule.adjustmentValue / 100));
    }

    return {
      type: 'pharmacistType',
      reason: rule.description || `약사 유형: ${pharmacistType}`,
      amount: adjustmentAmount,
    };
  }

  /**
   * 직책별 규칙 적용
   */
  private applyOfficialRoleRule(
    rules: OfficialRoleRule[],
    officialRole: string,
    baseAmount: number
  ): { isExempt: boolean; adjustment?: AmountBreakdown['adjustments'][0] } | null {
    const rule = rules.find((r) => r.role === officialRole);
    if (!rule) return null;

    if (rule.adjustmentType === 'exempt') {
      return { isExempt: true };
    }

    let adjustmentAmount: number;
    if (rule.adjustmentType === 'fixed') {
      adjustmentAmount = rule.adjustmentValue;
    } else {
      // percentage
      adjustmentAmount = Math.round(baseAmount * (rule.adjustmentValue / 100));
    }

    return {
      isExempt: false,
      adjustment: {
        type: 'officialRole',
        reason: rule.description || `직책: ${officialRole}`,
        amount: adjustmentAmount,
      },
    };
  }

  /**
   * 감면 규칙 적용
   */
  private applyExemptionRule(
    rule: ExemptionRule,
    context: MemberFeeContext,
    currentAmount: number
  ): { isFullExempt: boolean; reason: string; amount: number } | null {
    // 조건 확인
    if (!this.checkExemptionCondition(rule, context)) {
      return null;
    }

    const reason = rule.description || `감면: ${rule.category}`;

    if (rule.adjustmentType === 'full_exempt') {
      return {
        isFullExempt: true,
        reason,
        amount: currentAmount,
      };
    }

    let exemptionAmount: number;
    if (rule.adjustmentType === 'fixed') {
      exemptionAmount = Math.min(rule.adjustmentValue, currentAmount);
    } else {
      // percentage
      exemptionAmount = Math.round(currentAmount * (rule.adjustmentValue / 100));
    }

    return {
      isFullExempt: false,
      reason,
      amount: exemptionAmount,
    };
  }

  /**
   * 감면 조건 확인
   */
  private checkExemptionCondition(
    rule: ExemptionRule,
    context: MemberFeeContext
  ): boolean {
    const condition = rule.condition;

    // 나이 조건 (고령 감면)
    if (condition.ageThreshold && context.birthdate) {
      const age = this.calculateAge(context.birthdate);
      if (age < condition.ageThreshold) {
        return false;
      }
    }

    // 회원 카테고리 조건
    if (condition.categoryMatch && context.categoryName) {
      if (!condition.categoryMatch.includes(context.categoryName)) {
        return false;
      }
    }

    // 입회일 조건 (신규 회원 감면)
    if (condition.joinDateWithin && context.yaksaJoinDate) {
      const monthsSinceJoin = this.calculateMonthsSince(context.yaksaJoinDate);
      if (monthsSinceJoin > condition.joinDateWithin) {
        return false;
      }
    }

    // 조기 납부 조건은 납부 시점에 별도 확인

    return true;
  }

  /**
   * 나이 계산
   */
  private calculateAge(birthdate: string): number {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * 입회 후 경과 월수 계산
   */
  private calculateMonthsSince(dateStr: string): number {
    const date = new Date(dateStr);
    const today = new Date();

    const months =
      (today.getFullYear() - date.getFullYear()) * 12 +
      (today.getMonth() - date.getMonth());

    return months;
  }

  /**
   * 조기 납부 할인 확인
   */
  async checkEarlyPaymentDiscount(
    year: number,
    paymentDate: Date = new Date()
  ): Promise<{ eligible: boolean; discountRate?: number }> {
    const policy = await this.policyService.findActiveByYear(year);
    if (!policy || !policy.earlyPaymentDate) {
      return { eligible: false };
    }

    const earlyDeadline = policy.getEarlyPaymentDateForYear();
    if (!earlyDeadline) {
      return { eligible: false };
    }

    if (paymentDate <= earlyDeadline) {
      // 조기 납부 할인 규칙 찾기
      const earlyPaymentRule = policy.exemptionRules?.find(
        (r) => r.category === 'earlyPayment'
      );
      if (earlyPaymentRule) {
        return {
          eligible: true,
          discountRate:
            earlyPaymentRule.adjustmentType === 'percentage'
              ? earlyPaymentRule.adjustmentValue
              : undefined,
        };
      }
    }

    return { eligible: false };
  }
}
