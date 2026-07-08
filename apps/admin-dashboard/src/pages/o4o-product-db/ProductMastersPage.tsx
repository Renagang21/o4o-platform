/**
 * ProductMastersPage — 기본 상품 목록/검색 (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 * WO-O4O-ADMIN-O4O-PRODUCT-STANDARD-LIST-PATTERN-V1
 *   O4O 표준 목록 패턴: BaseTable + O4OColumn + RowActionMenu + ActionBar(선택) + 서버 페이지네이션 + URL sync.
 *   서버 페이지네이션은 기존과 동일(meta 사용). 표준 컴포넌트 적용 + row action/선택 구조만 추가.
 *   canonical reference — 나머지 목록(설명/이미지/초안)은 본 패턴을 복사 적용.
 *
 * 관리 콘솔 컬럼: 이미지/상품명/공식명/제조사/브랜드/분류/규격/바코드/이미지 상태.
 * mutation 없음 (GET-only). 선택 후 일괄 작업(write)은 후속 WO — 구조만 확립.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { BaseTable, RowActionMenu, ActionBar } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { listProductMasters, ProductMasterRow } from '@/api/o4o-product-db.api';

const LIMIT = 20;

export default function ProductMastersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ProductMasterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [q, setQ] = useState(searchParams.get('q') || '');           // 실제 적용된 검색어
  const [term, setTerm] = useState(searchParams.get('q') || '');     // 입력 중인 검색어 버퍼
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProductMasters({ q: q || undefined, page, limit: LIMIT });
      setRows(res.items);
      setTotal(res.meta.total);
      setTotalPages(Math.max(1, res.meta.totalPages));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '기본 상품을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    load();
  }, [load]);

  // URL query sync (공유/새로고침/뒤로가기 유지) — 기본값은 생략
  useEffect(() => {
    const nq: Record<string, string> = {};
    if (q) nq.q = q;
    if (page > 1) nq.page = String(page);
    setSearchParams(nq, { replace: true });
  }, [q, page, setSearchParams]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelectedKeys(new Set());
    setQ(term.trim());
  };

  const toggleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedKeys);
    if (checked) next.add(id); else next.delete(id);
    setSelectedKeys(next);
  };

  const columns: O4OColumn<ProductMasterRow>[] = [
    {
      key: '_select',
      system: true,
      header: '',
      width: 40,
      align: 'center',
      render: (_, r) => (
        <input
          type="checkbox"
          checked={selectedKeys.has(r.id)}
          onChange={(e) => toggleSelect(r.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      onCellClick: () => {},
    },
    {
      key: 'primaryImageUrl',
      header: '이미지',
      width: 64,
      align: 'center',
      render: (_, r) =>
        r.primaryImageUrl
          ? <img src={r.primaryImageUrl} alt="" className="w-10 h-10 object-cover rounded" />
          : <div className="w-10 h-10 bg-gray-100 rounded" />,
    },
    {
      key: 'name',
      header: '상품명',
      render: (_, r) => <span className="font-medium text-gray-900">{r.name || '—'}</span>,
    },
    { key: 'regulatoryName', header: '공식명', render: (_, r) => r.regulatoryName || '—' },
    { key: 'manufacturerName', header: '제조사', render: (_, r) => r.manufacturerName || '—' },
    { key: 'brand', header: '브랜드', render: (_, r) => r.brand?.name || '—' },
    { key: 'category', header: '분류', render: (_, r) => r.category?.name || '—' },
    { key: 'specification', header: '규격', render: (_, r) => r.specification || '—' },
    { key: 'barcode', header: '바코드', render: (_, r) => <span className="text-gray-500">{r.barcode || '—'}</span> },
    {
      key: 'imageStatus',
      header: '이미지 상태',
      align: 'center',
      render: (_, r) =>
        r.primaryImageUrl
          ? <span className="inline-block px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">있음</span>
          : <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">없음</span>,
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: 'last',
      align: 'center',
      render: (_, r) => (
        <RowActionMenu
          actions={[
            { key: 'view', label: '상세 보기', icon: <Eye size={14} />, onClick: () => navigate(r.id) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="상품명 / 바코드 / 제조사"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-72"
          />
          <button type="submit" className="flex items-center gap-1 bg-admin-blue text-white px-3 py-2 rounded text-sm">
            <Search className="w-4 h-4" /> 검색
          </button>
          {q && (
            <button
              type="button"
              onClick={() => { setTerm(''); setQ(''); setPage(1); setSelectedKeys(new Set()); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2"
            >초기화</button>
          )}
        </form>
        <div className="ml-auto text-sm text-gray-500">총 {total.toLocaleString()}건</div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-sm underline">재시도</button>
        </div>
      )}

      {/* 선택 시 일괄 작업 바 (구조 확립 — write 액션은 후속 WO) */}
      {selectedKeys.size > 0 && (
        <div className="mb-3">
          <ActionBar
            selectedCount={selectedKeys.size}
            onClearSelection={() => setSelectedKeys(new Set())}
            statusInfo="선택 항목에 대한 일괄 작업은 후속 WO에서 제공됩니다."
            actions={[]}
          />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <BaseTable<ProductMasterRow>
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(r.id)}
          emptyMessage={loading ? '불러오는 중…' : '아직 표시할 데이터가 없습니다'}
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          tableId="o4o-product-masters"
          columnVisibility
          persistState
        />

        {/* Pagination (서버) */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500">{page} / {totalPages} 페이지</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40"
              >이전</button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40"
              >다음</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
