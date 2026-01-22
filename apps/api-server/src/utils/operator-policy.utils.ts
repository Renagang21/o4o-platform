/**
 * Operator Policy Utilities
 *
 * WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1
 *
 * 스코프 기반 정책 레이어 유틸리티
 * - 운영자 권한 검사
 * - 정책 기반 기능 제어
 */

import {
  type OperatorScopeKey,
  type OperatorPolicy,
  GLYCOCARE_OPERATOR_POLICY,
  KPA_SOCIETY_OPERATOR_POLICY,
  OPERATOR_POLICIES,
} from '@o4o/types';
import { getScopesByLevel } from '../config/service-scopes.js';

/**
 * 스코프 키로 운영자 정책 조회
 */
export function getOperatorPolicy(scopeKey: OperatorScopeKey): OperatorPolicy {
  return OPERATOR_POLICIES[scopeKey];
}

/**
 * 서비스 코드에서 스코프 키 추출
 * glucoseview → glycocare
 * kpa-society → kpa_society
 */
export function serviceCodeToScopeKey(serviceCode: string): OperatorScopeKey | null {
  const mapping: Record<string, OperatorScopeKey> = {
    'glucoseview': 'glycocare',
    'kpa-society': 'kpa_society',
  };
  return mapping[serviceCode] || null;
}

/**
 * 스코프 키에서 서비스 코드 추출
 */
export function scopeKeyToServiceCode(scopeKey: OperatorScopeKey): string {
  const mapping: Record<OperatorScopeKey, string> = {
    'glycocare': 'glucoseview',
    'kpa_society': 'kpa-society',
  };
  return mapping[scopeKey];
}

/**
 * 사용자가 특정 스코프의 운영자 권한을 가지는지 확인
 */
export function hasOperatorScope(
  userScopes: string[],
  scopeKey: OperatorScopeKey
): boolean {
  const serviceCode = scopeKeyToServiceCode(scopeKey);
  const operatorScopes = getScopesByLevel(serviceCode, 'operator');

  // 사용자가 해당 서비스의 operator 스코프 중 하나라도 가지고 있으면 true
  return operatorScopes.some(scope => userScopes.includes(scope));
}

/**
 * 사용자의 운영자 스코프 키 목록 조회
 */
export function getUserOperatorScopeKeys(userScopes: string[]): OperatorScopeKey[] {
  const scopeKeys: OperatorScopeKey[] = ['glycocare', 'kpa_society'];
  return scopeKeys.filter(key => hasOperatorScope(userScopes, key));
}

/**
 * 특정 기능에 대한 운영자 권한 확인
 */
export function canOperatorPerform(
  scopeKey: OperatorScopeKey,
  feature: keyof OperatorPolicy['features']
): boolean {
  const policy = getOperatorPolicy(scopeKey);
  return policy.features[feature];
}

/**
 * 운영자가 특정 콘텐츠 타입을 관리할 수 있는지 확인
 */
export function canOperatorManageContentType(
  scopeKey: OperatorScopeKey,
  contentType: string
): boolean {
  const policy = getOperatorPolicy(scopeKey);
  return policy.contentTypes.includes(contentType);
}

/**
 * 운영자 가입 요건 검사
 */
export function validateOperatorJoinRequirements(
  scopeKey: OperatorScopeKey,
  userData: Record<string, unknown>
): { valid: boolean; missingFields: string[] } {
  const policy = getOperatorPolicy(scopeKey);
  const { requiredFields } = policy.joinRequirements;

  const missingFields = requiredFields.filter(
    field => !userData[field] || userData[field] === ''
  );

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * 운영자 승인 필요 여부 확인
 */
export function requiresOperatorApproval(scopeKey: OperatorScopeKey): boolean {
  const policy = getOperatorPolicy(scopeKey);
  return policy.joinRequirements.requiresApproval;
}

/**
 * 운영자 정책 비교 (디버깅/문서용)
 */
export function compareOperatorPolicies(): {
  glycocare: OperatorPolicy;
  kpa_society: OperatorPolicy;
  differences: string[];
} {
  const glycocare = GLYCOCARE_OPERATOR_POLICY;
  const kpa = KPA_SOCIETY_OPERATOR_POLICY;

  const differences: string[] = [];

  // 가입 요건 비교
  if (glycocare.joinRequirements.strictness !== kpa.joinRequirements.strictness) {
    differences.push(`joinRequirements.strictness: glycocare=${glycocare.joinRequirements.strictness}, kpa=${kpa.joinRequirements.strictness}`);
  }

  // 기능 비교
  const features = Object.keys(glycocare.features) as (keyof OperatorPolicy['features'])[];
  for (const feature of features) {
    if (glycocare.features[feature] !== kpa.features[feature]) {
      differences.push(`features.${feature}: glycocare=${glycocare.features[feature]}, kpa=${kpa.features[feature]}`);
    }
  }

  // 인증 기준 비교
  if (glycocare.certificationCriteria !== kpa.certificationCriteria) {
    differences.push(`certificationCriteria: glycocare=${glycocare.certificationCriteria}, kpa=${kpa.certificationCriteria}`);
  }

  return {
    glycocare,
    kpa_society: kpa,
    differences,
  };
}
