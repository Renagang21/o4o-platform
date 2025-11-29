import React, { useEffect, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { Sparkles, Eye, Heart, MessageSquare, Filter, Search, Plus } from 'lucide-react';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  authorId: string;
  categoryId: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  status: string;
  type: string;
  metadata?: {
    neture?: {
      skinType?: 'dry' | 'oily' | 'combination' | 'sensitive';
      concerns?: string[];
      routine?: string[];
      productIds?: string[];
    };
  };
}

interface Stats {
  total: number;
  bySkinType: Record<string, number>;
  byConcern: Record<string, number>;
}

export default function NetureForumDashboard() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedSkinType, setSelectedSkinType] = useState<string>('all');
  const [selectedConcern, setSelectedConcern] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedSkinType, selectedConcern]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (selectedSkinType !== 'all') {
        params.append('skinType', selectedSkinType);
      }
      if (selectedConcern !== 'all') {
        params.append('concerns', selectedConcern);
      }
      params.append('limit', '50');

      // Load posts
      const postsResponse = await authClient.api.get(`/neture/forum/posts?${params.toString()}`);
      if (postsResponse.data.success) {
        setPosts(postsResponse.data.data || []);
      } else {
        setPosts([]);
      }

      // Load stats
      const statsResponse = await authClient.api.get('/neture/forum/stats');
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
    } catch (err: any) {
      console.error('Error loading forum data:', err);
      setError(err.message || 'Failed to load forum data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const skinTypeLabels: Record<string, string> = {
    dry: '건성',
    oily: '지성',
    combination: '복합성',
    sensitive: '민감성',
  };

  const concernLabels: Record<string, string> = {
    acne: '여드름',
    wrinkles: '주름',
    darkSpots: '다크스팟',
    dryness: '건조함',
    oilControl: '피지조절',
    sensitivity: '민감성',
    redness: '홍조',
    pores: '모공',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">포럼 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-pink-500" />
              Neture 화장품 포럼
            </h1>
            <p className="text-gray-600">피부 타입별 후기, 제품 리뷰, 루틴 공유</p>
          </div>
          <button
            onClick={() => {
              window.location.href = '/admin/neture/forum/new';
            }}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            새 글 작성
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">전체 게시글</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">피부 타입별 분류</div>
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(stats.bySkinType || {}).length}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">관심사별 분류</div>
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(stats.byConcern || {}).length}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">필터</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Skin Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                피부 타입
              </label>
              <select
                value={selectedSkinType}
                onChange={(e) => setSelectedSkinType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="all">전체</option>
                <option value="dry">건성</option>
                <option value="oily">지성</option>
                <option value="combination">복합성</option>
                <option value="sensitive">민감성</option>
              </select>
            </div>

            {/* Concern Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                피부 고민
              </label>
              <select
                value={selectedConcern}
                onChange={(e) => setSelectedConcern(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="all">전체</option>
                <option value="acne">여드름</option>
                <option value="wrinkles">주름</option>
                <option value="darkSpots">다크스팟</option>
                <option value="dryness">건조함</option>
                <option value="oilControl">피지조절</option>
                <option value="sensitivity">민감성</option>
                <option value="redness">홍조</option>
                <option value="pores">모공</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                검색
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="제목 또는 내용 검색..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            게시글이 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            첫 번째 화장품 후기를 작성해보세요
          </p>
          <button
            onClick={() => {
              window.location.href = '/admin/neture/forum/new';
            }}
            className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            게시글 작성하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const skinType = post.metadata?.neture?.skinType;
            const concerns = post.metadata?.neture?.concerns || [];

            return (
              <div
                key={post.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  window.location.href = `/admin/neture/forum/posts/${post.id}`;
                }}
              >
                {/* Metadata Badges */}
                {(skinType || concerns.length > 0) && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {skinType && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-pink-100 text-pink-800">
                        {skinTypeLabels[skinType] || skinType}
                      </span>
                    )}
                    {concerns.slice(0, 3).map((concern, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {concernLabels[concern] || concern}
                      </span>
                    ))}
                    {concerns.length > 3 && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        +{concerns.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {post.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {post.excerpt || post.content.substring(0, 200) + (post.content.length > 200 ? '...' : '')}
                </p>

                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{post.viewCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span>{post.likeCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.commentCount}</span>
                  </div>
                  <span className="ml-auto">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
