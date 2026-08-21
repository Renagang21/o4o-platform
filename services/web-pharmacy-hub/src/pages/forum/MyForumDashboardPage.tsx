/**
 * MyForumDashboardPage — 내 포럼 대시보드 (PharmacyHub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §5·§7·§9
 * 공통 ForumOwnerDashboard + PharmacyHub adapter/config 만. 자체 구현 금지(§4).
 * `fetchMyRequests` 를 주입하므로 이 화면이 §5 의 "내 신청 현황"도 함께 담당한다.
 */

import { MessageSquare } from 'lucide-react';
import { ForumOwnerDashboard } from '@o4o/shared-space-ui';
import {
  pharmacyHubForumOwnerApi,
  PHARMACY_HUB_FORUM_OWNER_THEME,
} from '../../services/forumOwnerAdapter';

export default function MyForumDashboardPage() {
  return (
    <ForumOwnerDashboard
      api={pharmacyHubForumOwnerApi}
      theme={PHARMACY_HUB_FORUM_OWNER_THEME}
      emojiPlaceholder="예: 💊"
      links={{
        forumHomeHref: '/forum',
        requestFormHref: '/forum/request',
        forumHref: (slug) => `/forum/posts?forum=${encodeURIComponent(slug)}`,
        memberManageHref: (forumId) => `/forum/my-dashboard/${forumId}/members`,
      }}
      headerSlot={
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-600" />
            내 포럼
          </h1>
          <p className="text-slate-500 mt-1">내가 신청하거나 운영하는 포럼을 관리합니다</p>
        </div>
      }
    />
  );
}
