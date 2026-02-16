/**
 * ContentManagementPage - KPA-a 콘텐츠 CMS (공지/뉴스)
 * WO-KPA-A-CONTENT-CMS-PHASE1-V1
 *
 * API:
 *   GET    /api/v1/kpa/news/admin/list
 *   POST   /api/v1/kpa/news
 *   PUT    /api/v1/kpa/news/:id
 *   DELETE /api/v1/kpa/news/:id
 */

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { getAccessToken } from '../../contexts/AuthContext';
import { assetSnapshotApi } from '../../api/assetSnapshot';

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

const typeConfig: Record<ContentType, { label: string }> = {
  notice: { label: '공지' },
  news: { label: '뉴스' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// ─── Component ───────────────────────────────────────────────

type TabKey = 'notice' | 'news';

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('notice');
  const [showEditor, setShowEditor] = useState(false);
  const [editTarget, setEditTarget] = useState<CmsContent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
      <div className="border-b border-slate-200 mb-6">
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
            공지
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

      {/* Content List */}
      <ContentList
        type={activeTab}
        refreshKey={refreshKey}
        onEdit={handleEdit}
        onDeleted={() => setRefreshKey(k => k + 1)}
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
}: {
  type: ContentType;
  refreshKey: number;
  onEdit: (item: CmsContent) => void;
  onDeleted: () => void;
}) {
  const [items, setItems] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type, page: String(page), limit: String(limit) });
      if (statusFilter) params.set('status', statusFilter);
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
  }, [type, page, statusFilter, refreshKey]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [type]);

  async function handleStatusToggle(item: CmsContent) {
    const newStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    const label = newStatus === 'published' ? '게시' : '임시저장';
    if (!confirm(`"${item.title}"을(를) ${label} 상태로 변경하시겠습니까?`)) return;
    setActionLoading(item.id);
    try {
      await apiFetch(`/api/v1/kpa/news/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchItems();
    } catch (e: any) {
      alert(`상태 변경 실패: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(item: CmsContent) {
    if (!confirm(`"${item.title}"을(를) 삭제(보관)하시겠습니까?`)) return;
    setActionLoading(item.id);
    try {
      await apiFetch(`/api/v1/kpa/news/${item.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCopyToStore(item: CmsContent) {
    if (!confirm(`"${item.title}"을(를) 매장으로 복사하시겠습니까?`)) return;
    setActionLoading(item.id);
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: item.id,
        assetType: 'cms',
      });
      alert('매장으로 복사되었습니다.');
    } catch (e: any) {
      if (e.message?.includes('DUPLICATE') || e.message?.includes('already')) {
        alert('이미 매장에 복사된 콘텐츠입니다.');
      } else {
        alert(`복사 실패: ${e.message}`);
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        콘텐츠 목록을 불러오는 중...
      </div>
    );
  }

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
      <div className="flex items-center gap-3 mb-4">
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
        <button onClick={fetchItems} className="text-sm text-slate-500 hover:text-slate-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="px-4 py-3 font-medium w-20">상태</th>
              <th className="px-4 py-3 font-medium w-28">작성일</th>
              <th className="px-4 py-3 font-medium w-28">게시일</th>
              <th className="px-4 py-3 font-medium w-32">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  {typeConfig[type].label} 콘텐츠가 없습니다.
                </td>
              </tr>
            ) : (
              items.map(item => {
                const sc = statusConfig[item.status];
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 truncate max-w-md">{item.title}</div>
                      {item.summary && (
                        <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">{item.summary}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(item.publishedAt)}</td>
                    <td className="px-4 py-3">
                      {actionLoading === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : item.status !== 'archived' ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCopyToStore(item)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="매장으로 복사"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(item)}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                            title={item.status === 'published' ? '비공개' : '게시'}
                          >
                            {item.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">보관됨</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
          body: JSON.stringify({ title, summary, content: body, status }),
        });
      } else {
        await apiFetch('/api/v1/kpa/news', {
          method: 'POST',
          body: JSON.stringify({ title, summary, content: body, type, status }),
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
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="콘텐츠 내용을 입력하세요"
              rows={10}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
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
