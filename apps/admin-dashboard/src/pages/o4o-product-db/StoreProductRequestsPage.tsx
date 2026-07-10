/**
 * StoreProductRequestsPage — 매장 신규 상품 등록 요청 검토·승인 (P2)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 2)
 *
 * store_web(sourceLabel='kpa-store-product-request') 요청 전용 뷰. 기존 candidate 콘솔 코어와 별개.
 * 액션(검토 중 상태에서만): 기존 ProductMaster 연결 / 신규 ProductMaster 승인(A안) / 보완 요청 / 등록 불가.
 * 승인·연결 성공 시 요청 매장의 organization listing 이 자동 생성되어 '매장 경영활용 제품'에 반영된다.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import {
  listStoreProductRequests,
  type StoreRequestAdminRow,
  type StoreRequestDisplayStatus,
} from '@/api/store-product-requests-admin.api';
import StoreRequestReviewModal from './StoreRequestReviewModal';

const STATUS_OPTIONS: { value: StoreRequestDisplayStatus | ''; label: string }[] = [
  { value: 'reviewing', label: '검토 중' },
  { value: 'revision_requested', label: '보완 요청' },
  { value: 'registered', label: '등록 완료' },
  { value: 'rejected', label: '등록 불가' },
  { value: '', label: '전체' },
];

const STATUS_BADGE: Record<StoreRequestDisplayStatus, string> = {
  reviewing: 'bg-blue-100 text-blue-700',
  revision_requested: 'bg-amber-100 text-amber-700',
  registered: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const LIMIT = 20;

export default function StoreProductRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<StoreRequestAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [displayStatus, setDisplayStatus] = useState<StoreRequestDisplayStatus | ''>(
    (searchParams.get('displayStatus') as StoreRequestDisplayStatus) || 'reviewing',
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(search);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStoreProductRequests({
        displayStatus: displayStatus || undefined,
        search: search || undefined,
        page,
        limit: LIMIT,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.response?.data?.error?.code || e?.response?.data?.error || e?.message || '요청 목록을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [displayStatus, search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q: Record<string, string> = {};
    if (displayStatus) q.displayStatus = displayStatus;
    if (search) q.search = search;
    if (page > 1) q.page = String(page);
    setSearchParams(q, { replace: true });
  }, [displayStatus, search, page, setSearchParams]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const columns: O4OColumn<StoreRequestAdminRow>[] = [
    {
      key: 'productName',
      header: '상품명',
      render: (_, r) => (
        <div className="flex items-center gap-2">
          {r.imageUrl ? (
            <img src={r.imageUrl} alt="" className="w-8 h-8 rounded object-cover border border-gray-200" />
          ) : null}
          <span className="font-medium text-gray-900">{r.productName || '—'}</span>
        </div>
      ),
    },
    { key: 'manufacturer', header: '제조/판매원', render: (_, r) => r.manufacturer || '—' },
    { key: 'classification', header: '분류', render: (_, r) => r.classification?.label || '—' },
    {
      key: 'barcode',
      header: '바코드',
      render: (_, r) => (r.barcode ? <span className="font-mono text-xs">{r.barcode}</span> : r.noBarcode ? <span className="text-gray-400">바코드 없음</span> : '—'),
    },
    { key: 'organizationName', header: '매장', render: (_, r) => r.organizationName || <span className="text-gray-400 text-xs">{r.organizationId?.slice(0, 8) || '—'}</span> },
    {
      key: 'displayStatus',
      header: '상태',
      align: 'center',
      render: (_, r) => <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[r.displayStatus]}`}>{r.displayStatusLabel}</span>,
    },
    { key: 'createdAt', header: '제출일', render: (_, r) => <span className="text-gray-500">{formatDate(r.createdAt)}</span> },
    {
      key: '_actions',
      header: '',
      width: 64,
      system: 'last',
      align: 'center',
      render: (_, r) => (
        <button
          onClick={(e) => { e.stopPropagation(); setReviewId(r.id); }}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
        >
          <Eye size={13} /> 검토
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 text-sm text-gray-600 bg-blue-50/60 border border-blue-100 rounded p-3">
        매장이 O4O DB에 없는 상품의 등록을 요청한 건입니다. 검토 후 <b>기존 상품 연결</b> 또는 <b>신규 상품 승인</b>하면
        요청 매장의 <b>매장 경영활용 제품</b>에 자동 반영됩니다. 부족하면 <b>보완 요청</b>, 등록 대상이 아니면 <b>등록 불가</b>로 처리합니다.
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          value={displayStatus}
          onChange={(e) => { setPage(1); setDisplayStatus(e.target.value as StoreRequestDisplayStatus | ''); }}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
        </select>

        <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-2 items-center">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="상품명 / 제조사 / 바코드 검색"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-72"
          />
          <button type="submit" className="px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 hover:bg-gray-100">검색</button>
          {search && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} className="px-3 py-2 text-sm text-gray-500 underline">초기화</button>}
        </form>

        <div className="ml-auto text-sm text-gray-500 self-center">총 {total.toLocaleString()}건</div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-sm underline">재시도</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <BaseTable<StoreRequestAdminRow>
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setReviewId(r.id)}
          emptyMessage={loading ? '불러오는 중…' : '표시할 요청이 없습니다'}
          tableId="o4o-store-product-requests"
          columnVisibility
          persistState
        />

        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500">{page} / {totalPages} 페이지</span>
            <div className="flex gap-2">
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">이전</button>
              <button disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">다음</button>
            </div>
          </div>
        )}
      </div>

      <StoreRequestReviewModal
        requestId={reviewId}
        request={rows.find((r) => r.id === reviewId) ?? null}
        open={!!reviewId}
        onClose={() => setReviewId(null)}
        onProcessed={() => { setReviewId(null); load(); }}
      />
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}
