import { useState } from 'react';
import {
  Share2,
  Search,
  Heart,
  Download,
  Eye,
  TrendingUp,
  Clock,
} from 'lucide-react';
import type { SharedPlaylist } from '@/types';

// Mock 데이터
const mockSharedPlaylists: SharedPlaylist[] = [
  {
    id: '1',
    playlistId: 'pl-1',
    playlist: {
      id: 'pl-1',
      pharmacyId: 'other-1',
      name: '당뇨 환자 교육 컬렉션',
      description: '당뇨병 관리에 필요한 기초 교육 영상 모음',
      items: [],
      status: 'active',
      isPublic: true,
      totalDuration: 3600,
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-18T10:00:00Z',
    },
    pharmacyName: '건강한약국',
    pharmacyId: 'other-1',
    description: '당뇨병 환자분들을 위한 기초 교육 영상입니다. 혈당 관리, 식이요법 등을 다룹니다.',
    tags: ['당뇨', '교육', '혈당관리'],
    likeCount: 42,
    downloadCount: 15,
    isLikedByMe: false,
    createdAt: '2024-01-10T09:00:00Z',
  },
  {
    id: '2',
    playlistId: 'pl-2',
    playlist: {
      id: 'pl-2',
      pharmacyId: 'other-2',
      name: '혈압 관리 시리즈',
      description: '고혈압 환자를 위한 생활 수칙 안내',
      items: [],
      status: 'active',
      isPublic: true,
      totalDuration: 2400,
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
    },
    pharmacyName: '온누리약국',
    pharmacyId: 'other-2',
    description: '고혈압 관리를 위한 생활 수칙과 운동법을 소개합니다.',
    tags: ['혈압', '건강', '운동'],
    likeCount: 28,
    downloadCount: 8,
    isLikedByMe: true,
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: '3',
    playlistId: 'pl-3',
    playlist: {
      id: 'pl-3',
      pharmacyId: 'other-3',
      name: '계절별 건강 관리',
      description: '계절에 따른 건강 관리 팁',
      items: [],
      status: 'active',
      isPublic: true,
      totalDuration: 1800,
      createdAt: '2024-01-22T09:00:00Z',
      updatedAt: '2024-01-22T09:00:00Z',
    },
    pharmacyName: '참조은약국',
    pharmacyId: 'other-3',
    description: '계절 변화에 따른 건강 관리 요령을 안내하는 영상 모음입니다.',
    tags: ['계절건강', '일반', '홍보'],
    likeCount: 65,
    downloadCount: 23,
    isLikedByMe: false,
    createdAt: '2024-01-22T09:00:00Z',
  },
];

const sortOptions = [
  { value: 'popular', label: '인기순', icon: TrendingUp },
  { value: 'recent', label: '최신순', icon: Clock },
  { value: 'downloads', label: '다운로드순', icon: Download },
];

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  return `${minutes}분`;
}

export default function PlaylistForumPage() {
  const [playlists] = useState<SharedPlaylist[]>(mockSharedPlaylists);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedPlaylist, setSelectedPlaylist] = useState<SharedPlaylist | null>(null);

  const filteredPlaylists = playlists.filter((item) => {
    const matchesSearch =
      item.playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleImport = (playlist: SharedPlaylist) => {
    // 플레이리스트 가져오기 로직 (추후 구현)
    console.log('Importing playlist:', playlist.id);
    alert(`"${playlist.playlist.name}" 플레이리스트를 내 라이브러리에 추가했습니다.`);
  };

  const handleLike = (playlist: SharedPlaylist) => {
    // 좋아요 토글 로직 (추후 구현)
    console.log('Toggle like:', playlist.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Share2 className="w-7 h-7 text-orange-600" />
            공유 포럼
          </h1>
          <p className="text-slate-500 mt-1">
            다른 약국에서 공유한 플레이리스트를 둘러보세요
          </p>
        </div>
      </div>

      {/* Search & Filter */}
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
        <div className="flex gap-2">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === option.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Popular Tags */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-slate-500 mr-2">인기 태그:</span>
        {['당뇨', '교육', '혈압', '건강', '홍보', '계절건강'].map((tag) => (
          <button
            key={tag}
            onClick={() => setSearchQuery(tag)}
            className="px-3 py-1 text-sm bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Playlist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlaylists.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-primary-300 hover:shadow-lg transition-all"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{item.playlist.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">by {item.pharmacyName}</p>
                </div>
                <button
                  onClick={() => handleLike(item)}
                  className={`p-2 rounded-lg transition-colors ${
                    item.isLikedByMe
                      ? 'bg-red-50 text-red-500'
                      : 'hover:bg-slate-100 text-slate-400'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${item.isLikedByMe ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-slate-600 line-clamp-3">{item.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-3">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-orange-50 text-orange-600 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(item.playlist.totalDuration)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {item.likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  {item.downloadCount}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={() => setSelectedPlaylist(item)}
                className="flex-1 px-3 py-2 text-center text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
              >
                <Eye className="w-4 h-4" />
                미리보기
              </button>
              <button
                onClick={() => handleImport(item)}
                className="flex-1 px-3 py-2 text-center text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-1"
              >
                <Download className="w-4 h-4" />
                가져오기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPlaylists.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <Share2 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-slate-800">
            검색 결과가 없습니다
          </h3>
          <p className="mt-2 text-slate-500">
            다른 검색어로 시도해보세요
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {selectedPlaylist && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedPlaylist(null)}
          />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-white rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {selectedPlaylist.playlist.name}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                by {selectedPlaylist.pharmacyName}
              </p>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-slate-600">{selectedPlaylist.description}</p>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">포함된 영상</h4>
                <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-500">
                  영상 목록이 여기에 표시됩니다 (추후 구현)
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  handleImport(selectedPlaylist);
                  setSelectedPlaylist(null);
                }}
                className="flex-1 px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                가져오기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
