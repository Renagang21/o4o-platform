/**
 * Signage Content Hub Page - KPA-Society
 *
 * WO-SIGNAGE-CONTENT-HUB-V1-A
 * - 디지털 사이니지 콘텐츠 허브 페이지 (조직용 용어)
 * - 운영자/공급자/커뮤니티 콘텐츠를 탭별로 표시
 * - 보기 + 내 대시보드로 가져오기(Clone) 기능
 * - 조직 친화적 용어 사용 ("안내 영상 · 자료")
 */

import { useEffect, useState } from 'react';
import { Download, Video as VideoIcon, List, AlertCircle, ExternalLink, Play } from 'lucide-react';
import { publicContentApi, globalContentApi, SignagePlaylist, SignageMedia, type ContentSource } from '../../lib/api/signageV2';
import { getMediaThumbnailUrl, getMediaPlayUrl } from '@o4o/types/signage';

type ContentType = 'playlists' | 'media';

export default function ContentHubPage() {
  const [activeSource, setActiveSource] = useState<ContentSource>('hq');
  const [contentType, setContentType] = useState<ContentType>('playlists');

  // Data states
  const [playlists, setPlaylists] = useState<SignagePlaylist[]>([]);
  const [media, setMedia] = useState<SignageMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  // Load content when source or type changes
  useEffect(() => {
    loadContent();
  }, [activeSource, contentType]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      // WO-APP-SIGNAGE-PUBLIC-API-PHASE1-V1: Use public API for reading (no auth required)
      if (contentType === 'playlists') {
        const result = await publicContentApi.listPlaylists(activeSource, 'kpa-society', { page: 1, limit: 50 });
        if (result.success && result.data) {
          setPlaylists(result.data.items || []);
        } else {
          setError(result.error || 'Failed to load playlists');
        }
      } else {
        const result = await publicContentApi.listMedia(activeSource, 'kpa-society', { page: 1, limit: 50 });
        if (result.success && result.data) {
          setMedia(result.data.items || []);
        } else {
          setError(result.error || 'Failed to load media');
        }
      }
    } catch (err) {
      setError('An error occurred while loading content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClonePlaylist = async (playlistId: string, playlistName: string) => {
    try {
      const result = await globalContentApi.clonePlaylist(playlistId, 'kpa-society');
      if (result.success) {
        setCloneSuccess(`"${playlistName}"를 내 대시보드로 가져왔습니다. 대시보드에서 확인하세요.`);
        setTimeout(() => setCloneSuccess(null), 3000);
      } else {
        setError(result.error || '플레이리스트를 복사하지 못했습니다.');
      }
    } catch (error) {
      setError('플레이리스트 복사 중 오류가 발생했습니다.');
    }
  };

  const handleCloneMedia = async (mediaId: string, mediaName: string) => {
    try {
      const result = await globalContentApi.cloneMedia(mediaId, 'kpa-society');
      if (result.success) {
        setCloneSuccess(`"${mediaName}"를 내 대시보드로 가져왔습니다. 대시보드에서 확인하세요.`);
        setTimeout(() => setCloneSuccess(null), 3000);
      } else {
        setError(result.error || '미디어를 복사하지 못했습니다.');
      }
    } catch (error) {
      setError('미디어 복사 중 오류가 발생했습니다.');
    }
  };

  const getSourceLabel = (source: ContentSource): string => {
    switch (source) {
      case 'hq':
        return '운영자 제공';
      case 'supplier':
        return '파트너 제공';
      case 'community':
        return '커뮤니티 공유';
      default:
        return '알 수 없음';
    }
  };

  const getSourceDescription = (source: ContentSource): string => {
    switch (source) {
      case 'hq':
        return '약사회 및 관련 기관에서 공식적으로 제공하는 안내·교육 자료';
      case 'supplier':
        return '협력 기관 및 파트너가 등록한 안내 자료';
      case 'community':
        return '회원 간 공유된 유용한 안내 자료';
      default:
        return '';
    }
  };

  const renderPlaylistCard = (playlist: SignagePlaylist) => {
    // Get first item's media URL if available for preview
    const firstItem = playlist.items?.[0];
    const previewUrl = firstItem?.media ? getMediaPlayUrl(firstItem.media) : null;
    const previewThumbnail = firstItem?.media ? getMediaThumbnailUrl(firstItem.media) : null;

    return (
      <div key={playlist.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
        {/* Playlist header - clickable if preview available */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <List className="h-5 w-5 text-blue-600" />
                {playlist.name}
              </h3>
              {playlist.description && (
                <p className="text-sm text-slate-500 mt-2">{playlist.description}</p>
              )}
            </div>
          </div>
        </div>
        {/* Preview thumbnail if available */}
        {previewThumbnail && previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 relative group cursor-pointer"
          >
            <div className="relative">
              <img
                src={previewThumbnail}
                alt={`${playlist.name} 미리보기`}
                className="w-full h-32 object-cover rounded-md"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md pointer-events-none">
                <Play className="h-10 w-10 text-white" fill="white" />
              </div>
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded pointer-events-none">
                {playlist.itemCount}개 항목
              </span>
            </div>
          </a>
        )}
        <div className="p-4">
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>항목 수:</span>
              <span className="font-medium">{playlist.itemCount || 0}개</span>
            </div>
            <div className="flex items-center justify-between">
              <span>총 재생 시간:</span>
              <span className="font-medium">{Math.floor(playlist.totalDuration / 60)}분 {playlist.totalDuration % 60}초</span>
            </div>
            <div className="flex items-center justify-between">
              <span>등록일:</span>
              <span className="font-medium">{new Date(playlist.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              보기
            </a>
          )}
          <button
            onClick={() => handleClonePlaylist(playlist.id, playlist.name)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors"
          >
            <Download className="h-4 w-4" />
            가져오기
          </button>
        </div>
      </div>
    );
  };

  const renderMediaCard = (item: SignageMedia) => {
    const playUrl = getMediaPlayUrl(item);
    const thumbnailUrl = getMediaThumbnailUrl(item);

    return (
      <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
        {/* Clickable thumbnail area */}
        <a
          href={playUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="block cursor-pointer group"
        >
          <div className="p-4 pb-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 group-hover:text-primary-700 transition-colors">
                  {item.mediaType === 'video' || item.mediaType === 'youtube' || item.mediaType === 'vimeo' ? (
                    <VideoIcon className="h-5 w-5 text-purple-600" />
                  ) : (
                    <VideoIcon className="h-5 w-5 text-green-600" />
                  )}
                  {item.name}
                </h3>
              </div>
              <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{item.mediaType}</span>
            </div>
          </div>
          {/* Thumbnail with play overlay */}
          <div className="px-4 pt-3 relative">
            {thumbnailUrl ? (
              <div className="relative">
                <img
                  src={thumbnailUrl}
                  alt={item.name}
                  className="w-full h-40 object-cover rounded-md"
                />
                {/* Play overlay - pointer-events: none */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md pointer-events-none">
                  <Play className="h-12 w-12 text-white" fill="white" />
                </div>
              </div>
            ) : (
              <div className="w-full h-40 bg-slate-100 rounded-md flex items-center justify-center">
                <VideoIcon className="h-12 w-12 text-slate-300" />
              </div>
            )}
          </div>
        </a>
        <div className="p-4">
          <div className="space-y-2 text-sm text-slate-600">
            {item.duration && (
              <div className="flex items-center justify-between">
                <span>재생 시간:</span>
                <span className="font-medium">{item.duration}초</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>등록일:</span>
              <span className="font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          {playUrl && (
            <a
              href={playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              보기
            </a>
          )}
          <button
            onClick={() => handleCloneMedia(item.id, item.name)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors"
          >
            <Download className="h-4 w-4" />
            가져오기
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="h-6 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4 mb-4" />
              <div className="h-32 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="h-10 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      );
    }

    const items = contentType === 'playlists' ? playlists : media;

    if (items.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">
            아직 {contentType === 'playlists' ? '플레이리스트가' : '미디어가'} 없습니다. 다른 소스 탭을 확인해보세요.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentType === 'playlists'
          ? playlists.map(renderPlaylistCard)
          : media.map(renderMediaCard)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">안내 영상 · 자료</h1>
        <p className="text-slate-500 mt-1">
          약사회 및 관련 기관에서 제공하는 안내·교육 영상을 확인하고 활용할 수 있습니다
        </p>
      </div>

      {/* Success Message */}
      {cloneSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-green-700">
          <Download className="h-4 w-4" />
          <span>{cloneSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            {(['hq', 'supplier', 'community'] as ContentSource[]).map((source) => (
              <button
                key={source}
                onClick={() => setActiveSource(source)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeSource === source
                    ? 'text-primary-700 border-b-2 border-primary-700 bg-primary-50'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {getSourceLabel(source)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Source Description */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">{getSourceDescription(activeSource)}</p>
          </div>

          {/* Content Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setContentType('playlists')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                contentType === 'playlists'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <List className="h-4 w-4" />
              플레이리스트
            </button>
            <button
              onClick={() => setContentType('media')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                contentType === 'media'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <VideoIcon className="h-4 w-4" />
              동영상
            </button>
          </div>

          {/* Content Grid */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
