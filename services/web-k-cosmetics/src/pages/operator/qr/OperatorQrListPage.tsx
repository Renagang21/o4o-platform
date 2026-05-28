/**
 * OperatorQrListPage — 운영자 매장 HUB QR 템플릿 목록 (K-Cosmetics)
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 * Backend: GET /api/v1/cosmetics/operator/qr/templates
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Trash2, Send, Archive, Plus, Link as LinkIcon, FileText } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  listOperatorQrTemplates,
  publishOperatorQrTemplate,
  archiveOperatorQrTemplate,
  deleteOperatorQrTemplate,
  type OperatorQrTemplate,
} from '../../../api/operatorQr';

type StatusFilter = '' | 'draft' | 'published' | 'archived';

const STATUS_LABEL: Record<OperatorQrTemplate['status'], string> = {
  draft: '초안',
  published: '발행',
  archived: '보관',
};

const STATUS_BADGE_CLASS: Record<OperatorQrTemplate['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-pink-50 text-pink-700',
  archived: 'bg-amber-50 text-amber-700',
};

const CONTENT_KIND_LABEL: Record<string, string> = { blog: '블로그', cms: 'CMS', pop: 'POP' };

function formatTarget(item: OperatorQrTemplate): string {
  if (item.targetType === 'url') return item.targetUrl ? `URL · ${item.targetUrl}` : 'URL';
  const kind = item.targetContentKind ? CONTENT_KIND_LABEL[item.targetContentKind] || item.targetContentKind : '';
  const ref = item.targetContentRef ? ` · ${item.targetContentRef}` : '';
  return `콘텐츠${kind ? ` · ${kind}` : ''}${ref}`;
}

const qrActionPolicy = defineActionPolicy<OperatorQrTemplate>('cosmetics:operator-qr', {
  inlineMax: 2,
  rules: [
    { key: 'edit', label: '수정' },
    { key: 'publish', label: '발행', variant: 'primary', visible: (q) => q.status !== 'published' },
    {
      key: 'archive',
      label: '보관',
      visible: (q) => q.status !== 'archived',
      confirm: { title: 'QR 템플릿 보관', message: '이 QR 템플릿을 보관하시겠습니까? HUB 노출이 중단됩니다.', confirmText: '보관' },
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      confirm: { title: 'QR 템플릿 삭제', message: '이 QR 템플릿을 삭제하시겠습니까? 되돌릴 수 없습니다.', variant: 'danger', confirmText: '삭제' },
    },
  ],
});

const QR_ACTION_ICONS: Record<string, ReactNode> = {
  edit: <Edit3 className="w-4 h-4" />,
  publish: <Send className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

const PAGE_LIMIT = 20;

export default function OperatorQrListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OperatorQrTemplate[]>([]);
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
      const res = await listOperatorQrTemplates({ page, limit: PAGE_LIMIT, status: statusFilter || undefined });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch (e: any) {
      setError(e?.message || '목록을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setSelectedIds(new Set()); }, [page, statusFilter]);

  const handlePublish = useCallback(async (q: OperatorQrTemplate) => {
    if (!window.confirm(`"${q.title}" QR 템플릿을 발행하시겠습니까? 발행 즉시 매장 HUB 에 노출됩니다.`)) return;
    setActionLoading(q.id);
    try {
      await publishOperatorQrTemplate(q.id);
      toast.success('QR 템플릿이 발행되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleArchive = useCallback(async (q: OperatorQrTemplate) => {
    setActionLoading(q.id);
    try {
      await archiveOperatorQrTemplate(q.id);
      toast.success('QR 템플릿이 보관되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '보관에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleDelete = useCallback(async (q: OperatorQrTemplate) => {
    setActionLoading(q.id);
    try {
      await deleteOperatorQrTemplate(q.id);
      toast.success('QR 템플릿이 삭제되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const selectedDraftOrArchivedIds = useMemo(
    () => items.filter((q) => selectedIds.has(q.id) && q.status !== 'published').map((q) => q.id),
    [items, selectedIds],
  );
  const selectedNotArchivedIds = useMemo(
    () => items.filter((q) => selectedIds.has(q.id) && q.status !== 'archived').map((q) => q.id),
    [items, selectedIds],
  );

  type BulkOp = 'publish' | 'archive' | 'delete';
  const batchQrOp = useCallback(
    async (
      ids: string[],
      options?: Record<string, unknown>,
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const op = options?.op as BulkOp | undefined;
      if (!op) return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: 'op missing' })) } };
      const fn = op === 'publish' ? publishOperatorQrTemplate : op === 'archive' ? archiveOperatorQrTemplate : deleteOperatorQrTemplate;
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
      const result = await batch.executeBatch(batchQrOp, ids, { op });
      if (result.successCount > 0) { setSelectedIds(new Set()); await loadData(); }
    },
    [batch, batchQrOp, loadData],
  );

  const columns: ListColumnDef<OperatorQrTemplate>[] = useMemo(() => [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (q) => q.title,
      render: (_v, q) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
            {q.targetType === 'url' ? <LinkIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{q.title}</span>
        </div>
      ),
    },
    {
      key: 'targetType',
      header: '대상 종류',
      width: '90px',
      render: (_v, q) => (
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-slate-50 border-slate-200 text-slate-600">
          {q.targetType === 'url' ? 'URL' : '콘텐츠'}
        </span>
      ),
    },
    {
      key: 'target',
      header: '대상',
      render: (_v, q) => <span className="text-xs text-slate-500 truncate">{formatTarget(q)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (_v, q) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE_CLASS[q.status]}`}>
          {STATUS_LABEL[q.status]}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: '수정일',
      width: '100px',
      sortable: true,
      sortAccessor: (q) => new Date(q.updatedAt).getTime(),
      render: (_v, q) => <span className="text-xs text-slate-500">{new Date(q.updatedAt).toLocaleDateString('ko-KR')}</span>,
    },
    {
      key: 'publishedAt',
      header: '발행일',
      width: '100px',
      sortable: true,
      sortAccessor: (q) => (q.publishedAt ? new Date(q.publishedAt).getTime() : 0),
      render: (_v, q) => <span className="text-xs text-slate-500">{q.publishedAt ? new Date(q.publishedAt).toLocaleDateString('ko-KR') : '-'}</span>,
    },
    {
      key: '_actions',
      header: '액션',
      width: '60px',
      align: 'center',
      system: true,
      render: (_v, q) => (
        <RowActionMenu
          actions={buildRowActions(qrActionPolicy, q, {
            edit: () => navigate(`/operator/qr/${q.id}/edit`),
            publish: () => handlePublish(q),
            archive: () => handleArchive(q),
            delete: () => handleDelete(q),
          }, {
            icons: QR_ACTION_ICONS,
            loading: actionLoading === q.id ? { edit: true, publish: true, archive: true, delete: true } : undefined,
          })}
          inlineMax={qrActionPolicy.inlineMax}
        />
      ),
    },
  ], [navigate, handlePublish, handleArchive, handleDelete, actionLoading]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6 pb-5 border-b-2 border-slate-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">매장 HUB QR</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            운영자가 K-Cosmetics 매장 HUB 에 게시할 QR 템플릿을 작성·관리합니다.
            실제 QR-code 는 매장 경영자가 가져갈 때 매장별로 발급됩니다.
          </p>
        </div>
        <button
          onClick={() => navigate('/operator/qr/new')}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 shrink-0"
        >
          <Plus className="w-4 h-4" />새 QR 템플릿
        </button>
      </header>

      <div className="flex gap-2 mb-4">
        {(['', 'draft', 'published', 'archived'] as StatusFilter[]).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              statusFilter === s ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {s === '' ? '전체' : STATUS_LABEL[s as OperatorQrTemplate['status']]}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-center py-16 text-red-600 text-sm">
          <p>{error}</p>
          <button onClick={() => loadData()} className="mt-3 px-4 py-1.5 text-xs text-pink-600 border border-pink-400 rounded-lg hover:bg-pink-50">다시 시도</button>
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
                  onClick: () => runBulk(selectedDraftOrArchivedIds, 'publish'),
                  variant: 'primary' as const,
                  icon: <Send className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  visible: selectedDraftOrArchivedIds.length > 0,
                  tooltip: '선택한 초안/보관 QR 템플릿을 일괄 발행합니다',
                },
                {
                  key: 'bulk-archive',
                  label: `일괄 보관 (${selectedNotArchivedIds.length})`,
                  onClick: () => runBulk(selectedNotArchivedIds, 'archive', { confirm: `선택한 ${selectedNotArchivedIds.length}개 QR 템플릿을 보관하시겠습니까?` }),
                  variant: 'default' as const,
                  icon: <Archive className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  visible: selectedNotArchivedIds.length > 0,
                  tooltip: '선택한 QR 템플릿을 일괄 보관',
                },
                {
                  key: 'bulk-delete',
                  label: `일괄 삭제 (${selectedIds.size})`,
                  onClick: () => runBulk(
                    items.filter((q) => selectedIds.has(q.id)).map((q) => q.id),
                    'delete',
                    { confirm: `선택한 ${selectedIds.size}개 QR 템플릿을 삭제하시겠습니까? 되돌릴 수 없습니다.` },
                  ),
                  variant: 'danger' as const,
                  icon: <Trash2 className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  visible: selectedIds.size > 0,
                  tooltip: '선택한 QR 템플릿을 일괄 삭제 (되돌릴 수 없음)',
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

          <DataTable<OperatorQrTemplate>
            columns={columns}
            data={items}
            rowKey="id"
            loading={isLoading}
            emptyMessage={statusFilter ? '해당 상태의 QR 템플릿이 없습니다' : '아직 작성한 QR 템플릿이 없습니다'}
            tableId="kcos-operator-qr-list"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50">이전</button>
              <span className="text-sm text-slate-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50">다음</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
