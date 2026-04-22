/**
 * ForumPostDetailPage — 포럼 게시글 상세
 *
 * WO-O4O-GLYCOPHARM-KPA-STYLE-UX-REFINE-P3-V1
 *
 * Route: /forum/posts/:id
 * API: GET /api/v1/glycopharm/forum/posts/:id
 *      GET /api/v1/glycopharm/forum/posts/:postId/comments
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Eye, Heart, Calendar, User, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { ContentRenderer } from '@o4o/content-editor';

// ─── Types ──────────────────────────────────────────────────

interface PostDetail {
  id: string;
  title: string;
  content?: string | null;
  body?: string | null;
  author?: { name?: string; email?: string } | null;
  category?: { name?: string } | null;
  viewCount: number;
  commentCount: number;
  likeCount?: number;
  createdAt: string;
  isPinned?: boolean;
  status?: string;
}

interface Comment {
  id: string;
  content?: string | null;
  body?: string | null;
  author?: { name?: string; email?: string } | null;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function ForumPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      apiClient.get<{ success: boolean; data: PostDetail }>(`/api/v1/glycopharm/forum/posts/${id}`),
      apiClient.get<{ success: boolean; data: Comment[] }>(`/api/v1/glycopharm/forum/posts/${id}/comments`)
        .catch(() => ({ data: { success: true, data: [] } })),
    ])
      .then(([postRes, commentRes]) => {
        if (postRes.data?.success && postRes.data?.data) {
          setPost(postRes.data.data);
        } else {
          setError('게시글을 찾을 수 없습니다.');
        }
        if (commentRes.data?.data && Array.isArray(commentRes.data.data)) {
          setComments(commentRes.data.data);
        }
      })
      .catch(() => setError('게시글을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500 mb-4">{error || '게시글을 찾을 수 없습니다.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>
      </div>
    );
  }

  const authorName = post.author?.name || post.author?.email?.split('@')[0] || '익명';
  const bodyText = post.content || post.body || '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 뒤로가기 */}
      <div className="mb-6">
        <Link
          to="/forum/posts"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          포럼 목록
        </Link>
      </div>

      {/* 게시글 카드 */}
      <article className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-slate-100">
          {post.category?.name && (
            <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-primary-50 text-primary-600 rounded mb-2">
              {post.category.name}
            </span>
          )}
          <h1 className="text-xl font-bold text-slate-900 leading-snug">{post.title}</h1>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {authorName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(post.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {post.viewCount}
            </span>
            {(post.likeCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                {post.likeCount}
              </span>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 py-6 min-h-[120px]">
          {bodyText ? (
            <ContentRenderer
              html={bodyText}
              className="text-sm text-slate-700 leading-relaxed"
            />
          ) : (
            <p className="text-sm text-slate-400 italic">본문 내용이 없습니다.</p>
          )}
        </div>
      </article>

      {/* 댓글 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">
            댓글 {comments.length > 0 ? `(${comments.length})` : ''}
          </h2>
        </div>

        {comments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl px-6 py-8 text-center">
            <p className="text-sm text-slate-400">아직 댓글이 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {comments.map((comment) => {
              const cAuthor = comment.author?.name || comment.author?.email?.split('@')[0] || '익명';
              const cBody = comment.content || comment.body || '';
              return (
                <div key={comment.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-700">{cAuthor}</span>
                    <span className="text-[11px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{cBody}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 하단 네비게이션 */}
      <div className="mt-8 flex gap-3">
        <Link
          to="/forum/posts"
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          목록으로
        </Link>
        <Link
          to="/"
          className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          홈
        </Link>
      </div>
    </div>
  );
}
