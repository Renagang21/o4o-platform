/**
 * OperatorBlogListPage — 운영자 매장 HUB 블로그 목록 (K-Cosmetics)
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA·K-Cosmetics × 블로그·POP 4중복을 @o4o/operator-core-ui 의
 *   OperatorHubContentListPage 로 수렴. 서비스는 client + 문구 + accent 만 주입.
 *   수렴으로 획득: 행 발행 확인 게이트 · 일괄 작업 확인 대상 고정(RUNBULK 표준).
 *
 * Backend: GET /api/v1/cosmetics/operator/blog/posts
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
      actionPolicyKey="cosmetics:operator-blog"
      tableId="kcos-operator-blog-list"
      onCreate={() => navigate('/operator/blog/new')}
      onEdit={(id) => navigate(`/operator/blog/${id}/edit`)}
      copy={{
        kindLabel: '블로그',
        pageTitle: '매장 HUB 블로그',
        pageDescription:
          '운영자가 K-Cosmetics 매장 HUB 에 게시할 블로그 콘텐츠를 작성·관리합니다. 발행 시 모든 K-Cosmetics 매장의 HUB 에 노출됩니다.',
        createButtonLabel: '새 블로그',
        emptyMessage: '아직 작성한 블로그가 없습니다',
        emptyFilteredMessage: '해당 상태의 블로그가 없습니다',
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
