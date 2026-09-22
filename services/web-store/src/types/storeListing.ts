/**
 * Store Listing Card — Canonical ViewModel
 *
 * WO-O4O-KPA-STORE-LISTING-VIEWMODEL-CANONICAL-V1
 *
 * 목적:
 *   KPA 내부에서 일반 product / event-offer / 향후 trial·campaign 상품을 하나의
 *   카드/행 표시 모델로 표현 가능한 canonical ViewModel 타입을 정의한다.
 *
 * 위치:
 *   현재는 KPA 내부 전용. shared-space-ui / store-ui-core 승격은 후속 WO 에서 결정.
 *
 * 본 ViewModel 은 표시(card / table row)에 필요한 최소 필드 집합으로 구성된다.
 * 도메인 lifecycle 계산(/groupbuy/enriched 의 status), 주문 권한 검사 등은
 * 호출자(화면 또는 컨테이너) 책임이며, ViewModel 자체는 표시 정보만 담는다.
 *
 * 주의:
 *   - 본 WO 는 타입 정의만 추가한다. 기존 화면(KpaEventOfferPage / EventOfferDetailPage /
 *     StorefrontProductDetailPage) 은 변경하지 않는다.
 *   - EventOfferItem alias(StoreListing) 는 그대로 보존한다.
 *   - 카드 컴포넌트 추출은 후속 WO 에서 진행한다.
 */

import type { EventOfferItem } from './index.js';

// ─────────────────────────────────────────────────────
// Source type — 카드 진입 경로 식별자 (sourceType discriminator)
// ─────────────────────────────────────────────────────

/**
 * 카드의 진입 경로 / 도메인 분류.
 *
 * - 'event-offer': /groupbuy 계열 (KPA 이벤트/특가)
 * - 'product'    : 일반 storefront product
 * - 'trial'      : (예약) Market Trial
 * - 'campaign'   : (예약) 캠페인
 *
 * 백엔드 OPL.source_type 과 정합되도록 string union 으로 두되, null/unknown 도 허용.
 */
export type StoreListingSourceType =
  | 'event-offer'
  | 'product'
  | 'trial'
  | 'campaign'
  | (string & {}); // future-proof: 알려지지 않은 값도 허용

// ─────────────────────────────────────────────────────
// Badge tone — status / category badge 표현용 토큰
// ─────────────────────────────────────────────────────

/**
 * 카드/행에 표시되는 배지 단위.
 * tone 은 호출 측이 색 매핑(primary/success/warning/danger/neutral 등) 에 사용한다.
 */
export interface StoreListingBadge {
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | (string & {});
}

// ─────────────────────────────────────────────────────
// Period — Event Offer / Trial 의 시작/종료 시각
// ─────────────────────────────────────────────────────

export interface StoreListingPeriod {
  startAt?: string | null;
  endAt?: string | null;
}

// ─────────────────────────────────────────────────────
// Inventory — 수량/참여 한도 (event-offer 전용 필드)
// ─────────────────────────────────────────────────────

export interface StoreListingInventory {
  /** 잔여 수량 (totalQuantity 의 동의어 또는 차감된 값) */
  remaining?: number | null;
  /** 최소 참여자 수 (legacy event 모델에서 진행 조건) */
  minLimit?: number | null;
  /** 현재 참여자 수 */
  currentParticipants?: number | null;
  /** 총 수량 (제공량) */
  totalQuantity?: number | null;
}

// ─────────────────────────────────────────────────────
// Primary action — 카드의 주 CTA (예: "주문", "곧 시작")
// ─────────────────────────────────────────────────────

/**
 * 카드/행의 주 액션 정보.
 *
 * - kind: 'navigate' (기본 — href 사용) | 'order' | 'apply' | 'disabled' 등
 *   호출 측이 동작을 결정. ViewModel 은 의미만 담는다.
 * - disabled: 표시는 하되 동작 차단 (예: upcoming, sold_out, ended)
 *
 * onClick 은 함수 레퍼런스 — ViewModel 직렬화 시 제외 가능.
 */
export interface StoreListingPrimaryAction {
  label: string;
  kind?: 'navigate' | 'order' | 'apply' | 'disabled' | (string & {});
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────
// Canonical ViewModel
// ─────────────────────────────────────────────────────

/**
 * Store Listing Card ViewModel — 일반 product / event-offer / trial / campaign 공통.
 *
 * 필수 필드: id, name, primaryPrice
 * 나머지는 선택 — 카드 디자인이 sourceType / 도메인에 따라 conditional render 가능.
 */
export interface StoreListingCardViewModel {
  /** Listing 식별자 (offer.id 또는 product.id) */
  id: string;

  /** 표시 이름 (productName / title) */
  name: string;

  /** 썸네일 URL (없으면 fallback icon/이모지 표시) */
  imageUrl?: string | null;

