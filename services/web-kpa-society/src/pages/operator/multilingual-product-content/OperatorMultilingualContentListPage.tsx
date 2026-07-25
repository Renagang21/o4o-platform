/**
 * OperatorMultilingualContentListPage — 운영자 매장 HUB 다국어 상품 콘텐츠 목록 (표준 테이블)
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1 (초기 수동 테이블)
 * WO-O4O-KPA-OPERATOR-LIST-STANDARDIZATION-PRIORITY-AUDIT-V1 (2026-07-25):
 *   수동 <table> → O4O 표준 테이블 (DataTable + ActionBar + useBatchAction +
 *   BulkResultModal + RowActionMenu + defineActionPolicy). OperatorBlogListPage mirror.
 *   다국어 고유 요소(HUB 노출 판정 · 발행 언어 · publish 전 발행언어 가드)는 불변 보존.
 *   route/권한/backend API 불변.
 *
 * 운영자가 KPA 매장 HUB 에 게시할 다국어 상품 콘텐츠 ORIGINAL 목록.
 *   /operator/multilingual-product-contents
 * 작성/수정은 /operator/multilingual-product-contents/new · /:id
 */

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Languages, Send, Archive, Pencil } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  listOperatorMlcGroups,
  publishOperatorMlcGroup,
  archiveOperatorMlcGroup,
  OPERATOR_MLC_LOCALE_LABELS,
  type OperatorMlcGroup,
  type OperatorMlcStatus,
} from '../../../api/operatorMultilingualContent';

const PAGE_LIMIT = 20;

const STATUS_PILL: Record<OperatorMlcStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  archived: 'bg-amber-50 text-amber-700 border-amber-200',
};
const STATUS_LABEL: Record<OperatorMlcStatus, string> = {
  // WO-O4O-KPA-OPERATOR-STORE-CONTENT-MENU-TERMINOLOGY-ALIGNMENT-V1: 상태 라벨 통일(초안/발행/보관)
  draft: '초안',
  published: '발행',
  archived: '보관',
};

/**
 * HUB 노출 상태 — group.status + 발행된 언어 페이지 수로 판정.
 * Store Hub 노출 조건(불변): group.status='published' AND published page 1개 이상.
 */
type HubVisibility = 'visible' | 'group_draft' | 'no_locale' | 'archived';
const HUB_VIS_PILL: Record<HubVisibility, string> = {
  visible: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  group_draft: 'bg-slate-100 text-slate-600 border-slate-200',
  no_locale: 'bg-orange-50 text-orange-700 border-orange-200',
  archived: 'bg-slate-100 text-slate-400 border-slate-200',
};
const HUB_VIS_LABEL: Record<HubVisibility, string> = {
  visible: 'HUB 노출 가능',
  group_draft: '그룹 초안',
  no_locale: '발행된 언어 없음',
  archived: '보관됨',
};

const publishedLocales = (g: OperatorMlcGroup): string[] =>
  (g.pages || []).filter((p) => p.status === 'published').map((p) => p.locale);

const hubVisibility = (g: OperatorMlcGroup): HubVisibility => {
  if (g.status === 'archived') return 'archived';
  if (g.status !== 'published') return 'group_draft';
  return publishedLocales(g).length > 0 ? 'visible' : 'no_locale';
};

// ─── Action Policy (status 기반 행 액션 규칙) ─────────────────────
// OperatorBlogListPage 패턴 mirror. 다국어는 삭제 API 없음 → edit/publish/archive 만.
const mlcActionPolicy = defineActionPolicy<OperatorMlcGroup>('kpa:operator-mlc', {
  inlineMax: 2,
  rules: [
    { key: 'edit', label: '수정' },
    {
      key: 'publish',
      label: '발행',
      variant: 'primary',
      visible: (g) => g.status !== 'published',
    },
    {
      key: 'archive',
      label: '보관',
      visible: (g) => g.status !== 'archived',
      confirm: {
        title: '콘텐츠 보관',
        message: '보관 처리하면 매장 HUB 에서 더 이상 노출되지 않습니다. 계속할까요?',
        confirmText: '보관',
      },
    },
  ],
});

const MLC_ACTION_ICONS: Record<string, ReactNode> = {
  edit: <Pencil className="w-4 h-4" />,
  publish: <Send className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
};

