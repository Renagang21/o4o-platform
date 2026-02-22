/**
 * Content Hub Page
 *
 * WO-SIGNAGE-CONTENT-HUB-V1
 * WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clone 경로 제거, publicContentApi 단일 사용
 *
 * - 디지털 사이니지 콘텐츠 허브 페이지
 * - 운영자/공급자/커뮤니티 콘텐츠를 탭별로 표시
 * - ❌ globalContentApi.clone* 사용 금지
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video as VideoIcon, List, AlertCircle } from 'lucide-react';
import { publicContentApi, SignagePlaylist, SignageMedia, type ContentSource } from '@/lib/api/signageV2';
import { ContentPagination } from '@o4o/ui';

type ContentType = 'playlists' | 'media';
const PAGE_SIZE = 9;

export default function ContentHubPage() {
  const navigate = useNavigate();
  const [activeSource, setActiveSource] = useState<ContentSource>('community');
  const [contentType, setContentType] = useState<ContentType>('playlists');

  // Data states
  const [allPlaylists, setAllPlaylists] = useState<SignagePlaylist[]>([]);
  const [allMedia, setAllMedia] = useState<SignageMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Load content when source or type changes
  useEffect(() => {
    loadContent();
    setCurrentPage(1);
  }, [activeSource, contentType]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      if (contentType === 'playlists') {
        const result = await publicContentApi.listPlaylists(activeSource, 'k-cosmetics', { page: 1, limit: 50 });
        if (result.success && result.data) {
          setAllPlaylists(result.data.items || []);
        } else {
          setError(result.error || 'Failed to load playlists');
        }
      } else {
        const result = await publicContentApi.listMedia(activeSource, 'k-cosmetics', { page: 1, limit: 50 });
        if (result.success && result.data) {
          setAllMedia(result.data.items || []);
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

  // Paginated data
  const playlists = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return allPlaylists.slice(start, start + PAGE_SIZE);
  }, [allPlaylists, currentPage]);

  const media = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return allMedia.slice(start, start + PAGE_SIZE);
  }, [allMedia, currentPage]);

  const totalItems = contentType === 'playlists' ? allPlaylists.length : allMedia.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSourceLabel = (source: ContentSource): string => {
    switch (source) {
      case 'hq':
        return '운영자 콘텐츠';
      case 'supplier':
        return '공급자 콘텐츠';
      case 'community':
        return '커뮤니티 콘텐츠';
    }
  };

  const getSourceDescription = (source: ContentSource): string => {
    switch (source) {
      case 'hq':
        return 'HQ 및 서비스 운영자가 제작한 공식 콘텐츠';
      case 'supplier':
        return '네뚜레 공급자 대시보드에서 등록한 콘텐츠';
      case 'community':
        return '포럼 및 커뮤니티에서 공유된 콘텐츠';
    }
  };

  const renderPlaylistCard = (playlist: SignagePlaylist) => (
    <div
      key={playlist.id}
      onClick={() => navigate(`signage/playlist/${playlist.id}`)}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
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
      <div className="px-4 pb-4">
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
    </div>
  );

  const renderMediaCard = (item: SignageMedia) => (
    <div
      key={item.id}
      onClick={() => navigate(`signage/media/${item.id}`)}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
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
      {item.thumbnailUrl && (
        <div className="px-4">
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-full h-40 object-cover rounded-md"
          />
        </div>
      )}
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
    </div>
  );

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
            {contentType === 'playlists' ? '플레이리스트가' : '미디어가'} 없습니다.
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contentType === 'playlists'
            ? playlists.map(renderPlaylistCard)
            : media.map(renderMediaCard)}
        </div>
        {totalPages > 1 && (
          <div className="mt-6">
            <ContentPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              showItemRange
              totalItems={totalItems}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">디지털 사이니지 콘텐츠</h1>
        <p className="text-slate-500 mt-1">
          동영상과 플레이리스트를 탐색할 수 있습니다
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            {(['community', 'hq', 'supplier'] as ContentSource[]).map((source) => (
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
