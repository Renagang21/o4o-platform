/**
 * TabletContentLibraryList — 태블릿 콘텐츠(화면 세트) O4O 표준 리스트
 *
 * WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1
 *   TabletScreenSetManager(library 모드)의 수제 카드 그리드를 O4O 표준 테이블로 정비.
 *   - @o4o/operator-ux-core: DataTable(selectable) + defineActionPolicy + buildRowActions + useBatchAction
 *   - @o4o/ui: RowActionMenu(kebab) + ActionBar + BulkResultModal
 *   canonical 선례: services/web-kpa-society/src/pages/operator/qr/OperatorQrListPage.tsx
 *
 * 범위(WO 금지선 준수):
 *   - 기존 Screen Set 관리 API(/store/screen-sets)만 사용. API/DB/runtime 변경 없음.
 *   - Screen Set API 는 전체 목록을 반환(서버 페이지네이션 없음) → 검색/상태필터/페이지네이션은 client-side.
 *   - 개별 작업(kebab): 수정 / 보관. 미리보기·복제·삭제(hard)는 후속 WO — 미노출.
 *     ('삭제'는 hard-delete 엔드포인트가 없어 API 변경 없이는 제공 불가. 제거 동작은 '보관'(soft delete)로 일원화.)
 *   - 일괄 작업: 선택 → 보관.
 *   - 코너 적용/해제는 노출하지 않음(코너별 운영 탭 전용).
 */

import { useMemo, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Edit3, Archive, Plus, Layers } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import {
  DataTable,
  Pagination,
  defineActionPolicy,
  buildRowActions,
  useBatchAction,
  type ListColumnDef,
} from '@o4o/operator-ux-core';
import { archiveScreenSet, type ScreenSet, type ScreenSetStatus } from '../../api/tabletDisplays';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ScreenSetStatus, string> = {
  draft: '초안',
  active: '활성',
  archived: '보관',
  operator_template: '운영자 템플릿',
};
const STATUS_BADGE_CLASS: Record<ScreenSetStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-700',
  operator_template: 'bg-indigo-50 text-indigo-700',
};

type StatusFilter = '' | 'draft' | 'active' | 'archived';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'draft', label: '초안' },
  { value: 'active', label: '활성' },
  { value: 'archived', label: '보관' },
];

const PAGE_LIMIT = 20;

// ─── Action Policy (개별 작업 = 점 3개 kebab) ─────────────────────────────────
//   inlineMax:0 → 모든 개별 작업을 kebab 메뉴로. 미리보기/복제/삭제는 후속 WO(미정의 = 미노출).
const contentActionPolicy = defineActionPolicy<ScreenSet>('kpa:tablet-content', {
  inlineMax: 0,
  rules: [
    { key: 'edit', label: '수정' },
    // 보관: 확인은 상위 handleArchive(window.confirm + 적용중 가드)에서 수행 → RowActionMenu confirm 미설정(중복 방지).
    { key: 'archive', label: '보관', variant: 'warning', visible: (s) => s.status !== 'archived' },
  ],
});
const ACTION_ICONS: Record<string, ReactNode> = {
  edit: <Edit3 className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  /** 전체 화면 세트(부모 reload 가 includeArchived 포함해 전달). */
  sets: ScreenSet[];
  loading: boolean;
  busy: boolean;
  /** 세트 id → 적용 중인 코너 이름 목록(부모 계산). */
  usageBySet: Record<string, string[]>;
  /** templateKey → 사람이 읽는 라벨(부모 TEMPLATE_OPTIONS 기준). */
  templateLabel: (key: string | null | undefined) => string;
  /** 태블릿 화면 만들기 진입(부모 생성 폼 오픈 — 후속 스텝형 제작기 진입점). */
  onCreate: () => void;
  /** 개별 수정(부모 인라인 편집 패널 오픈). dirty guard 는 부모에서 처리. */
  onEdit: (id: string) => void;
  /** 개별 보관(부모 handleArchive — window.confirm + 적용중 가드 + reload 포함). */
  onArchive: (set: ScreenSet) => void;
  /** 일괄 작업 후 목록 갱신. */
  onRefresh: () => void;
}

