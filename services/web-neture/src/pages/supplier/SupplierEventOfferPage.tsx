/**
 * SupplierEventOfferPage — 공급자 이벤트 오퍼 현황
 *
 * WO-O4O-EVENT-OFFER-NETURE-ROLE-UX-ALIGNMENT-V1
 *
 * Neture는 Event Offer의 "지원 허브"이다 (DOC-O4O-EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1).
 * 이 화면은 공급자 관점의 등록 현황 확인 화면이며,
 * "매장 상품 확보" 또는 "참여/구매" 흐름을 포함하지 않는다.
 *
 * 역할:
 * - 등록된 이벤트 오퍼 현황 조회 (상태 / 수량 / 기간)
 * - 공급자가 제안한 상품의 노출 상태 확인
 * - 운영 관리 연결 (operator 승인 흐름과 연결)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { netureEventOfferApi } from '../../lib/api';

type StatusTab = 'active' | 'ended' | 'all';

interface OfferItem {
  id: string;
  offerId: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  unitPrice: number | null;
  productName: string;
  supplierName: string;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
}

function formatPrice(value: number | null): string {
  if (value == null) return '-';
  return '₩' + value.toLocaleString('ko-KR');
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active:   { label: '진행중',  cls: 'bg-green-100 text-green-700' },
  ended:    { label: '종료',    cls: 'bg-slate-100 text-slate-500' },
  approved: { label: '승인됨',  cls: 'bg-blue-100 text-blue-700' },
  pending:  { label: '검토중',  cls: 'bg-yellow-100 text-yellow-700' },
  canceled: { label: '취소',    cls: 'bg-red-100 text-red-500' },
};

export default function SupplierEventOfferPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<StatusTab>('active');
  const [items, setItems] = useState<OfferItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async (p: number, status: StatusTab) => {
    setLoading(true);
    try {
      const res = await netureEventOfferApi.getEnrichedOffers({ page: p, limit: 20, status });
      const body = res.data;
      setItems(body.data ?? []);
      setTotal(body.pagination?.total ?? 0);
      setTotalPages(body.pagination?.totalPages ?? 1);
      setPage(p);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(1, activeTab);
  }, [activeTab]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 text-slate-500 hover:text-slate-700">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">이벤트 오퍼 현황</h1>
              <p className="text-xs text-slate-500 mt-0.5">등록된 이벤트 오퍼 상태 및 조건 확인</p>
            </div>
          </div>
        </div>
        <span className="text-sm text-slate-500">총 {total}건</span>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {([
          { key: 'active' as StatusTab, label: '진행중' },
          { key: 'ended' as StatusTab, label: '종료' },
          { key: 'all' as StatusTab, label: '전체' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Package size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium">등록된 이벤트 오퍼가 없습니다.</p>
          <p className="text-sm mt-1">상품 등록 후 운영자 승인을 통해 이벤트 오퍼가 생성됩니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>상품명 / 공급사</span>
            <span>단가</span>
            <span>기간</span>
            <span>잔여수량</span>
            <span>상태</span>
          </div>

          {/* Table Rows */}
          {items.map(item => {
            const badge = STATUS_LABEL[item.status] ?? { label: item.status, cls: 'bg-slate-100 text-slate-500' };
            return (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50/60 transition-colors"
              >
                {/* 상품명 */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.supplierName}</p>
                </div>

                {/* 단가 */}
                <span className="text-sm font-semibold text-slate-700">
                  {formatPrice(item.unitPrice)}
                </span>

                {/* 기간 */}
                <div className="text-xs text-slate-500">
                  {item.startAt || item.endAt ? (
                    <>
                      <div>{formatDate(item.startAt)} ~</div>
                      <div>{formatDate(item.endAt)}</div>
                    </>
                  ) : (
                    <span className="text-slate-400">무기한</span>
                  )}
                </div>

                {/* 잔여수량 */}
                <div className="text-sm">
                  {item.totalQuantity !== null ? (
                    <span className={item.totalQuantity <= 10
                      ? 'font-semibold text-amber-600'
                      : 'text-slate-700'
                    }>
                      {item.totalQuantity.toLocaleString()}개
                    </span>
                  ) : (
                    <span className="text-slate-400">무제한</span>
                  )}
                  {item.perOrderLimit !== null && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      1회 최대 {item.perOrderLimit}개
                    </div>
                  )}
                </div>

                {/* 상태 */}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => fetchItems(page - 1, activeTab)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button
            onClick={() => fetchItems(page + 1, activeTab)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
