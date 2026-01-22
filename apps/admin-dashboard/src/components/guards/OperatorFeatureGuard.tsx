/**
 * OperatorFeatureGuard Component
 *
 * WO-KPA-OPERATOR-UI-POLICY-REFLECTION-V1
 *
 * 운영자 정책 기반 기능 접근 제어 컴포넌트
 * - 조건부 렌더링
 * - 불가 시 대체 UI 표시
 */

import React from 'react';
import { useOperatorPolicy } from '@/hooks/useOperatorPolicy';
import type { OperatorPolicy, OperatorScopeKey } from '@o4o/types';

// ============================================================================
// Types
// ============================================================================

export interface OperatorFeatureGuardProps {
  /** 필요한 기능 */
  feature: keyof OperatorPolicy['features'];

  /** 자식 요소 */
  children: React.ReactNode;

  /** 권한 없을 때 표시할 대체 UI (기본: null) */
  fallback?: React.ReactNode;

  /** 권한 없을 때 숨기기 (기본: true) */
  hideWhenUnauthorized?: boolean;
}

export interface OperatorScopeGuardProps {
  /** 허용할 스코프 키 목록 */
  allowedScopes: OperatorScopeKey[];

  /** 자식 요소 */
  children: React.ReactNode;

  /** 권한 없을 때 표시할 대체 UI */
  fallback?: React.ReactNode;

  /** 권한 없을 때 숨기기 (기본: true) */
  hideWhenUnauthorized?: boolean;
}

export interface OperatorContentTypeGuardProps {
  /** 필요한 콘텐츠 타입 */
  contentType: string;

  /** 자식 요소 */
  children: React.ReactNode;

  /** 권한 없을 때 표시할 대체 UI */
  fallback?: React.ReactNode;

  /** 권한 없을 때 숨기기 (기본: true) */
  hideWhenUnauthorized?: boolean;
}

// ============================================================================
// Feature Guard Component
// ============================================================================

/**
 * 운영자 기능 가드
 *
 * 사용 예:
 * ```tsx
 * <OperatorFeatureGuard feature="canCreateForum">
 *   <Button>포럼 개설</Button>
 * </OperatorFeatureGuard>
 * ```
 */
export function OperatorFeatureGuard({
  feature,
  children,
  fallback = null,
  hideWhenUnauthorized = true,
}: OperatorFeatureGuardProps) {
  const { canUseFeature, isOperator } = useOperatorPolicy();

  if (!isOperator) {
    return hideWhenUnauthorized ? null : <>{fallback}</>;
  }

  if (!canUseFeature(feature)) {
    return hideWhenUnauthorized ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================================================
// Scope Guard Component
// ============================================================================

/**
 * 운영자 스코프 가드
 *
 * 사용 예:
 * ```tsx
 * <OperatorScopeGuard allowedScopes={['kpa_society']}>
 *   <GroupBuyManager />
 * </OperatorScopeGuard>
 * ```
 */
export function OperatorScopeGuard({
  allowedScopes,
  children,
  fallback = null,
  hideWhenUnauthorized = true,
}: OperatorScopeGuardProps) {
  const { activeScopeKey, isOperator } = useOperatorPolicy();

  if (!isOperator || !activeScopeKey) {
    return hideWhenUnauthorized ? null : <>{fallback}</>;
  }

  if (!allowedScopes.includes(activeScopeKey)) {
    return hideWhenUnauthorized ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================================================
// Content Type Guard Component
// ============================================================================

/**
 * 운영자 콘텐츠 타입 가드
 *
 * 사용 예:
 * ```tsx
 * <OperatorContentTypeGuard contentType="forum">
 *   <ForumManager />
 * </OperatorContentTypeGuard>
 * ```
 */
export function OperatorContentTypeGuard({
  contentType,
  children,
  fallback = null,
  hideWhenUnauthorized = true,
}: OperatorContentTypeGuardProps) {
  const { canManageContentType, isOperator } = useOperatorPolicy();

  if (!isOperator) {
    return hideWhenUnauthorized ? null : <>{fallback}</>;
  }

  if (!canManageContentType(contentType)) {
    return hideWhenUnauthorized ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * 포럼 생성 가드 (glycocare는 숨김)
 */
export function ForumCreateGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <OperatorFeatureGuard feature="canCreateForum" fallback={fallback}>
      {children}
    </OperatorFeatureGuard>
  );
}

/**
 * KPA 전용 가드
 */
export function KpaOnlyGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <OperatorScopeGuard allowedScopes={['kpa_society']} fallback={fallback}>
      {children}
    </OperatorScopeGuard>
  );
}

/**
 * GlycoCare 전용 가드
 */
export function GlycoCareOnlyGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <OperatorScopeGuard allowedScopes={['glycocare']} fallback={fallback}>
      {children}
    </OperatorScopeGuard>
  );
}

export default OperatorFeatureGuard;
