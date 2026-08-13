/**
 * MyForumDashboardPage - 내 포럼 관리 대시보드 (K-Cosmetics)
 *
 * WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1:
 *   581줄 자체 구현 → 공통 ForumOwnerDashboard + K-Cosmetics adapter/config.
 *   route(/forum/my-dashboard) · 업무 · 문구는 그대로다.
 */

import { MessageSquare } from 'lucide-react';
import { ForumOwnerDashboard } from '@o4o/shared-space-ui';
import {
  kcosmeticsForumOwnerApi,
  KCOSMETICS_FORUM_OWNER_THEME,
} from '../../services/forumOwnerAdapter';

export default function MyForumDashboardPage() {
  return (
    <ForumOwnerDashboard
      api={kcosmeticsForumOwnerApi}
      theme={KCOSMETICS_FORUM_OWNER_THEME}
      emojiPlaceholder="예: 💄"
      links={{
        forumHomeHref: '/forum',
        requestFormHref: '/forum/request-category',
        forumHref: (slug) => `/forum?category=${slug}`,
        memberManageHref: (forumId) => `/forum/my-dashboard/${forumId}/members`,
      }}
      headerSlot={
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-pink-600" />
            내 포럼
          </h1>
          <p className="text-slate-500 mt-1">내가 신청하거나 운영하는 포럼을 관리합니다</p>
        </div>
      }
    />
  );
}
