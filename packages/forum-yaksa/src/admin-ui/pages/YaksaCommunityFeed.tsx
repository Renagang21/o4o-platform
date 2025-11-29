import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { ArrowLeft, MessageSquare, Heart, Eye, Plus, X } from 'lucide-react';

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
  });
  const [creating, setCreating] = useState(false);

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
      });

      if (response.data.success) {
        setShowCreatePost(false);
        setNewPost({ title: '', content: '', categoryId: '' });
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
          {feed.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                // Navigate to post detail
                window.location.href = `/admin/forum/posts/${post.id}`;
              }}
            >
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
          ))}
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
