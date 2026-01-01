import { useState, useEffect } from 'react';
import {
  Film,
  Plus,
  Search,
  Grid,
  List,
  Trash2,
  ExternalLink,
  Clock,
  Youtube,
  Play,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { MediaSourceType } from '@/types';
import { displayApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

// Vimeo 아이콘 컴포넌트
function VimeoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z" />
    </svg>
  );
}

interface MediaData {
  id: string;
  pharmacy_id?: string;
  name: string;
  source_type: MediaSourceType;
  source_url: string;
  embed_id: string;
  thumbnail_url?: string;
  duration?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function parseVideoUrl(url: string): { type: MediaSourceType | null; embedId: string | null; thumbnailUrl: string | null } {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return {
      type: 'youtube',
      embedId: youtubeMatch[1],
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedId: vimeoMatch[1],
      thumbnailUrl: null, // Vimeo requires API call for thumbnail
    };
  }

  return { type: null, embedId: null, thumbnailUrl: null };
}

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState<MediaSourceType | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await displayApi.getMedia({
        pharmacy_id: user?.pharmacyId,
      });
      if (response.error) {
        setError(response.error.message);
      } else {
        setMedia((response.data || []) as MediaData[]);
      }
    } catch {
      setError('미디어를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await displayApi.deleteMedia(id);
      if (response.error) {
        alert(response.error.message);
      } else {
        setMedia(media.filter(m => m.id !== id));
      }
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleAddMedia = async () => {
    const parsed = parseVideoUrl(urlInput);
    if (!parsed.type || !parsed.embedId) {
      alert('유효한 YouTube 또는 Vimeo URL을 입력하세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await displayApi.createMedia({
        name: nameInput || 'Untitled',
        source_type: parsed.type,
        source_url: urlInput,
        embed_id: parsed.embedId,
        pharmacy_id: user?.pharmacyId,
        thumbnail_url: parsed.thumbnailUrl || undefined,
        description: descInput || undefined,
      });

      if (response.error) {
        alert(response.error.message);
      } else {
        setMedia([response.data as MediaData, ...media]);
        setUrlInput('');
        setNameInput('');
        setDescInput('');
        setIsAddModalOpen(false);
      }
    } catch {
      alert('추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMedia = media.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.source_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-2 text-slate-600">로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <button
          onClick={loadMedia}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Film className="w-7 h-7 text-purple-600" />
            미디어 라이브러리
          </h1>
          <p className="text-slate-500 mt-1">
            YouTube/Vimeo 영상을 추가하고 관리하세요
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          영상 추가
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="영상 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as MediaSourceType | 'all')}
          className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">모든 플랫폼</option>
          <option value="youtube">YouTube</option>
          <option value="vimeo">Vimeo</option>
        </select>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 ${
              viewMode === 'grid'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 ${
              viewMode === 'list'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-primary-300 hover:shadow-lg transition-all group"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-slate-100 relative">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary-600 ml-0.5" />
                  </button>
                </div>
                {/* Platform Badge */}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                    item.source_type === 'youtube'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.source_type === 'youtube' ? (
                      <Youtube className="w-3 h-3" />
                    ) : (
                      <VimeoIcon className="w-3 h-3" />
                    )}
                    {item.source_type === 'youtube' ? 'YouTube' : 'Vimeo'}
                  </span>
                </div>
                {/* Duration */}
                {item.duration && (
                  <div className="absolute bottom-2 right-2">
                    <span className="px-2 py-1 text-xs font-medium bg-black/70 text-white rounded">
                      {formatDuration(item.duration)}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-slate-800 truncate">{item.name}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {item.description || '설명 없음'}
                </p>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 text-center text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    원본
                  </a>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">영상</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">플랫폼</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">재생시간</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-slate-600">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedia.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.name}
                          className="w-16 h-9 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-9 bg-slate-100 rounded flex items-center justify-center">
                          <Film className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-sm text-slate-500">{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.source_type === 'youtube'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.source_type === 'youtube' ? 'YouTube' : 'Vimeo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      {item.duration ? formatDuration(item.duration) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-white rounded-xl shadow-xl z-50 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">영상 추가</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">영상 이름</label>
                <input
                  type="text"
                  placeholder="영상 제목 입력"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">영상 URL</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">YouTube 또는 Vimeo URL을 입력하세요</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">설명 (선택)</label>
                <textarea
                  placeholder="영상에 대한 간단한 설명"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddMedia}
                disabled={!urlInput || !nameInput || isSubmitting}
                className="flex-1 px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                추가
              </button>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {filteredMedia.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <Film className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-slate-800">미디어가 없습니다</h3>
          <p className="mt-2 text-slate-500">YouTube 또는 Vimeo 영상을 추가하세요</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            영상 추가
          </button>
        </div>
      )}
    </div>
  );
}
