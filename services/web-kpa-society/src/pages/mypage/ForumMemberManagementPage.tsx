/**
 * ForumMemberManagementPage - 포럼 회원 관리 (KPA Society)
 *
 * WO-KPA-A-FORUM-OWNER-MEMBER-MANAGEMENT-UI-V1
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1:
 *   381줄 자체 구현 → 공통 ForumOwnerMemberManagement + KPA adapter/config.
 *
 * KPA 고유 (유지): 마이페이지 네비게이션 + 마이페이지 폭.
 * endpoint(/api/v1/kpa/forum/categories/:id/...)·소유자 검증 계약 무변경.
 */

import { useParams } from 'react-router-dom';
import { MyPageNavigation } from '@o4o/account-ui';
import { ForumOwnerMemberManagement } from '@o4o/shared-space-ui';
import { KPA_MYPAGE_NAV_ITEMS } from './navItems';
import { kpaForumMembershipAdapter, KPA_FORUM_OWNER_THEME } from '../../api/forumOwnerAdapter';

export default function ForumMemberManagementPage() {
  const { forumId } = useParams<{ forumId: string }>();

  return (
    <ForumOwnerMemberManagement
      forumId={forumId}
      api={kpaForumMembershipAdapter}
      theme={KPA_FORUM_OWNER_THEME}
      backHref="/mypage/my-forums"
      containerClassName="w-full max-w-[1120px] mx-auto px-4 sm:px-5 lg:px-6 pb-10"
      navSlot={<MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />}
    />
  );
}
