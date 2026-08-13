/**
 * MyForumDashboardPage - 내 포럼 관리 대시보드 (Neture 공급자 공간)
 *
 * WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1:
 *   576줄 자체 구현 → 공통 ForumOwnerDashboard + Neture adapter/config.
 *
 * Neture 고유 (유지):
 *   - basePath 가 /supplier/* 다 (공급자 공간 소속).
 *   - 폐쇄형 회원 관리 동선이 없다 → memberManageHref 미지정으로 노출하지 않는다.
 *   - 공급자 셸 안에 들어가므로 컨테이너 여백을 셸에 맡긴다(max-w-4xl only).
 */

import { MessageSquare } from 'lucide-react';
import { ForumOwnerDashboard } from '@o4o/shared-space-ui';
import {
  netureForumOwnerApi,
  NETURE_FORUM_OWNER_THEME,
} from '@/services/forumOwnerAdapter';

export default function MyForumDashboardPage() {
  return (
    <ForumOwnerDashboard
      api={netureForumOwnerApi}
      theme={NETURE_FORUM_OWNER_THEME}
      containerClassName="max-w-4xl"
      links={{
        forumHomeHref: '/supplier/forum',
        requestFormHref: '/supplier/forum/request-category',
        forumHref: (slug) => `/supplier/forum?category=${slug}`,
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
