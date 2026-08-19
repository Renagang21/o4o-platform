export { AccountPageLayout } from './components/AccountPageLayout.js';
export { ProfileCard } from './components/ProfileCard.js';
export { ProfileInfoField } from './components/ProfileInfoField.js';
export { SecuritySection } from './components/SecuritySection.js';
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
} from './components/MyRequestsInbox.js';
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

export { AccountSecuritySettings } from './components/AccountSecuritySettings.js';
export type {
  AccountSecuritySettingsProps,
  AccountSecurityNotify,
} from './components/AccountSecuritySettings.js';
