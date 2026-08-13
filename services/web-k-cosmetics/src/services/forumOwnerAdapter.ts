/**
 * K-Cosmetics — 포럼 소유자 영역 adapter
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 *
 * 공통 View(ForumOwnerDashboard / ForumOwnerMemberManagement)에 주입한다.
 * 매핑·envelope 정규화·실패 승격은 공통 factory 담당 — 여기서는 endpoint 배선과 accent 만.
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
 * K-Cosmetics accent (pink).
 * Tailwind JIT 스캔 대상이 되도록 **완성된 클래스 문자열**로 적는다 (조각 결합 금지).
 */
export const KCOSMETICS_FORUM_OWNER_THEME: ForumOwnerTheme = {
  accentText: 'text-pink-600',
  accentSolid: 'bg-pink-600 hover:bg-pink-700',
  accentSoft: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
  accentSoftText: 'text-pink-600',
  accentStrongText: 'text-pink-800',
  accentBadge: 'bg-pink-100 text-pink-700',
  accentIconBg: 'bg-pink-50',
  accentRing: 'focus:ring-pink-500',
  accentHover: 'hover:text-pink-600 hover:bg-pink-50',
};

export const kcosmeticsForumOwnerApi = createForumOwnerApi({
  fetchOwnedForums: fetchMyCategories,
  fetchMyRequests: fetchMyForumRequests,
  updateForum: updateMyCategory,
  requestForumDelete: requestDeleteCategory,
});

export const kcosmeticsForumMembershipAdapter = createForumOwnerMembershipApi({
  fetchOwnedForums: fetchMyCategories,
  fetchJoinRequests: forumMembershipApi.getJoinRequests,
  fetchMembers: forumMembershipApi.getMembers,
  approveJoin: forumMembershipApi.approveJoin,
  rejectJoin: forumMembershipApi.rejectJoin,
  removeMember: forumMembershipApi.removeMember,
});
