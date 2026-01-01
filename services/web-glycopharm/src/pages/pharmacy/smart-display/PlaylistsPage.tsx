import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ListVideo,
  Plus,
  Search,
  Play,
  MoreVertical,
  Clock,
  Film,
  Share2,
  Trash2,
  Edit2,
  Copy,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { PlaylistStatus } from '@/types';
import { displayApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface PlaylistData {
  id: string;
  pharmacy_id?: string;
  name: string;
  description?: string;
  status: PlaylistStatus;
  is_public: boolean;
  total_duration: number;
  like_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  items?: unknown[];
}

const statusLabels: Record<PlaylistStatus, { label: string; color: string }> = {
  active: { label: '활성', color: 'bg-green-100 text-green-700' },
  draft: { label: '초안', color: 'bg-slate-100 text-slate-600' },
  archived: { label: '보관됨', color: 'bg-orange-100 text-orange-700' },
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
}

export default function PlaylistsPage() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlaylistStatus | 'all'>('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await displayApi.getPlaylists({
        pharmacy_id: user?.pharmacyId,
      });
      if (response.error) {
        setError(response.error.message);
      } else {
        setPlaylists((response.data || []) as PlaylistData[]);
      }
    } catch (err) {
      setError('플레이리스트를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await displayApi.deletePlaylist(id);
      if (response.error) {
        alert(response.error.message);
      } else {
        setPlaylists(playlists.filter(p => p.id !== id));
        setActiveMenu(null);
      }
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const filteredPlaylists = playlists.filter((playlist) => {
    const matchesSearch = playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      playlist.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || playlist.status === statusFilter;
    return matchesSearch && matchesStatus;
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
          onClick={loadPlaylists}
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
            <ListVideo className="w-7 h-7 text-blue-600" />
            플레이리스트
          </h1>
          <p className="text-slate-500 mt-1">
            영상 재생 목록을 만들고 관리하세요
          </p>
        </div>
        <NavLink
          to="/pharmacy/smart-display/playlists/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 플레이리스트
        </NavLink>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="플레이리스트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PlaylistStatus | 'all')}
          className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">모든 상태</option>
          <option value="active">활성</option>
          <option value="draft">초안</option>
          <option value="archived">보관됨</option>
        </select>
      </div>

      {/* Playlist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlaylists.map((playlist) => {
          const statusInfo = statusLabels[playlist.status];
          return (
            <div
              key={playlist.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-primary-300 hover:shadow-lg transition-all"
            >
              {/* Thumbnail / Preview */}
              <div className="aspect-video bg-slate-100 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="w-8 h-8 text-primary-600 ml-1" />
                  </div>
                </div>
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                {/* Public Badge */}
                {playlist.is_public && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      공개
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{playlist.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {playlist.description || '설명 없음'}
                    </p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === playlist.id ? null : playlist.id)}
                      className="p-1 rounded-lg hover:bg-slate-100"
                    >
                      <MoreVertical className="w-5 h-5 text-slate-400" />
                    </button>
                    {activeMenu === playlist.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border py-1 z-50">
                          <NavLink
                            to={`/pharmacy/smart-display/playlists/${playlist.id}/edit`}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            편집
                          </NavLink>
                          <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Copy className="w-4 h-4" />
                            복제
                          </button>
                          <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            미리보기
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => handleDelete(playlist.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Film className="w-4 h-4" />
                    {playlist.items?.length || 0}개 영상
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(playlist.total_duration)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <NavLink
                    to={`/pharmacy/smart-display/playlists/${playlist.id}`}
                    className="flex-1 px-3 py-2 text-center text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    상세보기
                  </NavLink>
                  <button className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPlaylists.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <ListVideo className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-slate-800">플레이리스트가 없습니다</h3>
          <p className="mt-2 text-slate-500">새 플레이리스트를 만들어 영상을 관리하세요</p>
          <NavLink
            to="/pharmacy/smart-display/playlists/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 플레이리스트
          </NavLink>
        </div>
      )}
    </div>
  );
}
