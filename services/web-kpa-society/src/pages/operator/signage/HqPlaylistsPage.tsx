/**
 * HQ Playlists Management Page — Signage Console (KPA Society)
 * WO-O4O-SIGNAGE-CONSOLE-V1
 * WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1: 검색바 추가 + DataTable 전환
 * WO-O4O-SIGNAGE-TABLE-STANDARD-V1: O4O 표준 테이블 (체크 선택 + bulk delete + RowActionMenu)
 * WO-O4O-KPA-SIGNAGE-VIDEO-PLAYLIST-MODAL-V1: 인라인 등록 폼 → 모달
 * WO-O4O-KPA-HQ-PLAYLIST-CREATE-ITEMS-V1: 모달 내 URL 목록 입력 + 저장 시 항목 자동 생성
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../../contexts/AuthContext';
import { ListMusic, RefreshCw, Plus, Trash2, Search, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';

const DEFAULT_TAG_SUGGESTIONS = [
  '복약지도', '당뇨', '혈압', '면역', '건강기능식품',
  '의약외품', '이벤트', '프로모션', '신제품', '추천상품',
];

interface PlaylistItem {
  id: string;
  name: string;
  status: string;
  loopEnabled: boolean;
  itemCount: number;
  totalDuration: number;
  transitionType: string;
  createdAt: string;
}

/** URL 입력 행 */
interface UrlEntry {
  id: string; // local key only
  url: string;
  title: string; // 동영상 제목 (media name으로 사용)
}

