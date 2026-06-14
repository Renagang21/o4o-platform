/**
 * ContentDetailPage — 회원 콘텐츠 상세 (K-Cosmetics wrapper)
 *
 * WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1 (Phase B)
 *   표시부는 공통 `CommunityContentDetailView`(@o4o/shared-space-ui)에 위임.
 *   wrapper 는 KCos 고유 책임만: contentApi 조회·조회수, 링크복사, 수정 링크, 소유권·배지.
 *   documents-only — recommend / AppreciationPanel 미적용.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CommunityContentDetailView } from '@o4o/shared-space-ui';
import type { CommunityContentBadge } from '@o4o/shared-space-ui';
import { contentApi, type ContentItem, type ContentDetailResponse } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  published: '공개',
  private: '비공개',
};

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    contentApi.detail(id)
      .then((res: ContentDetailResponse) => {
        if (res.success) setContent(res.data);
      })
      .catch((e: any) => setError(e?.message || '콘텐츠를 불러올 수 없습니다'))
      .finally(() => setLoading(false));
    contentApi.trackView(id).catch(() => {});
  }, [id]);

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
    ...(content.status !== 'published'
      ? [{ text: STATUS_LABEL[content.status] || content.status, tone: 'warning' as const }]
      : []),
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
  actionBtnCopied: { color: '#16a34a', borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  editLink: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 16px', fontSize: '0.8125rem',
    fontWeight: 500, color: '#475569', backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 8, textDecoration: 'none', transition: 'all 0.15s',
  },
};

export default ContentDetailPage;
