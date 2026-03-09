/**
 * Financial Core — Commission Types
 *
 * WO-O4O-COMMISSION-ENGINE-UNIFICATION-V1
 *
 * Platform Fee / Supplier Settlement / Partner Commission
 * 통합 계산 인터페이스.
 */

/** 커미션 계산 입력 */
export interface CommissionInput {
  orderId: string;
  supplierId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  partnerId?: string;
  /** 파트너 계약 커미션율 (%) — contract-based */
  contractCommissionRate?: number;
  /** 파트너 고정 커미션 단가 (원) — referral-based */
  commissionPerUnit?: number;
}

/** 커미션 계산 결과 */
export interface CommissionResult {
  platformFee: number;
  supplierAmount: number;
  partnerCommission: number;
}

/** 커미션 정책 */
export interface CommissionPolicy {
  /** Platform Fee Rate (0.10 = 10%) */
  platformFeeRate: number;
}

/** 커미션 유형 */
export type CommissionMode = 'rate' | 'fixed';
