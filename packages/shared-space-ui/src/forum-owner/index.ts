/**
 * Forum Owner Area — barrel
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 */

export { ForumOwnerDashboard } from './ForumOwnerDashboard.js';
export type { ForumOwnerDashboardProps } from './ForumOwnerDashboard.js';

export { ForumOwnerMemberManagement } from './ForumOwnerMemberManagement.js';
export type { ForumOwnerMemberManagementProps } from './ForumOwnerMemberManagement.js';

export {
  DEFAULT_FORUM_OWNER_THEME,
  resolveForumOwnerTheme,
  formatOwnerDate,
  formatOwnerDateShort,
  ownerErrorMessage,
} from './theme.js';

/* adapter factory — 서비스는 자기 호출 함수만 넘기고 매핑·실패 정규화는 공통이다 */
export {
  createForumOwnerApi,
  createForumOwnerMembershipApi,
  mapOwnedForum,
  mapForumRequest,
  mapJoinRequest,
  mapForumMember,
} from './adapter.js';
export type {
  ForumOwnerRawApi,
  ForumOwnerMembershipRawApi,
  ForumOwnerEnvelope,
} from './adapter.js';

export type {
  ForumOwnerApi,
  ForumOwnerMembershipApi,
  ForumOwnerLinks,
  ForumOwnerTheme,
  ForumOwnerRequest,
  ForumOwnerRequestStatus,
  ForumOwnerJoinRequest,
  ForumOwnerMember,
  OwnedForum,
  OwnedForumUpdate,
} from './types.js';