const statusConfig: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { text: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

const playlistActionPolicy = defineActionPolicy<PlaylistItem>('kpa:signage:hq-playlists', {
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
        title: '플레이리스트 완전 삭제',
        message: `"${row.name}"\n\n삭제 시 모든 재생 항목도 함께 제거됩니다.\n이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger' as const,
        confirmText: '완전 삭제',
      }),
    },
  ],
});

const PLAYLIST_ACTION_ICONS: Record<string, React.ReactNode> = {
  view: <Eye className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

let _urlEntryCounter = 0;
function newUrlEntry(): UrlEntry {
  return { id: `url-${++_urlEntryCounter}`, url: '', title: '' };
}

export default function HqPlaylistsPage() {
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // 기본 플레이리스트 정보
  const [formName, setFormName] = useState('');
  const [formLoop, setFormLoop] = useState(true);
  const [formDuration, setFormDuration] = useState(10);
  const [formTransition, setFormTransition] = useState('fade');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState('');

  // URL 목록
  const [urlEntries, setUrlEntries] = useState<UrlEntry[]>([newUrlEntry()]);
  const [urlInput, setUrlInput] = useState(''); // 새 URL 입력 필드

  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createProgress, setCreateProgress] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormLoop(true);
    setFormDuration(10);
    setFormTransition('fade');
    setFormTags([]);
    setFormTagInput('');
    setUrlEntries([newUrlEntry()]);
    setUrlInput('');
    setFormError(null);
    setCreateProgress('');
  };

  // ESC to close modal
  useEffect(() => {
    if (!showForm) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) { setShowForm(false); resetForm(); }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showForm, isCreating]);

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

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${SERVICE_KEY}/playlists?source=hq`);
      setPlaylists(data.data || data.playlists || []);
    } catch (err: any) {
      setError(err?.message || 'HQ 플레이리스트를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  // ── 태그 ──
  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || formTags.includes(tag)) return;
    setFormTags(prev => [...prev, tag]);
  };
  const removeTag = (tag: string) => setFormTags(prev => prev.filter(t => t !== tag));

  // ── URL 목록 조작 ──
  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlEntries(prev => [...prev, { id: `url-${++_urlEntryCounter}`, url, title: '' }]);
    setUrlInput('');
  };

  const removeUrl = (id: string) => {
    setUrlEntries(prev => prev.filter(e => e.id !== id));
  };

  const moveUrl = (id: string, direction: 'up' | 'down') => {
    setUrlEntries(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx < 0) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const updateUrlEntry = (id: string, field: 'url' | 'title', value: string) => {
    setUrlEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  // ── 저장 ──
  const handleCreate = async () => {
    if (!formName.trim()) { setFormError('플레이리스트 이름을 입력하세요'); return; }
    if (formTags.length === 0) { setFormError('태그를 최소 1개 이상 입력해주세요'); return; }

    const validUrls = urlEntries.filter(e => e.url.trim());
    if (validUrls.length === 0) {
      setFormError('플레이리스트에는 최소 1개의 동영상 URL이 필요합니다.');
      return;
    }

    setIsCreating(true);
    setFormError(null);

    try {
      // Step 1: URL 별로 HQ media 생성
      const mediaIds: string[] = [];
      for (let i = 0; i < validUrls.length; i++) {
        const entry = validUrls[i];
        setCreateProgress(`동영상 등록 중 (${i + 1}/${validUrls.length})...`);
        const mediaResult = await apiFetch(`/api/signage/${SERVICE_KEY}/hq/media`, {
          method: 'POST',
          body: JSON.stringify({
            name: entry.title.trim() || `동영상 ${i + 1}`,
            mediaType: 'video',
            sourceUrl: entry.url.trim(),
            duration: formDuration,
            tags: formTags,
          }),
        });
        const created = mediaResult.data || mediaResult;
        mediaIds.push(created.id);
      }

      // Step 2: 플레이리스트 생성
      setCreateProgress('플레이리스트 생성 중...');
      const playlistResult = await apiFetch(`/api/signage/${SERVICE_KEY}/hq/playlists`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          loopEnabled: formLoop,
          defaultItemDuration: formDuration,
          transitionType: formTransition,
          tags: formTags,
        }),
      });
      const playlist = playlistResult.data || playlistResult;

      // Step 3: 항목 일괄 추가
      setCreateProgress('항목 추가 중...');
      await apiFetch(`/api/signage/${SERVICE_KEY}/playlists/${playlist.id}/items/bulk`, {
        method: 'POST',
        body: JSON.stringify({
          items: mediaIds.map((mediaId, idx) => ({
            mediaId,
            sortOrder: idx + 1,
            duration: formDuration,
            transitionType: formTransition,
            sourceType: 'hq',
          })),
        }),
      });

      setShowForm(false);
      resetForm();
      navigate(`/operator/signage/hq-playlists/${playlist.id}`);
    } catch (err: any) {
      setFormError(err?.message || '플레이리스트 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
      setCreateProgress('');
    }
  };

  const deleteOne = useCallback(async (id: string) => {
    await apiFetch(`/api/signage/${SERVICE_KEY}/hq/playlists/${id}`, { method: 'DELETE' });
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
    fetchPlaylists();
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return '-'; }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  const filteredPlaylists = useMemo(() => {
    if (!searchKeyword.trim()) return playlists;
    const kw = searchKeyword.toLowerCase();
    return playlists.filter(p => p.name.toLowerCase().includes(kw));
  }, [playlists, searchKeyword]);

  const columns: ListColumnDef<PlaylistItem>[] = [
    {
      key: 'name',
      header: '이름',
      render: (value) => <span className="font-medium text-slate-800 text-sm">{value}</span>,
    },
    {
      key: 'itemCount',
      header: '항목 수',
      align: 'center',
      render: (value) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{value}</span>
      ),
    },
    {
      key: 'totalDuration',
      header: '총 시간',
      render: (value) => <span className="text-sm text-slate-600">{formatDuration(value)}</span>,
    },
    {
      key: 'loopEnabled',
      header: '루프',
      align: 'center',
      render: (value) => <span className="text-sm">{value ? 'O' : '-'}</span>,
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
          actions={buildRowActions(playlistActionPolicy, row, {
            view: () => navigate(`/operator/signage/hq-playlists/${row.id}`),
            delete: () => deleteOne(row.id).then(fetchPlaylists).catch((err: any) => setError(err?.message || '삭제 실패')),
          }, { icons: PLAYLIST_ACTION_ICONS })}
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
      tooltip: '선택된 플레이리스트를 일괄 삭제합니다',
      visible: selectedIds.size > 0,
      confirm: {
        title: '일괄 삭제 확인',
        message: `${selectedIds.size}개의 플레이리스트를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger' as const,
        confirmText: '삭제',
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ListMusic className="w-6 h-6 text-blue-600" /> HQ 플레이리스트 관리
            </h1>
            <p className="text-slate-500 text-sm mt-1">운영자 제공 사이니지 플레이리스트</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 새 플레이리스트
            </button>
            <button onClick={fetchPlaylists} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 새로고침
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">{error}</div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            placeholder="플레이리스트 이름으로 검색..."
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
          onClose={() => { batch.clearResult(); fetchPlaylists(); }}
          result={batch.result}
          onRetry={() => { batch.retryFailed(); }}
        />

        {/* Table */}
        <DataTable<PlaylistItem>
          columns={columns}
          data={filteredPlaylists}
          rowKey="id"
          loading={isLoading}
          onRowClick={record => navigate(`/operator/signage/hq-playlists/${record.id}`)}
          emptyMessage="HQ 플레이리스트가 없습니다"
          tableId="kpa-hq-playlists"
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* ── 플레이리스트 등록 모달 ── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !isCreating) { setShowForm(false); resetForm(); } }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">플레이리스트 등록</h2>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                disabled={isCreating}
                className="text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* 모달 본문 (스크롤) */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

              {/* 기본 정보 */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">이름 *</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="플레이리스트 이름" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">기본 항목 시간 (초)</label>
                  <input type="number" value={formDuration} onChange={e => setFormDuration(Number(e.target.value))} min={1} max={300} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">전환 효과</label>
                  <select value={formTransition} onChange={e => setFormTransition(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="none">없음</option>
                    <option value="fade">페이드</option>
                    <option value="slide">슬라이드</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="loop" checked={formLoop} onChange={e => setFormLoop(e.target.checked)} className="rounded" />
                <label htmlFor="loop" className="text-sm text-slate-700">반복 재생</label>
              </div>

              {/* 태그 */}
              <div>
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

              {/* 동영상 URL 목록 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-500">동영상 URL * (최소 1개)</label>
                  <span className="text-xs text-slate-400">YouTube / Vimeo</span>
                </div>

                {/* 추가된 URL 목록 */}
                {urlEntries.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {urlEntries.map((entry, idx) => (
                      <div key={entry.id} className="flex items-start gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                        {/* 순서 번호 */}
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center mt-1">{idx + 1}</span>

                        {/* URL + 제목 */}
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            value={entry.url}
                            onChange={e => updateUrlEntry(entry.id, 'url', e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          />
                          <input
                            type="text"
                            value={entry.title}
                            onChange={e => updateUrlEntry(entry.id, 'title', e.target.value)}
                            placeholder={`동영상 제목 (선택, 미입력 시 "동영상 ${idx + 1}")`}
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          />
                        </div>

                        {/* 위/아래/삭제 버튼 */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => moveUrl(entry.id, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="위로"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveUrl(entry.id, 'down')}
                            disabled={idx === urlEntries.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="아래로"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeUrl(entry.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 새 URL 추가 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                    placeholder="YouTube / Vimeo URL 입력 후 추가"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addUrl}
                    disabled={!urlInput.trim()}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" /> URL 추가
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Enter 또는 버튼으로 추가. 각 URL은 별도 동영상 미디어로 등록됩니다.</p>
              </div>

              {/* 진행 상태 */}
              {isCreating && createProgress && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {createProgress}
                </div>
              )}

              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>

            {/* 모달 푸터 */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                disabled={isCreating}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !formName.trim() || formTags.length === 0 || urlEntries.filter(e => e.url.trim()).length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
