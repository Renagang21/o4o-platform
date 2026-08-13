/**
 * ForumMemberManagementPage - 포럼 회원 관리 (GlycoPharm)
 *
 * WO-O4O-FORUM-MEMBER-MANAGEMENT-EXPANSION-FRONTEND-V1
 * WO-O4O-GLYCOPHARM-FORUM-SERVICE-BOUNDARY-AND-CROSSSERVICE-READ-WRITE-ISOLATION-FIX-V1
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1:
 *   354줄 자체 구현 → 공통 ForumOwnerMemberManagement + GlycoPharm adapter/config.
 *
 * endpoint 는 service-scoped /api/v1/glycopharm/forum/categories/:id/... 그대로이고
 * (핸들러는 공통 ForumMembershipController), 소유자 검증도 백엔드 계약 무변경이다.
 */

import { useParams } from 'react-router-dom';
import { ForumOwnerMemberManagement } from '@o4o/shared-space-ui';
import {
  glycopharmForumMembershipAdapter,
  GLYCOPHARM_FORUM_OWNER_THEME,
} from '@/services/forumOwnerAdapter';

export default function ForumMemberManagementPage() {
  const { forumId } = useParams<{ forumId: string }>();

  return (
    <ForumOwnerMemberManagement
      forumId={forumId}
      api={glycopharmForumMembershipAdapter}
      theme={GLYCOPHARM_FORUM_OWNER_THEME}
      backHref="/forum/my-dashboard"
    />
  );
}
