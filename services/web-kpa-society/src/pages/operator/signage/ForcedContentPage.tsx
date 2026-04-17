/**
 * Forced Content Management Page — Signage Console (KPA Society)
 * WO-KPA-SIGNAGE-FORCED-CONTENT-IMPLEMENTATION-V1
 *
 * Operator creates forced content that is automatically injected
 * into ALL store playlists during the specified period.
 * API: /api/signage/kpa-society/hq/forced-content
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAccessToken } from '../../../contexts/AuthContext';
import { Shield, RefreshCw, Plus, Trash2, Search, Edit2, X, Check } from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';

interface ForcedContentItem {
  id: string;
  title: string;
  videoUrl: string;
  sourceType: 'youtube' | 'vimeo';
  embedId: string;
  thumbnailUrl: string | null;
  startAt: string;
  endAt: string;
  isActive: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const sourceTypeLabel: Record<string, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
};

const statusBadge = (item: ForcedContentItem) => {
  const now = new Date();
  const start = new Date(item.startAt);
  const end = new Date(item.endAt);

  if (!item.isActive) return { text: '비활성', cls: 'bg-slate-100 text-slate-500' };
  if (now < start) return { text: '예약', cls: 'bg-blue-100 text-blue-700' };
  if (now > end) return { text: '만료', cls: 'bg-slate-100 text-slate-400' };
  return { text: '적용 중', cls: 'bg-green-100 text-green-700' };
};

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '-'; }
};

export default function ForcedContentPage() {
  const [items, setItems] = useState<ForcedContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formStartAt, setFormStartAt] = useState('');
  const [formEndAt, setFormEndAt] = useState('');
  const [formNote, setFormNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${SERVICE_KEY}/hq/forced-content`);
      setItems(data.data || []);
    } catch (err: any) {
      setError(err?.message || '강제 콘텐츠를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setFormTitle('');
    setFormVideoUrl('');
    setFormThumbnailUrl('');
    setFormStartAt('');
    setFormEndAt('');
    setFormNote('');
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item: ForcedContentItem) => {
    setFormTitle(item.title);
    setFormVideoUrl(item.videoUrl);
    setFormThumbnailUrl(item.thumbnailUrl || '');
    // Convert ISO to datetime-local format
    setFormStartAt(item.startAt.slice(0, 16));
    setFormEndAt(item.endAt.slice(0, 16));
    setFormNote(item.note || '');
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formVideoUrl.trim() || !formStartAt || !formEndAt) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const body = {
        title: formTitle.trim(),
        videoUrl: formVideoUrl.trim(),
        thumbnailUrl: formThumbnailUrl.trim() || undefined,
        startAt: new Date(formStartAt).toISOString(),
        endAt: new Date(formEndAt).toISOString(),
        note: formNote.trim() || undefined,
      };

      if (editingId) {
        await apiFetch(`/api/signage/${SERVICE_KEY}/hq/forced-content/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch(`/api/signage/${SERVICE_KEY}/hq/forced-content`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }

      resetForm();
      setShowForm(false);
      fetchItems();
    } catch (err: any) {
      setError(err?.message || '저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: ForcedContentItem) => {
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/forced-content/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      fetchItems();
    } catch (err: any) {
      setError(err?.message || '상태 변경에 실패했습니다');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/forced-content/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchItems();
    } catch (err: any) {
      setError(err?.message || '삭제에 실패했습니다');
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchKeyword.trim()) return items;
    const kw = searchKeyword.toLowerCase();
    return items.filter(i =>
      i.title.toLowerCase().includes(kw) ||
      (i.note || '').toLowerCase().includes(kw)
    );
  }, [items, searchKeyword]);

  const stats = {
    total: items.length,
    active: items.filter(i => {
      const now = new Date();
      return i.isActive && now >= new Date(i.startAt) && now <= new Date(i.endAt);
    }).length,
    scheduled: items.filter(i => i.isActive && new Date() < new Date(i.startAt)).length,
    expired: items.filter(i => new Date() > new Date(i.endAt)).length,
  };

  const columns: Column<ForcedContentItem>[] = [
    {
      key: 'title',
      title: '제목',
      dataIndex: 'title',
      render: (value) => <span className="font-medium text-slate-800 text-sm">{value}</span>,
    },
    {
      key: 'sourceType',
      title: '소스',
      dataIndex: 'sourceType',
      render: (value) => <span className="text-sm text-slate-600">{sourceTypeLabel[value] || value}</span>,
    },
    {
      key: 'status',
      title: '상태',
      align: 'center',
      render: (_value, record) => {
        const badge = statusBadge(record);
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.text}</span>;
      },
    },
    {
      key: 'period',
      title: '적용 기간',
      render: (_value, record) => (
        <div className="text-xs text-slate-500">
          <div>{fmtDate(record.startAt)}</div>
          <div>~ {fmtDate(record.endAt)}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      title: '',
      width: '100px',
      align: 'right',
      render: (_value, record) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={e => { e.stopPropagation(); handleToggleActive(record); }}
            className={`p-1.5 rounded transition-colors ${record.isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-50'}`}
            title={record.isActive ? '비활성화' : '활성화'}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); openEditForm(record); }}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="수정"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: record.id, title: record.title }); }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" /> 강제 콘텐츠 관리
          </h1>
          <p className="text-slate-500 text-sm mt-1">전체 약국 플레이리스트에 자동 삽입되는 강제 콘텐츠</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreateForm} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> 새 강제 콘텐츠
          </button>
          <button onClick={fetchItems} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
        <strong>강제 콘텐츠란?</strong> 운영자가 지정한 기간 동안 모든 약국의 플레이리스트에 자동으로 삽입되는 콘텐츠입니다.
        약국은 순서를 변경할 수 있지만 삭제할 수 없습니다.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체', value: stats.total, color: 'text-slate-800' },
          { label: '적용 중', value: stats.active, color: 'text-green-600' },
          { label: '예약됨', value: stats.scheduled, color: 'text-blue-600' },
          { label: '만료됨', value: stats.expired, color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-red-100">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {editingId ? '강제 콘텐츠 수정' : '새 강제 콘텐츠'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">제목 *</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="예: 독감 예방접종 안내"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">YouTube / Vimeo URL *</label>
              <input
                type="text"
                value={formVideoUrl}
                onChange={e => setFormVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">썸네일 URL (선택)</label>
              <input
                type="text"
                value={formThumbnailUrl}
                onChange={e => setFormThumbnailUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">시작 일시 *</label>
              <input
                type="datetime-local"
                value={formStartAt}
                onChange={e => setFormStartAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">종료 일시 *</label>
              <input
                type="datetime-local"
                value={formEndAt}
                onChange={e => setFormEndAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">메모 (선택)</label>
              <input
                type="text"
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
                placeholder="운영자 내부 메모"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formTitle.trim() || !formVideoUrl.trim() || !formStartAt || !formEndAt}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : (editingId ? '수정' : '등록')}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          placeholder="제목 또는 메모로 검색..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Table */}
      <DataTable<ForcedContentItem>
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={isLoading}
        emptyText="등록된 강제 콘텐츠가 없습니다"
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">강제 콘텐츠 삭제</h3>
            <p className="text-sm text-slate-500 mb-4">삭제 후 즉시 모든 매장 플레이리스트에서 제거됩니다.</p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium text-slate-700">{deleteConfirm.title}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">취소</button>
              <button onClick={handleDeleteConfirmed} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
