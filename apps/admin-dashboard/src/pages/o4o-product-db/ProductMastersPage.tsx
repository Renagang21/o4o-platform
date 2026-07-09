/**
 * ProductMastersPage — 기본 상품 목록/검색 (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 * WO-O4O-ADMIN-O4O-PRODUCT-STANDARD-LIST-PATTERN-V1 — BaseTable + O4OColumn + RowActionMenu + ActionBar + URL sync
 * WO-O4O-ADMIN-PRODUCT-MASTER-TABLE-PERFORMANCE-V1 — 체감 속도 개선
 *   "목록은 가볍게, 상세는 따로, 다음 페이지만 미리":
 *   - 목록 응답은 이미 테이블 필드만(경량). 상세는 행 클릭 시 별도 /masters/:id 로 이동(목록 재조회 없음).
 *   - 다음 1~2 페이지 백그라운드 prefetch + 페이지 캐시 → 페이지 이동 체감 지연 감소.
 *   - 페이지 크기 20/50/100(기본 50). 검색 debounce + 버튼 즉시 실행 + page reset.
 *   - 로딩 UX: 최초 skeleton, 페이지 이동 시 기존 데이터 유지 + 상단 얇은 로딩바(비블로킹).
 *   - 검색어/페이지 크기 변경 시 캐시 초기화.
 *
 * 관리 콘솔 컬럼: 선택/이미지/상품명/공식명/제조사/브랜드/분류/규격/바코드/이미지 상태/액션.
 * mutation 없음 (GET-only).
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, Plus } from 'lucide-react';
import { BaseTable, RowActionMenu, ActionBar } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import {
  listProductMasters,
  ProductMasterRow,
  ProductMasterListResult,
  getProductDescriptionQrSummary,
  ProductDescriptionQrSummary,
  DescriptionLangState,
} from '@/api/o4o-product-db.api';

// WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1: 언어별 설명서 존재 여부 → badge 톤
function langTone(state?: DescriptionLangState): { label: string; cls: string } {
  if (!state || !state.exists) return { label: '없음', cls: 'bg-gray-100 text-gray-500' };
  if (state.status === 'canonical') return { label: '있음', cls: 'bg-green-100 text-green-700' };
  return { label: '초안', cls: 'bg-blue-100 text-blue-700' }; // candidate 등
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 400;
const PREFETCH_AHEAD = 2; // 현재 페이지 이후 미리 불러올 페이지 수

function parseLimit(v: string | null): number {
  const n = Number(v);
  return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_LIMIT;
}

export default function ProductMastersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ProductMasterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState(parseLimit(searchParams.get('limit')));
  const [q, setQ] = useState(searchParams.get('q') || '');        // 적용된 검색어
  const [term, setTerm] = useState(searchParams.get('q') || '');  // 입력 버퍼
  const [hardLoading, setHardLoading] = useState(true);   // 표시할 데이터 없음 → skeleton
  const [softLoading, setSoftLoading] = useState(false);  // 기존 데이터 유지한 채 갱신 중
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1: masterId → 설명서(KO/ZH)/QR 상태 요약 (read-only)
  const [descQrMap, setDescQrMap] = useState<Record<string, ProductDescriptionQrSummary>>({});

  // 페이지 캐시 (key=`${q}|${limit}|${page}`). q/limit 변경 시 초기화.
  const cacheRef = useRef<Map<string, ProductMasterListResult>>(new Map());
  const reqIdRef = useRef(0);
  const rowsLenRef = useRef(0); // 현재 표시 중인 행 수 (로딩 모드 결정용)

  const keyFor = useCallback((pg: number) => `${q}|${limit}|${pg}`, [q, limit]);

  // 검색어/페이지 크기 변경 → 캐시 초기화 (load effect 보다 먼저 선언되어 먼저 실행)
  useEffect(() => {
    cacheRef.current.clear();
  }, [q, limit]);

  // 다음 1~2 페이지 백그라운드 prefetch (화면 blocking 없음)
  const prefetchNext = useCallback((fromPage: number, tp: number) => {
    for (let i = 1; i <= PREFETCH_AHEAD; i++) {
      const pg = fromPage + i;
      if (pg > tp) break;
      const key = `${q}|${limit}|${pg}`;
      if (cacheRef.current.has(key)) continue;
      listProductMasters({ q: q || undefined, page: pg, limit })
        .then((r) => { cacheRef.current.set(key, r); })
        .catch(() => { /* prefetch 실패는 무시 */ });
    }
  }, [q, limit]);

  // 메인 로드 (q/limit/page 변경 시). 캐시 히트면 즉시 표시, 미스면 네트워크.
  useEffect(() => {
    const myReq = ++reqIdRef.current;
    setError(null);
    const key = keyFor(page);
    const cached = cacheRef.current.get(key);

    if (cached) {
      setRows(cached.items);
      rowsLenRef.current = cached.items.length;
      setTotal(cached.meta.total);
      const tp = Math.max(1, cached.meta.totalPages);
      setTotalPages(tp);
      setHardLoading(false);
      setSoftLoading(false);
      prefetchNext(page, tp);
      return;
    }

    // 데이터가 있으면 유지(soft), 없으면 skeleton(hard)
    if (rowsLenRef.current > 0) setSoftLoading(true); else setHardLoading(true);

    listProductMasters({ q: q || undefined, page, limit })
      .then((res) => {
        if (myReq !== reqIdRef.current) return; // 최신 요청만 반영
        cacheRef.current.set(key, res);
        setRows(res.items);
        rowsLenRef.current = res.items.length;
        setTotal(res.meta.total);
        const tp = Math.max(1, res.meta.totalPages);
        setTotalPages(tp);
        prefetchNext(page, tp);
      })
      .catch((e: any) => {
        if (myReq !== reqIdRef.current) return;
        setError(e?.response?.data?.error || e?.message || '기본 상품을 불러오지 못했습니다');
        setRows([]);
        rowsLenRef.current = 0;
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (myReq !== reqIdRef.current) return;
        setHardLoading(false);
        setSoftLoading(false);
      });
  }, [q, limit, page, keyFor, prefetchNext]);

  // 현재 페이지 제품들의 설명서(KO/ZH)/QR 상태 배치 조회 (read-only, 실패해도 목록은 정상)
  useEffect(() => {
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return;
    let cancelled = false;
    getProductDescriptionQrSummary(ids)
      .then((m) => { if (!cancelled) setDescQrMap((prev) => ({ ...prev, ...m })); })
      .catch(() => { /* badge 미표시로 진행 */ });
    return () => { cancelled = true; };
  }, [rows]);

  // 검색 debounce → 적용 검색어 commit + page reset
  useEffect(() => {
    const h = setTimeout(() => {
      const t = term.trim();
      setQ((prev) => {
        if (prev === t) return prev;
        setPage(1);
        setSelectedKeys(new Set());
        return t;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(h);
  }, [term]);

  // URL sync (공유/새로고침/뒤로가기)
  useEffect(() => {
    const nq: Record<string, string> = {};
    if (q) nq.q = q;
    if (page > 1) nq.page = String(page);
    if (limit !== DEFAULT_LIMIT) nq.limit = String(limit);
    setSearchParams(nq, { replace: true });
  }, [q, page, limit, setSearchParams]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const t = term.trim();
    setSelectedKeys(new Set());
    setPage(1);
    setQ(t);
  };

  const changeLimit = (n: number) => {
    setSelectedKeys(new Set());
    setPage(1);
    setLimit(n);
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
          ? <img src={r.primaryImageUrl} alt="" className="w-10 h-10 object-cover rounded" loading="lazy" />
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
      // WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1
      // 설명서 상태(KO/ZH). ko/zh = SPD(master-scope) language 기준. 매장 다국어 콘텐츠는 store-scope(후속).
      key: 'descStatus',
      header: '설명서',
      align: 'center',
      width: 132,
      render: (_, r) => {
        const s = descQrMap[r.id];
        const ko = langTone(s?.descriptions.ko);
        const zh = langTone(s?.descriptions.zh);
        return (
          <div className="flex items-center justify-center gap-1">
            <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs ${ko.cls}`}>KO {ko.label}</span>
            <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs ${zh.cls}`}>ZH {zh.label}</span>
          </div>
        );
      },
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: 'last',
      align: 'center',
      render: (_, r) => {
        return (
          <RowActionMenu
            actions={[
              // 설명은 상세 화면에서 확인한다(설명서 검토 워크플로우 제거, WO-...-DESCRIPTION-REVIEW-REMOVE-V1).
              { key: 'view', label: '상세 보기', icon: <Eye size={14} />, onClick: () => navigate(r.id) },
              // QR 연결/생성은 admin QR 화면·master↔QR 매핑 부재로 이번 WO 범위 밖(자리만).
              // 실제 연결은 WO-O4O-PRODUCT-UNIT-MULTILINGUAL-DESCRIPTION-QR-LINK-V1.
              { key: 'qr', label: 'QR 연결 (후속 WO)', disabled: true, onClick: () => {} },
            ]}
          />
        );
      },
    },
  ];

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

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

        {/* 페이지 크기 */}
        <label className="flex items-center gap-1.5 text-sm text-gray-500">
          페이지당
          <select
            value={limit}
            onChange={(e) => changeLimit(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}건</option>)}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-500">총 {total.toLocaleString()}건</span>
          {/* WO-O4O-ADMIN-PRODUCT-MASTER-MANUAL-REGISTRATION-UI-V1 */}
          <button
            type="button"
            onClick={() => navigate('/admin/o4o-product-db/masters/new')}
            className="flex items-center gap-1 bg-admin-blue text-white px-3 py-2 rounded text-sm"
          >
            <Plus className="w-4 h-4" /> 새 상품 등록
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => { cacheRef.current.delete(keyFor(page)); setPage((p) => p); setHardLoading(true); }} className="text-sm underline">재시도</button>
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

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden relative">
        {/* 비블로킹 로딩바 — 기존 데이터 유지한 채 갱신 중 */}
        {softLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden z-10">
            <div className="h-full w-1/3 bg-admin-blue animate-pulse" />
          </div>
        )}

        {hardLoading && rows.length === 0 ? (
          <TableSkeleton rows={Math.min(limit, 12)} />
        ) : (
          <BaseTable<ProductMasterRow>
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(r.id)}
            emptyMessage="아직 표시할 데이터가 없습니다"
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            tableId="o4o-product-masters"
            columnVisibility
            persistState
          />
        )}

        {/* Pagination (서버) */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500">
              {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} / {total.toLocaleString()}건 · {page} / {totalPages} 페이지
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-40"
              >이전</button>
              <button
                disabled={page >= totalPages}
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

/** 최초 로딩 skeleton — lightweight (blocking 아님, 화면 자리만 확보) */
function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="p-4 space-y-2 animate-pulse">
      <div className="h-8 bg-gray-100 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 bg-gray-50 rounded flex items-center gap-3 px-3">
          <div className="w-10 h-10 bg-gray-100 rounded shrink-0" />
          <div className="h-3 bg-gray-100 rounded flex-1 max-w-[40%]" />
          <div className="h-3 bg-gray-100 rounded w-24" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      ))}
    </div>
  );
}
