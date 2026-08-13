/**
 * ForumMemberManagementPage - 포럼 회원 관리 (K-Cosmetics)
 *
 * WO-O4O-FORUM-MEMBER-MANAGEMENT-EXPANSION-FRONTEND-V1
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1:
 *   354줄 자체 구현 → 공통 ForumOwnerMemberManagement + K-Cosmetics adapter/config.
 *
 * endpoint(/api/v1/cosmetics/forum/categories/:id/...)·소유자 검증 계약 무변경.
 */

import { useParams } from 'react-router-dom';
import { ForumOwnerMemberManagement } from '@o4o/shared-space-ui';
import {
  kcosmeticsForumMembershipAdapter,
  KCOSMETICS_FORUM_OWNER_THEME,
} from '../../services/forumOwnerAdapter';

export default function ForumMemberManagementPage() {
  const { forumId } = useParams<{ forumId: string }>();

  return (
    <ForumOwnerMemberManagement
      forumId={forumId}
      api={kcosmeticsForumMembershipAdapter}
      theme={KCOSMETICS_FORUM_OWNER_THEME}
      backHref="/forum/my-dashboard"
    />
  );
}
