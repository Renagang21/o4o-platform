/**
 * EventOffersHubList — Store Hub 이벤트 오퍼 단순 목록 (GP/KCos 진입점).
 *
 * WO-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1: GP/KCos 통합
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   테이블 마크업을 공통 `EventOfferHubView` 로 이관하고, 이 컴포넌트는
 *   **조회 상태 + 장바구니 담기 + 단순 목록 config** 만 소유한다.
 *   서비스 wrapper(props: listActive / addToCart / accent) 계약은 그대로다.
 *
 * 도메인: 이벤트 오퍼 = 이벤트형 O4O 주문 가능 상품. 진행 중(active/approved+isActive)만 노출.
 *   장바구니 담기 → /store-hub/cart → checkout-confirm → checkout_orders(buyer).
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShoppingCart } from 'lucide-react';
import { EventOfferHubView } from './EventOfferHubView';

/** accent 별 정적 Tailwind class (동적 class 생성 금지) */
const ACCENT_CLASSES = {
  teal: {
    link: 'border-teal-200 text-teal-700 hover:bg-teal-50',
    spinner: 'text-teal-600',
    btn: 'border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100',
  },
  pink: {
    link: 'border-pink-200 text-pink-700 hover:bg-pink-50',
    spinner: 'text-pink-600',
    btn: 'border-pink-200 text-pink-700 bg-pink-50 hover:bg-pink-100',
  },
} as const;

export type EventOffersHubAccent = keyof typeof ACCENT_CLASSES;

export interface EventOfferHubItem {
  id: string;
  productName: string;
  supplierName: string;
  status: string;
  isActive: boolean;
  price: number | null;
  unitPrice: number | null;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  createdAt: string | null;
}

export interface EventOffersHubListProps<T extends EventOfferHubItem> {
  /** 진행 중 이벤트 오퍼 조회 (axios 응답 shape: { data: { data: T[] } }) */
  listActive: (page: number, limit: number) => Promise<{ data?: { data?: T[] | null } | null }>;
  /** 장바구니 담기 — service 별 storeCartApi + payload + toast 처리(컴포넌트는 loading 만 관리) */
  addToCart: (offer: T, quantity: number) => Promise<void>;
  /** 서비스 테마 accent */
  accent?: EventOffersHubAccent;
}

function formatCreatedAt(iso: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return '-';
  }
}

export function EventOffersHubList<T extends EventOfferHubItem>({
  listActive,
  addToCart,
  accent = 'teal',
}: EventOffersHubListProps<T>) {
  const a = ACCENT_CLASSES[accent];
  const [offers, setOffers] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listActive(1, 50);
      const items: T[] = res.data?.data ?? [];
      const data = items.filter(
        (o) => (o.status === 'active' || o.status === 'approved') && o.isActive,
      );
      setOffers(data);
    } catch (err: any) {
      const status = err?.response?.status;
      setError(
        status === 401 || status === 403
          ? '접근 권한이 없습니다.'
          : '이벤트 오퍼를 불러오지 못했습니다.',
      );
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [listActive]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const handleAddToCart = useCallback(
    async (offer: T) => {
      if (orderingId) return; // 중복 클릭 방지
      const qty =
        offer.perOrderLimit && offer.perOrderLimit > 0 ? Math.min(1, offer.perOrderLimit) : 1;
      setOrderingId(offer.id);
      try {
        await addToCart(offer, qty);
      } catch {
        // toast 는 addToCart(service) 에서 처리
      } finally {
        setOrderingId(null);
      }
    },
    [orderingId, addToCart],
  );

  return (
    <EventOfferHubView<T>
      items={offers}
      loading={loading}
      spinnerClassName={a.spinner}
      header={
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">이벤트 오퍼</h1>
            <p className="text-slate-500 mt-1 text-sm">
              승인된 이벤트 오퍼를 장바구니에 담아 내 장바구니에서 주문 확정합니다.
            </p>
          </div>
          <Link
            to="/store-hub/cart"
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border bg-white transition-colors ${a.link}`}
          >
            <ShoppingCart size={15} /> 내 장바구니
          </Link>
        </div>
      }
      errorSlot={
        error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        ) : null
      }
      dateHeader="승인일"
      formatDate={(item) => formatCreatedAt(item.createdAt)}
      renderAction={(offer) => (
        <button
          type="button"
          onClick={() => handleAddToCart(offer)}
          disabled={orderingId === offer.id}
          title="이벤트 오퍼를 장바구니에 담습니다."
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${a.btn}`}
        >
          {orderingId === offer.id ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <ShoppingCart size={12} />
          )}
          {orderingId === offer.id ? '담는 중...' : '장바구니 담기'}
        </button>
      )}
    />
  );
}
