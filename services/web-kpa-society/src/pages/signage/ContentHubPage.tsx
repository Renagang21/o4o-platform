/**
 * Signage Content Hub Page - KPA-Society
 *
 * WO-SIGNAGE-CONTENT-HUB-V2
 * WO-KPA-A-HUB-TO-STORE-CLONE-FLOW-V2
 * 레이아웃:
 * ├─ Header (안내 영상 · 자료)
 * ├─ 최신 콘텐츠 / 추천 콘텐츠 (2열 하이라이트)
 * ├─ 카테고리 탭 (운영자 제공 / 공급자 제공 / 커뮤니티 공유)
 * │  ├─ 플레이리스트 리스트
 * │  └─ 동영상 리스트
 * ├─ Clone/가져오기 기능 유지
 * └─ + 내 매장에 추가 (asset snapshot copy → Store Assets)
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Video as VideoIcon, List, AlertCircle, Play, Clock, Film, ImageOff, Plus } from 'lucide-react';
import { publicContentApi, globalContentApi, SignagePlaylist, SignageMedia, type ContentSource } from '../../lib/api/signageV2';
import { getMediaThumbnailUrl } from '@o4o/types/signage';
import { assetSnapshotApi } from '../../api/assetSnapshot';

/** Image with onError fallback — shows placeholder icon when image fails to load */
function SafeImg({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`${className} bg-slate-100 flex items-center justify-center`} style={{ objectFit: undefined }}>
        <ImageOff className="h-8 w-8 text-slate-300" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

const SOURCE_TABS: { key: ContentSource; label: string; desc: string }[] = [
  { key: 'community', label: '커뮤니티 공유', desc: '회원 간 공유된 유용한 안내 자료' },
  { key: 'hq', label: '운영자 제공', desc: '약사회 및 관련 기관에서 공식적으로 제공하는 안내·교육 자료' },
  { key: 'supplier', label: '공급자 제공', desc: '공급자가 등록한 안내 자료' },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

// ── Compact list-row components ──

function PlaylistRow({ playlist, onClone, onAddToStore }: {
  playlist: SignagePlaylist;
  onClone: (id: string, name: string) => void;
  onAddToStore: (id: string, name: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/signage/playlist/${playlist.id}`)}
      className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-b-0 group cursor-pointer hover:bg-slate-50 transition-colors"
    >
      <div className="flex-shrink-0 w-8 text-center">
        <List className="h-5 w-5 text-blue-600 mx-auto" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 truncate group-hover:text-blue-600">{playlist.name}</span>
          {playlist.itemCount > 0 && (
            <span className="text-xs text-slate-400 flex-shrink-0">{playlist.itemCount}개 항목</span>
          )}
        </div>
        {playlist.description && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{playlist.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
        <Clock className="h-3 w-3" />
        {formatDuration(playlist.totalDuration || 0)}
      </div>
      <div className="text-xs text-slate-400 flex-shrink-0 w-20 text-right">
        {new Date(playlist.createdAt).toLocaleDateString()}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onAddToStore(playlist.id, playlist.name); }}
          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
          title="내 매장에 추가"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClone(playlist.id, playlist.name); }}
          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
          title="가져오기"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MediaRow({ item, onClone, onAddToStore }: {
  item: SignageMedia;
  onClone: (id: string, name: string) => void;
  onAddToStore: (id: string, name: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/signage/media/${item.id}`)}
      className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-b-0 group cursor-pointer hover:bg-slate-50 transition-colors"
    >
      <div className="flex-shrink-0 w-8 text-center">
        <VideoIcon className="h-5 w-5 text-purple-600 mx-auto" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 truncate group-hover:text-blue-600">{item.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded flex-shrink-0">{item.mediaType}</span>
        </div>
      </div>
      {item.duration != null && (
        <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
          <Clock className="h-3 w-3" />
          {formatDuration(item.duration)}
        </div>
      )}
      <div className="text-xs text-slate-400 flex-shrink-0 w-20 text-right">
        {new Date(item.createdAt).toLocaleDateString()}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onAddToStore(item.id, item.name); }}
          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
          title="내 매장에 추가"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClone(item.id, item.name); }}
          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
          title="가져오기"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Highlight card (for top section) ──

