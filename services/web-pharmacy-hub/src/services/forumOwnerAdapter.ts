/**
 * PharmacyHub — 포럼 소유자 영역 adapter
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1 §7·§8·§16
 *
 * 공통 View(ForumOwnerDashboard / ForumOwnerMemberManagement)에 주입만 한다.
 * 매핑·envelope 정규화·실패 승격은 공통 factory 담당 — 여기서는 endpoint 배선과 accent 만.
 * (K-Cosmetics forumOwnerAdapter 와 동일 구조. PH 전용 View 복제 금지 §4.)
 */

import {
  createForumOwnerApi,
  createForumOwnerMembershipApi,
  type ForumOwnerTheme,
} from '@o4o/shared-space-ui';
import {
  forumMembershipApi,
  fetchMyPharmacyHubForums,
  fetchMyPharmacyHubForumRequests,
  updateMyPharmacyHubForum,
  requestDeletePharmacyHubForum,
} from './forumApi';

/**
 * PharmacyHub accent (teal) — 커뮤니티 홈/헤더와 같은 계열.
 * Tailwind JIT 스캔 대상이 되도록 **완성된 클래스 문자열**로 적는다 (조각 결합 금지).
 */
export const PHARMACY_HUB_FORUM_OWNER_THEME: ForumOwnerTheme = {
  accentText: 'text-teal-600',
  accentSolid: 'bg-teal-600 hover:bg-teal-700',
  accentSoft: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
  accentSoftText: 'text-teal-600',
  accentStrongText: 'text-teal-800',
  accentBadge: 'bg-teal-100 text-teal-700',
  accentIconBg: 'bg-teal-50',
  accentRing: 'focus:ring-teal-500',
  accentHover: 'hover:text-teal-600 hover:bg-teal-50',
};

export const pharmacyHubForumOwnerApi = createForumOwnerApi({
  fetchOwnedForums: fetchMyPharmacyHubForums,
  fetchMyRequests: fetchMyPharmacyHubForumRequests,
  updateForum: updateMyPharmacyHubForum,
  requestForumDelete: requestDeletePharmacyHubForum,
});

export const pharmacyHubForumMembershipAdapter = createForumOwnerMembershipApi({
  fetchOwnedForums: fetchMyPharmacyHubForums,
  fetchJoinRequests: forumMembershipApi.getJoinRequests,
  fetchMembers: forumMembershipApi.getMembers,
  approveJoin: forumMembershipApi.approveJoin,
  rejectJoin: forumMembershipApi.rejectJoin,
  removeMember: forumMembershipApi.removeMember,
});
