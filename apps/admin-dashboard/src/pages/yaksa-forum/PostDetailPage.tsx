/**
 * Yaksa Forum Post Detail Page
 *
 * 약사 포럼 게시글 상세 페이지
 * - 게시글 내용
 * - 댓글 목록
 * - 작성자 정보
 *
 * Phase 9-B: Web Business Template 복제 검증
 * Template Reference: cosmetics-products/ProductDetailPage.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
} from '@o4o/ui';
import {
  MessageSquare,
  ArrowLeft,
  AlertCircle,
  Eye,
  ThumbsUp,
  Clock,
  User,
} from 'lucide-react';

/**
 * API Response Types (OpenAPI 계약 기반)
 */
interface Author {
  id: string;
  name: string;
  avatar?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface Comment {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
  updatedAt: string;
}

type PostStatus = 'draft' | 'published' | 'archived' | 'hidden';

interface PostDetail {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  author: Author;
  category?: Category;
  status: PostStatus;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isPinned?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface PostDetailResponse {
  data: PostDetail;
}

interface CommentListResponse {
  data: Comment[];
}

const statusLabels: Record<PostStatus, string> = {
  draft: '초안',
  published: '게시됨',
  archived: '보관됨',
  hidden: '숨김',
};

const statusColors: Record<PostStatus, 'gray' | 'green' | 'yellow' | 'red'> = {
  draft: 'gray',
  published: 'green',
  archived: 'yellow',
  hidden: 'red',
};

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    if (!postId) {
      setError('게시글 ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<PostDetailResponse>(`/api/v1/forum/posts/${postId}`);
      if (response.data) {
        setPost(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch post:', err);
      if (err.response?.status === 404) {
        setError('게시글을 찾을 수 없습니다.');
      } else {
        setError(err.message || '게시글을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, postId]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;

    try {
      const response = await api.get<CommentListResponse>(`/api/v1/forum/posts/${postId}/comments`);
      if (response.data) {
        setComments(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  }, [api, postId]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <>
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
            </>
          ) : (
            <>
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">게시글을 찾을 수 없습니다</p>
            </>
          )}
          <AGButton variant="outline" onClick={() => navigate('/yaksa-forum')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title={post.title}
        description={post.category?.name || '게시글'}
        icon={<MessageSquare className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/yaksa-forum"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            게시글 목록
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            {post.isPinned && (
              <AGTag color="blue" size="md">고정</AGTag>
            )}
            <AGTag color={statusColors[post.status]} size="md">
              {statusLabels[post.status]}
            </AGTag>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Post Content */}
        <AGSection>
          <AGCard>
            {/* Author & Meta */}
            <div className="flex items-center justify-between pb-4 border-b mb-6">
              <div className="flex items-center gap-3">
                {post.author.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{post.author.name}</p>
                  <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {post.viewCount}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  {post.likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {post.commentCount}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-gray max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </AGCard>
        </AGSection>

        {/* Comments Section */}
        <AGSection title={`댓글 (${comments.length})`}>
          {comments.length === 0 ? (
            <AGCard>
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>아직 댓글이 없습니다</p>
              </div>
            </AGCard>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <AGCard key={comment.id}>
                  <div className="flex items-start gap-3">
                    {comment.author.avatar ? (
                      <img
                        src={comment.author.avatar}
                        alt={comment.author.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  </div>
                </AGCard>
              ))}
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default PostDetailPage;
