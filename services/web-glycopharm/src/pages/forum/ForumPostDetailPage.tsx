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
import { fetchForumPost, fetchPostComments, extractTextContent, type ForumPostDetail, type ForumComment } from '@/services/forumApi';
import { ContentRenderer } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import { useAuth } from '@/contexts/AuthContext';
import { appreciationApi, type AppreciationSummary, type AppreciationSend } from '@/api/appreciation';

// ─── Local aliases ───────────────────────────────────────────
type PostDetail = ForumPostDetail & { body?: string | null };
type Comment = ForumComment & { body?: string | null };

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function ForumPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Appreciation state
  const [showAppreciation, setShowAppreciation] = useState(false);
  const [appreciationAmount, setAppreciationAmount] = useState<number | ''>('');
  const [appreciationMsg, setAppreciationMsg] = useState('');
  const [isSendingAppreciation, setIsSendingAppreciation] = useState(false);
  const [appreciationSummary, setAppreciationSummary] = useState<AppreciationSummary | null>(null);
  const [appreciationRecent, setAppreciationRecent] = useState<AppreciationSend[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchForumPost(id),
      fetchPostComments(id).catch(() => ({ success: true, data: [] as Comment[] })),
    ])
      .then(([postRes, commentRes]) => {
        if (postRes.success && postRes.data) {
          setPost(postRes.data as PostDetail);
        } else {
          setError('게시글을 찾을 수 없습니다.');
        }
        setComments(commentRes.data as Comment[]);
      })
      .catch(() => setError('게시글을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));

    // Load appreciation data (non-critical)
    Promise.allSettled([
      appreciationApi.getSummary('forum_post', id),
      appreciationApi.getRecent('forum_post', id),
    ]).then(([sumRes, recentRes]) => {
      if (sumRes.status === 'fulfilled') setAppreciationSummary(sumRes.value.data?.data ?? sumRes.value.data);
      if (recentRes.status === 'fulfilled') {
        const d = recentRes.value.data?.data ?? recentRes.value.data;
        setAppreciationRecent(d?.items ?? []);
      }
    });
  }, [id]);

  const handleSendAppreciation = async () => {
    if (!post || !user || isSendingAppreciation) return;
    const amt = Number(appreciationAmount);
    if (!amt || amt < 1) { toast.error('금액은 1P 이상이어야 합니다'); return; }
    try {
      setIsSendingAppreciation(true);
      await appreciationApi.send({
        targetType: 'forum_post',
        targetId: post.id,
        amount: amt,
        message: appreciationMsg.trim() || undefined,
      });
      toast.success(`${amt}P 감사 포인트를 전달했습니다 🎁`);
      setShowAppreciation(false);
      setAppreciationAmount('');
      setAppreciationMsg('');
      const [sumRes, recentRes] = await Promise.allSettled([
        appreciationApi.getSummary('forum_post', post.id),
        appreciationApi.getRecent('forum_post', post.id),
      ]);
      if (sumRes.status === 'fulfilled') setAppreciationSummary(sumRes.value.data?.data ?? sumRes.value.data);
      if (recentRes.status === 'fulfilled') {
        const d = recentRes.value.data?.data ?? recentRes.value.data;
        setAppreciationRecent(d?.items ?? []);
      }
    } catch (err: any) {
      const msg = String(err?.response?.data?.error || err?.message || '');
      if (msg.includes('INSUFFICIENT_BALANCE') || msg.includes('부족')) toast.error('포인트가 부족합니다');
      else if (msg.includes('SELF')) toast.error('자신의 게시글에는 감사 포인트를 보낼 수 없습니다');
      else toast.error('감사 포인트 전송에 실패했습니다');
    } finally {
      setIsSendingAppreciation(false);
    }
  };

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

  const authorName = (post as any).authorName || post.author?.nickname || post.author?.name || '익명';
  const bodyText = extractTextContent(post.content) || post.body || '';

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

      {/* Appreciation 버튼 + 집계 */}
      <div className="flex items-center gap-3 mb-4">
        {user ? (
          <button
            onClick={() => setShowAppreciation(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
          >
            🎁 감사하기
            {appreciationSummary && appreciationSummary.totalAmount > 0 && (
              <span className="text-xs opacity-75">{appreciationSummary.totalAmount.toLocaleString()}P · {appreciationSummary.count}명</span>
            )}
          </button>
        ) : (
          appreciationSummary && appreciationSummary.totalAmount > 0 && (
            <span className="text-sm text-amber-700">🎁 {appreciationSummary.totalAmount.toLocaleString()}P · {appreciationSummary.count}명</span>
          )
        )}
      </div>

      {/* Appreciation 집계 + 최근 메시지 */}
      {appreciationSummary && appreciationSummary.totalAmount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
          <div className="flex items-center gap-3 text-sm text-amber-800 mb-2">
            <span>🎁 감사 <strong>{appreciationSummary.totalAmount.toLocaleString()}P</strong></span>
            <span className="text-amber-300">·</span>
            <span>👥 <strong>{appreciationSummary.count}명</strong></span>
          </div>
          {appreciationRecent.length > 0 && (
            <div className="border-t border-amber-200 pt-2 mt-2 space-y-1">
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-1">최근 감사</p>
              {appreciationRecent.filter(r => r.message).map((r, i) => (
                <div key={i} className="flex justify-between items-center text-xs text-amber-700">
                  <span className="italic flex-1 mr-2">"{r.message!.length > 60 ? r.message!.slice(0, 60) + '…' : r.message}"</span>
                  <span className="font-semibold whitespace-nowrap">+{r.amount}P</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appreciation 모달 */}
      {showAppreciation && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowAppreciation(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-7 w-[360px] max-w-[90vw]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1">🎁 감사 포인트 보내기</h3>
            <p className="text-sm text-gray-500 mb-5">작성자에게 감사의 마음을 포인트로 전달할 수 있습니다.</p>
            <div className="flex gap-2 mb-3">
              {[10, 30, 50].map(p => (
                <button
                  key={p}
                  onClick={() => setAppreciationAmount(p)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    appreciationAmount === p
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {p}P
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              placeholder="직접 입력 (1P 이상)"
              value={appreciationAmount}
              onChange={e => setAppreciationAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-primary-400"
            />
            <textarea
              placeholder="감사 메시지 (선택)"
              rows={3}
              value={appreciationMsg}
              onChange={e => setAppreciationMsg(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-5 resize-y focus:outline-none focus:border-primary-400"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAppreciation(false); setAppreciationAmount(''); setAppreciationMsg(''); }}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleSendAppreciation}
                disabled={isSendingAppreciation || !appreciationAmount}
                className="px-5 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50"
              >
                {isSendingAppreciation ? '전송 중...' : `${appreciationAmount || 0}P 보내기`}
              </button>
            </div>
          </div>
        </div>
      )}

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
              const cAuthor = comment.author?.nickname || comment.author?.name || '익명';
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
