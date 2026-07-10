/**
 * ProductCandidatesPage — 공공데이터 후보 목록 (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 * WO-O4O-ADMIN-O4O-PRODUCT-STANDARD-LIST-PATTERN-V1
 *   O4O 표준 목록 패턴: BaseTable + O4OColumn + RowActionMenu + ActionBar(선택) + 서버 페이지네이션 + URL sync.
 *   필터(status/search)·서버 페이지네이션. source(sourceType/sourceLabel)·matchStatus 는 UI 미노출(데이터·API 보존).
 *   표준 컴포넌트 적용 + row action/선택 구조만 추가. 후보 승격/삭제는 이 화면에서 하지 않는다(구조만).
 *
 * mutation 없음. 후보 API 는 all=true(platform cross-service) 로 조회한다.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Archive, XCircle, PauseCircle } from 'lucide-react';
import { BaseTable, RowActionMenu, ActionBar } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { listProductCandidates, ProductCandidateRow, bulkCandidateAction } from '@/api/o4o-product-db.api';
// WO-O4O-ADMIN-PRODUCT-CANDIDATE-CONFLICT-ACTIONS-V1: 후보 상세 처리 드로어
import CandidateConflictDrawer from './CandidateConflictDrawer';

// WO-O4O-ADMIN-PRODUCT-CANDIDATE-FILTER-MINIMAL-CLEANUP-V1
// 공공데이터 후보 화면은 "매칭 검토" 화면이 아니라 "O4O 기본상품 DB 등록 흐름 확인" 화면이다.
// 따라서 상태 필터를 등록 흐름 3단계(+전체)로만 노출한다. 원시 status 값·API 는 그대로 유지.
//   before_registration = pending + reviewing            (아직 기본상품 DB 미반영)
//   registered          = matched + linked + approved_new_master  (기본상품 DB 반영됨)
//   rejected(제외)      = rejected + merged + archived    (넣지 않기로/종료 처리)
// matchStatus(매칭) 필터는 이 화면에서 제거 (API 파라미터는 호환 유지, UI 만 미노출).
// WO-O4O-ADMIN-PRODUCT-CANDIDATES-SOURCE-UI-HIDE-V1
//   source(sourceType/sourceLabel) 는 운영자 관리 기준이 아니므로 화면에서 비노출한다.
//   데이터·API·DB 의 source 는 이력으로 보존하고, UI(필터·컬럼·enum) 만 제거한다.
const GROUPED_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'before_registration', label: '등록 전' },
  { value: 'registered', label: '등록 완료' },
  { value: 'rejected', label: '제외' },
];

const LIMIT = 20;

export default function ProductCandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ProductCandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  // WO-O4O-ADMIN-PRODUCT-CANDIDATE-STATUS-SIMPLIFY-V2 / FILTER-MINIMAL-CLEANUP-V1: 상태 필터는 groupedStatus 로 통일
  // WO-...-CLOSED-STATUS-AND-MATCH-BADGE-CLEANUP-V1: 기본 진입은 '등록 전' 후보 중심 (등록완료·제외는 필터로 조회)
  const [groupedStatus, setGroupedStatus] = useState(searchParams.get('groupedStatus') || 'before_registration');
  // committed(쿼리에 반영되는) search 와 입력 버퍼 분리 — 타이핑마다 조회 방지
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(search);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // WO-O4O-ADMIN-PRODUCT-CANDIDATE-CONFLICT-ACTIONS-V1
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProductCandidates({
        groupedStatus: groupedStatus || undefined,
        search: search || undefined,
        page,
        limit: LIMIT,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '후보 목록을 불러오지 못했습니다');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [groupedStatus, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  // URL query sync (공유/새로고침/뒤로가기 유지) — 기본값은 생략
  useEffect(() => {
    // 일반 UI 는 matchStatus/groupedMatchStatus 를 생성하지 않는다. 기존 URL 에 남아 있어도
    // 여기서 q 에 싣지 않으므로 다음 replace 시 자동 제거된다(화면은 깨지지 않음). WO-...-FILTER-MINIMAL-CLEANUP-V1
    // source(sourceType/sourceLabel) 는 이 화면에서 사용하지 않으므로 q 에 싣지 않는다.
    // 기존 URL 에 남아 있어도 다음 replace 시 자동 제거된다. WO-...-SOURCE-UI-HIDE-V1
    const q: Record<string, string> = {};
    if (groupedStatus) q.groupedStatus = groupedStatus;
    if (search) q.search = search;
    if (page > 1) q.page = String(page);
    setSearchParams(q, { replace: true });
  }, [groupedStatus, search, page, setSearchParams]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const onFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPage(1);
    setSelectedKeys(new Set());
    setter(e.target.value);
  };

  // search 는 폼 제출(Enter / 버튼) 시에만 commit
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelectedKeys(new Set());
    setSearch(searchInput.trim());
  };
  const onSearchReset = () => {
    setPage(1);
    setSelectedKeys(new Set());
    setSearchInput('');
    setSearch('');
  };

  const toggleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedKeys);
    if (checked) next.add(id); else next.delete(id);
    setSelectedKeys(next);
  };

  // WO-O4O-ADMIN-PRODUCT-CANDIDATE-CONFLICT-ACTIONS-V1: 선택 후보 일괄 처리 (hard delete 없음)
  const runBulk = async (action: 'archive' | 'ignore' | 'manual_review') => {
    const ids = Array.from(selectedKeys);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      await bulkCandidateAction(ids, action);
      setSelectedKeys(new Set());
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '일괄 처리에 실패했습니다');
    } finally {
      setBulkBusy(false);
    }
  };

  const columns: O4OColumn<ProductCandidateRow>[] = [
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
      key: 'candidateName',
      header: '상품명',
      render: (_, r) => <span className="font-medium text-gray-900">{r.candidateName || '—'}</span>,
    },
    { key: 'candidateManufacturer', header: '제조/업체', render: (_, r) => r.candidateManufacturer || '—' },
    { key: 'candidateCategory', header: '분류', render: (_, r) => r.candidateCategory || '—' },
    {
      key: 'identifier',
      header: '식별자',
      render: (_, r) =>
        r.identifierType ? (
          <div>
            <div className="text-xs text-gray-400">{r.identifierType}</div>
            <div>{r.identifierValue}</div>
          </div>
        ) : '—',
    },
    { key: 'candidateStatus', header: '후보 상태', align: 'center', render: (_, r) => <Badge value={r.candidateStatus} /> },
    { key: 'createdAt', header: '생성일', render: (_, r) => <span className="text-gray-500">{formatDate(r.createdAt)}</span> },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: 'last',
      align: 'center',
      render: (_, r) => (
        <RowActionMenu
          actions={[
            { key: 'view', label: '상세', icon: <Eye size={14} />, onClick: () => setDrawerId(r.id) },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      {/* 유입 확인용 안내 (정비 action 화면 아님) — WO-O4O-ADMIN-O4O-PRODUCT-MANAGEMENT-BASE-CONSOLE-V1 */}
      <div className="mb-4 text-sm text-gray-600 bg-blue-50/60 border border-blue-100 rounded p-3">
        공공데이터, import, 공급자/매장 입력 등에서 들어온 상품 후보를 확인합니다.
        현재 화면에서는 후보를 승격하거나 삭제하지 않습니다.
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={groupedStatus} onChange={onFilterChange(setGroupedStatus)} className="border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">전체</option>
          {GROUPED_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {/* WO-...-FILTER-MINIMAL-CLEANUP-V1: 매칭(matchStatus) 필터는 등록 흐름 확인 화면에 불필요 → 제거 */}
        {/* WO-...-SOURCE-UI-HIDE-V1: source(sourceType)·source_label 필터는 운영 기준 아님 → 비노출 */}

        {/* 검색 — 폼 제출 시에만 commit */}
        <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-2 items-center">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="상품명 / 업체명 / 식별번호(STTEMNT_NO) 검색"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-72"
          />
          <button type="submit" className="px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 hover:bg-gray-100">검색</button>
          {search && (
            <button type="button" onClick={onSearchReset} className="px-3 py-2 text-sm text-gray-500 underline">초기화</button>
          )}
        </form>

        <div className="ml-auto text-sm text-gray-500 self-center">총 {total.toLocaleString()}건</div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-sm underline">재시도</button>
        </div>
      )}

      {/* 선택 시 일괄 작업 바 — archive / ignore / manual_review (hard delete 없음) */}
      {selectedKeys.size > 0 && (
        <div className="mb-3">
          <ActionBar
            selectedCount={selectedKeys.size}
            onClearSelection={() => setSelectedKeys(new Set())}
            statusInfo="선택 후보의 상태를 일괄 변경합니다. 원천 데이터는 삭제되지 않습니다. (기존 상품 매칭은 각 후보 상세에서 진행)"
            actions={[
              {
                key: 'archive', label: 'archive', icon: <Archive size={14} />, disabled: bulkBusy,
                confirm: { title: 'archive 처리', message: `선택한 ${selectedKeys.size}개 후보를 archive 처리합니다. 원천 데이터는 삭제되지 않습니다. 계속할까요?`, confirmText: 'archive' },
                onClick: () => runBulk('archive'),
              },
              {
                key: 'ignore', label: '제외(ignored)', icon: <XCircle size={14} />, disabled: bulkBusy,
                confirm: { title: 'ignored 처리', message: `선택한 ${selectedKeys.size}개 후보를 O4O 상품화 대상 아님(제외)으로 처리합니다. 원천 데이터는 삭제되지 않습니다. 계속할까요?`, variant: 'warning', confirmText: '제외' },
                onClick: () => runBulk('ignore'),
              },
              {
                key: 'manual_review', label: '보류(manual review)', icon: <PauseCircle size={14} />, disabled: bulkBusy,
                confirm: { title: 'manual review', message: `선택한 ${selectedKeys.size}개 후보를 판단 보류(검토 중)로 표시합니다. 계속할까요?`, confirmText: '보류' },
                onClick: () => runBulk('manual_review'),
              },
            ]}
          />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <BaseTable<ProductCandidateRow>
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => setDrawerId(r.id)}
          emptyMessage={loading ? '불러오는 중…' : '아직 표시할 데이터가 없습니다'}
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          tableId="o4o-product-candidates"
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

      {/* WO-O4O-ADMIN-PRODUCT-CANDIDATE-CONFLICT-ACTIONS-V1: 충돌 상세 + 처리 드로어 */}
      <CandidateConflictDrawer
        candidateId={drawerId}
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        onProcessed={load}
      />
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{value}</span>;
}
function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}
