/**
 * ContentDetailPage — 회원 콘텐츠 상세 (K-Cosmetics wrapper)
 *
 * WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1 (Phase B)
 *   표시부는 공통 `CommunityContentDetailView`(@o4o/shared-space-ui)에 위임.
 *   documents-only — recommend / AppreciationPanel 미적용.
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1
 *   조회·조회수·loading/error/not-found·목록으로 배치까지 공통
 *   `CommunityContentDetailTemplate` 로 이동. wrapper 는 K-Cosmetics 고유 축만:
 *   contentApi adapter · 링크복사 · 수정 링크 · 소유권 판정.
 */

import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CommunityContentDetailTemplate,
  standardContentToDetailData,
  type CommunityContentDetailConfig,
} from '@o4o/shared-space-ui';
import { contentApi, type ContentItem, type ContentDetailResponse } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [linkCopied, setLinkCopied] = useState(false);

  const config: CommunityContentDetailConfig<ContentItem> = useMemo(() => ({
    fetchContent: async (contentId) => {
      const res: ContentDetailResponse = await contentApi.detail(contentId);
      if (!res.success) throw new Error('CONTENT_DETAIL_FAILED');
      return res.data;
    },
    toDetailData: standardContentToDetailData,
    trackView: (contentId) => { contentApi.trackView(contentId).catch(() => {}); },
    listPath: '/content',
    listLabel: '목록으로',
    errorMessage: '콘텐츠를 불러오지 못했습니다',
    notFoundMessage: '콘텐츠를 찾을 수 없습니다',
  }), []);

  const handleCopyLink = (contentId: string) => {
    const url = `${window.location.origin}/content/${contentId}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      toast.success('링크가 복사되었습니다');
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => toast.error('복사에 실패했습니다'));
  };

  return (
    <CommunityContentDetailTemplate<ContentItem>
      contentId={id}
      config={config}
      renderLink={(href, children) => <Link to={href} style={styles.backLink}>{children}</Link>}
      renderActions={(content) => (
        <>
          <button
            onClick={() => handleCopyLink(content.id)}
            style={{ ...styles.actionBtn, ...(linkCopied ? styles.actionBtnCopied : {}) }}
          >
            {linkCopied ? '복사됨!' : '🔗 링크 복사'}
          </button>
          {user?.id === content.created_by && (
            <Link to={`/content/${content.id}/edit`} style={styles.editLink}>✏️ 수정</Link>
          )}
        </>
      )}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  backLink: { fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 500 },
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
