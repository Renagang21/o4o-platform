/**
 * Free Shipping Progress (WO-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-V1)
 *
 * 공급자 배송 정책(baseShippingFee / freeShippingThreshold)과 주문 subtotal 로
 * 무료배송 안내 문구를 계산하는 순수 함수. 배송비를 재계산하거나 서버 계산값을
 * 덮어쓰지 않는다 — 표시 전용.
 *
 * 백엔드 계산 기준(apps/api-server/src/services/shipping/supplier-shipping.ts)과 동일 의미:
 *   - freeShippingThreshold 미설정 → 무료배송 기준 없음
 *   - subtotal >= threshold → 무료배송 적용
 *   - 그 외 → 남은 금액 = threshold - subtotal
 */

export interface FreeShippingPolicyInput {
  subtotal: number;
  baseShippingFee?: number | null;
  freeShippingThreshold?: number | null;
}

export interface FreeShippingProgress {
  /** 무료배송 기준(threshold)이 설정되어 있는가 */
  hasThreshold: boolean;
  /** 공급자 배송 정책 자체가 설정되어 있는가(base 또는 threshold 중 하나라도) */
  hasPolicy: boolean;
  /** 무료배송 기준 충족 */
  freeShippingApplied: boolean;
  /** 무료배송까지 남은 금액(기준 없으면 null) */
  remainingAmount: number | null;
  /** 사용자 안내 문구 */
  message: string;
}

const won = (v: number): string => `${Math.max(0, Math.round(v)).toLocaleString('ko-KR')}원`;

export function calcFreeShippingProgress(input: FreeShippingPolicyInput): FreeShippingProgress {
  const subtotal = Number(input.subtotal) || 0;
  const base = input.baseShippingFee ?? null;
  const threshold = input.freeShippingThreshold ?? null;
  const hasPolicy = base != null || threshold != null;

  if (threshold == null) {
    return {
      hasThreshold: false,
      hasPolicy,
      freeShippingApplied: false,
      remainingAmount: null,
      message: hasPolicy
        ? '이 공급자는 무료배송 기준을 설정하지 않았습니다. 배송비는 주문 시 공급자 배송 정책에 따라 계산됩니다.'
        : '이 공급자는 배송 정책을 설정하지 않았습니다. 배송비는 주문 시 계산됩니다.',
    };
  }

  if (subtotal >= threshold) {
    return {
      hasThreshold: true,
      hasPolicy: true,
      freeShippingApplied: true,
      remainingAmount: 0,
      message: '무료배송 기준을 충족했습니다.',
    };
  }

  const remaining = threshold - subtotal;
  return {
    hasThreshold: true,
    hasPolicy: true,
    freeShippingApplied: false,
    remainingAmount: remaining,
    message: `무료배송까지 ${won(remaining)} 남았습니다.`,
  };
}

/** 금액 표시 헬퍼 (원). */
export function formatWon(v: number | null | undefined): string {
  return won(Number(v ?? 0));
}