function HighlightPlaylistCard({ playlist }: { playlist: SignagePlaylist }) {
  const navigate = useNavigate();
  const firstItem = playlist.items?.[0];
  const previewThumbnail = firstItem?.media ? getMediaThumbnailUrl(firstItem.media) : null;

  return (
    <div
      onClick={() => navigate(`/signage/playlist/${playlist.id}`)}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      {previewThumbnail ? (
        <div className="block relative group">
          <SafeImg src={previewThumbnail} alt={playlist.name} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="h-8 w-8 text-white" fill="white" />
          </div>
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
            {playlist.itemCount}개 항목
          </span>
        </div>
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
          <List className="h-8 w-8 text-blue-300" />
        </div>
      )}
      <div className="p-3">
        <h4 className="font-semibold text-sm text-slate-800 truncate">{playlist.name}</h4>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Film className="h-3 w-3" /> {playlist.itemCount}개</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(playlist.totalDuration || 0)}</span>
        </div>
      </div>
    </div>
  );
}

function HighlightMediaCard({ item }: { item: SignageMedia }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/signage/media/${item.id}`)}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="w-full h-32 bg-gradient-to-br from-purple-50 to-slate-100 flex items-center justify-center">
        <VideoIcon className="h-8 w-8 text-purple-300" />
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-sm text-slate-800 truncate">{item.name}</h4>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
          <span className="px-1.5 py-0.5 bg-slate-100 rounded">{item.mediaType}</span>
          {item.duration != null && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(item.duration)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function ContentHubPage() {
  const navigate = useNavigate();
  const [playlistSource, setPlaylistSource] = useState<ContentSource>('community');
  const [mediaSource, setMediaSource] = useState<ContentSource>('community');
  const [allPlaylists, setAllPlaylists] = useState<SignagePlaylist[]>([]);
  const [allMedia, setAllMedia] = useState<SignageMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  // Load ALL content once (all sources)
  useEffect(() => {
    loadAllContent();
  }, []);

  const loadAllContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const [playlistRes, mediaRes] = await Promise.all([
        publicContentApi.listPlaylists(undefined, 'kpa-society', { page: 1, limit: 50 }),
        publicContentApi.listMedia(undefined, 'kpa-society', { page: 1, limit: 50 }),
      ]);

      if (playlistRes.success && playlistRes.data) {
        setAllPlaylists(playlistRes.data.items || []);
      }
      if (mediaRes.success && mediaRes.data) {
        setAllMedia(mediaRes.data.items || []);
      }
      if (!playlistRes.success && !mediaRes.success) {
        setError('콘텐츠를 불러오는 데 실패했습니다.');
      }
    } catch {
      setError('콘텐츠를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Derived data
  const latestPlaylists = useMemo(
    () => [...allPlaylists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [allPlaylists],
  );
  const latestMedia = useMemo(
    () => [...allMedia].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [allMedia],
  );
  const recommendedPlaylists = useMemo(
    () => [...allPlaylists].sort((a, b) => (b.itemCount || 0) - (a.itemCount || 0)).slice(0, 4),
    [allPlaylists],
  );
  const recommendedMedia = useMemo(
    () => [...allMedia].sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0)).slice(0, 4),
    [allMedia],
  );

  // Filter by source for tab sections (independent tabs for playlists and media)
  // NOTE: public API returns source field but type doesn't declare it.
  const filteredPlaylists = useMemo(
    () => allPlaylists.filter((p) => (p as any).source === playlistSource),
    [allPlaylists, playlistSource],
  );
  const filteredMedia = useMemo(
    () => allMedia.filter((m) => (m as any).source === mediaSource),
    [allMedia, mediaSource],
  );

  // Add to Store handler (asset snapshot copy)
  const handleAddToStore = async (sourceId: string, name: string) => {
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: sourceId,
        assetType: 'signage',
      });
      setCloneSuccess(`"${name}" — 내 매장에 추가되었습니다.`);
      setTimeout(() => {
        setCloneSuccess(null);
        navigate('/pharmacy/assets?tab=signage');
      }, 1500);
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('DUPLICATE') || msg.includes('already')) {
        setError('이미 매장에 추가된 항목입니다.');
      } else {
        setError('매장 추가에 실패했습니다.');
      }
      setTimeout(() => setError(null), 3000);
    }
  };

  // Clone handlers
  const handleClonePlaylist = async (playlistId: string, playlistName: string) => {
    try {
      const result = await globalContentApi.clonePlaylist(playlistId, 'kpa-society');
      if (result.success) {
        setCloneSuccess(`"${playlistName}"를 내 대시보드로 가져왔습니다.`);
        setTimeout(() => setCloneSuccess(null), 3000);
      } else {
        setError(result.error || '플레이리스트를 복사하지 못했습니다.');
      }
    } catch {
      setError('플레이리스트 복사 중 오류가 발생했습니다.');
    }
  };

  const handleCloneMedia = async (mediaId: string, mediaName: string) => {
    try {
      const result = await globalContentApi.cloneMedia(mediaId, 'kpa-society');
      if (result.success) {
        setCloneSuccess(`"${mediaName}"를 내 대시보드로 가져왔습니다.`);
        setTimeout(() => setCloneSuccess(null), 3000);
      } else {
        setError(result.error || '미디어를 복사하지 못했습니다.');
      }
    } catch {
      setError('미디어 복사 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="h-32 bg-slate-200 rounded animate-pulse mb-3" />
              <div className="h-4 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">안내 영상 · 자료</h1>
        <p className="text-slate-500 mt-1">
          약사회 및 관련 기관에서 제공하는 안내·교육 영상을 확인하고 활용할 수 있습니다
        </p>
      </div>

      {/* Toast Messages */}
      {cloneSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
          <Download className="h-4 w-4" />
          <span>{cloneSuccess}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* ══════ 최신 콘텐츠 / 추천 콘텐츠 ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최신 콘텐츠 */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">최신 콘텐츠</h2>
          {latestPlaylists.length === 0 && latestMedia.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              아직 콘텐츠가 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {latestPlaylists.slice(0, 2).map((pl) => (
                <HighlightPlaylistCard key={pl.id} playlist={pl} />
              ))}
              {latestMedia.slice(0, 2).map((m) => (
                <HighlightMediaCard key={m.id} item={m} />
              ))}
            </div>
          )}
        </section>

        {/* 추천 콘텐츠 */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">추천 콘텐츠</h2>
          {recommendedPlaylists.length === 0 && recommendedMedia.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              아직 콘텐츠가 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recommendedPlaylists.slice(0, 2).map((pl) => (
                <HighlightPlaylistCard key={`rec-${pl.id}`} playlist={pl} />
              ))}
              {recommendedMedia.slice(0, 2).map((m) => (
                <HighlightMediaCard key={`rec-${m.id}`} item={m} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ══════ 플레이리스트 섹션 ══════ */}
      <section>
        <div className="flex gap-2 mb-3">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPlaylistSource(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                playlistSource === tab.key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {SOURCE_TABS.find((t) => t.key === playlistSource)?.desc}
        </p>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <List className="h-4 w-4 text-blue-600" />
              플레이리스트
            </h3>
            <span className="text-xs text-slate-400">{filteredPlaylists.length}건</span>
          </div>
          <div className="px-5">
            {filteredPlaylists.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">등록된 플레이리스트가 없습니다</div>
            ) : (
              filteredPlaylists.map((pl) => (
                <PlaylistRow key={pl.id} playlist={pl} onClone={handleClonePlaylist} onAddToStore={handleAddToStore} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ══════ 동영상 섹션 ══════ */}
      <section>
        <div className="flex gap-2 mb-3">
          {SOURCE_TABS.map((tab) => (
            <button
              key={`media-${tab.key}`}
              onClick={() => setMediaSource(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                mediaSource === tab.key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {SOURCE_TABS.find((t) => t.key === mediaSource)?.desc}
        </p>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <VideoIcon className="h-4 w-4 text-purple-600" />
              동영상
            </h3>
            <span className="text-xs text-slate-400">{filteredMedia.length}건</span>
          </div>
          <div className="px-5">
            {filteredMedia.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">등록된 동영상이 없습니다</div>
            ) : (
              filteredMedia.map((m) => (
                <MediaRow key={m.id} item={m} onClone={handleCloneMedia} onAddToStore={handleAddToStore} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
