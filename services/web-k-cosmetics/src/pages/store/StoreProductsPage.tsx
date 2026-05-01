/**
 * StoreProductsPage — 매장 경영자 주문 제품 화면
 *
 * WO-O4O-KCOS-STORE-PRODUCTS-FOUNDATION-V1
 *
 * 책임 (commerce/order product domain):
 * - approved K-Cos Event Offer 목록 (매장에 추가 가능한 상품)
 * - 매장 경영자의 주문 제품 (Phase 1: placeholder)
 *
 * StoreLocalProductsPage(display domain)와 분리된 별개 화면이다.
 * - StoreLocalProductsPage: store_local_products (매장 자체 진열, 비-commerce)
 * - StoreProductsPage:      Event Offer / 매장 주문 제품 (commerce)
 */

import { useEffect, useState, useCallback } from 'react';
import { Loader2, ShoppingCart, Package, Tag } from 'lucide-react';
import {
  cosmeticsEventOfferApi,
  type EnrichedEventOffer,
} from '@/api/eventOffer';

type TabKey = 'event-offers' | 'my-products';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'event-offers', label: '이벤트 오퍼' },
  { key: 'my-products',  label: '내 주문 제품' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:   { label: '진행중', cls: 'bg-green-100 text-green-700' },
  approved: { label: '승인됨', cls: 'bg-blue-100 text-blue-700' },
  pending:  { label: '대기중', cls: 'bg-yellow-100 text-yellow-700' },
  ended:    { label: '종료',   cls: 'bg-slate-100 text-slate-500' },
  canceled: { label: '취소',   cls: 'bg-red-100 text-red-500' },
};

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

export default function StoreProductsPage() {
  const [tab, setTab] = useState<TabKey>('event-offers');

  // Event Offer 탭 상태
  const [offers, setOffers] = useState<EnrichedEventOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cosmeticsEventOfferApi.listActive(1, 50);
      // backend 'active' 필터 = approved + 진행 윈도우 + 수량 OK
      // 그래도 클라이언트에서 한 번 더 가드 (미래 backend 변경 대비)
      const items: EnrichedEventOffer[] = res.data?.data ?? [];
      const data = items.filter(
        (o: EnrichedEventOffer) =>
          (o.status === 'active' || o.status === 'approved') && o.isActive,
      );
      setOffers(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError('접근 권한이 없습니다.');
      } else {
        setError('이벤트 오퍼를 불러오지 못했습니다.');
      }
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'event-offers') {
      loadOffers();
    }
  }, [tab, loadOffers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">주문 제품</h1>
        <p className="text-slate-500 mt-1 text-sm">
          승인된 이벤트 오퍼를 확인하고 매장에 추가 가능한 상품을 관리합니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 이벤트 오퍼 탭 */}
      {tab === 'event-offers' && (
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 size={28} className="animate-spin text-pink-600" />
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

                {offers.map(offer => {
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
                            {offer.perOrderLimit !== null
                              ? ` · 1회 최대 ${offer.perOrderLimit}개`
                              : ''}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-slate-600 truncate">
                        {offer.supplierName}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {formatPrice(displayPrice)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(offer.createdAt)}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block w-fit ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled
                          title="주문 제품 추가는 준비 중입니다."
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                        >
                          <ShoppingCart size={12} />
                          추가 (준비 중)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 내 주문 제품 탭 — Phase 1 placeholder */}
      {tab === 'my-products' && (
        <div className="bg-white rounded-xl border border-slate-100 py-16 text-center text-slate-500">
          <Package size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-sm">내 주문 제품 화면은 준비 중입니다.</p>
          <p className="text-xs mt-1 text-slate-400">
            매장에 추가한 상품과 주문 이력이 여기에 표시됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
