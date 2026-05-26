/**
 * ContentDetailPage — K-Cosmetics 콘텐츠 상세
 *
 * WO-O4O-APPRECIATION-CONTENT-DETAIL-UI-GLYCO-KCOS-V1
 * WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1: AppreciationPanel 공통 컴포넌트로 정렬
 *
 * Route: /library/content/:id
 * Data: location.state.item (ContentHubItem from list navigation)
 * Appreciation: targetType='content', authorId guard via item.createdBy
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppreciationPanel, type ContentHubItem } from '@o4o/shared-space-ui';
import { appreciationPanelApi } from '@/api/appreciation';
import { toast } from '@o4o/error-handling';

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const item = state?.item as ContentHubItem | undefined;

  if (!item) {
    return (
      <div style={S.notFound}>
        <p style={S.notFoundText}>콘텐츠를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} style={S.backBtn}>← 뒤로</button>
      </div>
    );
  }

  const canSend = !!item.createdBy;

  const handleAppreciationError = (err: any) => {
    const code = err?.response?.data?.code;
    if (code === 'INSUFFICIENT_BALANCE') toast.error('포인트가 부족합니다');
    else if (code === 'SELF_APPRECIATION') toast.error('자신의 콘텐츠에는 감사 포인트를 보낼 수 없습니다');
    else toast.error('감사 포인트 전송에 실패했습니다');
  };

  return (
    <div style={S.page}>
      <button onClick={() => navigate(-1)} style={S.backLink}>← 콘텐츠 목록</button>

      {/* Content Card */}
      <div style={S.card}>
        {item.thumbnail && (
          <div style={S.thumbnailWrap}>
            <img src={item.thumbnail} alt={item.title} style={S.thumbnail} />
          </div>
        )}
        <div style={S.cardBody}>
          {item.type && <span style={S.typeBadge}>{item.type}</span>}
          {item.isPinned && <span style={S.pinnedBadge}>추천</span>}
          <h1 style={S.title}>{item.title}</h1>
          {item.summary && <p style={S.summary}>{item.summary}</p>}
          {item.date && <p style={S.date}>{item.date}</p>}
          {item.href && (
            <a href={item.href} target="_blank" rel="noopener noreferrer" style={S.externalBtn}>
              외부 링크 열기 ↗
            </a>
          )}
        </div>
      </div>

      {/* WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1: 공통 AppreciationPanel (panel variant) */}
      <AppreciationPanel
        targetType="content"
        targetId={id ?? ''}
        api={appreciationPanelApi}
        currentUserId={user?.id ?? null}
        canSend={canSend}
        disabledReason="작성자 정보가 없어 감사하기를 사용할 수 없습니다."
        theme="pink"
        variant="panel"
        panelTitle="콘텐츠 감사"
        buttonLabel="🎁 작성자에게 감사하기"
        defaultAmount={10}
        onSent={({ amount }) => toast.success(`${amount}P 감사 포인트를 보냈습니다!`)}
        onError={handleAppreciationError}
        onRequireLogin={() => toast.error('로그인이 필요합니다')}
      />
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 640, margin: '0 auto', padding: '24px 16px 60px' },
  notFound: { minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: '0.875rem', color: '#94a3b8' },
  backBtn: { fontSize: '0.875rem', color: '#ec4899', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  backLink: { display: 'block', fontSize: '0.875rem', color: '#ec4899', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16, textAlign: 'left' },
  card: { backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 16 },
  thumbnailWrap: { width: '100%', aspectRatio: '16/9', backgroundColor: '#f8fafc', overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%', objectFit: 'cover' },
  cardBody: { padding: '20px' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: 4, marginRight: 6, marginBottom: 8 },
  pinnedBadge: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 500, backgroundColor: '#fdf2f8', color: '#ec4899', borderRadius: 4, marginBottom: 8 },
  title: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.4 },
  summary: { fontSize: '0.875rem', color: '#64748b', margin: '0 0 8px', lineHeight: 1.6 },
  date: { fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 16px' },
  externalBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#ec4899', color: '#fff', fontSize: '0.875rem', fontWeight: 500, borderRadius: 8, textDecoration: 'none' },
};
