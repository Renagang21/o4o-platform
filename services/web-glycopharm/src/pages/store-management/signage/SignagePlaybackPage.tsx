/**
 * SignagePlaybackPage — GlycoPharm
 * WO-O4O-GLYCOPHARM-SIGNAGE-PHASE1-V1
 *
 * /store/marketing/signage/play/:playlistId
 * 단일 Playlist fullscreen 루프 재생
 *
 * WO-O4O-SIGNAGE-PLAYLIST-FULLSCREEN-CORE-PROMOTION-V1:
 *   재생 시작 전 "전체화면으로 재생 / 일반 화면으로 재생" 선택 화면 추가.
 *   containerRef를 단일 루트 div에 유지하여 phase 전환 후에도
 *   requestFullscreen이 동일 DOM 요소에서 동작.
 *
 * 규칙:
 * - Playlist가 최종 실행 단위
 * - Media는 URL 기반 (YouTube / Vimeo / video / image)
 * - loopEnabled(isLoop) = true 기본
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Loader2, AlertCircle, List, Maximize, Minimize, Play, MonitorPlay } from 'lucide-react';
import { publicContentApi, type SignagePlaylist, type SignagePlaylistItem } from '@/lib/api/signageV2';
import { api, API_BASE_URL } from '@/lib/apiClient';

const SERVICE_KEY = 'glycopharm';
const SIGNAGE_BASE = `${API_BASE_URL}/api/signage/${SERVICE_KEY}`;
const DEFAULT_DURATION_MS = 10_000;

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
function MediaRenderer({ item }: { item: SignagePlaylistItem }) {
  const media = item.media;
  if (!media) return null;

  const url = (media as any).url ?? (media as any).sourceUrl ?? '';
  const embedId = (media as any).embedId ?? '';
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
  if (mediaType === 'image' && url) {
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
export default function SignagePlaybackPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<SignagePlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);

    // 1차: 인증 API (내 플레이리스트)
    api.get(`${SIGNAGE_BASE}/playlists/${playlistId}`)
      .then((res: { data: any }) => {
        const data = (res.data as any)?.data ?? res.data;
        if (data?.id) { setPlaylist(data); return; }
        throw new Error('not found');
      })
      .catch(() =>
        // 2차: 공개 API (HQ/community 플레이리스트)
        publicContentApi.getPlaylist(playlistId).then((res) => {
          if (res.success && res.data) {
            setPlaylist(res.data);
          } else {
            setError('플레이리스트를 찾을 수 없습니다.');
          }
        }),
      )
      .catch(() => setError('플레이리스트를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [playlistId]);

  // ── 아이템 순서 정렬 ────────────────────────────────────────────────────────
  const items = playlist
    ? [...(playlist.items ?? [])].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
      ).filter((i) => i.isActive !== false)
    : [];

  const currentItem = items[currentIdx] ?? null;

  // ── 타이머 기반 자동 전환 (playing 단계에서만) ─────────────────────────────
  const goNext = useCallback(() => {
    if (!playlist || items.length === 0) return;
    setCurrentIdx((prev) => {
      const next = prev + 1;
      if (next >= items.length) {
        return playlist.isLoop ? 0 : prev;
      }
      return next;
    });
  }, [playlist, items.length]);

  useEffect(() => {
    if (!currentItem || !playlist || phase !== 'playing') return;
    const durationMs =
      ((currentItem.displayDuration ?? playlist.defaultDuration ?? 0) || 10) * 1000;
    const ms = durationMs > 0 ? durationMs : DEFAULT_DURATION_MS;

    timerRef.current = setTimeout(goNext, ms);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIdx, currentItem, playlist, goNext, phase]);

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
    navigate(-1);
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
            <p className="text-white/40 text-sm">플레이리스트 로딩 중...</p>
          </div>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {!loading && (error || !playlist) && (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-white/60 mb-4">{error ?? '플레이리스트를 찾을 수 없습니다.'}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
            >
              돌아가기
            </button>
          </div>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────── */}
      {!loading && !error && playlist && items.length === 0 && (
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
      {!loading && !error && playlist && items.length > 0 && phase === 'start' && (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center max-w-sm w-full px-6">
            <MonitorPlay className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/80 text-lg font-medium mb-1 truncate">{playlist.name}</p>
            <p className="text-white/40 text-sm mb-8">{items.length}개 콘텐츠</p>

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
              onClick={() => navigate(-1)}
              className="mt-6 text-white/30 hover:text-white/60 text-xs transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      )}

      {/* ── Playback ─────────────────────────────────────────────────────── */}
      {!loading && !error && playlist && items.length > 0 && phase === 'playing' && (
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
                {playlist.name} ({currentIdx + 1}/{items.length})
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
