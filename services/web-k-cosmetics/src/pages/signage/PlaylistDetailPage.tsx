/**
 * PlaylistDetailPage - 플레이리스트 상세 페이지
 *
 * WO-SIGNAGE-PLAYLIST-DETAIL-V1
 * WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clone 경로 제거
 *
 * ❌ globalContentApi.clone* 사용 금지
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Clock, User, Calendar, Film, List } from 'lucide-react';
import { publicContentApi, type SignagePlaylist, type SignagePlaylistItem } from '@/lib/api/signageV2';
import type { ContentSource } from '@/lib/api/signageV2';
import { extractYouTubeVideoId, getMediaPlayUrl, getMediaThumbnailUrl, SIGNAGE_SOURCE_LABELS, SIGNAGE_MEDIA_TYPE_LABELS } from '@o4o/types/signage';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function getSourceBadgeStyle(source?: ContentSource): string {
  switch (source) {
    case 'hq': return 'bg-blue-100 text-blue-700';
    case 'supplier': return 'bg-amber-100 text-amber-700';
    case 'community': return 'bg-green-100 text-green-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<SignagePlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SignagePlaylistItem | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    publicContentApi.getPlaylist(id, 'k-cosmetics')
      .then((res) => {
        if (res.success && res.data) {
          setPlaylist(res.data);
          if (res.data.items?.[0]) setSelectedItem(res.data.items[0]);
        } else {
          setError('플레이리스트를 찾을 수 없습니다.');
        }
      })
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const getEmbedContent = () => {
    const media = selectedItem?.media;
    if (!media) return (
      <div className="w-full aspect-video rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
        항목을 선택하세요
      </div>
    );

    if (media.mediaType === 'youtube') {
      const videoId = extractYouTubeVideoId(media.url);
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            className="w-full aspect-video rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={media.name}
          />
        );
      }
    }

    if (media.mediaType === 'video' && media.url) {
      return <video controls className="w-full aspect-video rounded-lg bg-black" src={media.url} />;
    }

    if (media.mediaType === 'image' && media.url) {
      return <img src={media.url} alt={media.name} className="w-full rounded-lg object-contain max-h-[480px]" />;
    }

    const playUrl = getMediaPlayUrl(media);
    if (playUrl) {
      return (
        <div className="w-full aspect-video rounded-lg bg-slate-100 flex items-center justify-center">
          <a href={playUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
            <Play className="h-5 w-5" /> 새 창에서 열기
          </a>
        </div>
      );
    }

    return (
      <div className="w-full aspect-video rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
        미리보기를 사용할 수 없습니다
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="h-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-2/3 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 뒤로가기
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
          {error || '플레이리스트를 찾을 수 없습니다.'}
        </div>
      </div>
    );
  }

  const items = playlist.items || [];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 콘텐츠 허브
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800 mb-3">{playlist.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {playlist.source && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getSourceBadgeStyle(playlist.source)}`}>
                {SIGNAGE_SOURCE_LABELS[playlist.source] ?? playlist.source}
              </span>
            )}
            {playlist.creatorName && (
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <User className="h-3.5 w-3.5" /> {playlist.creatorName}
              </span>
            )}
          </div>
          {playlist.description && (
            <p className="text-sm text-slate-600 mb-3">{playlist.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1"><List className="h-3.5 w-3.5" /> {items.length}개 항목</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(playlist.totalDuration || 0)}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(playlist.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Player */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5">{getEmbedContent()}</div>
        </div>
      )}

      {/* Item list */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">재생 목록</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map((item, idx) => {
              const isSelected = selectedItem?.id === item.id;
              const thumb = item.media ? getMediaThumbnailUrl(item.media) : null;
              const typeLabel = item.media ? (SIGNAGE_MEDIA_TYPE_LABELS[item.media.mediaType] || item.media.mediaType) : '';
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <span className={`text-sm font-medium w-6 text-center ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>{idx + 1}</span>
                  <div className="flex-shrink-0 w-16 h-10 rounded overflow-hidden bg-slate-100">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="h-4 w-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm truncate block ${isSelected ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>
                      {item.media?.name || '미디어'}
                    </span>
                    <span className="text-xs text-slate-400">{typeLabel}</span>
                  </div>
                  {item.media?.duration != null && item.media.duration > 0 && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDuration(item.media.duration)}
                    </span>
                  )}
                  {isSelected && <Play className="h-4 w-4 text-blue-600" fill="currentColor" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
