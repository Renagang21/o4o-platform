/**
 * OperatorBlogListPage — 운영자 약국 HUB 블로그 목록
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1 (2026-05-27):
 *   KPA OperatorBlogListPage port. API endpoint: /api/v1/glycopharm/operator/blog/posts
 *   상태별 필터 (draft / published / archived) + 행 액션 + 일괄 발행/보관/삭제.
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Trash2, Send, Archive, Plus } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  listOperatorBlogPosts,
  publishOperatorBlogPost,
  archiveOperatorBlogPost,
  deleteOperatorBlogPost,
  type OperatorBlogPost,
} from '../../../api/operatorBlog';

type StatusFilter = '' | 'draft' | 'published' | 'archived';

const STATUS_LABEL: Record<OperatorBlogPost['status'], string> = {
  draft: '초안',
  published: '발행',
  archived: '보관',
};

const STATUS_BADGE_CLASS: Record<OperatorBlogPost['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-700',
};

const blogActionPolicy = defineActionPolicy<OperatorBlogPost>('glycopharm:operator-blog', {
  inlineMax: 2,
  rules: [
    { key: 'edit', label: '수정' },
    {
      key: 'publish',
      label: '발행',
      variant: 'primary',
      visible: (p) => p.status !== 'published',
    },
    {
      key: 'archive',
      label: '보관',
      visible: (p) => p.status !== 'archived',
      confirm: {
        title: '블로그 보관',
        message: '이 블로그를 보관하시겠습니까? HUB 노출이 중단됩니다.',
        confirmText: '보관',
      },
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      confirm: {
        title: '블로그 삭제',
        message: '이 블로그를 삭제하시겠습니까? 되돌릴 수 없습니다.',
        variant: 'danger',
        confirmText: '삭제',
      },
    },
  ],
});

const BLOG_ACTION_ICONS: Record<string, ReactNode> = {
  edit: <Edit3 className="w-4 h-4" />,
  publish: <Send className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

const PAGE_LIMIT = 20;

export default function OperatorBlogListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OperatorBlogPost[]>([]);
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
      const res = await listOperatorBlogPosts({
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

  const handlePublish = useCallback(async (post: OperatorBlogPost) => {
    if (!window.confirm(`"${post.title}" 블로그를 발행하시겠습니까? 발행 즉시 약국 HUB 에 노출됩니다.`)) return;
    setActionLoading(post.id);
    try {
      await publishOperatorBlogPost(post.id);
      toast.success('블로그가 발행되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleArchive = useCallback(async (post: OperatorBlogPost) => {
    setActionLoading(post.id);
    try {
      await archiveOperatorBlogPost(post.id);
      toast.success('블로그가 보관되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '보관에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleDelete = useCallback(async (post: OperatorBlogPost) => {
    setActionLoading(post.id);
    try {
      await deleteOperatorBlogPost(post.id);
      toast.success('블로그가 삭제되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const selectedDraftOrArchivedIds = useMemo(
    () =>
      items
        .filter((p) => selectedIds.has(p.id) && p.status !== 'published')
        .map((p) => p.id),
    [items, selectedIds],
  );
  const selectedNotArchivedIds = useMemo(
    () =>
      items
        .filter((p) => selectedIds.has(p.id) && p.status !== 'archived')
        .map((p) => p.id),
    [items, selectedIds],
  );
  const selectedAllIds = useMemo(
    () => items.filter((p) => selectedIds.has(p.id)).map((p) => p.id),
    [items, selectedIds],
  );

  type BulkOp = 'publish' | 'archive' | 'delete';
  const batchBlogOp = useCallback(
    async (
      ids: string[],
      options?: Record<string, unknown>,
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const op = options?.op as BulkOp | undefined;
      if (!op) {
        return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: 'op missing' })) } };
      }
      const fn =
        op === 'publish' ? publishOperatorBlogPost
        : op === 'archive' ? archiveOperatorBlogPost
        : deleteOperatorBlogPost;
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
      const result = await batch.executeBatch(batchBlogOp, ids, { op });
      if (result.successCount > 0) {
        setSelectedIds(new Set());
        await loadData();
      }
    },
    [batch, batchBlogOp, loadData],
  );

  const handleBulkPublish = useCallback(
    () => runBulk(selectedDraftOrArchivedIds, 'publish'),
    [runBulk, selectedDraftOrArchivedIds],
  );
  const handleBulkArchive = useCallback(
    () => runBulk(selectedNotArchivedIds, 'archive', {
      confirm: `선택한 ${selectedNotArchivedIds.length}개 블로그를 보관하시겠습니까?`,
    }),
    [runBulk, selectedNotArchivedIds],
  );
  const handleBulkDelete = useCallback(
    () => runBulk(selectedAllIds, 'delete', {
      confirm: `선택한 ${selectedAllIds.length}개 블로그를 삭제하시겠습니까? 되돌릴 수 없습니다.`,
    }),
    [runBulk, selectedAllIds],
  );

  const columns: ListColumnDef<OperatorBlogPost>[] = useMemo(() => [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (p) => p.title,
      render: (_v, p) => (
        <span className="font-medium text-slate-800 text-sm truncate">{p.title}</span>
      ),
    },
    {
      key: 'slug',
      header: '슬러그',
      width: '180px',
      render: (_v, p) => (
        <span className="text-xs text-slate-500 font-mono truncate">/{p.slug}</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (_v, p) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE_CLASS[p.status]}`}>
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
        <span className="text-xs text-slate-500">
          {new Date(p.updatedAt).toLocaleDateString('ko-KR')}
        </span>
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
          actions={buildRowActions(blogActionPolicy, p, {
            edit: () => navigate(`/operator/blog/${p.id}/edit`),
            publish: () => handlePublish(p),
            archive: () => handleArchive(p),
            delete: () => handleDelete(p),
          }, {
            icons: BLOG_ACTION_ICONS,
            loading: actionLoading === p.id
              ? { edit: true, publish: true, archive: true, delete: true }
              : undefined,
          })}
          inlineMax={blogActionPolicy.inlineMax}
        />
      ),
    },
  ], [navigate, handlePublish, handleArchive, handleDelete, actionLoading]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6 pb-5 border-b-2 border-slate-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">약국 HUB 블로그</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            운영자가 GlycoPharm 약국 HUB 에 게시할 블로그 콘텐츠를 작성·관리합니다.
            발행 시 모든 GlycoPharm 약국의 HUB 에 노출되며, 매장 경영자가 자기 약국 자료함으로 가져갈 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => navigate('/operator/blog/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />새 블로그
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
            {s === '' ? '전체' : STATUS_LABEL[s as OperatorBlogPost['status']]}
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
                  tooltip: '선택한 초안/보관 블로그를 일괄 발행합니다',
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
                  tooltip: '선택한 블로그를 일괄 보관 (HUB 노출 중단)',
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
                  tooltip: '선택한 블로그를 일괄 삭제 (되돌릴 수 없음)',
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

          <DataTable<OperatorBlogPost>
            columns={columns}
            data={items}
            rowKey="id"
            loading={isLoading}
            emptyMessage={
              statusFilter
                ? '해당 상태의 블로그가 없습니다'
                : '아직 작성한 블로그가 없습니다'
            }
            tableId="gp-operator-blog-list"
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
