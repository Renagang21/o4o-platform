/**
 * HubContentDetailPage — GlycoPharm 콘텐츠 상세
 *
 * WO-O4O-APPRECIATION-CONTENT-DETAIL-UI-GLYCO-KCOS-V1
 * WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1: AppreciationPanel 공통 컴포넌트로 정렬
 *
 * Route: /hub/content/:id
 * Data: location.state.item (ContentHubItem from list navigation)
 * Appreciation: targetType='content', authorId guard via item.createdBy
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { AppreciationPanel, type ContentHubItem } from '@o4o/shared-space-ui';
import { appreciationPanelApi } from '@/api/appreciation';
import { toast } from '@o4o/error-handling';

export default function HubContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const item = state?.item as ContentHubItem | undefined;

  if (!item) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-slate-400">콘텐츠를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary-600 hover:underline">
          ← 뒤로
        </button>
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
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-sm text-primary-600 hover:underline mb-4 block">
        ← 콘텐츠 목록
      </button>

      {/* Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
        {item.thumbnail && (
          <div className="aspect-video bg-slate-100 overflow-hidden">
            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5">
          {item.type && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded mb-2">
              {item.type}
            </span>
          )}
          <h1 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h1>
          {item.summary && <p className="text-sm text-slate-500 mb-3 leading-relaxed">{item.summary}</p>}
          {item.date && <p className="text-xs text-slate-400 mb-4">{item.date}</p>}
          {item.href && (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
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
        theme="emerald"
        variant="panel"
        panelTitle="콘텐츠 감사"
        buttonLabel="🎁 작성자에게 감사하기"
        defaultAmount={10}
        onSent={({ amount }) => toast.success(`${amount}P 감사 포인트를 보냈습니다!`)}
        onError={handleAppreciationError}
        onRequireLogin={() => openLoginModal()}
      />
    </div>
  );
}
