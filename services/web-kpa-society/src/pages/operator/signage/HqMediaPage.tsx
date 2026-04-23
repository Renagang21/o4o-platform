/**
 * HQ Media Management Page — Signage Console (KPA Society)
 * WO-O4O-SIGNAGE-CONSOLE-V1
 * WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1: 검색바 추가 + DataTable 전환
 * WO-O4O-SIGNAGE-TABLE-STANDARD-V1: O4O 표준 테이블 (체크 선택 + bulk delete + RowActionMenu)
 *
 * Operator creates & manages HQ signage media.
 * API: /api/signage/kpa-society/hq/*
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../../contexts/AuthContext';
import { Film, RefreshCw, Plus, Sparkles, Trash2, Search, Eye } from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import AiContentGenerationModal from './AiContentGenerationModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';

const DEFAULT_TAG_SUGGESTIONS = [
  '복약지도', '당뇨', '혈압', '면역', '건강기능식품',
  '의약외품', '이벤트', '프로모션', '신제품', '추천상품',
];

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

const mediaActionPolicy = defineActionPolicy<MediaItem>('kpa:signage:hq-media', {
  rules: [
    {
      key: 'view',
      label: '상세 보기',
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      divider: true,
      confirm: (row) => ({
        title: '미디어 완전 삭제',
        message: `"${row.name}"\n\n삭제 시 연결된 플레이리스트 항목도 함께 제거됩니다.\n이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger' as const,
        confirmText: '완전 삭제',
      }),
    },
  ],
});

const MEDIA_ACTION_ICONS: Record<string, React.ReactNode> = {
  view: <Eye className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

export default function HqMediaPage() {
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // Create form
  const [formName, setFormName] = useState('');
  const [formMediaType, setFormMediaType] = useState('video');
  const [formSourceType, setFormSourceType] = useState('url');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState('');

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

  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || formTags.includes(tag)) return;
    setFormTags(prev => [...prev, tag]);
  };

  const removeTag = (tag: string) => {
    setFormTags(prev => prev.filter(t => t !== tag));
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formSourceUrl.trim()) return;
    if (formTags.length === 0) {
      setError('태그를 최소 1개 이상 입력해주세요');
      return;
    }
    setIsCreating(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          mediaType: formMediaType,
          sourceType: formSourceType,
          sourceUrl: formSourceUrl.trim(),
          tags: formTags,
        }),
      });
      setFormName(''); setFormSourceUrl(''); setShowForm(false);
      setFormTags([]);
      setFormTagInput('');
      fetchMedia();
    } catch (err: any) {
      setError(err?.message || '미디어 등록에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteOne = useCallback(async (id: string) => {
    await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media/${id}`, { method: 'DELETE' });
  }, [apiFetch]);

  const handleBulkDelete = async () => {
    const targetIds = [...selectedIds];
    await batch.executeBatch(
      async (ids) => {
        const results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> = [];
        for (const id of ids) {
          try {
            await deleteOne(id);
            results.push({ id, status: 'success' });
          } catch (err: any) {
            results.push({ id, status: 'failed', error: err?.message || '삭제 실패' });
          }
        }
        return { data: { results } };
      },
      targetIds,
    );
    setSelectedIds(new Set());
    fetchMedia();
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

  const columns: ListColumnDef<MediaItem>[] = [
    {
      key: 'name',
      header: '이름',
      render: (value) => <span className="font-medium text-slate-800 text-sm">{value}</span>,
    },
    {
      key: 'mediaType',
      header: '타입',
      render: (value) => <span className="text-sm text-slate-600">{mediaTypeLabel[value] || value}</span>,
    },
    {
      key: 'sourceType',
      header: '소스',
      render: (value) => <span className="text-sm text-slate-600">{sourceTypeLabel[value] || value}</span>,
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (value) => {
        const sc = statusConfig[value] || { text: value, cls: 'bg-slate-100 text-slate-600' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>;
      },
    },
    {
      key: 'createdAt',
      header: '생성일',
      render: (value) => <span className="text-sm text-slate-500">{formatDate(value)}</span>,
    },
    {
      key: '_actions',
      header: '액션',
      align: 'center',
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(mediaActionPolicy, row, {
            view: () => navigate(`/operator/signage/hq-media/${row.id}`),
            delete: () => deleteOne(row.id).then(fetchMedia).catch((err: any) => setError(err?.message || '삭제 실패')),
          }, { icons: MEDIA_ACTION_ICONS })}
        />
      ),
    },
  ];

  const bulkActions = [
    {
      key: 'delete',
      label: `삭제 (${selectedIds.size})`,
      onClick: handleBulkDelete,
      variant: 'danger' as const,
      icon: <Trash2 size={14} />,
      loading: batch.loading,
      group: 'danger',
      tooltip: '선택된 미디어를 일괄 삭제합니다',
      visible: selectedIds.size > 0,
      confirm: {
        title: '일괄 삭제 확인',
        message: `${selectedIds.size}개의 미디어를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger' as const,
        confirmText: '삭제',
      },
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4">새 미디어 등록</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">제목 *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="동영상 제목을 입력하세요" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">동영상 URL *</label>
              <input type="text" value={formSourceUrl} onChange={e => setFormSourceUrl(e.target.value)} placeholder="YouTube 또는 Vimeo URL" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">소스 타입</label>
              <select value={formSourceType} onChange={e => setFormSourceType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="url">URL</option>
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
              </select>
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
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">태그 * (최소 1개)</label>
              <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
                {formTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-blue-900">×</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={formTagInput}
                onChange={(e) => setFormTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(formTagInput);
                    setFormTagInput('');
                  }
                }}
                placeholder="태그 입력 후 Enter 또는 쉼표"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {DEFAULT_TAG_SUGGESTIONS.filter(t => !formTags.includes(t)).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">취소</button>
            <button onClick={handleCreate} disabled={isCreating || !formName.trim() || !formSourceUrl.trim() || formTags.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{isCreating ? '등록 중...' : '등록'}</button>
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

      {/* Bulk Action Bar */}
      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={bulkActions}
      />

      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); fetchMedia(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />

      {/* Table */}
      <DataTable<MediaItem>
        columns={columns}
        data={filteredMedia}
        rowKey="id"
        loading={isLoading}
        onRowClick={record => navigate(`/operator/signage/hq-media/${record.id}`)}
        emptyMessage="HQ 미디어가 없습니다"
        tableId="kpa-hq-media"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {showAiModal && (
        <AiContentGenerationModal
          open={showAiModal}
          onClose={() => setShowAiModal(false)}
          onSaved={() => { setShowAiModal(false); fetchMedia(); }}
        />
      )}
    </div>
  );
}
