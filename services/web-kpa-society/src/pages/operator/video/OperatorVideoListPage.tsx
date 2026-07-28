/**
 * OperatorVideoListPage — 운영자 매장 HUB 동영상 목록 (표준 테이블)
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * 운영자가 KPA 매장 HUB 에 게시한 QR 전용 동영상 목록. 상태별 필터 + 행 액션 +
 * 일괄 발행/보관/삭제. OperatorPopListPage mirror.
 *
 * Backend:
 *   GET    /api/v1/kpa/operator/video/posts
 *   PATCH  /...:id/publish — fan-out 일괄 발행
 *   PATCH  /...:id/archive — fan-out 일괄 보관
 *   DELETE /...:id        — fan-out 일괄 삭제
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Trash2, Send, Archive, Plus } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BulkResultModal, RowActionMenu, ConfirmActionDialog } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  listOperatorVideoPosts,
  publishOperatorVideoPost,
  archiveOperatorVideoPost,
  deleteOperatorVideoPost,
  type OperatorVideoPost,
} from '../../../api/operatorVideo';

type StatusFilter = '' | 'draft' | 'published' | 'archived';

const STATUS_LABEL: Record<OperatorVideoPost['status'], string> = {
  draft: '초안',
  published: '발행',
  archived: '보관',
};

const STATUS_BADGE_CLASS: Record<OperatorVideoPost['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-700',
};

const videoActionPolicy = defineActionPolicy<OperatorVideoPost>('kpa:operator-video', {
  inlineMax: 2,
  rules: [
    { key: 'edit', label: '수정' },
    {
      key: 'publish',
      label: '발행',
      variant: 'primary',
      visible: (v) => v.status !== 'published',
      confirm: {
        title: '동영상 발행',
        message: '이 동영상을 발행하시겠습니까? 발행 즉시 매장 HUB 에 노출됩니다.',
        confirmText: '발행',
      },
    },
    {
      key: 'archive',
      label: '보관',
      visible: (v) => v.status !== 'archived',
      confirm: {
        title: '동영상 보관',
        message: '이 동영상을 보관하시겠습니까? HUB 노출이 중단됩니다.',
        confirmText: '보관',
      },
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      confirm: {
        title: '동영상 삭제',
        message: '이 동영상을 삭제하시겠습니까? 되돌릴 수 없습니다.',
        variant: 'danger',
        confirmText: '삭제',
      },
    },
  ],
});

const VIDEO_ACTION_ICONS: Record<string, ReactNode> = {
  edit: <Edit3 className="w-4 h-4" />,
  publish: <Send className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

const PAGE_LIMIT = 20;

export default function OperatorVideoListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OperatorVideoPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const batch = useBatchAction();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listOperatorVideoPosts({
        page,
        limit: PAGE_LIMIT,
        status: statusFilter || undefined,
      });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch (e: any) {
      setError(e?.message || '목록을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter]);

  // 확인은 videoActionPolicy.publish.confirm (RowActionMenu → ConfirmActionDialog) 가 담당.
  const handlePublish = useCallback(async (video: OperatorVideoPost) => {
    setActionLoading(video.id);
    try {
      await publishOperatorVideoPost(video.id);
      toast.success('동영상이 발행되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleArchive = useCallback(async (video: OperatorVideoPost) => {
    setActionLoading(video.id);
    try {
      await archiveOperatorVideoPost(video.id);
      toast.success('동영상이 보관되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '보관에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleDelete = useCallback(async (video: OperatorVideoPost) => {
    setActionLoading(video.id);
    try {
      await deleteOperatorVideoPost(video.id);
      toast.success('동영상이 삭제되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const selectedDraftOrArchivedIds = useMemo(
    () => items.filter((v) => selectedIds.has(v.id) && v.status !== 'published').map((v) => v.id),
    [items, selectedIds],
  );
  const selectedNotArchivedIds = useMemo(
    () => items.filter((v) => selectedIds.has(v.id) && v.status !== 'archived').map((v) => v.id),
    [items, selectedIds],
  );

  type BulkOp = 'publish' | 'archive' | 'delete';
  // WO-O4O-KPA-OPERATOR-RUNBULK-CONFIRM-FLOW-STANDARDIZATION-V1:
  //   확인 UI 를 runBulk 에서 분리. dialog open 시점의 target IDs 를 고정(pendingBulk.ids)해
  //   selection 이 바뀌어도 저장된 대상으로만 실행한다.
  type BulkConfirmState = { op: BulkOp; ids: string[]; title: string; message: string; variant?: 'default' | 'danger' | 'warning'; confirmText: string };
  const [pendingBulk, setPendingBulk] = useState<BulkConfirmState | null>(null);
  const batchVideoOp = useCallback(
    async (
      ids: string[],
      options?: Record<string, unknown>,
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const op = options?.op as BulkOp | undefined;
      if (!op) {
        return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: 'op missing' })) } };
      }
      const fn =
        op === 'publish' ? publishOperatorVideoPost
        : op === 'archive' ? archiveOperatorVideoPost
        : deleteOperatorVideoPost;
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

  // runBulk 은 이미 확인된 작업만 실행한다 (확인 UI/window.confirm 미포함).
  const runBulk = useCallback(
    async (ids: string[], op: BulkOp) => {
      if (ids.length === 0) return;
      const result = await batch.executeBatch(batchVideoOp, ids, { op });
      if (result.successCount > 0) {
        setSelectedIds(new Set());
        await loadData();
      }
    },
    [batch, batchVideoOp, loadData],
  );

  // 확인 대상 IDs 를 dialog open 시점에 고정 → 이후 selection 변경과 무관하게 실행.
  const handleBulkPublish = useCallback(() => {
    const ids = selectedDraftOrArchivedIds;
    if (ids.length === 0) return;
    setPendingBulk({
      op: 'publish', ids,
      title: '일괄 발행',
      message: `선택한 ${ids.length}개 동영상을 발행하시겠습니까? 발행 즉시 매장 HUB 에 노출됩니다.`,
      confirmText: '발행',
    });
  }, [selectedDraftOrArchivedIds]);
  const handleBulkArchive = useCallback(() => {
    const ids = selectedNotArchivedIds;
    if (ids.length === 0) return;
    setPendingBulk({
      op: 'archive', ids,
      title: '일괄 보관',
      message: `선택한 ${ids.length}개 동영상을 보관하시겠습니까?`,
      confirmText: '보관',
    });
  }, [selectedNotArchivedIds]);
  const handleBulkDelete = useCallback(() => {
    const ids = items.filter((v) => selectedIds.has(v.id)).map((v) => v.id);
    if (ids.length === 0) return;
    setPendingBulk({
      op: 'delete', ids,
      title: '일괄 삭제',
      message: `선택한 ${ids.length}개 동영상을 삭제하시겠습니까? 되돌릴 수 없습니다.`,
      variant: 'danger',
      confirmText: '삭제',
    });
  }, [items, selectedIds]);
  const handleConfirmBulk = useCallback(async () => {
    const pending = pendingBulk;
    if (!pending) return;
    await runBulk(pending.ids, pending.op);
    setPendingBulk(null);
  }, [pendingBulk, runBulk]);

  const columns: ListColumnDef<OperatorVideoPost>[] = useMemo(() => [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (v) => v.title,
      render: (_val, v) => (
        <span className="font-medium text-slate-800 text-sm truncate">{v.title}</span>
      ),
    },
    {
      key: 'videoUrl',
      header: '동영상 URL',
      width: '220px',
      render: (_val, v) => (
        <span className="text-xs text-slate-500 font-mono truncate">{v.videoUrl}</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (_val, v) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE_CLASS[v.status]}`}>
          {STATUS_LABEL[v.status]}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: '수정일',
      width: '100px',
      sortable: true,
      sortAccessor: (v) => new Date(v.updatedAt).getTime(),
      render: (_val, v) => (
        <span className="text-xs text-slate-500">
          {new Date(v.updatedAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'publishedAt',
      header: '발행일',
      width: '100px',
      sortable: true,
      sortAccessor: (v) => (v.publishedAt ? new Date(v.publishedAt).getTime() : 0),
      render: (_val, v) => (
        <span className="text-xs text-slate-500">
          {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('ko-KR') : '-'}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '액션',
      width: '60px',
      align: 'center',
      system: true,
      render: (_val, v) => (
        <RowActionMenu
          actions={buildRowActions(videoActionPolicy, v, {
            edit: () => navigate(`/operator/video/${v.id}/edit`),
            publish: () => handlePublish(v),
            archive: () => handleArchive(v),
            delete: () => handleDelete(v),
          }, {
            icons: VIDEO_ACTION_ICONS,
            loading: actionLoading === v.id
              ? { edit: true, publish: true, archive: true, delete: true }
              : undefined,
          })}
          inlineMax={videoActionPolicy.inlineMax}
        />
      ),
    },
  ], [navigate, handlePublish, handleArchive, handleDelete, actionLoading]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6 pb-5 border-b-2 border-slate-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">매장 HUB 동영상 (QR 전용)</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            운영자가 KPA 매장 HUB 에 게시할 동영상(외부 URL)을 작성·관리합니다.
            발행 시 모든 KPA 매장의 HUB 에 노출되며, 매장 경영자가 자기 매장으로 가져가 QR 로 연결할 수 있습니다.
            디지털 사이니지와는 연결되지 않는 QR 전용 콘텐츠입니다.
          </p>
        </div>
        <button
          onClick={() => navigate('/operator/video/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />동영상 만들기
        </button>
      </header>

      <div className="flex gap-2 mb-4">
        {(['', 'draft', 'published', 'archived'] as StatusFilter[]).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {s === '' ? '전체' : STATUS_LABEL[s as OperatorVideoPost['status']]}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-center py-16 text-red-600 text-sm">
          <p>{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-3 px-4 py-1.5 text-xs text-blue-600 border border-blue-400 rounded-lg hover:bg-blue-50"
          >
            다시 시도
          </button>
        </div>
      )}

      {!error && (
        <>
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
                  tooltip: '선택한 초안/보관 동영상을 일괄 발행합니다',
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
                  tooltip: '선택한 동영상을 일괄 보관',
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
                  tooltip: '선택한 동영상을 일괄 삭제 (되돌릴 수 없음)',
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

          {/* WO-O4O-KPA-OPERATOR-RUNBULK-CONFIRM-FLOW-STANDARDIZATION-V1:
              일괄 확인 → 고정된 target IDs 로 runBulk 실행. 실행 중(batch.loading) 재확인/닫힘 방지. */}
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

          <DataTable<OperatorVideoPost>
            columns={columns}
            data={items}
            rowKey="id"
            loading={isLoading}
            emptyMessage={
              statusFilter
                ? '해당 상태의 동영상이 없습니다'
                : '아직 만든 동영상이 없습니다'
            }
            tableId="operator-video-list"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
          />

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
