export { AccountPageLayout } from './components/AccountPageLayout.js';
export { ProfileCard } from './components/ProfileCard.js';
export { ProfileInfoField } from './components/ProfileInfoField.js';
export { PasswordChangeModal } from './components/PasswordChangeModal.js';
export { QuickActionsSection } from './components/QuickActionsSection.js';
export { MyPageNavigation } from './components/MyPageNavigation.js';
export { MyPageLayout } from './components/MyPageLayout.js';
export type { MyPageBreadcrumbItem, MyPageLayoutWidth } from './components/MyPageLayout.js';

// ---------------------------------------------------------------------------
// My Page Shell — WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1
// 5 서비스 My Page 공통 화면 골격(Shell / Layout / Navigation).
// `MyPageLayout` 은 `MyPageShell` 의 호환 별칭이며 구현은 하나뿐이다.
// ---------------------------------------------------------------------------
export { MyPageShell } from './components/MyPageShell.js';
export type { MyPageShellProps } from './components/MyPageShell.js';
export {
  resolveMyPageNavItems,
  resolveMyPageNavHref,
} from './components/MyPageNavigation.js';
export { MyPageUserSummary } from './components/MyPageUserSummary.js';
export type {
  MyPageUserSummaryProps,
  MyPageUserSummaryInfoRow,
} from './components/MyPageUserSummary.js';
export { MyPageEntryCardGrid } from './components/MyPageEntryCardGrid.js';
export type {
  MyPageEntryCardGridProps,
  MyPageEntryCardItem,
} from './components/MyPageEntryCardGrid.js';
// ---------------------------------------------------------------------------
// My Page Home/Hub Core — WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1
// Home 첫 화면의 "최근 활동" · "감사 활동" 표현 구조 공통화.
// 데이터 조회·모델은 각 서비스 소관이며 여기서는 표시만 한다.
// ---------------------------------------------------------------------------
export { MyPageActivityFeed } from './components/MyPageActivityFeed.js';
export type {
  MyPageActivityFeedProps,
  MyPageActivityItem,
} from './components/MyPageActivityFeed.js';
export { MyPageAppreciationCard } from './components/MyPageAppreciationCard.js';
export type {
  MyPageAppreciationCardProps,
  MyPageAppreciationEntry,
} from './components/MyPageAppreciationCard.js';
export { SettingsSection } from './components/SettingsSection.js';
export { GlobalUserProfileDropdown } from './components/GlobalUserProfileDropdown.js';
// WO-O4O-MYPAGE-PHASE1-NAV-ROLEBADGE-CANONICALIZATION-V1
export { RoleBadge, RoleBadgeGroup } from './components/RoleBadge.js';
export type {
  RoleBadgeProps,
  RoleBadgeTone,
  RoleBadgeSize,
  RoleBadgeVariant,
  RoleBadgeGroupItem,
  RoleBadgeGroupProps,
} from './components/RoleBadge.js';
// WO-O4O-MYPAGE-HUB-CARD-CANONICAL-ALIGNMENT-V1
export { MyPageHubCard } from './components/MyPageHubCard.js';
export type {
  MyPageHubCardProps,
  MyPageHubCardIconTone,
} from './components/MyPageHubCard.js';
// WO-O4O-MYPAGE-EMPTY-LOADING-COMPONENT-EXTRACTION-V1
export { MyPageLoadingState } from './components/MyPageLoadingState.js';
export type {
  MyPageLoadingStateProps,
  MyPageLoadingStateSize,
} from './components/MyPageLoadingState.js';
export { MyPageEmptyState } from './components/MyPageEmptyState.js';
export type {
  MyPageEmptyStateProps,
} from './components/MyPageEmptyState.js';
export type { MyPageNavItem } from './components/MyPageNavigation.js';
export type { ProfileField } from './types.js';
export type {
  GlobalUserProfileUser,
  GlobalUserProfileMenuItem,
  GlobalUserProfileDropdownProps,
} from './components/GlobalUserProfileDropdown.js';
export { getUserDisplayName } from './utils/getUserDisplayName.js';
export type { DisplayNameUser } from './utils/getUserDisplayName.js';

// WO-O4O-NOTIFICATION-UI-CORE-V1
export { NotificationBell } from './components/NotificationBell.js';
// WO-O4O-MYPAGE-MY-REQUESTS-INBOX-COMPONENT-V1
export { MyRequestsInbox } from './components/MyRequestsInbox.js';
export type {
  MyRequestItem,
  MyRequestEntityType,
  MyRequestStatus,
  MyRequestTypeFilterTab,
  MyRequestsInboxProps,
  MyRequestResultLink,
} from './components/MyRequestsInbox.js';
// WO-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1 §8 — 공통 adapter
export {
  normalizeForumCategoryRequest,
  normalizeForumCategoryRequests,
  sortRequestsByCreatedAtDesc,
} from './adapters/requestNormalizers.js';
export { RequestStatusBadge, DEFAULT_STATUS_CONFIG } from './components/RequestStatusBadge.js';
export type { RequestStatusBadgeProps, RequestStatusConfig } from './components/RequestStatusBadge.js';
export { RequestTypeBadge, DEFAULT_TYPE_CONFIG } from './components/RequestTypeBadge.js';
export type { RequestTypeBadgeProps, RequestTypeConfig } from './components/RequestTypeBadge.js';
export type { NotificationBellProps } from './components/NotificationBell.js';
export { useNotifications } from './notifications/useNotifications.js';
export type {
  UseNotificationsOptions,
  UseNotificationsResult,
} from './notifications/useNotifications.js';
export type {
  NotificationItem,
  NotificationListResult,
  NotificationListParams,
  NotificationApiClient,
} from './notifications/types.js';

// WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1
// 모바일 알림 시트 · 목록 본문 · 상대 시각 · deep link 해석기 (5서비스 공통 정본)
export { NotificationSheet, NotificationTabBadge } from './components/NotificationSheet.js';
export type { NotificationSheetProps } from './components/NotificationSheet.js';
export { NotificationListBody } from './notifications/NotificationListBody.js';
export type { NotificationListBodyProps } from './notifications/NotificationListBody.js';
export { formatRelativeTime } from './notifications/formatRelative.js';
export {
  resolveNotificationTarget,
  toInternalPath,
} from './notifications/resolveTarget.js';
export type { ResolveNotificationTargetOptions } from './notifications/resolveTarget.js';

// WO-O4O-BUSINESS-REGISTRATION-COMMON-UI-COMPONENT-V1
export { BusinessRegistrationFields } from './components/BusinessRegistrationFields.js';
export type {
  BusinessRegistrationFieldsProps,
  BusinessRegistrationFieldsValue,
} from './components/BusinessRegistrationFields.js';

// ---------------------------------------------------------------------------
// Profile Core — WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1
// 5 서비스(KPA / GlycoPharm / K-Cosmetics / Neture / Pharmacy-Hub) 프로필 화면 공통 계층.
// ---------------------------------------------------------------------------
export { MyPageAuthRequired } from './components/MyPageAuthRequired.js';
export type { MyPageAuthRequiredProps } from './components/MyPageAuthRequired.js';

export { AccountProfileSection } from './components/AccountProfileSection.js';
export type {
  AccountProfileSectionProps,
  AccountProfileFieldSpec,
} from './components/AccountProfileSection.js';

export { BusinessProfileSection } from './components/BusinessProfileSection.js';
export type {
  BusinessProfileSectionProps,
  BusinessProfileData,
  BusinessProfilePatch,
  BusinessProfileAccent,
} from './components/BusinessProfileSection.js';

// WO-O4O-CROSS-SERVICE-MYPAGE-SETTINGS-SECURITY-COMMONIZATION-V1:
//   `SecuritySection` 은 소비처 0 이 되어 제거했다 (5 서비스 전부 AccountSecuritySettings 사용).
export { AccountSecuritySettings } from './components/AccountSecuritySettings.js';
export type {
  AccountSecuritySettingsProps,
  AccountSecurityNotify,
} from './components/AccountSecuritySettings.js';

// ---------------------------------------------------------------------------
// LMS MyPage Views — WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1
// K-Cosmetics / GlycoPharm 의 수강·크레딧·수료증 View 중복 공통화.
// ---------------------------------------------------------------------------
export { MyEnrollmentsView } from './components/MyEnrollmentsView.js';
export type { MyEnrollmentsViewProps, MyEnrollmentStatus } from './components/MyEnrollmentsView.js';
export { MyCreditsView } from './components/MyCreditsView.js';
export type { MyCreditsViewProps } from './components/MyCreditsView.js';
export { MyCertificatesView } from './components/MyCertificatesView.js';
export type { MyCertificatesViewProps } from './components/MyCertificatesView.js';

// ---------------------------------------------------------------------------
// Membership / Role Status Core
// WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1
//
// 5 서비스의 가입 상태(service_memberships.status) 표현 · 역할 라벨 해석 ·
// 상태 안내 화면을 공통화한다.
//   - 상태/역할 **판정** 은 `@o4o/auth-utils` 와 각 서비스 config 소관 (여기서 하지 않는다)
//   - 이 계층은 표현(label/tone/문구/마크업) 만 담당한다
// ---------------------------------------------------------------------------
export {
  DEFAULT_MEMBERSHIP_STATUS_CONFIG,
  DEFAULT_MEMBERSHIP_STATUS_NOTICE,
  MEMBERSHIP_SERVICE_TOKEN,
  resolveMembershipStatusConfig,
  resolveMembershipStatusNotice,
  resolveRoleLabel,
  resolveRoleLabels,
  buildMembershipViewModel,
} from './adapters/membershipNormalizers.js';
export type {
  MembershipStatusConfig,
  MembershipStatusNoticeContent,
  ResolveMembershipStatusNoticeOptions,
  ResolveRoleLabelOptions,
  MembershipViewModel,
  MembershipViewModelAction,
  BuildMembershipViewModelInput,
} from './adapters/membershipNormalizers.js';
export { MembershipStatusBadge } from './components/MembershipStatusBadge.js';
export type { MembershipStatusBadgeProps } from './components/MembershipStatusBadge.js';
export { MembershipStatusNotice } from './components/MembershipStatusNotice.js';
export type {
  MembershipStatusNoticeProps,
  MembershipStatusNoticeAction,
} from './components/MembershipStatusNotice.js';
