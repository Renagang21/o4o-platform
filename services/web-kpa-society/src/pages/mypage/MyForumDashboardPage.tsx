/**
 * MyForumDashboardPage - 내 포럼 관리 대시보드 (KPA Society)
 *
 * WO-O4O-FORUM-MY-FORUM-EXPANSION-V1
 * WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1: 신청 내역 → 통합 신청함으로 이전
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1:
 *   285줄 자체 구현 → 공통 ForumOwnerDashboard + KPA adapter/config.
 *
 * KPA 고유 (유지):
 *   - MyPageLayout 안에 들어간다 (제목·breadcrumb 는 레이아웃이 담당 → headerSlot 없음).
 *   - 신청 내역 섹션 없음 (adapter 가 fetchMyRequests 를 넘기지 않는다) + 통합 신청함 안내 slot.
 */

import { Link } from 'react-router-dom';
import { ForumOwnerDashboard } from '@o4o/shared-space-ui';
import { MyPageLayout } from '../../layouts/MyPageLayout';
import { kpaForumOwnerApi, KPA_FORUM_OWNER_THEME } from '../../api/forumOwnerAdapter';

export default function MyForumDashboardPage() {
  return (
    <MyPageLayout
      title="내 포럼"
      description="내가 운영하는 포럼을 관리합니다"
      breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지', href: '/mypage' }, { label: '내 포럼' }]}
      width="wide"
    >
      <ForumOwnerDashboard
        api={kpaForumOwnerApi}
        theme={KPA_FORUM_OWNER_THEME}
        containerClassName=""
        links={{
          forumHomeHref: '/forum',
          forumHref: (slug) => `/forum?category=${slug}`,
          memberManageHref: (forumId) => `/mypage/my-forums/${forumId}/members`,
        }}
        noticeSlot={
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="text-sm text-slate-600">
              포럼 개설 신청 및 진행 상태는 <strong>내 신청</strong> 탭에서 확인하세요
            </div>
            <Link
              to="/mypage/my-requests?entityType=forum_category"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              내 신청 바로가기 →
            </Link>
          </div>
        }
      />
    </MyPageLayout>
  );
}
