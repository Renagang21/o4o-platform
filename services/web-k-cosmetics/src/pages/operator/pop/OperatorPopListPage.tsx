/**
 * OperatorPopListPage — 운영자 매장 HUB POP 목록 (K-Cosmetics)
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA·K-Cosmetics × 블로그·POP 4중복을 @o4o/operator-core-ui 의
 *   OperatorHubContentListPage 로 수렴. 서비스는 client + 문구 + accent 만 주입.
 *   수렴으로 획득: 행 발행 확인 게이트 · 일괄 작업 확인 대상 고정(RUNBULK 표준).
 *
 * Backend: GET /api/v1/cosmetics/operator/pop/posts
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
      actionPolicyKey="cosmetics:operator-pop"
      tableId="kcos-operator-pop-list"
      onCreate={() => navigate('/operator/pop/new')}
      onEdit={(id) => navigate(`/operator/pop/${id}/edit`)}
      copy={{
        kindLabel: 'POP',
        pageTitle: '매장 HUB POP',
        pageDescription:
          '운영자가 K-Cosmetics 매장 HUB 에 게시할 POP 콘텐츠를 작성·관리합니다. 발행 시 모든 K-Cosmetics 매장의 HUB 에 노출됩니다.',
        createButtonLabel: '새 POP',
        emptyMessage: '아직 작성한 POP 이 없습니다',
        emptyFilteredMessage: '해당 상태의 POP 이 없습니다',
      }}
      accent={{
        createButton: 'bg-pink-600 hover:bg-pink-700',
        activePill: 'bg-pink-600 text-white',
        retryButton: 'text-pink-600 border-pink-400 hover:bg-pink-50',
        publishedBadge: 'bg-pink-50 text-pink-700',
      }}
    />
  );
}
