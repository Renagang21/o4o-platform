/**
 * ForumMemberManagementPage — 포럼 회원 관리 (PharmacyHub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §8
 * 공통 ForumOwnerMemberManagement + PharmacyHub adapter/config.
 * 소유자 검증·endpoint 계약(`/api/v1/pharmacy-hub/forum/categories/:id/...`)은 backend 무변경.
 * 새 moderation 기능(차단 등)은 추가하지 않는다 — 공통에 존재하는 capability 만 채택.
 */

import { useParams } from 'react-router-dom';
import { ForumOwnerMemberManagement } from '@o4o/shared-space-ui';
import {
  pharmacyHubForumMembershipAdapter,
  PHARMACY_HUB_FORUM_OWNER_THEME,
} from '../../services/forumOwnerAdapter';

export default function ForumMemberManagementPage() {
  const { forumId } = useParams<{ forumId: string }>();

  return (
    <ForumOwnerMemberManagement
      forumId={forumId}
      api={pharmacyHubForumMembershipAdapter}
      theme={PHARMACY_HUB_FORUM_OWNER_THEME}
      backHref="/forum/my-dashboard"
    />
  );
}
