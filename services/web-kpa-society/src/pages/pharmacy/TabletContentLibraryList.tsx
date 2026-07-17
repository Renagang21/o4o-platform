/**
 * TabletContentLibraryList — 태블릿 콘텐츠(화면 세트) O4O 표준 리스트
 *
 * WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1 (기반)
 * WO-O4O-KPA-TABLET-CONTENT-LIST-SEARCH-PAGINATION-PREVIEW-V1
 *   - 검색 + 템플릿/상태/사용코너 필터 + 페이지네이션(페이지당 표시 수 선택)
 *   - 행 단위 미리보기(kebab '미리보기' + 콘텐츠명 클릭) → read-only Screen Set preview 모달(태블릿/QR 모바일)
 * WO-O4O-KPA-TABLET-CONTENT-LIST-REMOVE-LABEL-V1
 *   - 사용자 문구 '보관' → '리스트에서 제거'(내부 status/API 는 archived/soft-delete 그대로).
 *
 * 범위(금지선 준수): 기존 Screen Set 관리/미리보기 API 만 사용. API/DB/runtime 변경 없음.
 *   Screen Set API 는 전체 목록 반환 → 검색/필터/페이지네이션은 client-side.
 *   미리보기 = 기존 previewScreenSet(저장 전 draft resolve) + TabletKioskPage embedded 재사용.
 */

