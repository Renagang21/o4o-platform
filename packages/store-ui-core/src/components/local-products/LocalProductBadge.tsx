export type LocalProductBadgeType = 'none' | 'new' | 'recommend' | 'event';

export interface LocalProductBadgeOption {
  value: LocalProductBadgeType;
  label: string;
  /** Tailwind color classes (bg + text) */
  color: string;
}

/**
 * 매장 취급 상품(StoreLocalProduct) badge_type 공통 옵션.
 * WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V1:
 *   KPA/GP/KCos 의 동일한 로컬 BADGE_OPTIONS 중복을 통합. 폼 옵션 + 목록 배지 양쪽에서 사용.
 */
export const LOCAL_PRODUCT_BADGE_OPTIONS: LocalProductBadgeOption[] = [
  { value: 'none', label: '없음', color: 'bg-slate-100 text-slate-600' },
  { value: 'new', label: 'NEW', color: 'bg-blue-100 text-blue-700' },
  { value: 'recommend', label: '추천', color: 'bg-green-100 text-green-700' },
  { value: 'event', label: '이벤트', color: 'bg-orange-100 text-orange-700' },
];

export interface LocalProductBadgeProps {
  /** StoreLocalProduct.badge_type (none/new/recommend/event) */
  badgeType?: string | null;
  /** 추가 className */
  className?: string;
}

/**
 * LocalProductBadge — 매장 취급 상품 목록의 badge_type 표시 배지.
 * 'none'/미정의/빈값은 렌더하지 않음(null). 3서비스 모두 Tailwind 기반이라 디자인 시스템 비충돌.
 * (O4O 주문 가능 상품 배지가 아님 — 매장 취급 상품(non-order) 전용 표시.)
 */
export function LocalProductBadge({ badgeType, className }: LocalProductBadgeProps) {
  if (!badgeType || badgeType === 'none') return null;
  const opt = LOCAL_PRODUCT_BADGE_OPTIONS.find((b) => b.value === badgeType);
  if (!opt) return null;
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${opt.color}${className ? ` ${className}` : ''}`}
    >
      {opt.label}
    </span>
  );
}
