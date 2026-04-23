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
import { publicContentApi, SignagePlaylist, SignageMedia } from '@/lib/api/signageV2';
import { ContentPagination } from '@o4o/ui';

type ContentType = 'playlists' | 'media';
const PAGE_SIZE = 9;

export default function ContentHubPage() {
  const navigate = useNavigate();
  const [contentType, setContentType] = useState<ContentType>('playlists');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Data states
  const [allPlaylists, setAllPlaylists] = useState<SignagePlaylist[]>([]);
  const [allMedia, setAllMedia] = useState<SignageMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Load content when type changes
  useEffect(() => {
    loadContent();
    setCurrentPage(1);
    setSelectedTags([]);
  }, [contentType]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      if (contentType === 'playlists') {
        const result = await publicContentApi.listPlaylists(undefined, 'k-cosmetics', { page: 1, limit: 50 });
        if (result.success && result.data) {
          setAllPlaylists(result.data.items || []);
        } else {
          setError(result.error || 'Failed to load playlists');
        }
      } else {
        const result = await publicContentApi.listMedia(undefined, 'k-cosmetics', { page: 1, limit: 50 });
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

  // Tag helpers
  const availableTags = useMemo(() => {
    const all = [...allPlaylists, ...allMedia].flatMap((item) => item.tags ?? []);
    return [...new Set(all)].sort();
  }, [allPlaylists, allMedia]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1);
  };

  // Filtered + paginated data
  const filteredPlaylists = useMemo(() => {
    if (selectedTags.length === 0) return allPlaylists;
    return allPlaylists.filter((p) => selectedTags.some((tag) => (p.tags ?? []).includes(tag)));
  }, [allPlaylists, selectedTags]);

  const filteredMedia = useMemo(() => {
    if (selectedTags.length === 0) return allMedia;
    return allMedia.filter((m) => selectedTags.some((tag) => (m.tags ?? []).includes(tag)));
  }, [allMedia, selectedTags]);

  const playlists = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPlaylists.slice(start, start + PAGE_SIZE);
  }, [filteredPlaylists, currentPage]);

  const media = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredMedia.slice(start, start + PAGE_SIZE);
  }, [filteredMedia, currentPage]);

  const totalItems = contentType === 'playlists' ? filteredPlaylists.length : filteredMedia.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        {(playlist.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {(playlist.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">#{tag}</span>
            ))}
            {(playlist.tags ?? []).length > 3 && (
              <span className="text-[11px] text-slate-400">+{(playlist.tags ?? []).length - 3}</span>
            )}
          </div>
        )}
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
        {(item.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {(item.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">#{tag}</span>
            ))}
            {(item.tags ?? []).length > 3 && (
              <span className="text-[11px] text-slate-400">+{(item.tags ?? []).length - 3}</span>
            )}
          </div>
        )}
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
            {contentType === 'playlists' ? '플레이리스트가' : '개별 영상이'} 없습니다.
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
        <h1 className="text-2xl font-bold text-slate-800">안내 영상 · 자료</h1>
        <p className="text-slate-500 mt-1">
          영상과 플레이리스트를 검색하고 활용하세요
        </p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 space-y-6">
          {/* Tag Filter */}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
          )}

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
              개별 영상
            </button>
          </div>

          {/* Content Grid */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