export default function OperatorMultilingualContentListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OperatorMlcGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OperatorMlcStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection (canonical Set<string>)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Per-row loading (단건 액션 진행 표시)
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Batch hook
  const batch = useBatchAction();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listOperatorMlcGroups({
        page,
        limit: PAGE_LIMIT,
        status: statusFilter || undefined,
      });
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (e: any) {
      setError(e?.message || '다국어 상품 콘텐츠를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 필터/페이지 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter]);

  // ── Single row actions ──────────────────────────────────────────
  const handlePublish = useCallback(async (g: OperatorMlcGroup) => {
    // 불변 가드: 발행된 언어 페이지 0개면 발행 불가(HUB 노출 조건).
    if (publishedLocales(g).length === 0) {
      toast.error('발행된 언어 페이지가 없습니다. 먼저 1개 이상의 언어를 "저장 후 발행"해 주세요.');
      return;
    }
    setActionLoading(g.id);
    try {
      await publishOperatorMlcGroup(g.id);
      toast.success('발행되었습니다 — KPA 매장 HUB 에 노출됩니다');
      await loadData();
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleArchive = useCallback(async (g: OperatorMlcGroup) => {
    setActionLoading(g.id);
    try {
      await archiveOperatorMlcGroup(g.id);
      toast.success('보관되었습니다');
      await loadData();
    } catch (e: any) {
      toast.error(e?.message || '보관에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  // ── Bulk action — status 별 선택 후보 ───────────────────────────
  // 발행 후보: 선택 && 미발행 && 발행된 언어 1개 이상(불변 가드와 동일 조건).
  const selectedPublishableIds = useMemo(
    () =>
      items
        .filter((g) => selectedIds.has(g.id) && g.status !== 'published' && publishedLocales(g).length > 0)
        .map((g) => g.id),
    [items, selectedIds],
  );
  const selectedNotArchivedIds = useMemo(
    () =>
      items
        .filter((g) => selectedIds.has(g.id) && g.status !== 'archived')
        .map((g) => g.id),
    [items, selectedIds],
  );

  // Bulk fan-out wrapper (기존 단건 API 재사용, client-side fan-out)
  type BulkOp = 'publish' | 'archive';
  const batchMlcOp = useCallback(
    async (
      ids: string[],
      options?: Record<string, unknown>,
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const op = options?.op as BulkOp | undefined;
      if (!op) {
        return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: 'op missing' })) } };
      }
      const fn = op === 'publish' ? publishOperatorMlcGroup : archiveOperatorMlcGroup;
      const settled = await Promise.allSettled(ids.map((id) => fn(id)));
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        return { id, status: 'failed' as const, error: err?.message || 'Network error' };
      });
      return { data: { results } };
    },
    [],
  );

  const runBulk = useCallback(
    async (ids: string[], op: BulkOp, opts?: { confirm?: string }) => {
      if (ids.length === 0) return;
      if (opts?.confirm && !window.confirm(opts.confirm)) return;
      const result = await batch.executeBatch(batchMlcOp, ids, { op });
      if (result.successCount > 0) {
        setSelectedIds(new Set());
        await loadData();
      }
    },
    [batch, batchMlcOp, loadData],
  );

  const handleBulkPublish = useCallback(
    () => runBulk(selectedPublishableIds, 'publish'),
    [runBulk, selectedPublishableIds],
  );
  const handleBulkArchive = useCallback(
    () => runBulk(selectedNotArchivedIds, 'archive', {
      confirm: `선택한 ${selectedNotArchivedIds.length}개 콘텐츠를 보관하시겠습니까? 매장 HUB 노출이 중단됩니다.`,
    }),
    [runBulk, selectedNotArchivedIds],
  );

  // ── Columns ───────────────────────────────────────────────────
  const columns: ListColumnDef<OperatorMlcGroup>[] = useMemo(() => [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (g) => g.title,
      render: (_v, g) => (
        <button
          onClick={() => navigate(`/operator/multilingual-product-contents/${g.id}`)}
          className="flex items-center gap-2 min-w-0 text-left"
        >
          <span className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
            <Languages className="w-3.5 h-3.5" />
          </span>
          <span className="font-medium text-slate-800 truncate hover:text-blue-600">{g.title}</span>
        </button>
      ),
    },
    {
      key: 'hubVisibility',
      header: 'HUB 노출',
      width: '130px',
      render: (_v, g) => {
        const vis = hubVisibility(g);
        return (
          <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${HUB_VIS_PILL[vis]}`}>
            {HUB_VIS_LABEL[vis]}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (_v, g) => (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${STATUS_PILL[g.status]}`}>
          {STATUS_LABEL[g.status]}
        </span>
      ),
    },
    {
      key: 'locales',
      header: '발행 언어',
      width: '180px',
      render: (_v, g) => {
        const locales = publishedLocales(g);
        return locales.length === 0 ? (
          <span className="text-xs text-slate-400">발행 페이지 없음</span>
        ) : (
          <span className="text-xs text-slate-600">
            {locales.map((l) => OPERATOR_MLC_LOCALE_LABELS[l as keyof typeof OPERATOR_MLC_LOCALE_LABELS] || l).join(' · ')}
            <span className="text-slate-400"> ({locales.length})</span>
          </span>
        );
      },
    },
    {
      key: 'updatedAt',
      header: '수정일',
      width: '100px',
      sortable: true,
      sortAccessor: (g) => new Date(g.updatedAt).getTime(),
      render: (_v, g) => (
        <span className="text-xs text-slate-500">
          {new Date(g.updatedAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '작업',
      width: '60px',
      align: 'center',
      system: true,
      render: (_v, g) => (
        <RowActionMenu
          actions={buildRowActions(mlcActionPolicy, g, {
            edit: () => navigate(`/operator/multilingual-product-contents/${g.id}`),
            publish: () => handlePublish(g),
            archive: () => handleArchive(g),
          }, {
            icons: MLC_ACTION_ICONS,
            loading: actionLoading === g.id
              ? { edit: true, publish: true, archive: true }
              : undefined,
          })}
          inlineMax={mlcActionPolicy.inlineMax}
        />
      ),
    },
  ], [navigate, handlePublish, handleArchive, actionLoading]);

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b-2 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">매장 HUB 다국어 상품 콘텐츠</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            외국인 고객 대상 다국어 상품 안내 콘텐츠를 작성·게시하면 매장이 가져가(복사) 자기 상품에 연결합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/operator/multilingual-product-contents/new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />
          콘텐츠 만들기
        </button>
      </header>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        {(['', 'draft', 'published', 'archived'] as const).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-full border ${
              statusFilter === s
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === '' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-center py-12 text-red-600 text-sm">
          <p>{error}</p>
          <button onClick={loadData} className="mt-3 px-4 py-1.5 text-xs text-blue-600 border border-blue-400 rounded-lg hover:bg-blue-50">
            다시 시도
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* ActionBar */}
          <ActionBar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            actions={[
              {
                key: 'bulk-publish',
                label: `일괄 발행 (${selectedPublishableIds.length})`,
                onClick: handleBulkPublish,
                variant: 'primary' as const,
                icon: <Send className="w-3.5 h-3.5" />,
                loading: batch.loading,
                group: 'actions',
                visible: selectedPublishableIds.length > 0,
                tooltip: '선택한 콘텐츠 중 발행 가능한(발행 언어 1개 이상) 항목을 일괄 발행합니다',
              },
              {
                key: 'bulk-archive',
                label: `일괄 보관 (${selectedNotArchivedIds.length})`,
                onClick: handleBulkArchive,
                variant: 'default' as const,
                icon: <Archive className="w-3.5 h-3.5" />,
                loading: batch.loading,
                group: 'actions',
                visible: selectedNotArchivedIds.length > 0,
                tooltip: '선택한 콘텐츠를 일괄 보관 (HUB 노출 중단)',
              },
            ]}
          />

          {/* BulkResultModal */}
          <BulkResultModal
            open={batch.showResult}
            onClose={() => batch.clearResult()}
            result={batch.result}
            onRetry={() => batch.retryFailed()}
          />

          {/* DataTable */}
          <DataTable<OperatorMlcGroup>
            columns={columns}
            data={items}
            rowKey="id"
            loading={isLoading}
            emptyMessage={
              statusFilter
                ? '해당 상태의 다국어 상품 콘텐츠가 없습니다'
                : '아직 작성한 다국어 상품 콘텐츠가 없습니다'
            }
            tableId="operator-mlc-list"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                이전
              </button>
              <span className="text-sm text-slate-500">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
