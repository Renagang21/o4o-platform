/**
 * SignagePlaybackPage — KPA Society
 * WO-KPA-STORE-SIGNAGE-IA-RESTRUCTURE-V2
 *
 * /store/marketing/signage/play/:playlistId
 * 단일 Playlist fullscreen 루프 재생
 *
 * GlycoPharm SignagePlaybackPage에서 포팅:
 * - SERVICE_KEY: kpa-society
 * - 인증: getAccessToken() + fetch
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Loader2, AlertCircle, List } from 'lucide-react';
import { publicContentApi, type SignagePlaylist, type SignagePlaylistItem } from '../../lib/api/signageV2';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';
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

// ── Main ─────────────────────────────────────────────────────────────────────
export function SignagePlaybackPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<SignagePlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseMoveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 플레이리스트 로드 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!playlistId) return;
    setLoading(true);

    const token = getAccessToken();

    // 1차: 인증 API (내 플레이리스트)
    fetch(`${SIGNAGE_BASE}/playlists/${playlistId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((json) => {
        const data = json?.data ?? json;
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

  // ── 타이머 기반 자동 전환 ───────────────────────────────────────────────────
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
    if (!currentItem || !playlist) return;
    const durationMs =
      ((currentItem.displayDuration ?? playlist.defaultDuration ?? 0) || 10) * 1000;
    const ms = durationMs > 0 ? durationMs : DEFAULT_DURATION_MS;

    timerRef.current = setTimeout(goNext, ms);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIdx, currentItem, playlist, goNext]);

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

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-white/60 mx-auto mb-3" />
          <p className="text-white/40 text-sm">플레이리스트 로딩 중...</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !playlist) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
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
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (items.length === 0) {
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

  // ── Playback ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
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

      {/* Controls overlay */}
      {showControls && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="text-white/60 text-xs bg-black/40 px-2 py-1 rounded-md max-w-[200px] truncate">
            {playlist.name} ({currentIdx + 1}/{items.length})
          </span>
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
            title="재생 종료"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
