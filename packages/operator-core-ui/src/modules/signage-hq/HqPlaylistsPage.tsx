/**
 * HqPlaylistsPage — 운영자 사이니지 HQ 플레이리스트 목록 (공통 콘솔)
 *
 * WO-O4O-SIGNAGE-CONSOLE-V1 · WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1 · WO-O4O-SIGNAGE-TABLE-STANDARD-V1
 * WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1:
 *   인라인/모달 등록 → 표준 `{routeBase}/hq-playlists/new` (공통 SignagePlaylistCreateShell)
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   KPA/K-Cosmetics 중복을 단일 콘솔로 수렴.
 *
 * 용어: 플레이리스트 라벨은 서비스마다 다르므로(KPA '플레이리스트' / KCos '재생목록')
 *       `config.playlistLabel` 로 주입한다.
 *
 * API: GET /api/signage/:serviceKey/playlists?source=hq
 *      DEL /api/signage/:serviceKey/hq/playlists/:id
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { ListMusic, RefreshCw, Plus, Trash2, Search, Eye } from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  SIGNAGE_STATUS_CONFIG,
  type SignagePlaylistItem,
  type SignageHqPageProps,
} from './types';

const PLAYLIST_ACTION_ICONS: Record<string, ReactNode> = {
  view: <Eye className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '-';
  }
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export function HqPlaylistsPage({ apiFetch, config, navigate }: SignageHqPageProps) {
  const { serviceKey, accent, routeBase, playlistLabel } = config;

  const [playlists, setPlaylists] = useState<SignagePlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  const playlistActionPolicy = useMemo(
    () => defineActionPolicy<SignagePlaylistItem>(`${config.actionPolicyPrefix}:hq-playlists`, {
      rules: [
        { key: 'view', label: '상세 보기' },
        {
          key: 'delete',
          label: '삭제',
          variant: 'danger',
          divider: true,
          confirm: (row) => ({
            title: `${playlistLabel} 완전 삭제`,
            message: `"${row.name}"\n\n삭제 시 모든 재생 항목도 함께 제거됩니다.\n이 작업은 되돌릴 수 없습니다.`,
            variant: 'danger' as const,
            confirmText: '완전 삭제',
          }),
        },
      ],
    }),
    [config.actionPolicyPrefix, playlistLabel],
  );

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${serviceKey}/playlists?source=hq`);
      setPlaylists(data.data || data.playlists || []);
    } catch (err: any) {
      setError(err?.message || `HQ ${playlistLabel}를 불러올 수 없습니다`);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, serviceKey, playlistLabel]);

  useEffect(() => { void fetchPlaylists(); }, [fetchPlaylists]);

  const deleteOne = useCallback(async (id: string) => {
    await apiFetch(`/api/signage/${serviceKey}/hq/playlists/${id}`, { method: 'DELETE' });
  }, [apiFetch, serviceKey]);

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
    void fetchPlaylists();
  };

  const filteredPlaylists = useMemo(() => {
    if (!searchKeyword.trim()) return playlists;
    const kw = searchKeyword.toLowerCase();
    return playlists.filter((p) => p.name.toLowerCase().includes(kw));
  }, [playlists, searchKeyword]);

  const columns: ListColumnDef<SignagePlaylistItem>[] = [
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
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${accent.countBadge}`}>
          {value ?? 0}
        </span>
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
        const sc = SIGNAGE_STATUS_CONFIG[value] || { text: value, cls: 'bg-slate-100 text-slate-600' };
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
            view: () => navigate(`${routeBase}/hq-playlists/${row.id}`),
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
      tooltip: `선택된 ${playlistLabel}를 일괄 삭제합니다`,
      visible: selectedIds.size > 0,
      confirm: {
        title: '일괄 삭제 확인',
        message: `${selectedIds.size}개의 ${playlistLabel}를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
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
            <ListMusic className={`w-6 h-6 ${accent.icon}`} /> HQ {playlistLabel} 관리
          </h1>
          <p className="text-slate-500 text-sm mt-1">운영자 제공 사이니지 {playlistLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`${routeBase}/hq-playlists/new`)}
            className={`flex items-center gap-2 px-4 py-2 ${accent.primaryButton} text-white rounded-lg transition-colors text-sm font-medium`}
          >
            <Plus className="w-4 h-4" /> 새 {playlistLabel}
          </button>
          <button
            onClick={() => void fetchPlaylists()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
          >
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
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder={`${playlistLabel} 이름으로 검색...`}
          className={`w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`}
        />
      </div>

      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={bulkActions}
      />

      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); void fetchPlaylists(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />

      <DataTable<SignagePlaylistItem>
        columns={columns}
        data={filteredPlaylists}
        rowKey="id"
        loading={isLoading}
        onRowClick={(record) => navigate(`${routeBase}/hq-playlists/${record.id}`)}
        emptyMessage={`HQ ${playlistLabel}가 없습니다`}
        tableId={`${config.tableIdPrefix}-hq-playlists`}
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}
