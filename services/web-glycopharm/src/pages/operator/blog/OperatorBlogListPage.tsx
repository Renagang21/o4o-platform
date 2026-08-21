/**
 * OperatorBlogListPage — 운영자 약국 HUB 블로그 목록 (GlycoPharm)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1 (2026-05-27): KPA port (서비스 로컬 구현)
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
 *   KPA · K-Cosmetics 가 이미 쓰던 @o4o/operator-core-ui 의 OperatorHubContentListPage 로 수렴.
 *   서비스는 client + 문구 + accent 만 주입한다.
 *
 * Backend 변경 없음:
 *   GET   /api/v1/glycopharm/operator/blog/posts
 *   PATCH /...:id/publish · /...:id/archive · DELETE /...:id
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
      actionPolicyKey="glycopharm:operator-blog"
      tableId="operator-blog-list"
      onCreate={() => navigate('/operator/blog/new')}
      onEdit={(id) => navigate(`/operator/blog/${id}/edit`)}
      copy={{
        kindLabel: '블로그',
        pageTitle: '약국 HUB 블로그',
        pageDescription:
          '운영자가 GlycoPharm 약국 HUB 에 게시할 블로그 콘텐츠를 작성·관리합니다. 발행 시 모든 GlycoPharm 약국의 HUB 에 노출되며, 매장 경영자가 자기 약국 자료함으로 가져갈 수 있습니다.',
        createButtonLabel: '새 블로그',
        emptyMessage: '아직 작성한 블로그가 없습니다',
        emptyFilteredMessage: '해당 상태의 블로그가 없습니다',
      }}
      /* 기존 GlycoPharm 로컬 화면의 accent(blue-600)를 그대로 보존한다 — 시각 회귀 0. */
      accent={{
        createButton: 'bg-blue-600 hover:bg-blue-700',
        activePill: 'bg-blue-600 text-white',
        retryButton: 'text-blue-600 border-blue-400 hover:bg-blue-50',
        publishedBadge: 'bg-emerald-50 text-emerald-700',
      }}
    />
  );
}
