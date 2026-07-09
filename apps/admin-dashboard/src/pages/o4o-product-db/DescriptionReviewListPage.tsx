/**
 * DescriptionReviewListPage — 설명서 검토 목록 (통합: SPD + OTC_DRAFT, read-only)
 *
 * WO-O4O-ADMIN-DESCRIPTION-REVIEW-LIST-V1
 *
 * Dashboard '검토 필요' 수치 → 실제 검토 대상 목록으로 이동하는 첫 단계.
 * shared_product_descriptions + product_candidate_description_drafts 두 store 를 공통 row 로 정규화해
 * 서버 페이지네이션/검색/필터로 조회한다. **read-only** — 본문 편집/승인/반려 없음(상세는 기존 화면 재사용).
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { fetchDescriptionReviewList, DescriptionReviewListRow } from '@/api/o4o-product-db.api';

const LIMIT = 20;

const SOURCE_OPTIONS = [
  { value: 'all', label: '출처 전체' },
  { value: 'SPD', label: '공식 설명서(SPD)' },
  { value: 'OTC_DRAFT', label: 'OTC 초안' },
];
const STATUS_OPTIONS = [
  { value: 'needs_review', label: '검토 대기' },
  { value: 'all', label: '상태 전체' },
  { value: 'canonical', label: '대표(canonical)' },
  { value: 'candidate', label: '후보' },
  { value: 'approved', label: '승인' },
  { value: 'draft', label: '초안' },
];
const DESC_TYPE_OPTIONS = [
  { value: 'all', label: '타입 전체' },
  { value: 'STORE', label: 'STORE' },
  { value: 'SUPPLIER_STORE', label: 'SUPPLIER_STORE' },
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
];
const CATEGORY_OPTIONS = [
  { value: 'all', label: '분류 전체' },
  { value: 'OTC', label: 'OTC' },
  { value: 'HFF', label: '건강기능식품' },
  { value: 'MEDICAL_DEVICE', label: '의료기기' },
  { value: 'QUASI_DRUG', label: '의약외품' },
  { value: '기타', label: '기타' },
];

function SourceBadge({ store }: { store: 'SPD' | 'OTC_DRAFT' }) {
  const spd = store === 'SPD';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${spd ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
      {spd ? '공식 설명서' : 'OTC 초안'}
    </span>
  );
}
function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    needs_review: 'bg-amber-50 text-amber-700',
    canonical: 'bg-green-50 text-green-700',
    approved: 'bg-green-50 text-green-700',
    candidate: 'bg-gray-100 text-gray-600',
    draft: 'bg-gray-100 text-gray-600',
    rejected: 'bg-red-50 text-red-700',
    deprecated: 'bg-red-50 text-red-700',
    hidden: 'bg-gray-100 text-gray-400',
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

export default function DescriptionReviewListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<DescriptionReviewListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState(searchParams.get('status') || 'needs_review');
  const [descriptionType, setDescriptionType] = useState('all');
  const [category, setCategory] = useState('all');
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDescriptionReviewList({ source, status, descriptionType, category, q: q || undefined, page, limit: LIMIT });
      setRows(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '검토 목록을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [source, status, descriptionType, category, q, page]);

  useEffect(() => { load(); }, [load]);

  const resetPage = () => setPage(1);
  const submitSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setQ(term.trim()); };

  const goDetail = (r: DescriptionReviewListRow) => {
    if (r.sourceStore === 'OTC_DRAFT') navigate(`/admin/o4o-product-db/drug-description-drafts/${r.id}`);
    else if (r.masterId) navigate(`/admin/o4o-product-db/masters/${r.masterId}`);
    else navigate(`/admin/o4o-product-db/review/${r.id}`);
  };

  const columns: O4OColumn<DescriptionReviewListRow>[] = [
    { key: 'sourceStore', header: '구분', align: 'center', render: (_, r) => <SourceBadge store={r.sourceStore} /> },
    { key: 'productName', header: '상품명', maxWidth: 240, render: (_, r) => <span className="block max-w-[15rem] truncate font-medium text-gray-900">{r.productName || '—'}</span> },
    { key: 'manufacturerName', header: '제조사', maxWidth: 160, render: (_, r) => <span className="block max-w-[10rem] truncate text-gray-500">{r.manufacturerName || '—'}</span> },
    { key: 'descriptionType', header: '설명서 타입', align: 'center', render: (_, r) => <span className="text-gray-600">{r.descriptionType || '—'}</span> },
    { key: 'status', header: '상태', align: 'center', render: (_, r) => <StatusBadge status={r.status} /> },
    { key: 'groupKey', header: '그룹', maxWidth: 160, render: (_, r) => <span className="block max-w-[10rem] truncate text-gray-400">{r.groupKey || '—'}</span> },
    { key: 'sourceType', header: '출처', render: (_, r) => <span className="text-gray-500">{r.sourceType || '—'}</span> },
    { key: 'summary', header: '요약', maxWidth: 260, render: (_, r) => <span className="block max-w-[16rem] truncate text-gray-600">{r.summary || '—'}</span> },
    { key: 'updatedAt', header: '수정일', render: (_, r) => <span className="text-gray-400">{(r.updatedAt || r.createdAt)?.slice(0, 10) || '—'}</span> },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: 'last',
      align: 'center',
      render: (_, r) => (
        <RowActionMenu actions={[{ key: 'detail', label: '상세 보기', icon: <Eye size={14} />, onClick: () => goDetail(r) }]} />
      ),
      onCellClick: () => {},
    },
  ];

  return (
    <div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-xs text-gray-600">
        검토가 필요한 설명서를 통합(공식 설명서 SPD + OTC 초안)으로 조회하는 <b>read-only</b> 목록입니다.
        본문 편집·승인·반려는 제공하지 않으며, 각 행의 <b>상세 보기</b>로 기존 상세 화면으로 이동합니다.
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={source} onChange={(e) => { setSource(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={descriptionType} onChange={(e) => { setDescriptionType(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {DESC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); resetPage(); }} className="border border-gray-300 rounded px-3 py-2 text-sm">
          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="상품명 / 제조사 / master · candidate id / 그룹" className="border border-gray-300 rounded px-3 py-2 text-sm w-72" />
          <button type="submit" className="flex items-center gap-1 bg-admin-blue text-white px-3 py-2 rounded text-sm"><Search className="w-4 h-4" /> 검색</button>
          {q && <button type="button" onClick={() => { setTerm(''); setQ(''); setPage(1); }} className="text-sm text-gray-500 px-2">초기화</button>}
        </form>
        <div className="ml-auto text-sm text-gray-500">총 {total.toLocaleString()}건</div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-sm underline">재시도</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <BaseTable<DescriptionReviewListRow>
          columns={columns}
          data={rows}
          rowKey={(r) => r.reviewItemId}
          onRowClick={(r) => goDetail(r)}
          emptyMessage={loading ? '불러오는 중…' : '현재 조건에 맞는 검토 대상이 없습니다.'}
          tableId="o4o-description-review-list"
          columnVisibility
          persistState
        />

        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500">{page} / {totalPages} 페이지 · 총 {total.toLocaleString()}건</span>
            <div className="flex gap-2">
              <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">이전</button>
              <button disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40">다음</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
