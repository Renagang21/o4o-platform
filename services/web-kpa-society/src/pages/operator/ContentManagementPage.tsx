/**
 * ContentManagementPage - KPA-a 콘텐츠 CMS (공지/뉴스)
 * WO-KPA-A-CONTENT-CMS-PHASE1-V1
 * WO-KPA-A-HUB-TO-STORE-CLONE-FLOW-V2: 매장 복사 후 자동 이동
 *
 * API:
 *   GET    /api/v1/kpa/news/admin/list
 *   POST   /api/v1/kpa/news
 *   PUT    /api/v1/kpa/news/:id
 *   DELETE /api/v1/kpa/news/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import {
  FileText,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  Copy,
  Star,
  Search,
  Archive,
} from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { getAccessToken } from '../../contexts/AuthContext';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { RichTextEditor } from '@o4o/content-editor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ─── Types ───────────────────────────────────────────────────

type ContentType = 'notice' | 'news';
type ContentStatus = 'draft' | 'published' | 'archived';

interface CmsContent {
  id: string;
  serviceKey: string;
  type: ContentType;
  title: string;
  summary: string | null;
  body: string | null;
  status: ContentStatus;
  isOperatorPicked?: boolean;
  publishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `API error ${res.status}`);
  }
  return res.json();
}

const statusConfig: Record<ContentStatus, { label: string; color: string; bg: string }> = {
  draft: { label: '임시저장', color: 'text-slate-600', bg: 'bg-slate-100' },
  published: { label: '게시', color: 'text-green-700', bg: 'bg-green-50' },
  archived: { label: '보관', color: 'text-red-700', bg: 'bg-red-50' },
};

const typeConfig: Record<ContentType, { label: string; desc: string }> = {
  notice: { label: '공지', desc: '운영 안내, 필독 사항, 공식 알림 — 홈 공지 영역에 표시' },
  news: { label: '뉴스', desc: '소식, 동향, 일반 안내 — 콘텐츠 허브에 표시' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// ─── V4: Action Policy ───────────────────────────────────────

const contentActionPolicy = defineActionPolicy<CmsContent>('kpa:content', {
  rules: [
    {
      key: 'unpublish',
      label: '비공개',
      visible: (row) => row.status === 'published',
      confirm: (row) => ({
        title: '상태 변경',
        message: `"${row.title}"을(를) 비공개 상태로 변경하시겠습니까?`,
        confirmText: '비공개 전환',
      }),
    },
    {
      key: 'publish',
      label: '게시',
      visible: (row) => row.status === 'draft',
      confirm: (row) => ({
        title: '상태 변경',
        message: `"${row.title}"을(를) 게시하시겠습니까?`,
        confirmText: '게시',
      }),
    },
    {
      key: 'edit',
      label: '수정',
      variant: 'primary',
      visible: (row) => row.status !== 'archived',
    },
    {
      key: 'copy',
      label: '매장으로 복사',
      visible: (row) => row.status !== 'archived',
      confirm: (row) => ({
        title: '매장 복사',
        message: `"${row.title}"을(를) 매장으로 복사하시겠습니까?`,
        confirmText: '복사',
      }),
    },
    {
      key: 'archive',
      label: '보관',
      variant: 'danger',
      divider: true,
      visible: (row) => row.status !== 'archived',
      confirm: (row) => ({
        title: '보관 확인',
        message: `"${row.title}"을(를) 보관 처리하시겠습니까?\n보관된 콘텐츠는 이후 완전 삭제할 수 있습니다.`,
        variant: 'danger',
        confirmText: '보관',
      }),
    },
    {
      key: 'hard-delete',
      label: '완전 삭제',
      variant: 'danger',
      visible: (row) => row.status === 'archived',
      confirm: (row) => ({
        title: '완전 삭제',
        message: `"${row.title}"\n\n보관된 콘텐츠를 완전 삭제합니다.\n이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger',
        confirmText: '완전 삭제',
      }),
    },
  ],
});

const CONTENT_ACTION_ICONS: Record<string, React.ReactNode> = {
  unpublish: <EyeOff className="w-4 h-4" />,
  publish: <Eye className="w-4 h-4" />,
  edit: <Pencil className="w-4 h-4" />,
  copy: <Copy className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
  'hard-delete': <Trash2 className="w-4 h-4" />,
};

// ─── Component ───────────────────────────────────────────────

type TabKey = 'notice' | 'news';

export default function ContentManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('notice');
  const [showEditor, setShowEditor] = useState(false);
  const [editTarget, setEditTarget] = useState<CmsContent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  function handleCreate() {
    setEditTarget(null);
    setShowEditor(true);
  }

  function handleEdit(item: CmsContent) {
    setEditTarget(item);
    setShowEditor(true);
  }

  function handleSaved() {
    setShowEditor(false);
    setEditTarget(null);
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Copy toast */}
      {copyToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg px-4 py-3 shadow-lg text-sm text-green-700">
          {copyToast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">콘텐츠 관리</h1>
          <p className="text-sm text-slate-500 mt-1">공지사항 및 뉴스 콘텐츠 생성/수정/관리</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 콘텐츠
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-2">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('notice')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notice'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Megaphone className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            공지사항
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'news'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            뉴스
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">{typeConfig[activeTab].desc}</p>

      {/* Content List */}
      <ContentList
        type={activeTab}
        refreshKey={refreshKey}
        onEdit={handleEdit}
        onDeleted={() => setRefreshKey(k => k + 1)}
        onCopyToast={setCopyToast}
        navigate={navigate}
      />

      {/* Editor Modal */}
      {showEditor && (
        <ContentEditor
          type={activeTab}
          editTarget={editTarget}
          onClose={() => { setShowEditor(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ─── Content List ────────────────────────────────────────────

function ContentList({
  type,
  refreshKey,
  onEdit,
  onDeleted,
  onCopyToast,
  navigate,
}: {
  type: ContentType;
  refreshKey: number;
  onEdit: (item: CmsContent) => void;
  onDeleted: () => void;
  onCopyToast: (msg: string | null) => void;
  navigate: (path: string) => void;
}) {
  const [items, setItems] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pickedOnly, setPickedOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();
  const limit = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type, page: String(page), limit: String(limit) });
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (pickedOnly) params.set('picked', 'true');
      const res = await apiFetch<{ data: CmsContent[]; total: number; totalPages: number }>(
        `/api/v1/kpa/news/admin/list?${params}`,
      );
      setItems(res.data);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [type, page, statusFilter, searchQuery, pickedOnly, refreshKey]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); setSearchQuery(''); setSearchInput(''); setSelectedIds(new Set()); }, [type]);
  useEffect(() => { setSelectedIds(new Set()); }, [statusFilter, searchQuery, pickedOnly]);

  async function handleStatusToggle(item: CmsContent) {
    const newStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    setActionLoading(item.id);
    try {
      await apiFetch(`/api/v1/kpa/news/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchItems();
    } catch (e: any) {
      toast.error(e.message || '상태 변경에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(item: CmsContent) {
    setActionLoading(item.id);
    try {
      await apiFetch(`/api/v1/kpa/news/${item.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e: any) {
      toast.error(e.message || '보관 처리에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleHardDelete(item: CmsContent) {
    setActionLoading(item.id);
    try {
      await apiFetch(`/api/v1/kpa/news/${item.id}/hard`, { method: 'DELETE' });
      toast.success('콘텐츠가 완전 삭제되었습니다.');
      onDeleted();
    } catch (e: any) {
      toast.error(e.message || '완전 삭제에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCopyToStore(item: CmsContent) {
    setActionLoading(item.id);
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: item.id,
        assetType: 'cms',
      });
      onCopyToast(`"${item.title}" — 매장에 추가되었습니다.`);
      setTimeout(() => {
        onCopyToast(null);
        navigate('/store/content?tab=cms');
      }, 1500);
    } catch (e: any) {
      if (e.message?.includes('DUPLICATE') || e.message?.includes('already')) {
        onCopyToast('이미 매장에 복사된 콘텐츠입니다.');
        setTimeout(() => onCopyToast(null), 3000);
      } else {
        onCopyToast(`복사 실패: ${e.message}`);
        setTimeout(() => onCopyToast(null), 3000);
      }
    } finally {
      setActionLoading(null);
    }
  }

  // ─── V3: Batch Actions ───

  async function handleBulkPublish() {
    const draftIds = [...selectedIds].filter((id) => {
      const item = items.find((i) => i.id === id);
      return item?.status === 'draft';
    });
    if (draftIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => apiFetch(`/api/v1/kpa/news/batch-publish`, {
        method: 'POST',
        body: JSON.stringify({ ids: batchIds }),
      }),
      draftIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      await fetchItems();
    }
  }

  async function handleBulkArchive() {
    const archivableIds = [...selectedIds].filter((id) => {
      const item = items.find((i) => i.id === id);
      return item?.status !== 'archived';
    });
    if (archivableIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => apiFetch(`/api/v1/kpa/news/batch-archive`, {
        method: 'POST',
        body: JSON.stringify({ ids: batchIds }),
      }),
      archivableIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      onDeleted();
    }
  }

  async function handleBulkHardDelete() {
    const archivedIds = [...selectedIds].filter((id) => {
      const item = items.find((i) => i.id === id);
      return item?.status === 'archived';
    });
    if (archivedIds.length === 0) return;
    if (!confirm(`${archivedIds.length}개 보관된 콘텐츠를 완전 삭제합니다. 이 작업은 되돌릴 수 없습니다.`)) return;
    const result = await batch.executeBatch(
      (batchIds) => apiFetch(`/api/v1/kpa/news/batch-hard-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids: batchIds }),
      }),
      archivedIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      onDeleted();
    }
  }

  // ─── Bulk action counts ───

  const selectedDraftCount = [...selectedIds].filter((id) => {
    const item = items.find((i) => i.id === id);
    return item?.status === 'draft';
  }).length;

  const selectedArchivableCount = [...selectedIds].filter((id) => {
    const item = items.find((i) => i.id === id);
    return item?.status !== 'archived';
  }).length;

  const selectedArchivedCount = [...selectedIds].filter((id) => {
    const item = items.find((i) => i.id === id);
    return item?.status === 'archived';
  }).length;

  // ─── Column Definitions ───

  const contentColumns: ListColumnDef<CmsContent>[] = [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      render: (_v, row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-900 truncate max-w-md">{row.title}</span>
            {row.isOperatorPicked && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 flex-shrink-0">
                <Star className="w-3 h-3" />
                추천
              </span>
            )}
          </div>
          {row.summary && (
            <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">{row.summary}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      sortable: true,
      render: (v) => {
        const sc = statusConfig[v as ContentStatus];
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
            {sc.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: '작성일',
      width: '110px',
      sortable: true,
      sortAccessor: (row) => new Date(row.createdAt).getTime(),
      render: (v) => <span className="text-slate-500">{formatDate(v)}</span>,
    },
    {
      key: 'publishedAt',
      header: '게시일',
      width: '110px',
      sortable: true,
      sortAccessor: (row) => row.publishedAt ? new Date(row.publishedAt).getTime() : 0,
      render: (v) => <span className="text-slate-500">{formatDate(v)}</span>,
    },
    {
      key: '_actions',
      header: '액션',
      width: '60px',
      system: true,
      align: 'center',
      onCellClick: () => {},
      render: (_v, row) => (
        actionLoading === row.id ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : (
          <RowActionMenu
            actions={buildRowActions(contentActionPolicy, row, {
              unpublish: () => handleStatusToggle(row),
              publish: () => handleStatusToggle(row),
              edit: () => onEdit(row),
              copy: () => handleCopyToStore(row),
              archive: () => handleDelete(row),
              'hard-delete': () => handleHardDelete(row),
            }, { icons: CONTENT_ACTION_ICONS })}
          />
        )
      ),
    },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="text-sm">{error}</p>
        <button onClick={fetchItems} className="mt-3 text-sm text-blue-600 hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearchQuery(searchInput); setPage(1); } }}
            placeholder="제목으로 검색"
            className="text-sm border border-slate-300 rounded-md pl-8 pr-3 py-1.5 bg-white w-52 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">전체 상태</option>
          <option value="draft">임시저장</option>
          <option value="published">게시</option>
          <option value="archived">보관</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={pickedOnly}
            onChange={e => { setPickedOnly(e.target.checked); setPage(1); }}
            className="w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
          />
          <Star className="w-3.5 h-3.5 text-amber-500" />
          추천만
        </label>
        <button onClick={fetchItems} className="text-sm text-slate-500 hover:text-slate-700" title="새로고침">
          <RefreshCw className="w-4 h-4" />
        </button>
        {searchQuery && (
          <button
            onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }}
            className="text-xs text-blue-600 hover:underline"
          >
            검색 초기화
          </button>
        )}
      </div>

      {/* V3: ActionBar with batch + BulkResultModal */}
      <div className="mb-3">
        <ActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          actions={[
            {
              key: 'publish',
              label: `게시 (${selectedDraftCount})`,
              onClick: handleBulkPublish,
              variant: 'primary' as const,
              icon: <Eye size={14} />,
              loading: batch.loading,
              group: 'actions',
              tooltip: '선택된 임시저장 콘텐츠를 일괄 게시합니다',
              visible: selectedDraftCount > 0,
            },
            {
              key: 'archive',
              label: `보관 (${selectedArchivableCount})`,
              onClick: handleBulkArchive,
              variant: 'warning' as const,
              icon: <Archive size={14} />,
              loading: batch.loading,
              group: 'actions',
              tooltip: '선택된 콘텐츠를 일괄 보관합니다',
              visible: selectedArchivableCount > 0,
            },
            {
              key: 'hardDelete',
              label: `완전 삭제 (${selectedArchivedCount})`,
              onClick: handleBulkHardDelete,
              variant: 'danger' as const,
              icon: <Trash2 size={14} />,
              loading: batch.loading,
              group: 'danger',
              tooltip: '선택된 보관 콘텐츠를 완전 삭제합니다 (되돌릴 수 없음)',
              visible: selectedArchivedCount > 0,
            },
          ]}
        />
      </div>

      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); fetchItems(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />

      {/* DataTable */}
      <DataTable<CmsContent>
        columns={contentColumns}
        data={items}
        rowKey="id"
        loading={loading}
        emptyMessage={`${typeConfig[type].label} 콘텐츠가 없습니다.`}
        tableId={`kpa-content-${type}`}
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Content Editor (Modal) ──────────────────────────────────

function ContentEditor({
  type,
  editTarget,
  onClose,
  onSaved,
}: {
  type: ContentType;
  editTarget: CmsContent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editTarget;
  const [title, setTitle] = useState(editTarget?.title || '');
  const [summary, setSummary] = useState(editTarget?.summary || '');
  const [body, setBody] = useState(editTarget?.body || '');
  const [status, setStatus] = useState<'draft' | 'published'>(
    editTarget?.status === 'published' ? 'published' : 'draft',
  );
  const [isOperatorPicked, setIsOperatorPicked] = useState(editTarget?.isOperatorPicked ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await apiFetch(`/api/v1/kpa/news/${editTarget.id}`, {
          method: 'PUT',
          body: JSON.stringify({ title, summary, content: body, status, isOperatorPicked }),
        });
      } else {
        await apiFetch('/api/v1/kpa/news', {
          method: 'POST',
          body: JSON.stringify({ title, summary, content: body, type, status, isOperatorPicked }),
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? '콘텐츠 수정' : `새 ${typeConfig[type].label}`}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="콘텐츠 제목을 입력하세요"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">요약</label>
            <input
              type="text"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="짧은 요약 (목록에 표시)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">내용</label>
            <RichTextEditor
              value={body}
              onChange={({ html }) => setBody(html)}
              preset="full"
              minHeight="300px"
              placeholder="콘텐츠 내용을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">상태</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'draft' | 'published')}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="draft">임시저장</option>
              <option value="published">즉시 게시</option>
            </select>
          </div>

          {/* 추천 콘텐츠 토글 */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isOperatorPicked}
                onChange={e => setIsOperatorPicked(e.target.checked)}
                className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-amber-900">홈 추천 콘텐츠로 표시</span>
            </label>
            <p className="text-xs text-amber-700 mt-0.5 ml-6">
              체크하면 홈의 추천 콘텐츠 영역에 우선 노출됩니다. 게시 상태에서만 사용자에게 보입니다.
            </p>
          </div>

          {/* 노출 위치 안내 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600">노출 위치 안내</p>
            {status === 'published' ? (
              <>
                <p>- 콘텐츠 허브 ({typeConfig[type].label} 탭)에 노출됩니다.</p>
                {type === 'notice' && <p>- 홈 공지 영역에 표시될 수 있습니다.</p>}
                {isOperatorPicked && <p>- 홈 추천 콘텐츠 영역에 우선 노출됩니다.</p>}
              </>
            ) : (
              <p>- 임시저장 상태에서는 사용자에게 노출되지 않습니다.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? '수정' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
