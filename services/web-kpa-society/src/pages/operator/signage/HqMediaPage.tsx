/**
 * HQ Media Management Page — Signage Console (KPA Society)
 * WO-O4O-SIGNAGE-CONSOLE-V1
 * WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1: 검색바 추가 + DataTable 전환
 *
 * Operator creates & manages HQ signage media.
 * API: /api/signage/kpa-society/hq/*
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../../contexts/AuthContext';
import { Film, RefreshCw, Plus, ChevronRight, Sparkles, Trash2, Search } from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';
import AiContentGenerationModal from './AiContentGenerationModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';

interface MediaItem {
  id: string;
  name: string;
  mediaType: string;
  sourceType: string;
  sourceUrl: string;
  status: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

const mediaTypeLabel: Record<string, string> = {
  video: '동영상', image: '이미지', html: 'HTML', text: '텍스트', rich_text: '리치 텍스트', link: '링크',
};

const sourceTypeLabel: Record<string, string> = {
  upload: '업로드', url: 'URL', embed: '임베드', youtube: 'YouTube', vimeo: 'Vimeo', cms: 'CMS',
};

const statusConfig: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { text: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

export default function HqMediaPage() {
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // Create form
  const [formName, setFormName] = useState('');
  const [formMediaType, setFormMediaType] = useState('video');
  const [formSourceType, setFormSourceType] = useState('url');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${SERVICE_KEY}/media?source=hq`);
      setMedia(data.data || data.media || []);
    } catch (err: any) {
      setError(err?.message || 'HQ 미디어를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleCreate = async () => {
    if (!formName.trim() || !formSourceUrl.trim()) return;
    setIsCreating(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          mediaType: formMediaType,
          sourceType: formSourceType,
          sourceUrl: formSourceUrl.trim(),
        }),
      });
      setFormName(''); setFormSourceUrl(''); setShowForm(false);
      fetchMedia();
    } catch (err: any) {
      setError(err?.message || '미디어 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchMedia();
    } catch (err: any) {
      setError(err?.message || '삭제에 실패했습니다');
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return '-'; }
  };

  const stats = {
    total: media.length,
    active: media.filter(m => m.status === 'active').length,
    pending: media.filter(m => m.status === 'pending').length,
    archived: media.filter(m => m.status === 'archived').length,
  };

  const filteredMedia = useMemo(() => {
    if (!searchKeyword.trim()) return media;
    const kw = searchKeyword.toLowerCase();
    return media.filter(m =>
      m.name.toLowerCase().includes(kw) ||
      (mediaTypeLabel[m.mediaType] || m.mediaType).toLowerCase().includes(kw)
    );
  }, [media, searchKeyword]);

  const columns: Column<MediaItem>[] = [
    {
      key: 'name',
      title: '이름',
      dataIndex: 'name',
      render: (value) => <span className="font-medium text-slate-800 text-sm">{value}</span>,
    },
    {
      key: 'mediaType',
      title: '타입',
      dataIndex: 'mediaType',
      render: (value) => <span className="text-sm text-slate-600">{mediaTypeLabel[value] || value}</span>,
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
      dataIndex: 'status',
      align: 'center',
      render: (value) => {
        const sc = statusConfig[value] || { text: value, cls: 'bg-slate-100 text-slate-600' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>;
      },
    },
    {
      key: 'createdAt',
      title: '생성일',
      dataIndex: 'createdAt',
      render: (value) => <span className="text-sm text-slate-500">{formatDate(value)}</span>,
    },
    {
      key: 'actions',
      title: '',
      width: '60px',
      align: 'right',
      render: (_value, record) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: record.id, name: record.name }); }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="완전 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronRight className="w-4 h-4 text-slate-300" />
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
            <Film className="w-6 h-6 text-blue-600" /> HQ 미디어 관리
          </h1>
          <p className="text-slate-500 text-sm mt-1">운영자 제공 사이니지 미디어 콘텐츠</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAiModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
            <Sparkles className="w-4 h-4" /> AI 초안 생성
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> 새 미디어
          </button>
          <button onClick={fetchMedia} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체', value: stats.total, color: 'text-slate-800' },
          { label: '활성', value: stats.active, color: 'text-green-600' },
          { label: '대기', value: stats.pending, color: 'text-amber-600' },
          { label: '아카이브', value: stats.archived, color: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-blue-100">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">새 HQ 미디어</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">제목 *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="미디어 제목" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">미디어 타입</label>
              <select value={formMediaType} onChange={e => setFormMediaType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="video">동영상</option>
                <option value="image">이미지</option>
                <option value="html">HTML</option>
                <option value="text">텍스트</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">소스 타입</label>
              <select value={formSourceType} onChange={e => setFormSourceType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="url">URL</option>
                <option value="upload">업로드</option>
                <option value="embed">임베드</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">소스 URL *</label>
              <input type="text" value={formSourceUrl} onChange={e => setFormSourceUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">취소</button>
            <button onClick={handleCreate} disabled={isCreating || !formName.trim() || !formSourceUrl.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{isCreating ? '생성 중...' : '생성'}</button>
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
          placeholder="미디어 이름 또는 타입으로 검색..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <DataTable<MediaItem>
        columns={columns}
        dataSource={filteredMedia}
        rowKey="id"
        loading={isLoading}
        onRowClick={record => navigate(`/operator/signage/hq-media/${record.id}`)}
        emptyText="HQ 미디어가 없습니다"
      />

      {showAiModal && (
        <AiContentGenerationModal
          open={showAiModal}
          onClose={() => setShowAiModal(false)}
          onSaved={() => { setShowAiModal(false); fetchMedia(); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">미디어 완전 삭제</h3>
            <p className="text-sm text-slate-500 mb-4">이 작업은 되돌릴 수 없습니다.</p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium text-slate-700">{deleteConfirm.name}</p>
              <p className="text-slate-400 text-xs mt-1">타입: HQ 미디어 · 삭제 시 연결된 플레이리스트 항목도 함께 제거됩니다</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">취소</button>
              <button onClick={handleDeleteConfirmed} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? '삭제 중...' : '완전 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
