/**
 * PlaylistDetailPage - 플레이리스트 상세 페이지
 *
 * WO-SIGNAGE-PLAYLIST-DETAIL-V1
 * WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1: clone → snapshot copy 전환
 *
 * 구조:
 * ├─ 뒤로가기 링크
 * ├─ 헤더: 제목, 소스 뱃지, 설명, 등록자, 메타 정보, 내 매장에 추가 버튼
 * ├─ 동영상 목록: 번호, 썸네일, 제목, 유형, 재생시간
 * └─ 미리보기 플레이어: 선택한 영상 임베드 재생
 *
 * ❌ globalContentApi.clone* 사용 금지
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Plus, Play, Clock, List, User, Calendar, RotateCw, Film } from 'lucide-react';
import { publicContentApi, type SignagePlaylist } from '../../lib/api/signageV2';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import type { SignagePlaylistItemResponse, ContentSource } from '@o4o/types/signage';
import { getMediaPlayUrl, extractYouTubeVideoId, SIGNAGE_SOURCE_LABELS, SIGNAGE_MEDIA_TYPE_LABELS } from '@o4o/types/signage';

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

function getSourceLabel(source?: ContentSource): string {
  if (!source) return '콘텐츠';
  return SIGNAGE_SOURCE_LABELS[source] ?? source;
}

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<SignagePlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    publicContentApi.getPlaylist(id)
      .then((res) => {
        if (res.success && res.data) {
          setPlaylist(res.data);
        } else {
          setError('플레이리스트를 찾을 수 없습니다.');
        }
      })
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToStore = async () => {
    if (!playlist) return;
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: playlist.id,
        assetType: 'signage',
      });
      setCopySuccess(`"${playlist.name}" — 내 매장에 추가되었습니다.`);
      setTimeout(() => {
        setCopySuccess(null);
        navigate('/store/content?tab=signage');
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

  const items = playlist?.items || [];
  const selectedItem = items[selectedItemIndex] as (SignagePlaylistItemResponse & { media?: any }) | undefined;

  // Build embed URL for selected media
  const getEmbedContent = () => {
    if (!selectedItem?.media) return null;
    const media = selectedItem.media;
    const mediaType = media.mediaType;

    if (mediaType === 'youtube') {
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

    if (mediaType === 'vimeo' && media.url) {
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

    if (mediaType === 'video' && media.url) {
      return (
        <video controls className="w-full aspect-video rounded-lg bg-black" src={media.url}>
          브라우저가 비디오 재생을 지원하지 않습니다.
        </video>
      );
    }

    if (mediaType === 'image' && media.url) {
      return <img src={media.url} alt={media.name} className="w-full rounded-lg object-contain max-h-[480px]" />;
    }

    // Fallback: external link
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
          <div className="h-8 w-2/3 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="space-y-6">
        <Link to="/signage" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 콘텐츠 허브로 돌아가기
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
          {error || '플레이리스트를 찾을 수 없습니다.'}
        </div>
      </div>
    );
  }

  const source = (playlist as any).source as ContentSource | undefined;
  const creatorName = (playlist as any).creatorName as string | undefined;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/signage" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 콘텐츠 허브
      </Link>

      {/* Success Message */}
      {copySuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-green-700">
          <Download className="h-4 w-4" />
          <span>{copySuccess}</span>
        </div>
      )}

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <List className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl font-bold text-slate-800 truncate">{playlist.name}</h1>
            </div>

            {/* Source badge + Creator */}
            <div className="flex items-center gap-3 mb-3">
              {source && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getSourceBadgeStyle(source)}`}>
                  {getSourceLabel(source)}
                </span>
              )}
              {creatorName && (
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <User className="h-3.5 w-3.5" /> {creatorName}
                </span>
              )}
            </div>

            {/* Description */}
            {playlist.description && (
              <p className="text-sm text-slate-600 mb-4">{playlist.description}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Film className="h-3.5 w-3.5" /> {playlist.itemCount || items.length}개 항목
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> 총 {formatDuration(playlist.totalDuration || 0)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {new Date(playlist.createdAt).toLocaleDateString()}
              </span>
              {playlist.isLoop && (
                <span className="flex items-center gap-1 text-blue-500">
                  <RotateCw className="h-3.5 w-3.5" /> 반복 재생
                </span>
              )}
            </div>
          </div>

          {/* Add to Store button */}
          <button
            onClick={handleAddToStore}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            내 매장에 추가
          </button>
        </div>
      </div>

      {/* ══════ Player ══════ */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5">
            {getEmbedContent()}
          </div>
          {selectedItem?.media && (
            <div className="px-5 pb-4 flex items-center justify-between text-sm text-slate-500">
              <span className="font-medium text-slate-700">{selectedItem.media.name}</span>
              <span>{selectedItemIndex + 1} / {items.length}</span>
            </div>
          )}
        </div>
      )}

      {/* ══════ Item List ══════ */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <List className="h-4 w-4 text-blue-600" />
            재생 목록
          </h2>
          <span className="text-xs text-slate-400">{items.length}개</span>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            재생 목록이 비어있습니다
          </div>
        ) : (
          <ul>
            {items.map((item: any, index: number) => {
              const media = item.media;
              const isSelected = index === selectedItemIndex;

              return (
                <li
                  key={item.id}
                  onClick={() => setSelectedItemIndex(index)}
                  className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Number */}
                  <span className={`w-6 text-center text-sm font-medium flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                    {isSelected ? <Play className="h-4 w-4 mx-auto" /> : index + 1}
                  </span>

                  {/* Icon */}
                  <div className="flex-shrink-0 w-8 text-center">
                    <Film className={`h-5 w-5 mx-auto ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isSelected ? 'font-semibold text-blue-700' : 'font-medium text-slate-700'}`}>
                      {media?.name || '(미디어 없음)'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      {media?.mediaType && (
                        <span>{SIGNAGE_MEDIA_TYPE_LABELS[media.mediaType as keyof typeof SIGNAGE_MEDIA_TYPE_LABELS] || media.mediaType}</span>
                      )}
                      {(item.displayDuration || media?.duration) && (
                        <>
                          <span>·</span>
                          <span>{formatDuration(item.displayDuration || media.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
