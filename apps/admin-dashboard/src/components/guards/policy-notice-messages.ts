/**
 * Policy Notice Messages
 *
 * WO-KPA-SCOPE-AWARE-UX-NOTICES-V1
 *
 * 정책 기반 UX 안내 메시지 상수
 * - 기능 제한 안내
 * - 프로그램 참여 안내
 * - 스코프 불일치 안내
 */

import type { OperatorScopeKey, OperatorPolicy } from '@o4o/types';

// ============================================================================
// Types
// ============================================================================

export type PolicyNoticeType =
  | 'feature_disabled'
  | 'scope_mismatch'
  | 'program_required'
  | 'content_type_unavailable'
  | 'not_operator';

export interface PolicyNoticeMessage {
  /** 메시지 타입 */
  type: PolicyNoticeType;
  /** 짧은 제목 */
  title: string;
  /** 설명 메시지 */
  description: string;
  /** 추가 안내 (선택) */
  guidance?: string;
}

// ============================================================================
// Feature Display Names
// ============================================================================

export const FEATURE_DISPLAY_NAMES: Record<keyof OperatorPolicy['features'], string> = {
  canCreateForum: '포럼 개설',
  canManageContent: '콘텐츠 관리',
  canManageCertification: '인증 관리',
  canManagePolicy: '정책 관리',
  canManageJoinRequirements: '가입 조건 관리',
  canManageServiceActivation: '서비스 활성화 관리',
};

// ============================================================================
// Scope Display Names
// ============================================================================

export const SCOPE_DISPLAY_NAMES: Record<OperatorScopeKey, string> = {
  glycocare: '혈당관리 프로그램',
  kpa_society: '약사회 서비스',
};

// ============================================================================
// Message Templates
// ============================================================================

/**
 * 기능 비활성화 메시지 생성
 */
export function getFeatureDisabledMessage(
  feature: keyof OperatorPolicy['features'],
  scopeKey: OperatorScopeKey | null
): PolicyNoticeMessage {
  const featureName = FEATURE_DISPLAY_NAMES[feature] || feature;
  const scopeName = scopeKey ? SCOPE_DISPLAY_NAMES[scopeKey] : '현재 서비스';

  return {
    type: 'feature_disabled',
    title: `${featureName} 기능 제한`,
    description: `현재 이 서비스에서는 ${featureName} 기능이 제공되지 않습니다.`,
    guidance: `적용 정책: ${scopeName}`,
  };
}

/**
 * 스코프 불일치 메시지 생성
 */
export function getScopeMismatchMessage(
  activeScopeKey: OperatorScopeKey,
  serviceDefaultScopeKey: OperatorScopeKey
): PolicyNoticeMessage {
  const activeScopeName = SCOPE_DISPLAY_NAMES[activeScopeKey];
  const serviceScopeName = SCOPE_DISPLAY_NAMES[serviceDefaultScopeKey];

  return {
    type: 'scope_mismatch',
    title: '스코프 불일치',
    description: `현재 스코프(${activeScopeName})가 서비스 기본 스코프(${serviceScopeName})와 다릅니다.`,
    guidance: '일부 기능이 제한될 수 있습니다.',
  };
}

/**
 * 프로그램 참여 필요 메시지 생성
 */
export function getProgramRequiredMessage(
  programName: string = '혈당관리 프로그램'
): PolicyNoticeMessage {
  return {
    type: 'program_required',
    title: '프로그램 참여 필요',
    description: `이 기능은 ${programName} 참여 약국만 이용할 수 있습니다.`,
    guidance: '프로그램 참여를 원하시면 관리자에게 문의하세요.',
  };
}

/**
 * 콘텐츠 타입 불가 메시지 생성
 */
export function getContentTypeUnavailableMessage(
  contentType: string,
  scopeKey: OperatorScopeKey | null
): PolicyNoticeMessage {
  const scopeName = scopeKey ? SCOPE_DISPLAY_NAMES[scopeKey] : '현재 서비스';

  return {
    type: 'content_type_unavailable',
    title: '콘텐츠 유형 제한',
    description: `현재 서비스에서는 "${contentType}" 콘텐츠를 관리할 수 없습니다.`,
    guidance: `적용 정책: ${scopeName}`,
  };
}

/**
 * 운영자 아님 메시지 생성
 */
export function getNotOperatorMessage(): PolicyNoticeMessage {
  return {
    type: 'not_operator',
    title: '운영자 권한 필요',
    description: '이 기능은 운영자 권한이 있는 사용자만 이용할 수 있습니다.',
    guidance: '운영자 권한이 필요하시면 관리자에게 문의하세요.',
  };
}

// ============================================================================
// Predefined Messages
// ============================================================================

export const POLICY_NOTICES = {
  /** 공동구매 관리 - kpa_society 전용 */
  groupBuyKpaOnly: {
    type: 'feature_disabled' as PolicyNoticeType,
    title: '공동구매 관리 제한',
    description: '공동구매 관리는 약사회 서비스에서만 이용할 수 있습니다.',
    guidance: '적용 정책: 약사회 서비스 전용 기능',
  },

  /** 포럼 개설 - glycocare 불가 */
  forumCreateNotAvailable: {
    type: 'feature_disabled' as PolicyNoticeType,
    title: '포럼 개설 제한',
    description: '현재 서비스에서는 새 포럼을 개설할 수 없습니다.',
    guidance: '적용 정책: 혈당관리 프로그램 스코프',
  },

  /** 혈당관리 프로그램 미참여 */
  glucosecareNotParticipating: {
    type: 'program_required' as PolicyNoticeType,
    title: '혈당관리 프로그램 참여 필요',
    description: '이 기능은 혈당관리 프로그램 참여 약국만 이용할 수 있습니다.',
    guidance: '프로그램 참여를 원하시면 관리자에게 문의하세요.',
  },

  /** 일반 기능 제한 */
  featureNotAvailable: {
    type: 'feature_disabled' as PolicyNoticeType,
    title: '기능 제한',
    description: '현재 이 서비스에서는 해당 기능이 제공되지 않습니다.',
    guidance: '적용 정책: 기본 서비스 스코프',
  },
} as const;
