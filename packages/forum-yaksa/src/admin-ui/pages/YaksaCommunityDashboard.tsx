import React, { useEffect, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { MessageSquare, Heart, Eye, Pin, Megaphone, Clock } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  type: 'personal' | 'branch' | 'division' | 'global';
}

interface FeedPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  authorId: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  status: string;
  type: string;
  metadata?: {
    yaksa?: {
      communityId?: string;
      pinned?: boolean;
      isAnnouncement?: boolean;
    };
  };
}

type CommunityType = 'all' | 'personal' | 'branch' | 'division' | 'global';

const COMMUNITY_TYPE_LABELS: Record<CommunityType, string> = {
  all: '전체',
  personal: '개인',
  branch: '지부',
  division: '분회',
  global: '전체 약사',
};

const COMMUNITY_TYPE_COLORS: Record<string, string> = {
  personal: 'bg-blue-100 text-blue-800',
  branch: 'bg-green-100 text-green-800',
  division: 'bg-purple-100 text-purple-800',
  global: 'bg-orange-100 text-orange-800',
};

export default function YaksaCommunityDashboard() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CommunityType>('all');

  useEffect(() => {
    loadData();
  }, [selectedType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load communities
      const communitiesResponse = await authClient.api.get('/yaksa/forum/communities/mine');
      if (communitiesResponse.data.success) {
        setCommunities(communitiesResponse.data.data || []);
      }

      // Load unified feed
      const typeParam = selectedType !== 'all' ? `?type=${selectedType}` : '';
      const feedResponse = await authClient.api.get(`/yaksa/forum/communities/feed/all${typeParam}&limit=50`);
      if (feedResponse.data.success) {
        setFeed(feedResponse.data.data || []);
      }
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getCommunityInfo = (post: FeedPost): { name: string; type: string } | null => {
    const communityId = post.metadata?.yaksa?.communityId;
    if (!communityId) return null;

    const community = communities.find(c => c.id === communityId);
    if (!community) return null;

    return {
      name: community.name,
      type: community.type,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">대시보드 로딩 중...</p>
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
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Yaksa 커뮤니티 홈
        </h1>
        <p className="text-gray-600">
          참여 중인 {communities.length}개 커뮤니티의 최신 소식
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(Object.keys(COMMUNITY_TYPE_LABELS) as CommunityType[]).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {COMMUNITY_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            아직 게시글이 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            커뮤니티에 첫 번째 게시글을 작성해보세요
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((post) => {
            const communityInfo = getCommunityInfo(post);
            const isPinned = post.metadata?.yaksa?.pinned;
            const isAnnouncement = post.metadata?.yaksa?.isAnnouncement;
            const isPending = post.status === 'pending';

            return (
              <div
                key={post.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  window.location.href = `/admin/forum/posts/${post.id}`;
                }}
              >
                {/* Community Badge + Status Badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {communityInfo && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      COMMUNITY_TYPE_COLORS[communityInfo.type] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {communityInfo.name}
                    </span>
                  )}

                  {isPinned && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Pin className="w-3 h-3" />
                      고정
                    </span>
                  )}

                  {isAnnouncement && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                      <Megaphone className="w-3 h-3" />
                      공지
                    </span>
                  )}

                  {isPending && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      <Clock className="w-3 h-3" />
                      승인 대기
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {post.excerpt || post.content.substring(0, 200) + (post.content.length > 200 ? '...' : '')}
                </p>

                {/* Meta */}
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
