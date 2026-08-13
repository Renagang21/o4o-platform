/**
 * HubContentDetailPage — GlycoPharm 콘텐츠 상세
 *
 * WO-O4O-APPRECIATION-CONTENT-DETAIL-UI-GLYCO-KCOS-V1
 * WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1: AppreciationPanel 공통 컴포넌트로 정렬
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   K-Cosmetics `/library/content/:id` 와 동일한 화면이라 공통 `HubContentDetailView` 로 이관.
 *   이 파일은 accent(primary) · 감사 패널(로그인 모달 포함) config 만 소유한다.
 *   데이터 출처 · 라우트 · 로그인 모달 연결 무변경.
 *
 * Route: /hub/content/:id
 * Data: location.state.item (ContentHubItem from list navigation)
 * Appreciation: targetType='content', authorId guard via item.createdBy
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { AppreciationPanel, type ContentHubItem } from '@o4o/shared-space-ui';
import { HubContentDetailView } from '@o4o/store-ui-core';
import { appreciationPanelApi } from '@/api/appreciation';
import { toast } from '@o4o/error-handling';

export default function HubContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const item = state?.item as ContentHubItem | undefined;

  const handleAppreciationError = (err: any) => {
    const code = err?.response?.data?.code;
    if (code === 'INSUFFICIENT_BALANCE') toast.error('포인트가 부족합니다');
    else if (code === 'SELF_APPRECIATION') toast.error('자신의 콘텐츠에는 감사 포인트를 보낼 수 없습니다');
    else toast.error('감사 포인트 전송에 실패했습니다');
  };

  return (
    <HubContentDetailView
      item={item}
      accent="primary"
      onBack={() => navigate(-1)}
      appreciation={
        /* WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1: 공통 AppreciationPanel (panel variant) */
        <AppreciationPanel
          targetType="content"
          targetId={id ?? ''}
          api={appreciationPanelApi}
          currentUserId={user?.id ?? null}
          canSend={!!item?.createdBy}
          disabledReason="작성자 정보가 없어 감사하기를 사용할 수 없습니다."
          theme="emerald"
          variant="panel"
          panelTitle="콘텐츠 감사"
          buttonLabel="🎁 작성자에게 감사하기"
          defaultAmount={10}
          onSent={({ amount }) => toast.success(`${amount}P 감사 포인트를 보냈습니다!`)}
          onError={handleAppreciationError}
          onRequireLogin={() => openLoginModal()}
        />
      }
    />
  );
}