export default function TabletContentLibraryList({
  sets,
  loading,
  busy,
  usageBySet,
  templateLabel,
  onCreate,
  onEdit,
  onArchive,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // ── client-side 필터/검색/정렬 ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sets
      .filter((s) => (statusFilter === '' ? s.status !== 'archived' : s.status === statusFilter))
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [sets, search, statusFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT),
    [filtered, page],
  );

  // 검색/필터 변경 시 1페이지로 + 선택 해제. 페이지 이동 시에도 선택 해제(선택은 현재 페이지 기준).
  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { setSelectedKeys(new Set()); }, [page, search, statusFilter, sets]);

  // ── 일괄 보관 ──
  const batchArchiveOp = useCallback(
    async (
      ids: string[],
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const settled = await Promise.allSettled(ids.map((id) => archiveScreenSet(id)));
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { code?: string; message?: string } | null;
        const error = err?.code === 'SCREEN_SET_IN_USE'
          ? '적용 중 — 먼저 코너에서 적용 해제하세요'
          : err?.message || '보관에 실패했습니다';
        return { id, status: 'failed' as const, error };
      });
      return { data: { results } };
    },
    [],
  );

  const handleBulkArchive = useCallback(async () => {
    const ids = pageRows.filter((s) => selectedKeys.has(s.id) && s.status !== 'archived').map((s) => s.id);
    if (ids.length === 0) {
      toast.error('보관할 수 있는 항목이 없습니다. (이미 보관된 항목은 제외됩니다)');
      return;
    }
    if (!window.confirm(`선택한 ${ids.length}개 화면 세트를 보관하시겠습니까?\n목록에서 숨겨지며, 적용 중인 세트는 먼저 적용 해제해야 합니다.`)) return;
    const result = await batch.executeBatch(batchArchiveOp, ids);
    if (result.successCount > 0) {
      setSelectedKeys(new Set());
      onRefresh();
    }
  }, [pageRows, selectedKeys, batch, batchArchiveOp, onRefresh]);

  const archivableSelectedCount = useMemo(
    () => pageRows.filter((s) => selectedKeys.has(s.id) && s.status !== 'archived').length,
    [pageRows, selectedKeys],
  );

  // ── Columns ──
  const columns: ListColumnDef<ScreenSet>[] = useMemo(() => [
    {
      key: 'name',
      header: '콘텐츠명',
      sortable: true,
      sortAccessor: (s) => s.name,
      render: (_v, s) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-indigo-50 shrink-0 text-indigo-500">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{s.name}</span>
          {s.tabletId === null && (
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">재사용</span>
          )}
        </div>
      ),
    },
    {
      key: 'templateKey',
      header: '템플릿',
      width: '120px',
      render: (_v, s) => <span className="text-xs text-slate-500">{templateLabel(s.templateKey)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (_v, s) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE_CLASS[s.status]}`}>
          {STATUS_LABEL[s.status]}
        </span>
      ),
    },
    {
      key: 'usage',
      header: '사용 중인 코너',
      render: (_v, s) => {
        const corners = usageBySet[s.id] ?? [];
        return corners.length > 0 ? (
          <span className="text-xs text-emerald-700 truncate" title={corners.join(', ')}>{corners.join(', ')}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        );
      },
    },
    {
      key: 'blockCount',
      header: '블록 수',
      width: '70px',
      align: 'center',
      render: (_v, s) => <span className="text-xs text-slate-500">{s.blockCount ?? 0}</span>,
    },
    {
      key: 'updatedAt',
      header: '수정일',
      width: '100px',
      sortable: true,
      sortAccessor: (s) => new Date(s.updatedAt).getTime(),
      render: (_v, s) => (
        <span className="text-xs text-slate-500">{new Date(s.updatedAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
    {
      key: '_actions',
      header: '작업',
      width: '60px',
      align: 'center',
      system: true,
      render: (_v, s) => (
        <RowActionMenu
          actions={buildRowActions(contentActionPolicy, s, {
            edit: () => onEdit(s.id),
            archive: () => onArchive(s),
          }, {
            icons: ACTION_ICONS,
            loading: busy ? { archive: true } : undefined,
          })}
          inlineMax={contentActionPolicy.inlineMax}
        />
      ),
    },
  ], [templateLabel, usageBySet, onEdit, onArchive, busy]);

  return (
    <div className="space-y-3">
      {/* ── 도구막대: 검색 + 상태 필터 + 만들기 ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="콘텐츠명 검색"
            className="min-w-[200px] flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="콘텐츠명 검색"
          />
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === f.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shrink-0"
        >
          <Plus className="w-4 h-4" /> 태블릿 화면 만들기
        </button>
      </div>

      <div className="text-xs text-slate-500">
        전체 <span className="font-medium text-slate-700">{total}</span>건
      </div>

      {/* ── 일괄 작업(선택 시) ── */}
      <ActionBar
        selectedCount={selectedKeys.size}
        onClearSelection={() => setSelectedKeys(new Set())}
        actions={[
          {
            key: 'bulk-archive',
            label: `선택한 콘텐츠 보관 (${archivableSelectedCount})`,
            onClick: handleBulkArchive,
            variant: 'default' as const,
            icon: <Archive className="w-3.5 h-3.5" />,
            loading: batch.loading,
            group: 'actions',
            visible: selectedKeys.size > 0,
            tooltip: '선택한 화면 세트를 일괄 보관합니다. (적용 중인 세트는 먼저 적용 해제 필요)',
          },
        ]}
      />

      <BulkResultModal
        open={batch.showResult}
        onClose={() => batch.clearResult()}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* ── 표준 테이블 ── */}
      <DataTable<ScreenSet>
        columns={columns}
        data={pageRows}
        rowKey="id"
        loading={loading}
        emptyMessage={
          search || statusFilter
            ? '조건에 맞는 태블릿 콘텐츠가 없습니다.'
            : '아직 태블릿 콘텐츠가 없습니다. ‘태블릿 화면 만들기’로 첫 화면 세트를 만들어 주세요.'
        }
        tableId="kpa-tablet-content-list"
        onRowClick={(s) => onEdit(s.id)}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
    </div>
  );
}
