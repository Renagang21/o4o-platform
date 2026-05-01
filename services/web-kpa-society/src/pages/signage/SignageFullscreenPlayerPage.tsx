/**
 * SignageFullscreenPlayerPage — KPA Society
 * WO-KPA-SIGNAGE-FULLSCREEN-PLAYER-V1
 *
 * 사이니지 전용 전체화면 재생 페이지.
 *
 * 두 가지 모드:
 * - /signage/play/media/:mediaId   → 단일 동영상 전체화면 재생
 * - /signage/play/playlist/:playlistId → 플레이리스트 순차 재생
 *
 * Layout 래퍼 없이 전체 뷰포트를 차지한다.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Loader2, AlertCircle, Maximize, List } from 'lucide-react';
import { publicContentApi, type SignageMedia, type SignagePlaylist } from '../../lib/api/signageV2';

const DEFAULT_DURATION_MS = 10_000;

// ── PlaybackItem (SignagePlaybackPage 동일 구조) ────────────────────────────
interface PlaybackItem {
  id: string;
  displayOrder: number;
  displayDuration?: number;
  media: {
    mediaType: string;
    url: string;
    embedId: string;
    name: string;
  };
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
  } catch { /* ignore */ }
  return null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

// ── MediaRenderer ───────────────────────────────────────────────────────────
function MediaRenderer({ item, singleMode }: { item: PlaybackItem; singleMode?: boolean }) {
  const media = item.media;
  if (!media) return null;

  const url = media.url ?? '';
  const embedId = media.embedId ?? '';
  const mediaType = media.mediaType;

  // YouTube
  if (mediaType === 'youtube' || (url && url.includes('youtu'))) {
    const vid = embedId || extractYouTubeId(url);
    if (vid) {
      const params = singleMode
        ? `rel=0&controls=1&loop=1&playlist=${vid}&mute=0`
        : `autoplay=1&rel=0&controls=0&loop=1&playlist=${vid}&mute=1`;
      return (
        <iframe
          key={item.id}
          src={`https://www.youtube.com/embed/${vid}?${params}`}
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
    const vid = embedId || extractVimeoId(url) || '';
    const params = singleMode
      ? 'title=0&byline=0&portrait=0'
      : 'autoplay=1&loop=1&title=0&byline=0&portrait=0&muted=1';
    return (
      <iframe
        key={item.id}
        src={`https://player.vimeo.com/video/${vid}?${params}`}
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
        loop={singleMode}
        controls={singleMode}
        muted={!singleMode}
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

// ── SignagePlaylist → PlaybackItem[] adapter ─────────────────────────────────
function playlistToItems(pl: SignagePlaylist): { items: PlaybackItem[]; defaultDuration: number; isLoop: boolean; name: string } {
  const items: PlaybackItem[] = [...(pl.items ?? [])]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .filter((i) => i.isActive !== false)
    .map((i) => ({
      id: i.id,
      displayOrder: i.displayOrder ?? 0,
      displayDuration: i.displayDuration,
      media: {
        mediaType: i.media?.mediaType ?? '',
        url: (i.media as any)?.url ?? (i.media as any)?.sourceUrl ?? '',
        embedId: (i.media as any)?.embedId ?? '',
        name: i.media?.name ?? '',
      },
    }));
  return {
    items,
    defaultDuration: pl.defaultDuration ?? 10,
    isLoop: pl.isLoop ?? true,
    name: pl.name,
  };
}

// ── SignageMedia → PlaybackItem adapter ──────────────────────────────────────
function mediaToItem(m: SignageMedia): PlaybackItem {
  const url = (m as any).sourceUrl || m.url || '';
  let embedId = '';
  if (m.mediaType === 'youtube') {
    embedId = extractYouTubeId(url) || '';
  } else if (m.mediaType === 'vimeo') {
    embedId = extractVimeoId(url) || '';
  }
  return {
    id: m.id,
    displayOrder: 0,
    displayDuration: m.duration,
    media: {
      mediaType: m.mediaType,
      url,
      embedId,
      name: m.name,
    },
  };
}

// ── Fullscreen API helper ───────────────────────────────────────────────────
function requestFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if ((el as any).webkitRequestFullscreen) {
    (el as any).webkitRequestFullscreen();
  } else if ((el as any).msRequestFullscreen) {
    (el as any).msRequestFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) {
    (document as any).webkitExitFullscreen();
  }
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function SignageFullscreenPlayerPage() {
  const { mediaId, playlistId } = useParams<{ mediaId?: string; playlistId?: string }>();
  const navigate = useNavigate();

  const isSingleMode = !!mediaId;
  const targetId = mediaId || playlistId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single mode
  const [singleItem, setSingleItem] = useState<PlaybackItem | null>(null);
  const [mediaName, setMediaName] = useState('');

  // Playlist mode
  const [playlistItems, setPlaylistItems] = useState<PlaybackItem[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistLoop, setPlaylistLoop] = useState(true);
  const [playlistDefaultDuration, setPlaylistDefaultDuration] = useState(10);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Controls
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseMoveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    setError(null);

    if (isSingleMode) {
      publicContentApi.getMedia(targetId)
        .then((res) => {
          if (res.success && res.data) {
            setSingleItem(mediaToItem(res.data));
            setMediaName(res.data.name);
          } else {
            setError('미디어를 찾을 수 없습니다.');
          }
        })
        .catch(() => setError('데이터를 불러오지 못했습니다.'))
        .finally(() => setLoading(false));
    } else {
      publicContentApi.getPlaylist(targetId)
        .then((res) => {
          if (res.success && res.data) {
            const { items, defaultDuration, isLoop, name } = playlistToItems(res.data);
            setPlaylistItems(items);
            setPlaylistDefaultDuration(defaultDuration);
            setPlaylistLoop(isLoop);
            setPlaylistName(name);
          } else {
            setError('플레이리스트를 찾을 수 없습니다.');
          }
        })
        .catch(() => setError('데이터를 불러오지 못했습니다.'))
        .finally(() => setLoading(false));
    }
  }, [targetId, isSingleMode]);

  // ── Playlist auto-advance ─────────────────────────────────────────────────
  const currentItem = isSingleMode ? singleItem : playlistItems[currentIdx] ?? null;

  const goNext = useCallback(() => {
    if (isSingleMode) return;
    setCurrentIdx((prev) => {
      const next = prev + 1;
      if (next >= playlistItems.length) {
        return playlistLoop ? 0 : prev;
      }
      return next;
    });
  }, [isSingleMode, playlistItems.length, playlistLoop]);

  useEffect(() => {
    if (isSingleMode || !currentItem || playlistItems.length <= 1) return;
    const durationMs =
      ((currentItem.displayDuration ?? playlistDefaultDuration ?? 0) || 10) * 1000;
    const ms = durationMs > 0 ? durationMs : DEFAULT_DURATION_MS;

    timerRef.current = setTimeout(goNext, ms);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIdx, currentItem, isSingleMode, playlistItems.length, playlistDefaultDuration, goNext]);

  // ── Mouse move → show controls ────────────────────────────────────────────
  const handleMouseMove = () => {
    setShowControls(true);
    if (mouseMoveTimer.current) clearTimeout(mouseMoveTimer.current);
    mouseMoveTimer.current = setTimeout(() => setShowControls(false), 3500);
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

  const handleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else if (containerRef.current) {
      requestFullscreen(containerRef.current);
    }
  };

  const handleClose = () => {
    if (isFullscreen) exitFullscreen();
    navigate(-1);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-white/60 mx-auto mb-3" />
          <p className="text-white/40 text-sm">
            {isSingleMode ? '동영상 로딩 중...' : '플레이리스트 로딩 중...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !currentItem) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-white/60 mb-4">{error ?? '콘텐츠를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ── Empty playlist ────────────────────────────────────────────────────────
  if (!isSingleMode && playlistItems.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
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
    );
  }

  const displayName = isSingleMode ? mediaName : playlistName;

  // ── Playback ──────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Media */}
      {currentItem && <MediaRenderer item={currentItem} singleMode={isSingleMode} />}

      {/* Controls overlay */}
      {showControls && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent pt-4 pb-8 px-4 flex items-start justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-white/90 text-sm font-medium truncate">{displayName}</p>
              {!isSingleMode && (
                <p className="text-white/50 text-xs mt-0.5">{currentIdx + 1} / {playlistItems.length}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Fullscreen toggle */}
              <button
                onClick={handleFullscreen}
                className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
                title={isFullscreen ? '전체화면 해제' : '브라우저 전체화면'}
              >
                <Maximize className="w-4 h-4" />
              </button>
              {/* Close */}
              <button
                onClick={handleClose}
                className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
                title="재생 종료"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom bar — F11 hint + progress dots */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pb-4 pt-8 px-4">
            {/* Progress dots (playlist only) */}
            {!isSingleMode && playlistItems.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mb-3">
                {playlistItems.map((_, i) => (
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

            {/* F11 hint */}
            {!isFullscreen && (
              <p className="text-center text-white/40 text-xs">
                <button
                  onClick={handleFullscreen}
                  className="text-white/60 hover:text-white underline mr-1"
                >
                  전체화면으로 보기
                </button>
                또는 F11 키를 누르세요
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