  /** 주 가격 — 일반가 또는 표시 단가 */
  primaryPrice: number | string | null;

  /** 보조 가격 — 할인 비교용 (정가, 일반가 strikethrough) */
  secondaryPrice?: number | string | null;

  /** 할인율 (%) — 미리 계산된 값. 없으면 호출 측이 계산 가능. */
  discountPercent?: number | null;

  /** 공급업체 / 제조사 (event-offer / 일반 product 공통) */
  supplierName?: string | null;

  /** 카테고리 (storefront 일반 product 우선) */
  categoryName?: string | null;

  /**
   * 도메인 status — 자유 string.
   * event-offer: 'pending'|'rejected'|'canceled'|'upcoming'|'active'|'sold_out'|'ended'
   * product:     'available'|'sold_out' 등
   * 호출 측이 status 별 표시(badge tone, CTA 분기) 결정.
   */
  status?: string | null;

  /** sourceType discriminator — 카드 형태 분기에 사용 */
  sourceType?: StoreListingSourceType | null;

  /** 추가 배지 (sourceType label, "이벤트", "특가" 등) */
  badges?: StoreListingBadge[];

  /** 기간 (event-offer / trial) */
  period?: StoreListingPeriod;

  /** 수량/참여 한도 (event-offer / trial) */
  inventory?: StoreListingInventory;

  /** 카드 클릭 시 이동할 경로. primaryAction 미지정 시 기본 동작은 href navigate. */
  href?: string;

  /** 주 CTA — "주문", "곧 시작", "매장 등록 후" 등 */
  primaryAction?: StoreListingPrimaryAction;
}

// ─────────────────────────────────────────────────────
// Adapter — EventOfferItem → StoreListingCardViewModel
// ─────────────────────────────────────────────────────

/**
 * EventOfferItem 을 canonical ViewModel 로 변환한다.
 *
 * 본 adapter 는 표시 정보만 채운다. 주문 권한 검사(hasStore, isOrderable)는
 * 호출 측 책임이며 primaryAction 은 호출 측이 추가/덮어씀이 권장된다.
 *
 * 사용 예:
 *   const vm = fromEventOfferItem(item);
 *   // 호출 측에서 primaryAction 보강:
 *   const enriched = { ...vm, primaryAction: hasStore && item.status === 'active'
 *                                              ? { label: '주문', kind: 'order' }
 *                                              : { label: '매장 필요', kind: 'disabled', disabled: true } };
 *
 * 본 함수는 기존 화면을 호출하지 않는다 — 본 WO 에서는 정의만 추가하고
 * 컴포넌트 추출 WO 에서 화면이 import 하여 사용한다.
 */
export function fromEventOfferItem(item: EventOfferItem): StoreListingCardViewModel {
  // discountPercent 계산: secondary > primary 면 (gap/secondary) * 100
  const discountPercent = computeDiscountPercent(item.unitPrice, item.generalPrice);

  // 기간
  const period: StoreListingPeriod | undefined =
    item.startAt || item.endAt ? { startAt: item.startAt, endAt: item.endAt } : undefined;

  // 수량 / 참여 한도 (event-offer 도메인 필드)
  const inventory: StoreListingInventory | undefined =
    item.totalQuantity != null || item.perOrderLimit != null || item.perStoreLimit != null
      ? {
          totalQuantity: item.totalQuantity,
          remaining: item.totalQuantity, // EventOfferItem 은 잔여를 totalQuantity 로 표현
          // perOrderLimit / perStoreLimit 는 호출 측에서 별도 사용 (ViewModel 은 단일 minLimit 만 노출)
          minLimit: item.perOrderLimit ?? null,
        }
      : undefined;

  return {
    id: item.id,
    name: item.productName,
    imageUrl: null, // EventOfferItem 은 imageUrl 미보유 — 호출 측이 보강 가능
    primaryPrice: item.unitPrice,
    secondaryPrice: item.generalPrice,
    discountPercent,
    supplierName: item.supplierName,
    categoryName: null,
    status: item.status,
    sourceType: item.sourceType ?? 'event-offer',
    badges: undefined,
    period,
    inventory,
    href: `/event-offers/${item.id}`,
    primaryAction: undefined, // 호출 측 책임
  };
}

/**
 * 할인율 계산 — primary < secondary 일 때만 양수 반환.
 * null/0/음수 결과는 null 로 반환 (UI 가 표시하지 않도록).
 */
function computeDiscountPercent(
  primary: number | null | undefined,
  secondary: number | null | undefined,
): number | null {
  if (primary == null || secondary == null) return null;
  const p = Number(primary);
  const s = Number(secondary);
  if (!Number.isFinite(p) || !Number.isFinite(s) || s <= 0 || p >= s) return null;
  return Math.round(((s - p) / s) * 100);
}
