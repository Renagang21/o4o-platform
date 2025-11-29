import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { ArrowLeft, MessageSquare, Heart, Eye, Plus, X, Pin, Megaphone, Clock } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  description?: string;
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

export default function YaksaCommunityFeed() {
  const { id } = useParams<{ id: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    categoryId: '', // Will need to fetch categories
    isAnnouncement: false,
    pinned: false,
  });
  const [creating, setCreating] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadFeedData();
    }
  }, [id]);

  const loadFeedData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load community info
      const communityResponse = await authClient.api.get(`/yaksa/forum/communities/${id}`);
      if (!communityResponse.data.success) {
        throw new Error(communityResponse.data.error || 'Failed to load community');
      }
      setCommunity(communityResponse.data.data);

      // Load community feed
      const feedResponse = await authClient.api.get(`/yaksa/forum/communities/${id}/feed?limit=50`);
      if (feedResponse.data.success) {
        setFeed(feedResponse.data.data || []);
      } else {
        setFeed([]);
      }
    } catch (err: any) {
      console.error('Error loading feed:', err);
      setError(err.message || 'Failed to load community feed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) {
      alert('제목과 내용을 입력해주세요');
      return;
    }

    try {
      setCreating(true);
      // Use a default category ID - this should be fetched from forum categories
      const categoryId = newPost.categoryId || '00000000-0000-0000-0000-000000000001';

      const response = await authClient.api.post(`/yaksa/forum/communities/${id}/posts`, {
        title: newPost.title,
        content: newPost.content,
        categoryId,
        type: 'discussion',
        isAnnouncement: newPost.isAnnouncement,
        // Note: pinned will be set via separate API after post creation if needed
      });

      if (response.data.success) {
        // If pinned option was selected, pin the post
        if (newPost.pinned && response.data.data?.id) {
          try {
            await authClient.api.post(`/yaksa/forum/posts/${response.data.data.id}/pin`);
          } catch (pinErr) {
            console.error('Error pinning post:', pinErr);
            // Continue even if pinning fails
          }
        }

        setShowCreatePost(false);
        setNewPost({ title: '', content: '', categoryId: '', isAnnouncement: false, pinned: false });
        // Reload feed
        await loadFeedData();
      } else {
        alert(response.data.error || '글 작성에 실패했습니다');
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      alert(err.response?.data?.error || '글 작성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">피드 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
          <p className="text-red-600">{error || '커뮤니티를 찾을 수 없습니다'}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {community.name} 타임라인
            </h1>
            {community.description && (
              <p className="text-gray-600">{community.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            글 작성
          </button>
        </div>
      </div>

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            아직 게시글이 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            이 커뮤니티에 첫 번째 게시글을 작성해보세요
          </p>
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => setShowCreatePost(true)}
          >
            게시글 작성하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((post) => {
            const isPinned = post.metadata?.yaksa?.pinned;
            const isAnnouncement = post.metadata?.yaksa?.isAnnouncement;
            const isPending = post.status === 'pending';

            return (
              <div
                key={post.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  // Navigate to post detail
                  window.location.href = `/admin/forum/posts/${post.id}`;
                }}
              >
                {/* Status Badges */}
                {(isPinned || isAnnouncement || isPending) && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
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

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">새 글 작성</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내용
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="내용을 입력하세요"
                />
              </div>

              {/* Admin Options */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">관리자 옵션</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPost.isAnnouncement}
                      onChange={(e) => setNewPost({ ...newPost, isAnnouncement: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">공지로 등록</span>
                    <Megaphone className="w-4 h-4 text-red-600" />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPost.pinned}
                      onChange={(e) => setNewPost({ ...newPost, pinned: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">상단에 고정</span>
                    <Pin className="w-4 h-4 text-yellow-600" />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * 관리자/소유자만 사용 가능한 기능입니다
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={creating}
                >
                  취소
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? '작성 중...' : '게시'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
