/**
 * MediaDetailPage - 동영상/미디어 상세 페이지
 *
 * WO-SIGNAGE-MEDIA-DETAIL-V1
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Play, Clock, User, Calendar, Film } from 'lucide-react';
import { publicContentApi, globalContentApi, type SignageMedia } from '@/lib/api/signageV2';
import type { ContentSource } from '@/lib/api/signageV2';
import { extractYouTubeVideoId, getMediaPlayUrl, SIGNAGE_SOURCE_LABELS, SIGNAGE_MEDIA_TYPE_LABELS } from '@o4o/types/signage';

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

export default function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [media, setMedia] = useState<SignageMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    publicContentApi.getMedia(id, 'k-cosmetics')
      .then((res) => {
        if (res.success && res.data) {
          setMedia(res.data);
        } else {
          setError('미디어를 찾을 수 없습니다.');
        }
      })
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleClone = async () => {
    if (!media) return;
    try {
      const result = await globalContentApi.cloneMedia(media.id, 'k-cosmetics');
      if (result.success) {
        setCloneSuccess(`"${media.name}"를 내 대시보드로 가져왔습니다.`);
        setTimeout(() => setCloneSuccess(null), 3000);
      } else {
        setError(result.error || '미디어를 복사하지 못했습니다.');
      }
    } catch {
      setError('미디어 복사 중 오류가 발생했습니다.');
    }
  };

  const getEmbedContent = () => {
    if (!media) return null;

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

    if (media.mediaType === 'vimeo' && media.url) {
      const vimeoMatch = media.url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
            className="w-full aspect-video rounded-lg"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={media.name}
          />
        );
      }
    }

    if (media.mediaType === 'video' && media.url) {
      return (
        <video controls className="w-full aspect-video rounded-lg bg-black" src={media.url}>
          브라우저가 비디오 재생을 지원하지 않습니다.
        </video>
      );
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

  if (error || !media) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 뒤로가기
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
          {error || '미디어를 찾을 수 없습니다.'}
        </div>
      </div>
    );
  }

  const typeLabel = SIGNAGE_MEDIA_TYPE_LABELS[media.mediaType] || media.mediaType;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 콘텐츠 허브
      </button>

      {cloneSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-green-700">
          <Download className="h-4 w-4" />
          <span>{cloneSuccess}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5">{getEmbedContent()}</div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-800 mb-3">{media.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {media.source && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getSourceBadgeStyle(media.source)}`}>
                  {SIGNAGE_SOURCE_LABELS[media.source] ?? media.source}
                </span>
              )}
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {typeLabel}
              </span>
              {media.creatorName && (
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <User className="h-3.5 w-3.5" /> {media.creatorName}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
              {media.duration != null && media.duration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(media.duration)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {new Date(media.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Film className="h-3.5 w-3.5" /> {typeLabel}
              </span>
            </div>
          </div>
          <button
            onClick={handleClone}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            가져오기
          </button>
        </div>
      </div>
    </div>
  );
}
