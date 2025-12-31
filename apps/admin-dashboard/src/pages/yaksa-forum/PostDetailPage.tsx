/**
 * Yaksa Forum Post Detail Page
 *
 * 약사 포럼 게시글 상세 페이지 (Admin)
 * - 게시글 내용
 * - 작성자 정보
 * - 관리 기능
 *
 * Phase A-3: Yaksa API Integration
 * API Endpoint: /api/v1/yaksa/admin/posts/:id
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
  Clock,
  User,
  Pin,
  Bell,
} from 'lucide-react';

/**
 * API Response Types (Phase A-1 Yaksa API)
 */
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type PostStatus = 'draft' | 'published' | 'hidden' | 'deleted';

interface PostDetail {
  id: string;
  category_id: string;
  category?: Category;
  title: string;
  content: string;
  status: PostStatus;
  is_pinned: boolean;
  is_notice: boolean;
  view_count: number;
  created_by_user_id?: string;
  created_by_user_name?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface PostDetailResponse {
  data: PostDetail;
}

const statusLabels: Record<PostStatus, string> = {
  draft: '초안',
  published: '게시됨',
  hidden: '숨김',
  deleted: '삭제됨',
};

const statusColors: Record<PostStatus, 'gray' | 'green' | 'yellow' | 'red'> = {
  draft: 'gray',
  published: 'green',
  hidden: 'yellow',
  deleted: 'red',
};

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [post, setPost] = useState<PostDetail | null>(null);
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
      const response = await api.get<PostDetailResponse>(`/api/v1/yaksa/admin/posts/${postId}`);
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

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

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
            {post.is_pinned && (
              <AGTag color="blue" size="md">
                <Pin className="w-3 h-3 inline mr-1" />고정
              </AGTag>
            )}
            {post.is_notice && (
              <AGTag color="purple" size="md">
                <Bell className="w-3 h-3 inline mr-1" />공지
              </AGTag>
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
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{post.created_by_user_name || '알 수 없음'}</p>
                  <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {post.view_count}
                </span>
                {post.published_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    게시: {formatDate(post.published_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-gray max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
};

export default PostDetailPage;