import { useMemo, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Edit3, Trash2, Plus, Layers, Eye, X, Loader2 } from 'lucide-react';
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
import { TabletKioskPage, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';
import { archiveScreenSet, fetchScreenSet, previewScreenSet, type ScreenSet, type ScreenSetStatus } from '../../api/tabletDisplays';

// ─── 상수 ────────────────────────────────────────────────────────────────────

// WO-...-REMOVE-LABEL-V1: 사용자 화면에서 archived = '리스트에서 제거됨'(내부 status 는 archived 그대로).
const STATUS_LABEL: Record<ScreenSetStatus, string> = {
  draft: '초안',
  active: '활성',
  archived: '리스트에서 제거됨',
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
  { value: 'archived', label: '리스트에서 제거됨' },
];

const PAGE_SIZES = [10, 20, 50];

// WO-...-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: 리스트 단독 미리보기는 코너 문맥 없음 → 상품 미표시(페이지 previewApi 와 동일 sentinel).
const PREVIEW_NO_CORNER = '__none__';

// ─── Action Policy (개별 작업 = 점 3개 kebab) ─────────────────────────────────
const contentActionPolicy = defineActionPolicy<ScreenSet>('kpa:tablet-content', {
  inlineMax: 0,
  rules: [
    { key: 'preview', label: '미리보기' },
    { key: 'edit', label: '수정' },
    // 리스트에서 제거(= soft delete/archived). 확인은 상위 handleArchive 에서 수행(중복 방지).
    { key: 'archive', label: '리스트에서 제거', variant: 'warning', visible: (s) => s.status !== 'archived' },
  ],
});
const ACTION_ICONS: Record<string, ReactNode> = {
  preview: <Eye className="w-4 h-4" />,
  edit: <Edit3 className="w-4 h-4" />,
  archive: <Trash2 className="w-4 h-4" />,
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
  /** 태블릿 화면 만들기 진입(부모 생성 폼 오픈). */
  onCreate: () => void;
  /** 개별 수정(부모 인라인 편집 패널 오픈). dirty guard 는 부모에서 처리. */
  onEdit: (id: string) => void;
  /** 개별 리스트에서 제거(부모 handleArchive — 확인 + 적용중 가드 + reload 포함). */
  onArchive: (set: ScreenSet) => void;
  /** 일괄 작업 후 목록 갱신. */
  onRefresh: () => void;
  /** 행 미리보기(kiosk-core 재사용) — 미주입 시 미리보기 비활성. */
  previewApi?: TabletKioskApi;
  storeSlug?: string | null;
  /** WO-...-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: 미리보기 코너 문맥. 리스트 단독은 코너 없음(상품 미표시). */
  onPreviewContext?: (tabletId: string | null) => void;
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
  previewApi,
  storeSlug,
  onPreviewContext,
}: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [templateFilter, setTemplateFilter] = useState<string>('');
  const [cornerFilter, setCornerFilter] = useState<string>(''); // '' 전체 / '__none__' 미사용 / 코너명
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // 미리보기 모달 (WO-...-SEARCH-PAGINATION-PREVIEW-V1)
  const canPreview = !!previewApi && !!storeSlug;
  const [preview, setPreview] = useState<{ name: string; screen: TabletScreenResponse; view: 'tablet' | 'mobile' } | null>(null);
  const [previewBusy, setPreviewBusy] = useState<string | null>(null);
  const handlePreview = useCallback(async (s: ScreenSet) => {
    if (!canPreview) { toast.error('매장 공개 주소를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.'); return; }
    if (previewBusy) return;
    // WO-...-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: 리스트 단독 미리보기 = 코너 문맥 없음 → Screen Set 원본 기준(상품 미표시).
    onPreviewContext?.(PREVIEW_NO_CORNER);
    setPreviewBusy(s.id);
    try {
      const detail = await fetchScreenSet(s.id);
      const screen = await previewScreenSet({ templateKey: detail.templateKey, blocks: detail.blocks });
      setPreview({ name: s.name, screen, view: 'tablet' });
    } catch (e: any) {
      toast.error(e?.message || '미리보기를 불러오지 못했습니다.');
    } finally { setPreviewBusy(null); }
  }, [canPreview, previewBusy]);

  // ── 필터 옵션(현재 목록에서 도출) ──
  const templateOptions = useMemo(() => {
    const keys = Array.from(new Set(sets.map((s) => s.templateKey)));
    return keys.map((k) => ({ key: k, label: templateLabel(k) })).sort((a, b) => a.label.localeCompare(b.label, 'ko'));
  }, [sets, templateLabel]);
  const cornerOptions = useMemo(() => {
    const names = new Set<string>();
    Object.values(usageBySet).forEach((arr) => arr.forEach((n) => names.add(n)));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [usageBySet]);

  // ── client-side 필터/검색/정렬 ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sets
      .filter((s) => (statusFilter === '' ? s.status !== 'archived' : s.status === statusFilter))
      .filter((s) => !templateFilter || s.templateKey === templateFilter)
      .filter((s) => {
        if (!cornerFilter) return true;
        const corners = usageBySet[s.id] ?? [];
        if (cornerFilter === '__none__') return corners.length === 0;
        return corners.includes(cornerFilter);
      })
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [sets, search, statusFilter, templateFilter, cornerFilter, usageBySet]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [filtered, clampedPage, pageSize],
  );

  // 검색/필터/페이지크기 변경 시 1페이지로 + 선택 해제.
  useEffect(() => { setPage(1); }, [search, statusFilter, templateFilter, cornerFilter, pageSize]);
  useEffect(() => { setSelectedKeys(new Set()); }, [page, search, statusFilter, templateFilter, cornerFilter, pageSize, sets]);

  // ── 일괄 리스트에서 제거 ──
  const batchArchiveOp = useCallback(
    async (
      ids: string[],
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const settled = await Promise.allSettled(ids.map((id) => archiveScreenSet(id)));
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { code?: string; message?: string } | null;
        const error = (err?.code === 'SCREEN_SET_IN_USE' || err?.code === 'ARCHIVE_BLOCKED_CONNECTED')
          ? '코너에 연결되어 있어 제거할 수 없습니다. 먼저 코너 연결을 해제하세요'
          : err?.message || '리스트에서 제거하지 못했습니다';
        return { id, status: 'failed' as const, error };
      });
      return { data: { results } };
    },
    [],
  );

  const handleBulkArchive = useCallback(async () => {
    const ids = pageRows.filter((s) => selectedKeys.has(s.id) && s.status !== 'archived').map((s) => s.id);
    if (ids.length === 0) {
      toast.error('제거할 수 있는 항목이 없습니다. (이미 제거된 항목은 제외됩니다)');
      return;
    }
    if (!window.confirm(`선택한 ${ids.length}개 콘텐츠를 리스트에서 제거하시겠습니까?\n콘텐츠는 삭제되지 않으며, ‘리스트에서 제거됨’ 필터에서 다시 확인할 수 있습니다.\n(코너에 연결된 콘텐츠는 먼저 연결을 해제해야 합니다.)`)) return;
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
      width: '110px',
      render: (_v, s) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE_CLASS[s.status]}`}>
          {STATUS_LABEL[s.status]}
        </span>
      ),
    },
    {
      key: 'usage',
      // WO-...-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1: usageBySet = '현재 화면으로 적용된' 코너(연결만은 미포함) → 정확한 라벨.
      header: '현재 적용 코너',
      render: (_v, s) => {
        const corners = usageBySet[s.id] ?? [];
        return corners.length > 0 ? (
          <span className="text-xs text-emerald-700 truncate" title={`현재 적용 코너: ${corners.join(', ')}`}>{corners.join(', ')}</span>
        ) : (
          <span className="text-xs text-slate-400" title="현재 어느 코너에도 적용되지 않음(연결만 되어 있을 수 있음)">현재 미적용</span>
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
            preview: () => handlePreview(s),
            edit: () => onEdit(s.id),
            archive: () => onArchive(s),
          }, {
            icons: ACTION_ICONS,
            loading: previewBusy === s.id ? { preview: true } : (busy ? { archive: true } : undefined),
          })}
          inlineMax={contentActionPolicy.inlineMax}
        />
      ),
    },
  ], [templateLabel, usageBySet, onEdit, onArchive, busy, handlePreview, previewBusy]);

  const selectCls = 'px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="space-y-3">
      {/* ── 도구막대: 검색 + 필터(상태/템플릿/코너) + 만들기 ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="콘텐츠명 검색"
            className="min-w-[180px] flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label="콘텐츠명 검색"
          />
          {/* 템플릿 필터 */}
          <select value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)} className={selectCls} aria-label="템플릿 필터">
            <option value="">템플릿 전체</option>
            {templateOptions.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {/* 현재 적용 코너 필터 */}
          <select value={cornerFilter} onChange={(e) => setCornerFilter(e.target.value)} className={selectCls} aria-label="현재 적용 코너 필터">
            <option value="">현재 적용 코너 전체</option>
            {cornerOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="__none__">현재 미적용</option>
          </select>
          {/* 상태 필터 */}
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

      {/* ── 일괄 작업(선택 시) ── */}
      <ActionBar
        selectedCount={selectedKeys.size}
        onClearSelection={() => setSelectedKeys(new Set())}
        actions={[
          {
            key: 'bulk-archive',
            label: `선택한 콘텐츠를 리스트에서 제거 (${archivableSelectedCount})`,
            onClick: handleBulkArchive,
            variant: 'default' as const,
            icon: <Trash2 className="w-3.5 h-3.5" />,
            loading: batch.loading,
            group: 'actions',
            visible: selectedKeys.size > 0,
            tooltip: '선택한 콘텐츠를 리스트에서 제거합니다(콘텐츠는 삭제되지 않음). 코너에 연결된 콘텐츠는 먼저 연결 해제 필요.',
          },
        ]}
      />

      <BulkResultModal
        open={batch.showResult}
        onClose={() => batch.clearResult()}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* ── 표준 테이블 (행/콘텐츠명 클릭 = 미리보기) ── */}
      <DataTable<ScreenSet>
        columns={columns}
        data={pageRows}
        rowKey="id"
        loading={loading}
        emptyMessage={
          search || statusFilter || templateFilter || cornerFilter
            ? '조건에 맞는 태블릿 콘텐츠가 없습니다.'
            : '아직 태블릿 콘텐츠가 없습니다. ‘태블릿 화면 만들기’로 첫 화면 세트를 만들어 주세요.'
        }
        tableId="kpa-tablet-content-list"
        onRowClick={(s) => handlePreview(s)}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
      />

      {/* ── 페이지네이션 + 요약 + 페이지당 표시 수 ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500">
          총 <span className="font-medium text-slate-700">{total}</span>건 · {clampedPage} / {totalPages} 페이지 · 페이지당 {pageSize}개
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">페이지당
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="ml-1 px-2 py-1 rounded border border-slate-200 text-xs" aria-label="페이지당 표시 수">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}개</option>)}
            </select>
          </label>
          <Pagination page={clampedPage} totalPages={totalPages} onPageChange={setPage} total={total} />
        </div>
      </div>

      {/* ── 미리보기 모달(read-only, 태블릿/QR 모바일 전환) ── */}
      {preview && previewApi && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/70 flex flex-col" onClick={() => setPreview(null)} role="presentation">
          <div className="bg-slate-900/95 text-white px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-semibold truncate">{preview.name}</span>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setPreview((p) => (p ? { ...p, view: 'tablet' } : p))}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${preview.view === 'tablet' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>태블릿 화면</button>
                <button onClick={() => setPreview((p) => (p ? { ...p, view: 'mobile' } : p))}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${preview.view === 'mobile' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>QR 모바일 화면</button>
              </div>
            </div>
            <button onClick={() => setPreview(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium whitespace-nowrap">
              <X className="w-4 h-4" /> 닫기
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-3 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div style={preview.view === 'tablet'
              ? { position: 'relative', overflow: 'hidden', width: 'min(100%, 1024px)', aspectRatio: '16 / 10', background: '#000', borderRadius: 12 }
              : { position: 'relative', overflow: 'hidden', width: 390, maxWidth: '100%', height: 'min(86vh, 780px)', background: '#000', borderRadius: 24 }}>
              <TabletKioskPage api={previewApi} slug={storeSlug ?? undefined} previewScreen={preview.screen} embedded showQrBadge={false} />
            </div>
          </div>
          <div className="bg-slate-900/90 text-slate-300 text-[11px] px-4 py-1.5 text-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            저장된 내용을 보여 주는 미리보기입니다. 실제 태블릿에서는 화면 크기·방향에 따라 달라질 수 있습니다.
          </div>
        </div>
      )}

      {previewBusy && !preview && (
        <div className="fixed inset-0 z-[100000] bg-slate-900/40 flex items-center justify-center" role="presentation">
          <div className="bg-white rounded-xl px-4 py-3 text-sm text-slate-600 inline-flex items-center gap-2 shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin" /> 미리보기 준비 중…
          </div>
        </div>
      )}
    </div>
  );
}
