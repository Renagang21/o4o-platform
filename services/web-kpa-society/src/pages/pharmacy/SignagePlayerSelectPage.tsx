/**
 * SignagePlayerSelectPage — KPA Society
 * WO-KPA-STORE-SIGNAGE-IA-RESTRUCTURE-V2
 * WO-KPA-STORE-SIGNAGE-SCHEDULE-PLAYBACK-SYNC-V1
 *
 * /store/marketing/signage/player
 * 게시된 플레이리스트 목록 → 새 탭 fullscreen 재생
 * + 현재 활성 스케줄 배너 → 스케줄 기준 재생
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Play, ListVideo, AlertCircle, Calendar, Tv } from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';
import { fetchStorePlaylists, type StorePlaylist } from '../../api/storePlaylist';
import { fetchActiveContent, type ActiveContentResult } from '../../api/signageSchedule';
import { useAuth } from '../../contexts';

/** HH:MM:SS → HH:MM */
function toHHMM(t: string): string {
  return t?.slice(0, 5) ?? '';
}

export function SignagePlayerSelectPage() {
  const { user } = useAuth();
  const organizationId = user?.kpaMembership?.organizationId || '';

  const [playlists, setPlaylists] = useState<StorePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedPlayerKeys, setSelectedPlayerKeys] = useState<string[]>([]);
  const [activeContent, setActiveContent] = useState<ActiveContentResult | null>(null);

  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStorePlaylists();
      setPlaylists(data.filter((p) => p.publishStatus === 'published'));
    } catch {
      setError('플레이리스트를 불러오지 못했습니다.');
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load active schedule
  useEffect(() => {
    if (!organizationId) return;
    fetchActiveContent(organizationId)
      .then((result) => {
        if (result.schedule && result.items.length > 0) {
          setActiveContent(result);
        }
      })
      .catch(() => { /* no active schedule — banner hidden */ });
  }, [organizationId]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return playlists;
    const kw = keyword.toLowerCase();
    return playlists.filter((p) => p.name.toLowerCase().includes(kw));
  }, [playlists, keyword]);

  const handlePlay = (playlistId: string) => {
    window.open(`/store/marketing/signage/play/${playlistId}`, '_blank');
  };

  const handleSchedulePlay = () => {
    window.open('/store/marketing/signage/play/_schedule', '_blank');
  };

  const columns: Column<StorePlaylist>[] = [
    {
      key: 'name',
      title: '이름',
      render: (_v, pl) => (
        <div className="flex items-center gap-2">
          <ListVideo className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="font-medium text-slate-900 truncate max-w-xs">{pl.name}</span>
        </div>
      ),
    },
    {
      key: 'itemCount',
      title: '항목 수',
      dataIndex: 'itemCount',
      align: 'center' as const,
      render: (v) => <span className="text-slate-600">{v}</span>,
    },
    {
      key: 'playlistType',
      title: '유형',
      dataIndex: 'playlistType',
      align: 'center' as const,
      render: (v) => (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600">
          {v === 'SINGLE' ? '단일' : '목록'}
        </span>
      ),
    },
    {
      key: 'publishStatus',
      title: '게시',
      dataIndex: 'publishStatus',
      align: 'center' as const,
      render: (v) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          {v === 'published' ? '게시 중' : '초안'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      align: 'right' as const,
      render: (_v, pl) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlay(pl.id);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          재생
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">사이니지 재생</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            게시된 플레이리스트를 선택하여 전체 화면으로 재생합니다.
          </p>
        </div>
      </div>

      {/* Active Schedule Banner */}
      {activeContent?.schedule && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Calendar className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-teal-900 truncate">
                  현재 활성 스케줄: {activeContent.schedule.name}
                </p>
                <p className="text-xs text-teal-600 mt-0.5">
                  {toHHMM(activeContent.schedule.startTime)} ~ {toHHMM(activeContent.schedule.endTime)}
                  {' · '}항목 {activeContent.items.length}개
                </p>
              </div>
            </div>
            <button
              onClick={handleSchedulePlay}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors flex-shrink-0"
            >
              <Tv className="w-4 h-4" />
              현재 스케줄로 TV 재생
            </button>
          </div>
          <p className="text-xs text-teal-500 mt-2">
            스케줄 변경은 TV 화면을 새로고침하거나 다시 열면 반영됩니다.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="플레이리스트 검색..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <DataTable<StorePlaylist>
        rowSelection={{
          selectedRowKeys: selectedPlayerKeys,
          onChange: setSelectedPlayerKeys,
        }}
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        emptyText="게시된 플레이리스트가 없습니다."
      />
    </div>
  );
}
