/**
 * EventOffersHubList — Store Hub 이벤트 오퍼 단순 목록 공통 컴포넌트.
 *
 * WO-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1:
 *   GP/KCos `HubEventOffersPage`(209/212줄 near-identical, diff=api client+테마색)를 통합.
 *   service 별 listActive + addToCart(장바구니 담기) + accent 색만 props 로 주입.
 *
 * 도메인: 이벤트 오퍼 = 이벤트형 O4O 주문 가능 상품. 진행 중(active/approved+isActive)만 노출.
 *   장바구니 담기 → /store-hub/cart → checkout-confirm → checkout_orders(buyer).
 *   (KPA KpaEventOfferPage(enriched/탭/stats/인라인 bulk) 는 본 컴포넌트 대상 아님 — 별도 유지.)
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Tag, ShoppingCart } from 'lucide-react';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:   { label: '진행중', cls: 'bg-green-100 text-green-700' },
  approved: { label: '승인됨', cls: 'bg-blue-100 text-blue-700' },
  pending:  { label: '대기중', cls: 'bg-yellow-100 text-yellow-700' },
  ended:    { label: '종료',   cls: 'bg-slate-100 text-slate-500' },
  canceled: { label: '취소',   cls: 'bg-red-100 text-red-500' },
};

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

function formatPrice(value: number | null): string {
  if (value == null) return '-';
  return '₩' + value.toLocaleString('ko-KR');
}

function formatDate(iso: string | null): string {
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
      setError(status === 401 || status === 403 ? '접근 권한이 없습니다.' : '이벤트 오퍼를 불러오지 못했습니다.');
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
    <div className="space-y-6">
      {/* Header */}
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={28} className={`animate-spin ${a.spinner}`} />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Tag size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-sm">진행 중인 이벤트 오퍼가 없습니다.</p>
            <p className="text-xs mt-1 text-slate-400">
              운영자가 승인한 이벤트가 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div>
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_140px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>상품명</span>
              <span>공급사</span>
              <span>가격</span>
              <span>승인일</span>
              <span>상태</span>
              <span className="text-right">작업</span>
            </div>

            {offers.map((offer) => {
              const badge = STATUS_BADGE[offer.status] ?? STATUS_BADGE.approved;
              const displayPrice = offer.price ?? offer.unitPrice;
              return (
                <div
                  key={offer.id}
                  className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_140px] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {offer.productName}
                    </p>
                    {offer.totalQuantity !== null && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        잔여 {offer.totalQuantity.toLocaleString()}개
                        {offer.perOrderLimit !== null ? ` · 1회 최대 ${offer.perOrderLimit}개` : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-slate-600 truncate">{offer.supplierName}</span>
                  <span className="text-sm font-semibold text-slate-700">{formatPrice(displayPrice)}</span>
                  <span className="text-xs text-slate-500">{formatDate(offer.createdAt)}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block w-fit ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <div className="flex justify-end">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
