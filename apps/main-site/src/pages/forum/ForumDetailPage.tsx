/**
 * ForumDetailPage
 *
 * 포럼 게시글 상세 페이지
 * - 게시글 내용 표시
 * - 댓글 목록/작성
 * - 이전/다음 글 이동
 */

import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@/context';
import { PageHeader, EmptyState } from '@/components/common';

// 게시글 타입
interface ForumPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  author?: {
    id: string;
    username: string;
    name?: string;
  };
  authorId: string;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  isPinned: boolean;
  isNotice: boolean;
  status: string;
  createdAt: string;
  publishedAt?: string;
  tags?: string[];
}

// 댓글 타입
interface ForumComment {
  id: string;
  content: string;
  author?: {
    id: string;
    username: string;
    name?: string;
  };
  authorId: string;
  parentId?: string;
  replyCount: number;
  likeCount: number;
  status: string;
  createdAt: string;
  replies?: ForumComment[];
}

// 이전/다음 글
interface AdjacentPost {
  id: string;
  title: string;
  slug: string;
}

export function ForumDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, can } = useAuth();

  // 상태
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prevPost, setPrevPost] = useState<AdjacentPost | null>(null);
  const [nextPost, setNextPost] = useState<AdjacentPost | null>(null);

  // 댓글 작성 상태
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 게시글 로드
  const loadPost = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authClient.api.get(`/forum/posts/slug/${slug}`);
      setPost(response.data);

      // 이전/다음 글 로드
      loadAdjacentPosts(response.data.id, response.data.categoryId);

      // 댓글 로드
      loadComments(response.data.id);
    } catch (err: any) {
      console.error('Failed to load post:', err);
      const status = err.response?.status;
      if (status === 401) {
        setError('로그인이 필요합니다.');
      } else if (status === 403) {
        setError('접근 권한이 없습니다.');
      } else if (status === 404) {
        setError('게시글을 찾을 수 없습니다.');
      } else {
        setError('일시적인 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  // 이전/다음 글 로드
  const loadAdjacentPosts = async (postId: string, categoryId: string) => {
    try {
      const response = await authClient.api.get(`/forum/posts/${postId}/adjacent`, {
        params: { categoryId },
      });
      setPrevPost(response.data.prev);
      setNextPost(response.data.next);
    } catch (err) {
      console.error('Failed to load adjacent posts:', err);
    }
  };

  // 댓글 로드
  const loadComments = async (postId: string) => {
    try {
      const response = await authClient.api.get(`/forum/posts/${postId}/comments`);
      setComments(response.data.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  // 댓글 작성
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!post || !commentContent.trim() || !isAuthenticated) return;

    setIsSubmitting(true);
    setCommentError(null);

    try {
      await authClient.api.post(`/forum/posts/${post.id}/comments`, {
        content: commentContent.trim(),
        parentId: replyTo,
      });

      // 댓글 새로고침
      await loadComments(post.id);

      // 입력 초기화
      setCommentContent('');
      setReplyTo(null);
    } catch (err: any) {
      console.error('Failed to submit comment:', err);
      // 입력 내용 유지, inline error 표시
      setCommentError(err.response?.data?.message || '댓글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 게시글 삭제
  const handleDeletePost = async () => {
    if (!post || !confirm('정말 삭제하시겠습니까?')) return;

    setIsDeleting(true);
    try {
      await authClient.api.delete(`/forum/posts/${post.id}`);
      navigate('/forum');
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      setCommentError(err.response?.data?.message || '삭제에 실패했습니다.');
      setIsDeleting(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // 날짜 포맷
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 권한 체크
  const canEdit = user?.id === post?.authorId || can('forum.posts.manage');
  const canDelete = user?.id === post?.authorId || can('forum.posts.manage');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
            <span className="text-gray-300">/</span>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            <span className="text-gray-300">/</span>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          {/* Post header skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-12 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4 mb-4" />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                  <div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
            {/* Content skeleton */}
            <div className="p-6 space-y-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-11/12" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-4/5" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-9/12" />
            </div>
          </div>
          {/* Comments skeleton */}
          <div className="mt-6">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="게시글"
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '커뮤니티', href: '/forum' },
            { label: '게시글' },
          ]}
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <EmptyState
            icon="😕"
            title={error || '게시글을 찾을 수 없습니다'}
            description="요청한 게시글이 존재하지 않거나 삭제되었습니다."
            action={
              <Link
                to="/forum"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                목록으로
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={post.title}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '커뮤니티', href: '/forum' },
          { label: post.category?.name || '게시글', href: `/forum?category=${post.category?.slug}` },
          { label: post.title },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 게시글 */}
        <article className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* 헤더 */}
          <header className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              {post.isPinned && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                  고정
                </span>
              )}
              {post.isNotice && (
                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                  공지
                </span>
              )}
              {post.category && (
                <span className="text-sm text-gray-500">{post.category.name}</span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {(post.author?.name || post.author?.username || '익')[0]}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {post.author?.name || post.author?.username || '익명'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(post.publishedAt || post.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>조회 {post.viewCount}</span>
                <span>댓글 {post.commentCount}</span>
                <span>좋아요 {post.likeCount}</span>
              </div>
            </div>
          </header>

          {/* 본문 */}
          <div className="p-6">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />

            {/* 태그 */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.tags.map((tag, index) => (
                    <Link
                      key={index}
                      to={`/forum?tag=${encodeURIComponent(tag)}`}
                      className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200 transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <footer className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  👍 좋아요 {post.likeCount}
                </button>
              </div>

              {(canEdit || canDelete) && (
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <Link
                      to={`/forum/edit/${post.slug}`}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      수정
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isDeleting ? '삭제 중...' : '삭제'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </footer>
        </article>

        {/* 이전/다음 글 */}
        <nav className="mt-4 bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {prevPost && (
            <Link
              to={`/forum/post/${prevPost.slug}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-500 w-16">이전글</span>
              <span className="text-sm text-gray-900 truncate flex-1">{prevPost.title}</span>
            </Link>
          )}
          {nextPost && (
            <Link
              to={`/forum/post/${nextPost.slug}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-500 w-16">다음글</span>
              <span className="text-sm text-gray-900 truncate flex-1">{nextPost.title}</span>
            </Link>
          )}
        </nav>

        {/* 댓글 섹션 */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            댓글 {post.commentCount}개
          </h2>

          {/* 댓글 작성 폼 */}
          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                {replyTo && (
                  <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                    <span>답글 작성 중</span>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="text-red-500 hover:text-red-600"
                    >
                      취소
                    </button>
                  </div>
                )}
                {commentError && (
                  <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{commentError}</p>
                  </div>
                )}
                <textarea
                  value={commentContent}
                  onChange={(e) => { setCommentContent(e.target.value); setCommentError(null); }}
                  placeholder="댓글을 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={!commentContent.trim() || isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? '작성 중...' : '댓글 작성'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-gray-100 rounded-lg p-4 text-center mb-6">
              <p className="text-sm text-gray-600">
                댓글을 작성하려면{' '}
                <Link to="/login" className="text-blue-600 hover:underline">
                  로그인
                </Link>
                이 필요합니다.
              </p>
            </div>
          )}

          {/* 댓글 목록 */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={() => setReplyTo(comment.id)}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>
        </section>

        {/* 목록으로 버튼 */}
        <div className="mt-6 flex justify-center">
          <Link
            to="/forum"
            className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}

// 댓글 아이템 컴포넌트
interface CommentItemProps {
  comment: ForumComment;
  onReply: () => void;
  currentUserId?: string;
  isReply?: boolean;
}

function CommentItem({ comment, onReply, currentUserId, isReply = false }: CommentItemProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 7) return date.toLocaleDateString('ko-KR');
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  };

  const isAuthor = currentUserId === comment.authorId;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${isReply ? 'ml-8' : ''}`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-600 text-sm font-medium">
                {(comment.author?.name || comment.author?.username || '익')[0]}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {comment.author?.name || comment.author?.username || '익명'}
                {isAuthor && (
                  <span className="ml-1 text-xs text-blue-600">(작성자)</span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {formatDate(comment.createdAt)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReply}
              className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              답글
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {comment.content}
        </div>

        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <button type="button" className="hover:text-blue-600 transition-colors">
            👍 좋아요 {comment.likeCount}
          </button>
        </div>
      </div>

      {/* 답글 목록 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              currentUserId={currentUserId}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ForumDetailPage;
