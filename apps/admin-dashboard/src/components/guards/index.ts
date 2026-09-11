/**
 * Guards Components Index
 *
 * WO-KPA-OPERATOR-UI-POLICY-REFLECTION-V1
 * WO-KPA-SCOPE-AWARE-UX-NOTICES-V1
 */

export {
  OperatorFeatureGuard,
  OperatorScopeGuard,
  OperatorContentTypeGuard,
  ForumCreateGuard,
  KpaOnlyGuard,
  GlycoCareOnlyGuard,
  type OperatorFeatureGuardProps,
  type OperatorScopeGuardProps,
  type OperatorContentTypeGuardProps,
} from './OperatorFeatureGuard';

export {
  OperatorScopeBadge,
  OperatorPolicySummary,
  type OperatorScopeBadgeProps,
  type OperatorPolicySummaryProps,
} from './OperatorScopeBadge';

// WO-KPA-SCOPE-AWARE-UX-NOTICES-V1
export {
  PolicyNoticeBanner,
  FeatureDisabledBanner,
  ProgramRequiredBanner,
  ScopeMismatchBanner,
  GuardedFeatureNotice,
  GuardedContentTypeNotice,
  type PolicyNoticeBannerProps,
  type FeatureDisabledBannerProps,
  type ProgramRequiredBannerProps,
  type ScopeMismatchBannerProps,
  type GuardedFeatureNoticeProps,
  type GuardedContentTypeNoticeProps,
} from './PolicyNoticeBanner';

export {
  type PolicyNoticeType,
  type PolicyNoticeMessage,
  FEATURE_DISPLAY_NAMES,
  SCOPE_DISPLAY_NAMES,
  POLICY_NOTICES,
  getFeatureDisabledMessage,
  getScopeMismatchMessage,
  getProgramRequiredMessage,
  getContentTypeUnavailableMessage,
  getNotOperatorMessage,
} from './policy-notice-messages';

// WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
//   GlucosecareParticipationNotice (WO-KPA-SCOPE-AWARE-UX-NOTICES-V1) 는 소비처 0 이라 제거.
