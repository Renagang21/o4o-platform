/**
 * OperatorPopListPage — 운영자 매장 HUB POP 목록 (KPA)
 *
 * WO-O4O-KPA-OPERATOR-POP-WRITE-PAGE-V1 / WO-O4O-KPA-OPERATOR-PUBLISHING-PAGES-STANDARD-TABLE-V1
 * WO-O4O-KPA-OPERATOR-RUNBULK-CONFIRM-FLOW-STANDARDIZATION-V1: 일괄 확인 대상 고정
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA·K-Cosmetics × 블로그·POP 4중복을 @o4o/operator-core-ui 의
 *   OperatorHubContentListPage 로 수렴. 서비스는 client + 문구 + accent 만 주입.
 *
 * Backend: WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1 (변경 없음)
 *   GET   /api/v1/kpa/operator/pop/posts
 *   PATCH /...:id/publish · /...:id/archive · DELETE /...:id
 */

import { useNavigate } from 'react-router-dom';
import { OperatorHubContentListPage } from '@o4o/operator-core-ui/modules/hub-content-list';
import type { HubContentListClient } from '@o4o/operator-core-ui/modules/hub-content-list';
import {
  listOperatorPopPosts,
  publishOperatorPopPost,
  archiveOperatorPopPost,
  deleteOperatorPopPost,
} from '../../../api/operatorPop';

const client: HubContentListClient = {
  list: listOperatorPopPosts,
  publish: publishOperatorPopPost,
  archive: archiveOperatorPopPost,
  remove: deleteOperatorPopPost,
};

export default function OperatorPopListPage() {
  const navigate = useNavigate();
  return (
    <OperatorHubContentListPage
      client={client}
      actionPolicyKey="kpa:operator-pop"
      tableId="operator-pop-list"
      onCreate={() => navigate('/operator/pop/new')}
      onEdit={(id) => navigate(`/operator/pop/${id}/edit`)}
      copy={{
        kindLabel: 'POP',
        pageTitle: '매장 HUB POP',
        pageDescription:
          '운영자가 KPA 매장 HUB 에 게시할 POP 콘텐츠를 작성·관리합니다. 발행 시 모든 KPA 매장의 HUB 에 노출되며, 매장 경영자가 자기 매장 자료함으로 가져갈 수 있습니다.',
        createButtonLabel: 'POP 만들기',
        emptyMessage: '아직 만든 POP 이 없습니다',
        emptyFilteredMessage: '해당 상태의 POP 이 없습니다',
      }}
      accent={{
        createButton: 'bg-blue-600 hover:bg-blue-700',
        activePill: 'bg-blue-600 text-white',
        retryButton: 'text-blue-600 border-blue-400 hover:bg-blue-50',
        publishedBadge: 'bg-emerald-50 text-emerald-700',
      }}
    />
  );
}
