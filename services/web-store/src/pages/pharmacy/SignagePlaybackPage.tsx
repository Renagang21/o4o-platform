/**
 * SignagePlaybackPage — KPA Society
 * WO-KPA-STORE-SIGNAGE-IA-RESTRUCTURE-V2
 * WO-KPA-STORE-SIGNAGE-SCHEDULE-PLAYBACK-SYNC-V1
 *
 * /store/marketing/signage/play/:playlistId
 * 단일 Playlist fullscreen 루프 재생
 *
 * playlistId === '_schedule' → 스케줄 기준 재생 (resolve-active API)
 * playlistId === UUID → 기존 수동 재생
 *
 * WO-O4O-SIGNAGE-PLAYLIST-FULLSCREEN-CORE-PROMOTION-V1:
 *   재생 시작 전 "전체화면으로 재생 / 일반 화면으로 재생" 선택 화면 추가.
 *   containerRef를 단일 루트 div에 유지하여 phase 전환 후에도
 *   requestFullscreen이 동일 DOM 요소에서 동작.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Loader2, AlertCircle, List, Calendar, Maximize, Minimize, Play, MonitorPlay } from 'lucide-react';
import { publicContentApi, type SignagePlaylist } from '../../lib/api/signageV2';
import { getAccessToken } from '../../contexts/AuthContext';
import { fetchActiveContent, type StorePlaylistActiveItem } from '../../api/signageSchedule';
import { useStoreOrganizationId } from '../../hooks/useStoreOrganizationId';
import { getActiveServiceKey } from '../../lib/serviceContext';
import { apiClient } from '../../api/client';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = () => getActiveServiceKey();
const SIGNAGE_BASE = () => `${API_BASE_URL}/api/signage/${SERVICE_KEY()}`;
const DEFAULT_DURATION_MS = 10_000;

// ── Playback item type (unified for both modes) ─────────────────────────────
interface PlaybackItem {
  id: string;
  displayOrder: number;
  displayDuration?: number;
  isActive: boolean;
  media: {
    mediaType: string;
    url: string;
    embedId: string;
    name: string;
  };
}

interface PlaybackData {
  name: string;
  isLoop: boolean;
  defaultDuration: number;
  items: PlaybackItem[];
}

// ── Store item → PlaybackItem adapter ───────────────────────────────────────
function storeItemToPlaybackItem(item: StorePlaylistActiveItem): PlaybackItem {
  const cj = item.contentJson || {};
  const mediaType = (cj.mediaType as string)
    || ((cj.mimeType as string)?.startsWith('video') ? 'video' : 'image');
  const url = (cj.sourceUrl as string) || (cj.fileUrl as string)
    || (cj.url as string) || (cj.imageUrl as string) || '';
  return {
    id: item.id,
    displayOrder: item.displayOrder,
    displayDuration: (cj.duration as number) || undefined,
    isActive: true,
    media: {
      mediaType,
      url,
      embedId: (cj.embedId as string) || '',
      name: (cj.title as string) || item.title || '',
    },
  };
}

// ── YouTube embed URL 변환 ──────────────────────────────────────────────────
function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v');
    } else if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1);
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&controls=0&loop=1&playlist=${videoId}&mute=1`;
  } catch {
    return null;
  }
}

function toVimeoEmbed(embedId: string): string {
  return `https://player.vimeo.com/video/${embedId}?autoplay=1&loop=1&title=0&byline=0&portrait=0&muted=1`;
}

// ── 미디어 렌더러 ────────────────────────────────────────────────────────────
function MediaRenderer({ item }: { item: PlaybackItem }) {
  const media = item.media;
  if (!media) return null;

  const url = media.url ?? '';
  const embedId = media.embedId ?? '';
  const mediaType = media.mediaType;

  // YouTube
  if (mediaType === 'youtube' || (url && url.includes('youtu'))) {
    const src = embedId
      ? `https://www.youtube.com/embed/${embedId}?autoplay=1&rel=0&controls=0&loop=1&playlist=${embedId}&mute=1`
      : toYouTubeEmbed(url);
    if (src) {
      return (
        <iframe
          key={item.id}
          src={src}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={media.name}
        />
      );
    }
  }

  // Vimeo
  if (mediaType === 'vimeo' || (url && url.includes('vimeo'))) {
    const vid = embedId || url.split('/').pop() || '';
    return (
      <iframe
        key={item.id}
        src={toVimeoEmbed(vid)}
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title={media.name}
      />
    );
  }

  // Video file
  if (mediaType === 'video' && url) {
    return (
      <video
        key={item.id}
        src={url}
        autoPlay
        loop
        muted
        className="w-full h-full object-contain"
      />
    );
  }

  // Image
  if ((mediaType === 'image' || !mediaType) && url) {
    return (
      <img
        key={item.id}
        src={url}
        alt={media.name}
        className="w-full h-full object-contain"
      />
    );
  }

  // Fallback
  return (
    <div className="flex items-center justify-center w-full h-full text-white/40 text-sm">
      {media.name}
    </div>
  );
}

// ── SignagePlaylist → PlaybackData adapter ──────────────────────────────────
function signagePlaylistToPlaybackData(pl: SignagePlaylist): PlaybackData {
  const items: PlaybackItem[] = [...(pl.items ?? [])].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  ).filter((i) => i.isActive !== false).map((i) => ({
    id: i.id,
    displayOrder: i.displayOrder ?? 0,
    displayDuration: i.displayDuration,
    isActive: true,
    media: {
      mediaType: i.media?.mediaType ?? '',
      url: (i.media as any)?.url ?? (i.media as any)?.sourceUrl ?? '',
      embedId: (i.media as any)?.embedId ?? '',
      name: i.media?.name ?? '',
    },
  }));
  return {
    name: pl.name,
    isLoop: pl.isLoop ?? true,
    defaultDuration: pl.defaultDuration ?? 10,
    items,
  };
}

// ── Fullscreen helpers ───────────────────────────────────────────────────────
function requestFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) el.requestFullscreen();
  else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
}
function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen();
  else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function SignagePlaybackPage() {
  const scope = useStoreOperationScope();
  return <PlaybackSession key={scope.key} />;
}

function PlaybackSession() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { organizationId: storeOrganizationId, loading: storeOrgLoading } = useStoreOrganizationId();

  const isScheduleMode = playlistId === '_schedule';

  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showControls, setShowControls] = useState(true);
  // WO-O4O-SIGNAGE-PLAYLIST-FULLSCREEN-CORE-PROMOTION-V1
  const [phase, setPhase] = useState<'start' | 'playing'>('start');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseMoveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Single persistent container — requestFullscreen operates on same element across phase changes
  const containerRef = useRef<HTMLDivElement>(null);

  // ── 플레이리스트 로드 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!playlistId) return;
    let current = true;
    setLoading(true); setError(null); setPlaybackData(null); setCurrentIdx(0); setPhase('start');
    if (storeOrgLoading) return () => { current = false; };
    const load = async (): Promise<PlaybackData> => {
      if (isScheduleMode) {
        if (!storeOrganizationId) throw new Error('STORE_REQUIRED');
        const result = await fetchActiveContent(storeOrganizationId);
        if (!result.schedule) throw new Error('NO_SCHEDULE');
        return { name: result.schedule.name, isLoop: true, defaultDuration: 10, items: result.items.map(storeItemToPlaybackItem) };
      }
      // The selection page lists store_playlists. Resolve that same model with its existing
      // public playback reader (published + active + forced/time-window filtering).
      try {
        const result = await apiClient.get<{ success: boolean; data: { name: string; items: StorePlaylistActiveItem[] } }>(`/store-playlists/public/${encodeURIComponent(playlistId)}`);
        if (!result.success || !result.data) throw new Error('INVALID_PLAYLIST');
        return { name: result.data.name, isLoop: true, defaultDuration: 10, items: result.data.items.map(storeItemToPlaybackItem) };
      } catch (cause) {
        if ((cause as { status?: number }).status !== 404) throw cause;
      }
      if (!current) throw new Error('STALE_REQUEST');
      // Existing broadcast IDs retain their separate catalog and reader. Access failures
      // are never retried through a public reader; only a missing ID reaches this fallback.
      const token = getAccessToken();
      const response = await fetch(`${SIGNAGE_BASE()}/playlists/${encodeURIComponent(playlistId)}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Organization-Id': storeOrganizationId },
      });
      if (response.ok) {
        const json = await response.json();
        return signagePlaylistToPlaybackData(json.data ?? json);
      }
      if (response.status !== 404 || !current) throw new Error('PLAYLIST_UNAVAILABLE');
      const result = await publicContentApi.getPlaylist(playlistId);
      if (!result.success || !result.data) throw new Error('PLAYLIST_UNAVAILABLE');
      return signagePlaylistToPlaybackData(result.data);
    };
    void load().then(result => { if (current) setPlaybackData(result); })
      .catch(cause => { if (current) setError(cause.message === 'NO_SCHEDULE' ? '현재 시간에 적용된 일정이 없습니다. 재생 시간을 확인하거나 게시된 안내를 선택하세요.' : '재생 자료를 불러오지 못했습니다. 게시 상태와 접근 권한을 확인하고 다시 시도해 주세요.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [playlistId, isScheduleMode, storeOrganizationId, storeOrgLoading, retry]);

  // ── 아이템 순서 정렬 ────────────────────────────────────────────────────────
  const items = playbackData?.items ?? [];
  const currentItem = items[currentIdx] ?? null;

  // ── 타이머 기반 자동 전환 (playing 단계에서만) ─────────────────────────────
  const goNext = useCallback(() => {
    if (!playbackData || items.length === 0) return;
    setCurrentIdx((prev) => {
      const next = prev + 1;
      if (next >= items.length) {
        return playbackData.isLoop ? 0 : prev;
      }
      return next;
    });
  }, [playbackData, items.length]);

  useEffect(() => {
    if (!currentItem || !playbackData || phase !== 'playing') return;
    const durationMs =
      ((currentItem.displayDuration ?? playbackData.defaultDuration ?? 0) || 10) * 1000;
    const ms = durationMs > 0 ? durationMs : DEFAULT_DURATION_MS;

    timerRef.current = setTimeout(goNext, ms);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIdx, currentItem, playbackData, goNext, phase]);

  // ── 마우스 이동 시 컨트롤 표시 ─────────────────────────────────────────────
  const handleMouseMove = () => {
    setShowControls(true);
    if (mouseMoveTimer.current) clearTimeout(mouseMoveTimer.current);
    mouseMoveTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    handleMouseMove();
    return () => { if (mouseMoveTimer.current) clearTimeout(mouseMoveTimer.current); };
  }, []);

  // ── Fullscreen change detection ───────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  const handleFullscreenToggle = () => {
    if (isFullscreen) exitFullscreen();
    else if (containerRef.current) requestFullscreen(containerRef.current);
  };

  // ── Start screen handlers ─────────────────────────────────────────────────
  const handleStartNormal = () => setPhase('playing');
  const handleStartFullscreen = () => {
    if (containerRef.current) requestFullscreen(containerRef.current);
    setPhase('playing');
  };

  const handleClose = () => {
    if (isFullscreen) exitFullscreen();
    if (isScheduleMode) navigate('/store/marketing/signage/player');
    else navigate(-1);
  };

  // ── Single root container — always in DOM ─────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-white/60 mx-auto mb-3" />
            <p className="text-white/40 text-sm">
              {isScheduleMode ? '스케줄 콘텐츠 로딩 중...' : '플레이리스트 로딩 중...'}
            </p>
          </div>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {!loading && (error || !playbackData) && (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center max-w-md">
            {isScheduleMode ? (
              <Calendar className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            ) : (
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            )}
            <p className="text-white/60 mb-4 whitespace-pre-line">{error ?? '플레이리스트를 찾을 수 없습니다.'}</p>
            <button type="button" onClick={() => setRetry(value => value + 1)} className="mb-3 min-h-11 rounded-lg bg-white/10 px-4 text-sm text-white">다시 시도</button>
            {isScheduleMode ? (
              <button
                onClick={() => navigate('/store/marketing/signage/player')}
                className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
              >
                플레이리스트 선택으로 이동
              </button>
            ) : (
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
              >
                돌아가기
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────── */}
      {!loading && !error && playbackData && items.length === 0 && (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center">
            <List className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 mb-4">재생할 항목이 없습니다.</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
            >
              돌아가기
            </button>
          </div>
        </div>
      )}

      {/* ── Start screen ────────────────────────────────────────────────── */}
      {!loading && !error && playbackData && items.length > 0 && phase === 'start' && (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center max-w-sm w-full px-6">
            <MonitorPlay className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/80 text-lg font-medium mb-1 truncate">{playbackData.name}</p>
            <p className="text-white/40 text-sm mb-8">
              {items.length}개 콘텐츠{isScheduleMode ? ' · 스케줄 기반' : ''}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleStartFullscreen}
                className="flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Maximize className="w-4 h-4" />
                전체화면으로 재생
              </button>
              <button
                onClick={handleStartNormal}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                일반 화면으로 재생
              </button>
            </div>

            <div className="mt-6 space-y-1">
              <p className="text-white/30 text-xs">전체화면 해제: ESC 키</p>
              <p className="text-white/30 text-xs">브라우저 전체화면: F11 키</p>
            </div>

            <button
              onClick={handleClose}
              className="mt-6 text-white/30 hover:text-white/60 text-xs transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      )}

      {/* ── Playback ─────────────────────────────────────────────────────── */}
      {!loading && !error && playbackData && items.length > 0 && phase === 'playing' && (
        <>
          {/* Media */}
          {currentItem && <MediaRenderer item={currentItem} />}

          {/* Progress dots */}
          {items.length > 1 && showControls && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIdx ? 'bg-white scale-125' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Schedule mode info */}
          {isScheduleMode && showControls && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-black/50 rounded-lg px-3 py-1.5 text-xs text-white/60 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              스케줄 기반 재생 · 변경 시 새로고침 필요
            </div>
          )}

          {/* Fullscreen hint */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 pb-3 text-center pointer-events-none">
              <p className="text-white/30 text-xs">
                {isFullscreen
                  ? <>전체화면 해제: <span className="text-white/50">ESC</span> 키</>
                  : 'F11 키로 브라우저 전체화면 전환'}
              </p>
            </div>
          )}

          {/* Controls overlay */}
          {showControls && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="text-white/60 text-xs bg-black/40 px-2 py-1 rounded-md max-w-[200px] truncate">
                {playbackData.name} ({currentIdx + 1}/{items.length})
              </span>
              {/* Fullscreen toggle */}
              <button
                onClick={handleFullscreenToggle}
                className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
                title={isFullscreen ? '전체화면 해제 (ESC)' : '전체화면 전환'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
              {/* Exit */}
              <button
                onClick={handleClose}
                className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
                title="재생 종료"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
