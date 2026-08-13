/**
 * KPA-Society — 포럼 소유자 영역 adapter
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 *
 * 공통 View(ForumOwnerDashboard / ForumOwnerMemberManagement)에 주입한다.
 * 매핑·envelope 정규화·실패 승격은 공통 factory 담당 — 여기서는 endpoint 배선과 accent 만.
 *
 * KPA 고유 정책 (SERVICE_SPECIFIC 로 유지):
 *   - 포럼 개설 **신청 내역은 통합 신청함(/mypage/my-requests)** 으로 이전됐다
 *     (WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1). 따라서 `fetchMyRequests` 를 넘기지 않아
 *     대시보드의 신청 내역·통계 섹션이 꺼진다. 대신 페이지가 noticeSlot 으로 안내한다.
 *   - 소유자 영역이 **마이페이지(/mypage/my-forums)** 소속이다.
 *
 * KPA apiClient 는 실패를 throw(Error.status 보존)하고 성공은 `{ success, data }` 로 준다 —
 * 공통 factory 의 실패 정규화가 그대로 동작한다.
 */

import {
  createForumOwnerApi,
  createForumOwnerMembershipApi,
  type ForumOwnerTheme,
} from '@o4o/shared-space-ui';
import { forumApi, forumMembershipApi } from './forum';

/**
 * KPA accent (blue).
 * Tailwind JIT 스캔 대상이 되도록 완성된 클래스 문자열로 적는다.
 */
export const KPA_FORUM_OWNER_THEME: ForumOwnerTheme = {
  accentText: 'text-blue-600',
  accentSolid: 'bg-blue-600 hover:bg-blue-700',
  accentSoft: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  accentSoftText: 'text-blue-600',
  accentStrongText: 'text-blue-800',
  accentBadge: 'bg-blue-100 text-blue-700',
  accentIconBg: 'bg-blue-50',
  accentRing: 'focus:ring-blue-500',
  accentHover: 'hover:text-blue-600 hover:bg-blue-50',
};

export const kpaForumOwnerApi = createForumOwnerApi({
  fetchOwnedForums: () => forumApi.getMyForums(),
  // fetchMyRequests 미제공 — 통합 신청함으로 이전 (위 주석 참조)
  updateForum: (forumId, data) => forumApi.updateMyForum(forumId, data),
  requestForumDelete: (forumId, data) => forumApi.requestDeleteForum(forumId, data),
});

export const kpaForumMembershipAdapter = createForumOwnerMembershipApi({
  fetchOwnedForums: () => forumApi.getMyForums(),
  fetchJoinRequests: (forumId) => forumMembershipApi.getJoinRequests(forumId),
  fetchMembers: (forumId) => forumMembershipApi.getMembers(forumId),
  approveJoin: (forumId, requestId) => forumMembershipApi.approveJoin(forumId, requestId),
  rejectJoin: (forumId, requestId, comment) => forumMembershipApi.rejectJoin(forumId, requestId, comment),
  removeMember: (forumId, userId) => forumMembershipApi.removeMember(forumId, userId),
});
