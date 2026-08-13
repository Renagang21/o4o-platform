/**
 * SignagePlayerSelectView — 디지털사이니지 송출 대상 선택 (공통 화면 본체)
 * WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1
 *
 * 원본: WO-O4O-KCOSMETICS-SIGNAGE-PLAYER-V1 / WO-KPA-STORE-SIGNAGE-IA-RESTRUCTURE-V2.
 * KCos·GP 사본의 차이는 accent Tailwind class 뿐이었다(동작·route·API 동일).
 * Tailwind 는 동적 class 조합을 purge 하므로 accent 는 완성된 class 문자열로 주입받는다.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Play, ListVideo, AlertCircle } from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';

/** 서비스 storePlaylist 응답 중 이 화면이 쓰는 필드 */
export interface SignageSelectPlaylist {
  id: string;
  name: string;
  itemCount?: number;
  playlistType?: string;
  publishStatus?: string;
}

export interface SignagePlayerSelectViewProps {
  fetchStorePlaylists: () => Promise<SignageSelectPlaylist[]>;
  /** 재생 버튼 Tailwind class (서비스 accent) */
  playButtonClassName?: string;
  /** 검색 input Tailwind class (서비스 accent) */
  searchInputClassName?: string;
}

const DEFAULT_PLAY_BTN =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-pink-600 text-white hover:bg-pink-700 transition-colors';
const DEFAULT_SEARCH_INPUT =
  'w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent';

export function SignagePlayerSelectView({
  fetchStorePlaylists,
  playButtonClassName = DEFAULT_PLAY_BTN,
  searchInputClassName = DEFAULT_SEARCH_INPUT,
}: SignagePlayerSelectViewProps) {
  const [playlists, setPlaylists] = useState<SignageSelectPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

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
  }, [fetchStorePlaylists]);

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

  const columns: Column<SignageSelectPlaylist>[] = [
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
          className={playButtonClassName}
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
          <h2 className="text-lg font-bold text-slate-900">디지털사이니지 송출</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            게시된 플레이리스트를 선택해 매장 화면으로 전체화면 송출합니다.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="플레이리스트 검색..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className={searchInputClassName}
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
      <DataTable<SignageSelectPlaylist>
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        emptyText="게시된 플레이리스트가 없습니다."
      />
    </div>
  );
}
