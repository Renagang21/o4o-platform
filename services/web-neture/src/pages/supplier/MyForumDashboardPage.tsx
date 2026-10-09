/**
 * MyForumDashboardPage - 내 포럼 관리 대시보드 (Neture 공급자 공간)
 *
 * WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1:
 *   576줄 자체 구현 → 공통 ForumOwnerDashboard + Neture adapter/config.
 *
 * Neture 고유 (유지):
 *   - basePath 가 /supplier/* 다 (공급자 공간 소속).
 *   - 기존 공급자 화면은 폐쇄형 회원 관리 동선을 노출하지 않는다. 회원 공간은 basePath가 있을 때만 제공한다.
 *   - 공급자 셸 안에 들어가므로 컨테이너 여백을 셸에 맡긴다(max-w-4xl only).
 */

import { MessageSquare } from 'lucide-react';
import { ForumOwnerDashboard } from '@o4o/shared-space-ui';
import {
  netureForumOwnerApi,
  NETURE_FORUM_OWNER_THEME,
} from '@/services/forumOwnerAdapter';

export default function MyForumDashboardPage({ basePath }: { basePath?: string } = {}) {
  return (
    <ForumOwnerDashboard
      api={netureForumOwnerApi}
      theme={NETURE_FORUM_OWNER_THEME}
      containerClassName="max-w-4xl"
      links={{
        forumHomeHref: basePath ?? '/supplier/forum',
        requestFormHref: basePath ? `${basePath}/request` : '/supplier/forum/request-category',
        forumHref: (slug) => basePath ? `${basePath}/posts?board=${encodeURIComponent(slug)}` : `/supplier/forum?category=${slug}`,
        ...(basePath ? { memberManageHref: (id: string) => `${basePath}/owned/${id}/members` } : {}),
      }}
      headerSlot={
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            내 포럼
          </h1>
          <p className="text-slate-500 mt-1">내가 신청하거나 운영하는 포럼을 관리합니다</p>
        </div>
      }
    />
  );
}
