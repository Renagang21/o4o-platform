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
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Loader2, AlertCircle, List, Calendar } from 'lucide-react';
import { publicContentApi, type SignagePlaylist } from '../../lib/api/signageV2';
import { getAccessToken } from '../../contexts/AuthContext';
import { useAuth } from '../../contexts';
import { fetchActiveContent, type StorePlaylistActiveItem } from '../../api/signageSchedule';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';
const SIGNAGE_BASE = `${API_BASE_URL}/api/signage/${SERVICE_KEY}`;
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

// ── Main ─────────────────────────────────────────────────────────────────────
export function SignagePlaybackPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isScheduleMode = playlistId === '_schedule';

  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
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

    // ── Schedule mode ───────────────────────────────────────────────────────
    if (isScheduleMode) {
      const orgId = user?.kpaMembership?.organizationId;
      if (!orgId) {
        setError('조직 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      fetchActiveContent(orgId)
        .then((result) => {
          if (!result.schedule || result.items.length === 0) {
            setError('현재 시간에 적용된 스케줄이 없습니다.\n게시된 플레이리스트를 직접 선택해 재생하세요.');
            return;
          }
          const converted = result.items.map(storeItemToPlaybackItem);
          setPlaybackData({
            name: result.schedule.name,
            isLoop: true,
            defaultDuration: 10,
            items: converted,
          });
        })
        .catch(() => setError('활성 콘텐츠를 불러오지 못했습니다.'))
        .finally(() => setLoading(false));
      return;
    }

    // ── Direct mode (existing flow) ─────────────────────────────────────────
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
        if (data?.id) { setPlaybackData(signagePlaylistToPlaybackData(data)); return; }
        throw new Error('not found');
      })
      .catch(() =>
        // 2차: 공개 API (HQ/community 플레이리스트)
        publicContentApi.getPlaylist(playlistId).then((res) => {
          if (res.success && res.data) {
            setPlaybackData(signagePlaylistToPlaybackData(res.data));
          } else {
            setError('플레이리스트를 찾을 수 없습니다.');
          }
        }),
      )
      .catch(() => setError('플레이리스트를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [playlistId]);

  // ── 아이템 순서 정렬 ────────────────────────────────────────────────────────
  const items = playbackData?.items ?? [];
  const currentItem = items[currentIdx] ?? null;

  // ── 타이머 기반 자동 전환 ───────────────────────────────────────────────────
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
    if (!currentItem || !playbackData) return;
    const durationMs =
      ((currentItem.displayDuration ?? playbackData.defaultDuration ?? 0) || 10) * 1000;
    const ms = durationMs > 0 ? durationMs : DEFAULT_DURATION_MS;

    timerRef.current = setTimeout(goNext, ms);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentIdx, currentItem, playbackData, goNext]);

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
          <p className="text-white/40 text-sm">
            {isScheduleMode ? '스케줄 콘텐츠 로딩 중...' : '플레이리스트 로딩 중...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !playbackData) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center max-w-md">
          {isScheduleMode ? (
            <Calendar className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          ) : (
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          )}
          <p className="text-white/60 mb-4 whitespace-pre-line">{error ?? '플레이리스트를 찾을 수 없습니다.'}</p>
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

      {/* Schedule mode info */}
      {isScheduleMode && showControls && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-black/50 rounded-lg px-3 py-1.5 text-xs text-white/60 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          스케줄 기반 재생 · 변경 시 새로고침 필요
        </div>
      )}

      {/* Controls overlay */}
      {showControls && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="text-white/60 text-xs bg-black/40 px-2 py-1 rounded-md max-w-[200px] truncate">
            {playbackData.name} ({currentIdx + 1}/{items.length})
          </span>
          <button
            onClick={() => isScheduleMode ? navigate('/store/marketing/signage/player') : navigate(-1)}
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
