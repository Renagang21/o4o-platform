/**
 * GlycoPharm — 포럼 소유자 영역 adapter
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 *
 * 공통 View(ForumOwnerDashboard / ForumOwnerMemberManagement)에 주입한다.
 * 매핑·envelope 정규화·실패 승격은 공통 factory 가 담당하고, 여기서는
 * **endpoint 함수 배선과 브랜드 accent 만** 정한다.
 *
 * endpoint 는 service-scoped forumApi 를 그대로 쓴다 — forum API base 의 단일 소유자는
 * services/forumApi.ts (`FORUM_BASE`) 다
 * (WO-O4O-GLYCOPHARM-FORUM-SERVICE-BOUNDARY-AND-CROSSSERVICE-READ-WRITE-ISOLATION-FIX-V1).
 */

import {
  createForumOwnerApi,
  createForumOwnerMembershipApi,
  type ForumOwnerTheme,
} from '@o4o/shared-space-ui';
import {
  forumMembershipApi,
  fetchMyCategories,
  fetchMyForumRequests,
  updateMyCategory,
  requestDeleteCategory,
} from './forumApi';

/**
 * GlycoPharm accent (emerald).
 * Tailwind JIT 스캔 대상이 되도록 **완성된 클래스 문자열**로 적는다 (조각 결합 금지).
 */
export const GLYCOPHARM_FORUM_OWNER_THEME: ForumOwnerTheme = {
  accentText: 'text-emerald-600',
  accentSolid: 'bg-emerald-600 hover:bg-emerald-700',
  accentSoft: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  accentSoftText: 'text-emerald-600',
  accentStrongText: 'text-emerald-800',
  accentBadge: 'bg-emerald-100 text-emerald-700',
  accentIconBg: 'bg-emerald-50',
  accentRing: 'focus:ring-emerald-500',
  accentHover: 'hover:text-emerald-600 hover:bg-emerald-50',
};

export const glycopharmForumOwnerApi = createForumOwnerApi({
  fetchOwnedForums: fetchMyCategories,
  fetchMyRequests: fetchMyForumRequests,
  updateForum: updateMyCategory,
  requestForumDelete: requestDeleteCategory,
});

export const glycopharmForumMembershipAdapter = createForumOwnerMembershipApi({
  fetchOwnedForums: fetchMyCategories,
  fetchJoinRequests: forumMembershipApi.getJoinRequests,
  fetchMembers: forumMembershipApi.getMembers,
  approveJoin: forumMembershipApi.approveJoin,
  rejectJoin: forumMembershipApi.rejectJoin,
  removeMember: forumMembershipApi.removeMember,
});
