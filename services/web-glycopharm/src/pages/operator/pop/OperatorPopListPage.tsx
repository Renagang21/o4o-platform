/**
 * OperatorPopListPage — 운영자 약국 HUB POP 목록 (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1 (2026-05-27): KPA port (서비스 로컬 구현)
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   @o4o/operator-core-ui 의 OperatorHubContentListPage 로 수렴.
 *
 * Backend 변경 없음:
 *   GET   /api/v1/glycopharm/operator/pop/posts
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
      actionPolicyKey="glycopharm:operator-pop"
      tableId="operator-pop-list"
      onCreate={() => navigate('/operator/pop/new')}
      onEdit={(id) => navigate(`/operator/pop/${id}/edit`)}
      copy={{
        kindLabel: 'POP',
        pageTitle: '약국 HUB POP',
        pageDescription:
          '운영자가 GlycoPharm 약국 HUB 에 게시할 POP 콘텐츠를 작성·관리합니다. 발행 시 모든 GlycoPharm 약국의 HUB 에 노출되며, 매장 경영자가 자기 약국 자료함으로 가져갈 수 있습니다.',
        createButtonLabel: '새 POP',
        emptyMessage: '아직 작성한 POP 이 없습니다',
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
