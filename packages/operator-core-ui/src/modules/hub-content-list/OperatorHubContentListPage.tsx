/**
 * OperatorHubContentListPage — 운영자 매장 HUB 콘텐츠(블로그 / POP) 목록 공통 콘솔
 *
 * WO-O4O-KPA-OPERATOR-PUBLISHING-PAGES-STANDARD-TABLE-V1 (원본, 표준 테이블 전환):
 *   DataTable + ActionBar + useBatchAction + BulkResultModal + RowActionMenu + defineActionPolicy.
 * WO-O4O-KPA-OPERATOR-RUNBULK-CONFIRM-FLOW-STANDARDIZATION-V1:
 *   확인 UI 를 runBulk 에서 분리. dialog open 시점의 target IDs 를 고정해
 *   selection 이 바뀌어도 저장된 대상으로만 실행한다.
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA·K-Cosmetics × 블로그·POP 4중복을 단일 모듈로 수렴.
 *
 * 보존: 상태 필터(전체/초안/발행/보관) · 행 액션(수정/발행/보관/삭제) ·
 *       일괄 발행/보관/삭제 + 결과 모달 · 페이지네이션 · 조회 실패 시 오류+재시도.
 *
 * fan-out 일괄 작업은 단건 endpoint 를 Promise.allSettled 로 호출한다 (기존 계약 그대로).
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Edit3, Trash2, Send, Archive, Plus } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BulkResultModal, RowActionMenu, ConfirmActionDialog } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type {
  HubContentPost,
  HubContentItemBase,
  HubContentStatusFilter,
  OperatorHubContentListPageProps,
} from './types';

const STATUS_LABEL: Record<HubContentPost['status'], string> = {
  draft: '초안',
  published: '발행',
  archived: '보관',
};

const ACTION_ICONS: Record<string, ReactNode> = {
  edit: <Edit3 className="w-4 h-4" />,
  publish: <Send className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

const PAGE_LIMIT = 20;

type BulkOp = 'publish' | 'archive' | 'delete';

interface BulkConfirmState {
  op: BulkOp;
  ids: string[];
  title: string;
  message: string;
  variant?: 'default' | 'danger' | 'warning';
  confirmText: string;
}

export function OperatorHubContentListPage<T extends HubContentItemBase = HubContentPost>({
  client,
  copy,
  leadColumns,
  actionPolicyKey,
  tableId,
  onCreate,
  onEdit,
  accent,
}: OperatorHubContentListPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<HubContentStatusFilter>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection (canonical Set<string>)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Per-row loading (단건 액션 진행 표시)
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const batch = useBatchAction();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const statusBadgeClass: Record<HubContentItemBase['status'], string> = useMemo(() => ({
    draft: 'bg-slate-100 text-slate-600',
    published: accent.publishedBadge,
    archived: 'bg-amber-50 text-amber-700',
  }), [accent.publishedBadge]);

  // ─── Action Policy (status 기반 행 액션 규칙) ─────────────────────
  const actionPolicy = useMemo(
    () => defineActionPolicy<T>(actionPolicyKey, {
      inlineMax: 2,
      rules: [
        { key: 'edit', label: '수정' },
        {
          key: 'publish',
          label: '발행',
          variant: 'primary',
          visible: (p) => p.status !== 'published',
          confirm: {
            title: `${copy.kindLabel} 발행`,
            message: `이 ${copy.kindLabel}을(를) 발행하시겠습니까? 발행 즉시 매장 HUB 에 노출됩니다.`,
            confirmText: '발행',
          },
        },
        {
          key: 'archive',
          label: '보관',
          visible: (p) => p.status !== 'archived',
          confirm: {
            title: `${copy.kindLabel} 보관`,
            message: `이 ${copy.kindLabel}을(를) 보관하시겠습니까? HUB 노출이 중단됩니다.`,
            confirmText: '보관',
          },
        },
        {
          key: 'delete',
          label: '삭제',
          variant: 'danger',
          confirm: {
            title: `${copy.kindLabel} 삭제`,
            message: `이 ${copy.kindLabel}을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`,
            variant: 'danger',
            confirmText: '삭제',
          },
        },
      ],
    }),
    [actionPolicyKey, copy.kindLabel],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.list({
        page,
        limit: PAGE_LIMIT,
        // statusFilter 의 '' 는 '전체' 를 뜻하므로 파라미터 자체를 생략한다.
        status: statusFilter === '' ? undefined : statusFilter,
      });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch (e: any) {
      setError(e?.message || '목록을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [client, page, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // 필터/페이지 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter]);

  // ── Single row actions ──────────────────────────────────────────
  // 확인은 actionPolicy.*.confirm (RowActionMenu → ConfirmActionDialog) 가 담당.
  const runSingle = useCallback(
    async (post: T, fn: (id: string) => Promise<unknown>, successMsg: string, failMsg: string) => {
      setActionLoading(post.id);
      try {
        await fn(post.id);
        toast.success(successMsg);
        await loadData();
      } catch (e: any) {
        toast.error(e?.message || failMsg);
      } finally {
        setActionLoading(null);
      }
    },
    [loadData],
  );

  const handlePublish = useCallback(
    (p: T) => runSingle(p, client.publish, `${copy.kindLabel}이(가) 발행되었습니다`, '발행에 실패했습니다'),
    [runSingle, client, copy.kindLabel],
  );
  const handleArchive = useCallback(
    (p: T) => runSingle(p, client.archive, `${copy.kindLabel}이(가) 보관되었습니다`, '보관에 실패했습니다'),
    [runSingle, client, copy.kindLabel],
  );
  const handleDelete = useCallback(
    (p: T) => runSingle(p, client.remove, `${copy.kindLabel}이(가) 삭제되었습니다`, '삭제에 실패했습니다'),
    [runSingle, client, copy.kindLabel],
  );

  // ── Bulk action — status 별 선택 후보 ───────────────────────────
  const selectedDraftOrArchivedIds = useMemo(
    () => items.filter((p) => selectedIds.has(p.id) && p.status !== 'published').map((p) => p.id),
    [items, selectedIds],
  );
  const selectedNotArchivedIds = useMemo(
    () => items.filter((p) => selectedIds.has(p.id) && p.status !== 'archived').map((p) => p.id),
    [items, selectedIds],
  );
  const selectedAllIds = useMemo(
    () => items.filter((p) => selectedIds.has(p.id)).map((p) => p.id),
    [items, selectedIds],
  );

  const [pendingBulk, setPendingBulk] = useState<BulkConfirmState | null>(null);

  const batchOp = useCallback(
    async (
      ids: string[],
      options?: Record<string, unknown>,
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const op = options?.op as BulkOp | undefined;
      if (!op) {
        return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: 'op missing' })) } };
      }
      const fn = op === 'publish' ? client.publish : op === 'archive' ? client.archive : client.remove;
      const settled = await Promise.allSettled(ids.map((id) => fn(id)));
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        return { id, status: 'failed' as const, error: err?.message || 'Network error' };
      });
      return { data: { results } };
    },
    [client],
  );

  // runBulk 은 이미 확인된 작업만 실행한다 (확인 UI/window.confirm 미포함).
  const runBulk = useCallback(
    async (ids: string[], op: BulkOp) => {
      if (ids.length === 0) return;
      const result = await batch.executeBatch(batchOp, ids, { op });
      if (result.successCount > 0) {
        setSelectedIds(new Set());
        await loadData();
      }
    },
    [batch, batchOp, loadData],
  );

  // 확인 대상 IDs 를 dialog open 시점에 고정 → 이후 selection 변경과 무관하게 실행.
  const handleBulkPublish = useCallback(() => {
    const ids = selectedDraftOrArchivedIds;
    if (ids.length === 0) return;
    setPendingBulk({
      op: 'publish', ids,
      title: '일괄 발행',
      message: `선택한 ${ids.length}개 ${copy.kindLabel}을(를) 발행하시겠습니까? 발행 즉시 매장 HUB 에 노출됩니다.`,
      confirmText: '발행',
    });
  }, [selectedDraftOrArchivedIds, copy.kindLabel]);

  const handleBulkArchive = useCallback(() => {
    const ids = selectedNotArchivedIds;
    if (ids.length === 0) return;
    setPendingBulk({
      op: 'archive', ids,
      title: '일괄 보관',
      message: `선택한 ${ids.length}개 ${copy.kindLabel}을(를) 보관하시겠습니까?`,
      confirmText: '보관',
    });
  }, [selectedNotArchivedIds, copy.kindLabel]);

  const handleBulkDelete = useCallback(() => {
    const ids = selectedAllIds;
    if (ids.length === 0) return;
    setPendingBulk({
      op: 'delete', ids,
      title: '일괄 삭제',
      message: `선택한 ${ids.length}개 ${copy.kindLabel}을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`,
      variant: 'danger',
      confirmText: '삭제',
    });
  }, [selectedAllIds, copy.kindLabel]);

  const handleConfirmBulk = useCallback(async () => {
    const pending = pendingBulk;
    if (!pending) return;
    await runBulk(pending.ids, pending.op);
    setPendingBulk(null);
  }, [pendingBulk, runBulk]);

  // ── Columns ───────────────────────────────────────────────────
  // 신원 컬럼 기본값 = 블로그/POP 의 제목 + 슬러그. QR 등은 leadColumns 로 대체한다.
  const defaultLeadColumns = useMemo<ListColumnDef<T>[]>(() => [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (p) => p.title,
      render: (_v, p) => <span className="font-medium text-slate-800 text-sm truncate">{p.title}</span>,
    },
    {
      key: 'slug',
      header: '슬러그',
      width: '180px',
      render: (_v, p) => <span className="text-xs text-slate-500 font-mono truncate">/{(p as unknown as HubContentPost).slug}</span>,
    },
  ], []);

  const columns: ListColumnDef<T>[] = useMemo(() => [
    ...(leadColumns ?? defaultLeadColumns),
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (_v, p) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${statusBadgeClass[p.status]}`}>
          {STATUS_LABEL[p.status]}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: '수정일',
      width: '100px',
      sortable: true,
      sortAccessor: (p) => new Date(p.updatedAt).getTime(),
      render: (_v, p) => (
        <span className="text-xs text-slate-500">{new Date(p.updatedAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
    {
      key: 'publishedAt',
      header: '발행일',
      width: '100px',
      sortable: true,
      sortAccessor: (p) => (p.publishedAt ? new Date(p.publishedAt).getTime() : 0),
      render: (_v, p) => (
        <span className="text-xs text-slate-500">
          {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('ko-KR') : '-'}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '액션',
      width: '60px',
      align: 'center',
      system: true,
      render: (_v, p) => (
        <RowActionMenu
          actions={buildRowActions(actionPolicy, p, {
            edit: () => onEdit(p.id),
            publish: () => handlePublish(p),
            archive: () => handleArchive(p),
            delete: () => handleDelete(p),
          }, {
            icons: ACTION_ICONS,
            loading: actionLoading === p.id
              ? { edit: true, publish: true, archive: true, delete: true }
              : undefined,
          })}
          inlineMax={actionPolicy.inlineMax}
        />
      ),
    },
  ], [actionPolicy, onEdit, handlePublish, handleArchive, handleDelete, actionLoading, statusBadgeClass, leadColumns, defaultLeadColumns]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <header className="mb-6 pb-5 border-b-2 border-slate-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{copy.pageTitle}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{copy.pageDescription}</p>
        </div>
        <button
          onClick={onCreate}
          className={`flex items-center gap-2 px-4 py-2 ${accent.createButton} text-white rounded-lg text-sm font-medium shrink-0`}
        >
          <Plus className="w-4 h-4" />{copy.createButtonLabel}
        </button>
      </header>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-4">
        {(['', 'draft', 'published', 'archived'] as HubContentStatusFilter[]).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              statusFilter === s ? accent.activePill : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {s === '' ? '전체' : STATUS_LABEL[s as HubContentPost['status']]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="text-center py-16 text-red-600 text-sm">
          <p>{error}</p>
          <button
            onClick={() => void loadData()}
            className={`mt-3 px-4 py-1.5 text-xs border rounded-lg ${accent.retryButton}`}
          >
            다시 시도
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* ActionBar */}
          <div className="mb-3">
            <ActionBar
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              actions={[
                {
                  key: 'bulk-publish',
                  label: `일괄 발행 (${selectedDraftOrArchivedIds.length})`,
                  onClick: handleBulkPublish,
                  variant: 'primary' as const,
                  icon: <Send className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  visible: selectedDraftOrArchivedIds.length > 0,
                  tooltip: `선택한 초안/보관 ${copy.kindLabel}을(를) 일괄 발행합니다`,
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
                  tooltip: `선택한 ${copy.kindLabel}을(를) 일괄 보관 (HUB 노출 중단)`,
                },
                {
                  key: 'bulk-delete',
                  label: `일괄 삭제 (${selectedIds.size})`,
                  onClick: handleBulkDelete,
                  variant: 'danger' as const,
                  icon: <Trash2 className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  visible: selectedIds.size > 0,
                  tooltip: `선택한 ${copy.kindLabel}을(를) 일괄 삭제 (되돌릴 수 없음)`,
                },
              ]}
            />
          </div>

          <BulkResultModal
            open={batch.showResult}
            onClose={() => batch.clearResult()}
            result={batch.result}
            onRetry={() => batch.retryFailed()}
          />

          {/* 일괄 확인 → 고정된 target IDs 로 runBulk 실행. 실행 중 재확인/닫힘 방지. */}
          <ConfirmActionDialog
            open={!!pendingBulk}
            title={pendingBulk?.title ?? ''}
            message={pendingBulk?.message ?? ''}
            variant={pendingBulk?.variant}
            confirmText={pendingBulk?.confirmText}
            loading={batch.loading}
            onConfirm={handleConfirmBulk}
            onClose={() => { if (!batch.loading) setPendingBulk(null); }}
          />

          <DataTable<T>
            columns={columns}
            data={items}
            rowKey="id"
            loading={isLoading}
            emptyMessage={statusFilter ? copy.emptyFilteredMessage : copy.emptyMessage}
            tableId={tableId}
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
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
