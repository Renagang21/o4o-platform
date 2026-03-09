/**
 * Commission Engine
 *
 * WO-O4O-COMMISSION-ENGINE-UNIFICATION-V1
 *
 * Unified commission calculation:
 *   Order → CommissionEngine → CommissionResult
 *
 * 세 가지 계산을 하나의 Engine에서 처리:
 *   1. Platform Fee      (totalPrice × feeRate)
 *   2. Partner Commission (rate-based 또는 fixed per-unit)
 *   3. Supplier Amount    (totalPrice - platformFee - partnerCommission)
 */

import type { CommissionInput, CommissionResult, CommissionPolicy } from './types.js';

/** Default platform fee rate (10%) */
const DEFAULT_PLATFORM_FEE_RATE = 0.10;

export class CommissionEngine {
  private policy: CommissionPolicy;

  constructor(policy?: Partial<CommissionPolicy>) {
    this.policy = {
      platformFeeRate: policy?.platformFeeRate ?? DEFAULT_PLATFORM_FEE_RATE,
    };
  }

  /**
   * 통합 커미션 계산
   *
   * Order Item → Platform Fee + Partner Commission + Supplier Amount
   */
  calculate(input: CommissionInput): CommissionResult {
    const platformFee = this.calculatePlatformFee(input.totalPrice);
    const partnerCommission = this.calculatePartnerCommission(input);
    const supplierAmount = input.totalPrice - platformFee - partnerCommission;

    return { platformFee, supplierAmount, partnerCommission };
  }

  /**
   * Platform Fee 계산
   *
   * @param totalPrice - 주문 총액
   * @param feeRate - 수수료율 (미지정 시 정책 기본값 사용)
   */
  calculatePlatformFee(totalPrice: number, feeRate?: number): number {
    return Math.round(totalPrice * (feeRate ?? this.policy.platformFeeRate));
  }

  /**
   * Partner Commission 계산
   *
   * 두 가지 모드:
   * - rate: totalPrice × contractCommissionRate / 100
   * - fixed: quantity × commissionPerUnit
   */
  calculatePartnerCommission(input: CommissionInput): number {
    if (input.contractCommissionRate != null && input.contractCommissionRate > 0) {
      return Math.round(input.totalPrice * input.contractCommissionRate / 100);
    }
    if (input.commissionPerUnit != null && input.commissionPerUnit > 0) {
      return input.quantity * input.commissionPerUnit;
    }
    return 0;
  }

  /**
   * Supplier Amount 계산
   *
   * supplierAmount = totalPrice - platformFee - partnerCommission
   */
  calculateSupplierAmount(totalPrice: number, platformFee: number, partnerCommission = 0): number {
    return totalPrice - platformFee - partnerCommission;
  }

  /** 현재 platform fee rate 조회 */
  getPlatformFeeRate(): number {
    return this.policy.platformFeeRate;
  }
}
