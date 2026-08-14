/**
 * OperatorBlogListPage — 운영자 매장 HUB 블로그 목록 (KPA)
 *
 * WO-O4O-OPERATOR-BLOG-WRITE-PAGE-KPA-V1 (초기 카드형)
 * WO-O4O-KPA-OPERATOR-PUBLISHING-PAGES-STANDARD-TABLE-V1 (2026-05-24): O4O 표준 테이블 전환
 * WO-O4O-KPA-OPERATOR-RUNBULK-CONFIRM-FLOW-STANDARDIZATION-V1: 일괄 확인 대상 고정
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA·K-Cosmetics × 블로그·POP 4중복을 @o4o/operator-core-ui 의
 *   OperatorHubContentListPage 로 수렴. 서비스는 client + 문구 + accent 만 주입.
 *
 * Backend: WO-O4O-OPERATOR-BLOG-PUBLISHING-WRITE-API-V1 (변경 없음)
 *   GET   /api/v1/kpa/operator/blog/posts
 *   PATCH /...:id/publish — fan-out 일괄 발행
 *   PATCH /...:id/archive — fan-out 일괄 보관
 *   DELETE /...:id        — fan-out 일괄 삭제
 *
 * 권한 검증은 backend + RoleGuard 가 처리.
 */

import { useNavigate } from 'react-router-dom';
import { OperatorHubContentListPage } from '@o4o/operator-core-ui/modules/hub-content-list';
import type { HubContentListClient } from '@o4o/operator-core-ui/modules/hub-content-list';
import {
  listOperatorBlogPosts,
  publishOperatorBlogPost,
  archiveOperatorBlogPost,
  deleteOperatorBlogPost,
} from '../../../api/operatorBlog';

const client: HubContentListClient = {
  list: listOperatorBlogPosts,
  publish: publishOperatorBlogPost,
  archive: archiveOperatorBlogPost,
  remove: deleteOperatorBlogPost,
};

export default function OperatorBlogListPage() {
  const navigate = useNavigate();
  return (
    <OperatorHubContentListPage
      client={client}
      actionPolicyKey="kpa:operator-blog"
      tableId="operator-blog-list"
      onCreate={() => navigate('/operator/blog/new')}
      onEdit={(id) => navigate(`/operator/blog/${id}/edit`)}
      copy={{
        kindLabel: '블로그',
        pageTitle: '매장 HUB 블로그',
        pageDescription:
          '운영자가 KPA 매장 HUB 에 게시할 블로그 콘텐츠를 작성·관리합니다. 발행 시 모든 KPA 매장의 HUB 에 노출되며, 매장 경영자가 자기 매장 자료함으로 가져갈 수 있습니다.',
        createButtonLabel: '블로그 글쓰기',
        emptyMessage: '아직 작성한 블로그가 없습니다',
        emptyFilteredMessage: '해당 상태의 블로그가 없습니다',
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
