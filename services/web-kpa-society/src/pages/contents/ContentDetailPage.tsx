/**
 * ContentDetailPage — 콘텐츠 상세
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 *
 * 본문(body HTML) 표시, 추천 토글, 링크 복사, 수정 링크
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contentApi, type ContentItem } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTENT_TYPE_LABEL: Record<string, string> = {
  participation: '참여 프로그램',
  information: '정보 콘텐츠',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  published: '공개',
  private: '비공개',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecommended, setIsRecommended] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [recommending, setRecommending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    contentApi.detail(id)
      .then((res) => {
        if (res.success) {
          setContent(res.data);
          setIsRecommended(res.data.isRecommendedByMe || false);
          setLikeCount(res.data.like_count || 0);
        }
      })
      .catch((e) => setError(e?.message || '콘텐츠를 불러올 수 없습니다'))
      .finally(() => setLoading(false));

    // Track view
    contentApi.trackView(id).catch(() => {});
  }, [id]);

  const handleRecommend = async () => {
    if (!isAuthenticated || !id) {
      toast.error('로그인이 필요합니다');
      return;
    }
    setRecommending(true);
    try {
      const res = await contentApi.recommend(id);
      if (res.success) {
        setIsRecommended(res.data.isRecommendedByMe);
        setLikeCount(res.data.recommendCount);
      }
    } catch (e: any) {
      toast.error(e?.message || '추천 처리에 실패했습니다');
    } finally {
      setRecommending(false);
    }
  };

  const handleCopyLink = () => {
    if (!id) return;
    const url = `${window.location.origin}/content/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      toast.success('링크가 복사되었습니다');
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      toast.error('복사에 실패했습니다');
    });
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return '-'; }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={styles.loadingText}>불러오는 중...</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div style={styles.center}>
        <p style={styles.errorText}>{error || '콘텐츠를 찾을 수 없습니다'}</p>
        <button onClick={() => navigate('/content')} style={styles.backLink}>목록으로</button>
      </div>
    );
  }

  const isOwner = user?.id === content.created_by;

  return (
    <div style={styles.page}>
      {/* Back link */}
      <div style={styles.backRow}>
        <Link to="/content" style={styles.backLink}>← 목록으로</Link>
      </div>

      {/* Article Header */}
      <article style={styles.article}>
        <div style={styles.metaRow}>
          <span style={styles.typeBadge}>
            {CONTENT_TYPE_LABEL[content.content_type] || content.content_type}
          </span>
          {content.sub_type && (
            <span style={styles.subTypeBadge}>{content.sub_type}</span>
          )}
          {content.status !== 'published' && (
            <span style={styles.statusBadge}>
              {STATUS_LABEL[content.status] || content.status}
            </span>
          )}
        </div>

        <h1 style={styles.articleTitle}>{content.title}</h1>

        <div style={styles.authorRow}>
          <span style={styles.authorName}>{content.author_name || '익명'}</span>
          <span style={styles.dot}>·</span>
          <span style={styles.dateText}>{formatDate(content.created_at)}</span>
          <span style={styles.dot}>·</span>
          <span style={styles.viewText}>조회 {content.view_count}</span>
        </div>

        {/* Summary */}
        {content.summary && (
          <div style={styles.summaryBox}>
            <p style={styles.summaryText}>{content.summary}</p>
          </div>
        )}

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div style={styles.tagRow}>
            {content.tags.map((tag) => (
              <span key={tag} style={styles.tag}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Body Content */}
        <div style={styles.bodyWrap}>
          {content.body ? (
            <div
              style={styles.bodyHtml}
              dangerouslySetInnerHTML={{ __html: content.body }}
            />
          ) : (
            <p style={styles.emptyBody}>
              본문 콘텐츠가 없습니다.
            </p>
          )}
        </div>

        {/* Action Bar */}
        <div style={styles.actionBar}>
          <button
            onClick={handleRecommend}
            disabled={recommending}
            style={{
              ...styles.actionBtn,
              ...(isRecommended ? styles.actionBtnActive : {}),
            }}
          >
            {isRecommended ? '♥' : '♡'} 추천 {likeCount}
          </button>

          <button
            onClick={handleCopyLink}
            style={{
              ...styles.actionBtn,
              ...(linkCopied ? styles.actionBtnCopied : {}),
            }}
          >
            {linkCopied ? '복사됨!' : '🔗 링크 복사'}
          </button>

          {isOwner && (
            <Link to={`/content/${content.id}/edit`} style={styles.editLink}>
              ✏️ 수정
            </Link>
          )}
        </div>
      </article>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 780,
    margin: '0 auto',
    padding: '24px 16px 60px',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
    gap: 12,
  },
  loadingText: {
    fontSize: '0.9375rem',
    color: '#64748b',
  },
  errorText: {
    fontSize: '0.9375rem',
    color: '#ef4444',
  },
  backRow: {
    marginBottom: 16,
  },
  backLink: {
    fontSize: '0.875rem',
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  article: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  metaRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: 4,
  },
  subTypeBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '0.6875rem',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: 4,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: 4,
  },
  articleTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 12px',
    lineHeight: 1.4,
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  authorName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#334155',
  },
  dot: {
    color: '#cbd5e1',
  },
  dateText: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  viewText: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 16,
    borderLeft: '3px solid #2563eb',
  },
  summaryText: {
    fontSize: '0.875rem',
    color: '#475569',
    margin: 0,
    lineHeight: 1.6,
  },
  tagRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tag: {
    fontSize: '0.8125rem',
    color: '#2563eb',
  },
  bodyWrap: {
    minHeight: 200,
    marginBottom: 24,
    paddingTop: 16,
    borderTop: '1px solid #f1f5f9',
  },
  bodyHtml: {
    fontSize: '0.9375rem',
    color: '#334155',
    lineHeight: 1.8,
    wordBreak: 'break-word',
  },
  emptyBody: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '40px 0',
    fontSize: '0.875rem',
  },
  actionBar: {
    display: 'flex',
    gap: 8,
    paddingTop: 16,
    borderTop: '1px solid #f1f5f9',
    flexWrap: 'wrap',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 16px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  actionBtnActive: {
    color: '#dc2626',
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  actionBtnCopied: {
    color: '#16a34a',
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  editLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 16px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
};

export default ContentDetailPage;
