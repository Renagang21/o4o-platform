/**
 * PostDetailPage - K-Cosmetics Forum Post Detail
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ContentRenderer } from '@o4o/content-editor';
import {
  fetchForumPostById,
  fetchForumComments,
  getAuthorName,
  type ForumPost,
  type ForumComment,
} from '../../services/forumApi';
import { toast } from '@o4o/error-handling';
import { useAuth } from '@/contexts/AuthContext';
import { appreciationApi, type AppreciationSummary, type AppreciationSend } from '@/api/appreciation';

// Convert Block[] to HTML for rendering (WO-FORUM-CONTENT-RENDER-UNIFICATION-V1)
function blocksToHtmlInline(blocks: any[]): string {
  return blocks.map((block: any) => {
    const content = typeof block.content === 'string' ? block.content : block.content?.text || '';
    switch (block.type) {
      case 'paragraph': return `<p>${content}</p>`;
      case 'heading': return `<h${block.attributes?.level || 2}>${content}</h${block.attributes?.level || 2}>`;
      case 'quote':
      case 'blockquote': return `<blockquote><p>${content}</p></blockquote>`;
      default: return content ? `<p>${content}</p>` : '';
    }
  }).join('');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Appreciation state
  const [showAppreciation, setShowAppreciation] = useState(false);
  const [appreciationAmount, setAppreciationAmount] = useState<number | ''>('');
  const [appreciationMsg, setAppreciationMsg] = useState('');
  const [isSendingAppreciation, setIsSendingAppreciation] = useState(false);
  const [appreciationSummary, setAppreciationSummary] = useState<AppreciationSummary | null>(null);
  const [appreciationRecent, setAppreciationRecent] = useState<AppreciationSend[]>([]);

  useEffect(() => {
    async function loadPost() {
      if (!postId) return;

      setIsLoading(true);
      setError(null);

      try {
        const [postResponse, commentsResponse] = await Promise.all([
          fetchForumPostById(postId),
          fetchForumComments(postId),
        ]);

        if (!postResponse?.data) {
          setError('게시글을 찾을 수 없습니다.');
          return;
        }

        setPost(postResponse.data);
        setComments(commentsResponse.data || []);
      } catch (err) {
        console.error('Error loading post:', err);
        setError('게시글을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }

      // Load appreciation data (non-critical)
      Promise.allSettled([
        appreciationApi.getSummary('forum_post', postId),
        appreciationApi.getRecent('forum_post', postId),
      ]).then(([sumRes, recentRes]) => {
        if (sumRes.status === 'fulfilled') setAppreciationSummary(sumRes.value.data?.data ?? sumRes.value.data);
        if (recentRes.status === 'fulfilled') {
          const d = recentRes.value.data?.data ?? recentRes.value.data;
          setAppreciationRecent(d?.items ?? []);
        }
      });
    }

    loadPost();
  }, [postId]);

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

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <p>게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <p>{error || '게시글을 찾을 수 없습니다.'}</p>
        </div>
        <div style={styles.footer}>
          <Link to="/forum" style={styles.backLink}>
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Resolve content to HTML string (WO-FORUM-CONTENT-RENDER-UNIFICATION-V1)
  const contentHtml = Array.isArray(post.content)
    ? blocksToHtmlInline(post.content)
    : (post.content || '');

  return (
    <div style={styles.container}>
      <article style={styles.article}>
        <header style={styles.articleHeader}>
          <h1 style={styles.title}>{post.title}</h1>
          <div style={styles.meta}>
            <span>{getAuthorName(post)}</span>
            <span style={styles.metaDivider}>·</span>
            <span>{formatDate(post.createdAt)}</span>
            {post.commentCount > 0 && (
              <>
                <span style={styles.metaDivider}>·</span>
                <span>댓글 {post.commentCount}</span>
              </>
            )}
          </div>
        </header>

        <div style={styles.content}>
          <ContentRenderer html={contentHtml} />
        </div>
      </article>

      {/* Appreciation 버튼 + 집계 */}
      <div style={appreciationStyles.row}>
        {user ? (
          <button style={appreciationStyles.button} onClick={() => setShowAppreciation(true)}>
            🎁 감사하기
            {appreciationSummary && appreciationSummary.totalAmount > 0 && (
              <span style={appreciationStyles.buttonBadge}>{appreciationSummary.totalAmount.toLocaleString()}P · {appreciationSummary.count}명</span>
            )}
          </button>
        ) : (
          appreciationSummary && appreciationSummary.totalAmount > 0 && (
            <span style={appreciationStyles.countLabel}>🎁 {appreciationSummary.totalAmount.toLocaleString()}P · {appreciationSummary.count}명</span>
          )
        )}
      </div>

      {/* Appreciation 집계 + 최근 메시지 */}
      {appreciationSummary && appreciationSummary.totalAmount > 0 && (
        <div style={appreciationStyles.cultureBlock}>
          <div style={appreciationStyles.stats}>
            <span>🎁 감사 <strong>{appreciationSummary.totalAmount.toLocaleString()}P</strong></span>
            <span style={{ color: '#d97706' }}>·</span>
            <span>👥 <strong>{appreciationSummary.count}명</strong></span>
          </div>
          {appreciationRecent.filter(r => r.message).length > 0 && (
            <div style={appreciationStyles.messages}>
              <p style={appreciationStyles.messagesLabel}>최근 감사</p>
              {appreciationRecent.filter(r => r.message).map((r, i) => (
                <div key={i} style={appreciationStyles.messageRow}>
                  <span style={appreciationStyles.messageText}>"{r.message!.length > 60 ? r.message!.slice(0, 60) + '…' : r.message}"</span>
                  <span style={appreciationStyles.messageAmount}>+{r.amount}P</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appreciation 모달 */}
      {showAppreciation && (
        <div style={appreciationStyles.overlay} onClick={() => setShowAppreciation(false)}>
          <div style={appreciationStyles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={appreciationStyles.modalTitle}>🎁 감사 포인트 보내기</h3>
            <p style={appreciationStyles.modalDesc}>작성자에게 감사의 마음을 포인트로 전달할 수 있습니다.</p>
            <div style={appreciationStyles.presets}>
              {[10, 30, 50].map(p => (
                <button
                  key={p}
                  style={{ ...appreciationStyles.presetBtn, ...(appreciationAmount === p ? appreciationStyles.presetBtnActive : {}) }}
                  onClick={() => setAppreciationAmount(p)}
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
              style={appreciationStyles.input}
            />
            <textarea
              placeholder="감사 메시지 (선택)"
              rows={3}
              value={appreciationMsg}
              onChange={e => setAppreciationMsg(e.target.value)}
              style={appreciationStyles.textarea}
            />
            <div style={appreciationStyles.modalActions}>
              <button
                style={appreciationStyles.cancelBtn}
                onClick={() => { setShowAppreciation(false); setAppreciationAmount(''); setAppreciationMsg(''); }}
              >
                취소
              </button>
              <button
                style={{ ...appreciationStyles.sendBtn, ...(isSendingAppreciation || !appreciationAmount ? { opacity: 0.5 } : {}) }}
                onClick={handleSendAppreciation}
                disabled={isSendingAppreciation || !appreciationAmount}
              >
                {isSendingAppreciation ? '전송 중...' : `${appreciationAmount || 0}P 보내기`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <section style={styles.commentsSection}>
        <h2 style={styles.commentsTitle}>
          댓글 {comments.length}개
        </h2>
        {comments.length > 0 ? (
          <div style={styles.commentsList}>
            {comments.map((comment) => (
              <div key={comment.id} style={styles.comment}>
                <div style={styles.commentMeta}>
                  <span style={styles.commentAuthor}>
                    {comment.author?.nickname || comment.author?.name || '익명'}
                  </span>
                  <span style={styles.commentDate}>
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <ContentRenderer
                  html={Array.isArray(comment.content)
                    ? blocksToHtmlInline(comment.content)
                    : (comment.content || '')}
                  style={styles.commentContent}
                />
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noComments}>아직 댓글이 없습니다.</p>
        )}
      </section>

      <div style={styles.footer}>
        <Link to="/forum" style={styles.backLink}>
          ← 목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

const appreciationStyles: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  button: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 24, fontSize: 14, fontWeight: 500, border: '1px solid #fde68a', backgroundColor: '#fffbeb', color: '#92400e', cursor: 'pointer' },
  buttonBadge: { fontSize: 12, opacity: 0.75 },
  countLabel: { fontSize: 14, color: '#92400e' },
  cultureBlock: { padding: '14px 18px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 20 },
  stats: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#92400e' },
  messages: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #fde68a' },
  messagesLabel: { margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' },
  messageRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #fef3c7' },
  messageText: { fontSize: 13, color: '#78350f', fontStyle: 'italic', flex: 1, marginRight: 12 },
  messageAmount: { fontSize: 13, fontWeight: 600, color: '#92400e', whiteSpace: 'nowrap' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: '28px 24px', width: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: '#1f2937' },
  modalDesc: { margin: '0 0 18px', fontSize: 14, color: '#6b7280' },
  presets: { display: 'flex', gap: 8, marginBottom: 10 },
  presetBtn: { flex: 1, padding: '9px 0', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', backgroundColor: '#f9fafb', color: '#374151' },
  presetBtnActive: { border: '1px solid #f59e0b', backgroundColor: '#fffbeb', color: '#92400e' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, resize: 'vertical', marginBottom: 18, boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  cancelBtn: { padding: '9px 18px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  sendBtn: { padding: '9px 18px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  loadingState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '15px',
  },
  errorState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#dc2626',
    fontSize: '15px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  article: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  articleHeader: {
    padding: '24px',
    borderBottom: '1px solid #f1f5f9',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 16px 0',
    lineHeight: 1.4,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
    flexWrap: 'wrap',
  },
  metaDivider: {
    color: '#cbd5e1',
  },
  content: {
    padding: '24px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: 1.8,
    color: '#334155',
    margin: '0 0 16px 0',
  },
  commentsSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '24px',
  },
  commentsTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 20px 0',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  comment: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  commentAuthor: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155',
  },
  commentDate: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  commentContent: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#475569',
    margin: 0,
  },
  noComments: {
    fontSize: '14px',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '20px 0',
  },
  footer: {
    textAlign: 'center',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
};
