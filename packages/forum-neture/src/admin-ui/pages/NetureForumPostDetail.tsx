import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { ArrowLeft, Eye, Heart, MessageSquare, Edit, Trash2, Sparkles } from 'lucide-react';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  status: string;
  type: string;
  tags?: string[];
  metadata?: {
    neture?: {
      skinType?: 'dry' | 'oily' | 'combination' | 'sensitive';
      concerns?: string[];
      routine?: string[];
      productIds?: string[];
    };
  };
}

export default function NetureForumPostDetail() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get(`/neture/forum/posts/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load post');
      }

      setPost(response.data.data);
    } catch (err: any) {
      console.error('Error loading post:', err);
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await authClient.api.delete(`/neture/forum/posts/${id}`);

      if (response.data.success) {
        alert('게시글이 삭제되었습니다');
        window.location.href = '/admin/neture/forum';
      } else {
        alert(response.data.error || '삭제에 실패했습니다');
      }
    } catch (err: any) {
      console.error('Error deleting post:', err);
      alert(err.response?.data?.error || '삭제에 실패했습니다');
    } finally {
      setDeleting(false);
    }
  };

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">게시글 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
          <p className="text-red-600">{error || '게시글을 찾을 수 없습니다'}</p>
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

  const skinType = post.metadata?.neture?.skinType;
  const concerns = post.metadata?.neture?.concerns || [];
  const routine = post.metadata?.neture?.routine || [];
  const productIds = post.metadata?.neture?.productIds || [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>

        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{post.title}</h1>

            {/* Metadata Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Sparkles className="w-4 h-4 text-pink-500" />
              {skinType && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
                  {skinTypeLabels[skinType] || skinType}
                </span>
              )}
              {concerns.map((concern, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                >
                  {concernLabels[concern] || concern}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{post.viewCount} 조회</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{post.likeCount} 좋아요</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span>{post.commentCount} 댓글</span>
              </div>
              <span className="ml-auto">
                {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            <button
              onClick={() => {
                window.location.href = `/admin/neture/forum/posts/${id}/edit`;
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              수정
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {/* Additional Metadata */}
      {(routine.length > 0 || productIds.length > 0 || post.tags && post.tags.length > 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">추가 정보</h3>

          {routine.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">루틴</h4>
              <div className="flex flex-wrap gap-2">
                {routine.map((step, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {idx + 1}. {step}
                  </span>
                ))}
              </div>
            </div>
          )}

          {productIds.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">언급된 제품</h4>
              <div className="flex flex-wrap gap-2">
                {productIds.map((productId, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    제품 #{productId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">태그</h4>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
