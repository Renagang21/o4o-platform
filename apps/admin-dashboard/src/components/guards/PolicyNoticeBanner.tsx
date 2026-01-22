/**
 * PolicyNoticeBanner Component
 *
 * WO-KPA-SCOPE-AWARE-UX-NOTICES-V1
 *
 * 정책 기반 기능 제한 안내 배너
 * - 기능이 정책상 비활성화된 경우 표시
 * - 프로그램 미참여로 인해 제한된 경우 표시
 * - 1줄 요약: 현재 서비스 컨텍스트, 적용 중인 스코프, 제한 사유
 */

import React from 'react';
import { useOperatorPolicy } from '@/hooks/useOperatorPolicy';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, AlertTriangle, Lock, HelpCircle } from 'lucide-react';
import type { OperatorPolicy, OperatorScopeKey } from '@o4o/types';
import {
  type PolicyNoticeMessage,
  type PolicyNoticeType,
  getFeatureDisabledMessage,
  getScopeMismatchMessage,
  getProgramRequiredMessage,
  getContentTypeUnavailableMessage,
  getNotOperatorMessage,
  SCOPE_DISPLAY_NAMES,
  POLICY_NOTICES,
} from './policy-notice-messages';

// ============================================================================
// Types
// ============================================================================

export interface PolicyNoticeBannerProps {
  /** 제한 사유 타입 */
  type: PolicyNoticeType;
  /** 커스텀 메시지 (type 대신 직접 지정) */
  message?: PolicyNoticeMessage;
  /** 관련 기능 (type이 feature_disabled일 때) */
  feature?: keyof OperatorPolicy['features'];
  /** 관련 콘텐츠 타입 (type이 content_type_unavailable일 때) */
  contentType?: string;
  /** 추가 클래스명 */
  className?: string;
  /** 컴팩트 모드 (제목 숨김) */
  compact?: boolean;
  /** 도움말 툴팁 내용 */
  helpText?: string;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const NOTICE_ICONS: Record<PolicyNoticeType, React.ComponentType<{ className?: string }>> = {
  feature_disabled: Lock,
  scope_mismatch: AlertTriangle,
  program_required: Info,
  content_type_unavailable: Lock,
  not_operator: Lock,
};

const NOTICE_VARIANTS: Record<PolicyNoticeType, 'default' | 'destructive'> = {
  feature_disabled: 'default',
  scope_mismatch: 'default',
  program_required: 'default',
  content_type_unavailable: 'default',
  not_operator: 'destructive',
};

// ============================================================================
// Component
// ============================================================================

/**
 * 정책 기반 안내 배너
 *
 * 사용 예:
 * ```tsx
 * <PolicyNoticeBanner
 *   type="feature_disabled"
 *   feature="canCreateForum"
 * />
 *
 * <PolicyNoticeBanner
 *   type="program_required"
 *   helpText="혈당관리 프로그램 참여 조건에 대해 알아보세요."
 * />
 * ```
 */
export function PolicyNoticeBanner({
  type,
  message: customMessage,
  feature,
  contentType,
  className = '',
  compact = false,
  helpText,
}: PolicyNoticeBannerProps) {
  const {
    activeScopeKey,
    serviceDefaultScopeKey,
    isScopeMatchingService,
  } = useOperatorPolicy();

  // 메시지 결정
  const message = React.useMemo((): PolicyNoticeMessage => {
    if (customMessage) return customMessage;

    switch (type) {
      case 'feature_disabled':
        return feature
          ? getFeatureDisabledMessage(feature, activeScopeKey)
          : POLICY_NOTICES.featureNotAvailable;

      case 'scope_mismatch':
        return activeScopeKey && serviceDefaultScopeKey
          ? getScopeMismatchMessage(activeScopeKey, serviceDefaultScopeKey)
          : POLICY_NOTICES.featureNotAvailable;

      case 'program_required':
        return getProgramRequiredMessage();

      case 'content_type_unavailable':
        return contentType
          ? getContentTypeUnavailableMessage(contentType, activeScopeKey)
          : POLICY_NOTICES.featureNotAvailable;

      case 'not_operator':
        return getNotOperatorMessage();

      default:
        return POLICY_NOTICES.featureNotAvailable;
    }
  }, [type, customMessage, feature, contentType, activeScopeKey, serviceDefaultScopeKey]);

  const Icon = NOTICE_ICONS[type] || Info;
  const variant = NOTICE_VARIANTS[type] || 'default';

  // 스코프 불일치 체크 (자동 표시)
  const showScopeMismatch = type === 'scope_mismatch' && !isScopeMatchingService;

  if (type === 'scope_mismatch' && isScopeMatchingService) {
    return null; // 스코프 일치 시 표시하지 않음
  }

  return (
    <Alert
      variant={variant}
      className={`${className} ${
        variant === 'default' ? 'border-amber-200 bg-amber-50' : ''
      }`}
    >
      <Icon className="h-4 w-4" />
      {!compact && <AlertTitle className="flex items-center gap-2">
        {message.title}
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </AlertTitle>}
      <AlertDescription className="flex items-center gap-2 flex-wrap">
        <span>{message.description}</span>
        {message.guidance && (
          <Badge variant="outline" className="text-xs">
            {message.guidance}
          </Badge>
        )}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

export interface FeatureDisabledBannerProps {
  feature: keyof OperatorPolicy['features'];
  className?: string;
  compact?: boolean;
  helpText?: string;
}

/**
 * 기능 비활성화 안내 배너
 */
export function FeatureDisabledBanner({
  feature,
  className,
  compact,
  helpText,
}: FeatureDisabledBannerProps) {
  return (
    <PolicyNoticeBanner
      type="feature_disabled"
      feature={feature}
      className={className}
      compact={compact}
      helpText={helpText}
    />
  );
}

export interface ProgramRequiredBannerProps {
  programName?: string;
  className?: string;
  compact?: boolean;
  helpText?: string;
}

/**
 * 프로그램 참여 필요 안내 배너
 */
export function ProgramRequiredBanner({
  programName = '혈당관리 프로그램',
  className,
  compact,
  helpText,
}: ProgramRequiredBannerProps) {
  return (
    <PolicyNoticeBanner
      type="program_required"
      message={getProgramRequiredMessage(programName)}
      className={className}
      compact={compact}
      helpText={helpText || `${programName} 참여 조건에 대해 자세히 알아보세요.`}
    />
  );
}

export interface ScopeMismatchBannerProps {
  className?: string;
  compact?: boolean;
}

/**
 * 스코프 불일치 안내 배너 (자동 감지)
 */
export function ScopeMismatchBanner({
  className,
  compact,
}: ScopeMismatchBannerProps) {
  const { isScopeMatchingService } = useOperatorPolicy();

  if (isScopeMatchingService) {
    return null;
  }

  return (
    <PolicyNoticeBanner
      type="scope_mismatch"
      className={className}
      compact={compact}
    />
  );
}

// ============================================================================
// Guard-Connected Components
// ============================================================================

export interface GuardedFeatureNoticeProps {
  /** 필요한 기능 */
  feature: keyof OperatorPolicy['features'];
  /** 자식 요소 (기능 사용 가능 시 표시) */
  children: React.ReactNode;
  /** 배너 표시 여부 (기본: true) */
  showBanner?: boolean;
  /** 배너 클래스명 */
  bannerClassName?: string;
  /** 도움말 툴팁 */
  helpText?: string;
}

/**
 * 가드 연결 기능 안내
 *
 * 기능 사용 가능 시 children 표시,
 * 불가능 시 안내 배너 표시
 */
export function GuardedFeatureNotice({
  feature,
  children,
  showBanner = true,
  bannerClassName,
  helpText,
}: GuardedFeatureNoticeProps) {
  const { canUseFeature, isOperator } = useOperatorPolicy();

  if (!isOperator) {
    return showBanner ? (
      <PolicyNoticeBanner type="not_operator" className={bannerClassName} />
    ) : null;
  }

  if (!canUseFeature(feature)) {
    return showBanner ? (
      <FeatureDisabledBanner
        feature={feature}
        className={bannerClassName}
        helpText={helpText}
      />
    ) : null;
  }

  return <>{children}</>;
}

export interface GuardedContentTypeNoticeProps {
  /** 필요한 콘텐츠 타입 */
  contentType: string;
  /** 자식 요소 (콘텐츠 타입 관리 가능 시 표시) */
  children: React.ReactNode;
  /** 배너 표시 여부 (기본: true) */
  showBanner?: boolean;
  /** 배너 클래스명 */
  bannerClassName?: string;
}

/**
 * 가드 연결 콘텐츠 타입 안내
 */
export function GuardedContentTypeNotice({
  contentType,
  children,
  showBanner = true,
  bannerClassName,
}: GuardedContentTypeNoticeProps) {
  const { canManageContentType, isOperator } = useOperatorPolicy();

  if (!isOperator) {
    return showBanner ? (
      <PolicyNoticeBanner type="not_operator" className={bannerClassName} />
    ) : null;
  }

  if (!canManageContentType(contentType)) {
    return showBanner ? (
      <PolicyNoticeBanner
        type="content_type_unavailable"
        contentType={contentType}
        className={bannerClassName}
      />
    ) : null;
  }

  return <>{children}</>;
}

export default PolicyNoticeBanner;
