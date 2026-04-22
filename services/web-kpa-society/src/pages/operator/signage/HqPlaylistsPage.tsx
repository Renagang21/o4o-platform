/**
 * HQ Playlists Management Page — Signage Console (KPA Society)
 * WO-O4O-SIGNAGE-CONSOLE-V1
 * WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1: 검색바 추가 + DataTable 전환
 * WO-O4O-SIGNAGE-TABLE-STANDARD-V1: O4O 표준 테이블 (체크 선택 + bulk delete + RowActionMenu)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../../contexts/AuthContext';
import { ListMusic, RefreshCw, Plus, Trash2, Search, Eye } from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';

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

export default function HqPlaylistsPage() {
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  const [formName, setFormName] = useState('');
  const [formLoop, setFormLoop] = useState(true);
  const [formDuration, setFormDuration] = useState(10);
  const [formTransition, setFormTransition] = useState('fade');
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

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setIsCreating(true);
    try {
      await apiFetch(`/api/signage/${SERVICE_KEY}/hq/playlists`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          loopEnabled: formLoop,
          defaultItemDuration: formDuration,
          transitionType: formTransition,
        }),
      });
      setFormName(''); setShowForm(false);
      fetchPlaylists();
    } catch (err: any) {
      setError(err?.message || '플레이리스트 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
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
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
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

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">새 HQ 플레이리스트</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">이름 *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="플레이리스트 이름" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
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
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="loop" checked={formLoop} onChange={e => setFormLoop(e.target.checked)} className="rounded" />
              <label htmlFor="loop" className="text-sm text-slate-700">반복 재생</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">취소</button>
            <button onClick={handleCreate} disabled={isCreating || !formName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{isCreating ? '생성 중...' : '생성'}</button>
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
  );
}
