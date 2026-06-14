/**
 * ContentDetailPage — 콘텐츠 상세 (KPA wrapper)
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 * WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-PHASE2-V1:
 *   표시부를 공통 `CommunityContentDetailView`(@o4o/shared-space-ui)로 위임.
 *   본 wrapper 는 KPA 고유 책임만 유지: contentApi 조회·추천·조회수, AppreciationPanel,
 *   링크복사, 수정 링크, 소유권/인증, 배지·날짜 매핑.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppreciationPanel, CommunityContentDetailView } from '@o4o/shared-space-ui';
import type { CommunityContentBadge } from '@o4o/shared-space-ui';
import { contentApi, type ContentItem } from '../../api/content';
import { appreciationPanelApi } from '../../api/appreciation';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

const CONTENT_TYPE_LABEL: Record<string, string> = {
  participation: '참여 프로그램',
  information: '정보 콘텐츠',
};
const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  published: '공개',
  private: '비공개',
};

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
    contentApi.trackView(id).catch(() => {});
  }, [id]);

  const handleAppreciationError = (err: any) => {
    const msg = err?.message || '';
    if (msg.includes('INSUFFICIENT_BALANCE') || msg.includes('부족')) toast.error('포인트가 부족합니다');
    else if (msg.includes('SELF')) toast.error('자신의 콘텐츠에는 감사 포인트를 보낼 수 없습니다');
    else if (msg.includes('INVALID')) toast.error('금액은 1P 이상이어야 합니다');
    else toast.error('감사 포인트 전송에 실패했습니다');
  };

  const handleRecommend = async () => {
    if (!isAuthenticated || !id) { toast.error('로그인이 필요합니다'); return; }
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
    }).catch(() => toast.error('복사에 실패했습니다'));
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return '-'; }
  };

  if (loading) {
    return <div style={styles.center}><p style={styles.loadingText}>불러오는 중...</p></div>;
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

  const badges: CommunityContentBadge[] = [
    { text: CONTENT_TYPE_LABEL[content.content_type] || content.content_type, tone: 'primary' },
    ...(content.sub_type ? [{ text: content.sub_type, tone: 'muted' as const }] : []),
    ...(content.status !== 'published' ? [{ text: STATUS_LABEL[content.status] || content.status, tone: 'warning' as const }] : []),
  ];

  return (
    <CommunityContentDetailView
      data={{
        title: content.title,
        authorName: content.author_name,
        dateLabel: formatDate(content.created_at),
        viewCount: content.view_count,
        summary: content.summary,
        tags: content.tags,
        bodyHtml: content.body,
        badges,
      }}
      backSlot={<Link to="/content" style={styles.backLink}>← 목록으로</Link>}
      actionsSlot={
        <>
          <button
            onClick={handleRecommend}
            disabled={recommending}
            style={{ ...styles.actionBtn, ...(isRecommended ? styles.actionBtnActive : {}) }}
          >
            {isRecommended ? '♥' : '♡'} 추천 {likeCount}
          </button>
          <button
            onClick={handleCopyLink}
            style={{ ...styles.actionBtn, ...(linkCopied ? styles.actionBtnCopied : {}) }}
          >
            {linkCopied ? '복사됨!' : '🔗 링크 복사'}
          </button>
          {isOwner && (
            <Link to={`/content/${content.id}/edit`} style={styles.editLink}>✏️ 수정</Link>
          )}
        </>
      }
      footerSlot={
        <AppreciationPanel
          targetType="content"
          targetId={content.id}
          api={appreciationPanelApi}
          currentUserId={user?.id ?? null}
          canSend={!!content.created_by}
          disabledReason="작성자 정보가 없어 감사하기를 사용할 수 없습니다."
          theme="blue"
          variant="inline"
          buttonLabel="🎁 작성자에게 감사하기"
          onSent={({ amount }) => toast.success(`${amount}P 감사 포인트를 전달했습니다 🎁`)}
          onError={handleAppreciationError}
        />
      }
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 12 },
  loadingText: { fontSize: '0.9375rem', color: '#64748b' },
  errorText: { fontSize: '0.9375rem', color: '#ef4444' },
  backLink: { fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0 },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 16px', fontSize: '0.8125rem',
    fontWeight: 500, color: '#475569', backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
  },
  actionBtnActive: { color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  actionBtnCopied: { color: '#16a34a', borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  editLink: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 16px', fontSize: '0.8125rem',
    fontWeight: 500, color: '#475569', backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 8, textDecoration: 'none', transition: 'all 0.15s',
  },
};

export default ContentDetailPage;
