/**
 * OperatorScopeBadge Component
 *
 * WO-KPA-OPERATOR-UI-POLICY-REFLECTION-V1
 *
 * 운영자 스코프 배지 표시 컴포넌트
 * - 현재 스코프 표시
 * - 스코프별 색상 구분
 */

import React from 'react';
import { useOperatorPolicy } from '@/hooks/useOperatorPolicy';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Shield, Activity, Users } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface OperatorScopeBadgeProps {
  /** 툴팁 표시 여부 (기본: true) */
  showTooltip?: boolean;

  /** 아이콘 표시 여부 (기본: true) */
  showIcon?: boolean;

  /** 크기 (기본: 'default') */
  size?: 'sm' | 'default' | 'lg';

  /** 추가 클래스 */
  className?: string;
}

// ============================================================================
// Scope Colors
// ============================================================================

const SCOPE_COLORS = {
  glycocare: {
    badge: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300',
    icon: 'text-blue-600',
  },
  kpa_society: {
    badge: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300',
    icon: 'text-green-600',
  },
} as const;

const SCOPE_ICONS = {
  glycocare: Activity,
  kpa_society: Users,
} as const;

// ============================================================================
// Component
// ============================================================================

export function OperatorScopeBadge({
  showTooltip = true,
  showIcon = true,
  size = 'default',
  className = '',
}: OperatorScopeBadgeProps) {
  const { activeScopeKey, activePolicy, isOperator } = useOperatorPolicy();

  if (!isOperator || !activeScopeKey || !activePolicy) {
    return null;
  }

  const colors = SCOPE_COLORS[activeScopeKey];
  const Icon = SCOPE_ICONS[activeScopeKey];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    default: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const badgeContent = (
    <Badge
      variant="outline"
      className={`${colors.badge} ${sizeClasses[size]} ${className} inline-flex items-center gap-1.5 font-medium`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} ${colors.icon}`} />}
      <span>{activePolicy.displayName}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{activePolicy.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {activePolicy.description}
            </p>
            <div className="pt-1 border-t text-xs">
              <p className="text-muted-foreground">
                인증 기준: {activePolicy.certificationCriteria === 'program' ? '프로그램 기반' : '협회 기반'}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Policy Summary Panel
// ============================================================================

export interface OperatorPolicySummaryProps {
  /** 추가 클래스 */
  className?: string;
}

/**
 * 운영자 정책 요약 패널
 *
 * 사용 예:
 * ```tsx
 * <OperatorPolicySummary />
 * ```
 */
export function OperatorPolicySummary({ className = '' }: OperatorPolicySummaryProps) {
  const {
    activePolicy,
    isOperator,
    canCreateForum,
    canManageContent,
    canManageCertification,
    canManagePolicy,
    canManageGroupBuy,
  } = useOperatorPolicy();

  if (!isOperator || !activePolicy) {
    return null;
  }

  const features = [
    { label: '포럼 개설', enabled: canCreateForum },
    { label: '콘텐츠 관리', enabled: canManageContent },
    { label: '인증 관리', enabled: canManageCertification },
    { label: '정책 관리', enabled: canManagePolicy },
    { label: '공구 관리', enabled: canManageGroupBuy },
  ];

  return (
    <div className={`p-4 rounded-lg border bg-card ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-medium">운영자 권한</h3>
      </div>

      <div className="space-y-2">
        <OperatorScopeBadge showTooltip={false} size="sm" />

        <div className="grid grid-cols-2 gap-2 mt-3">
          {features.map(({ label, enabled }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className={enabled ? '' : 'text-muted-foreground'}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OperatorScopeBadge;
