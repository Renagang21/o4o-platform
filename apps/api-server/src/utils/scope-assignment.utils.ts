/**
 * Scope Assignment Utilities
 *
 * WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1
 *
 * 사용자 역할 기반 스코프 할당 로직
 * - 역할에서 스코프 자동 도출
 * - 서비스별 스코프 레벨 매핑
 */

import { SERVICE_SCOPES, getScopesByLevel, type ScopeLevel } from '../config/service-scopes.js';

// ============================================================================
// Types
// ============================================================================

export interface ScopeAssignmentContext {
  /** 사용자 역할 */
  role: string;
  /** 사용자 역할 목록 (복수 역할 지원) */
  roles?: string[];
  /** 서비스 컨텍스트 (선택) */
  serviceCode?: string;
  /** 추가 스코프 (수동 부여) */
  additionalScopes?: string[];
  /** 약사 정보 (GlucoseView용) */
  pharmacistInfo?: {
    role?: 'pharmacist' | 'operator' | 'admin';
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  };
}

// ============================================================================
// Role to Scope Level Mapping
// ============================================================================

/**
 * 역할에서 스코프 레벨 도출
 */
function rolesToScopeLevel(role: string, roles?: string[]): ScopeLevel {
  const allRoles = new Set([role, ...(roles || [])]);

  // Admin 계열
  if (allRoles.has('super_admin') || allRoles.has('admin')) {
    return 'admin';
  }

  // Operator 계열
  if (allRoles.has('operator')) {
    return 'operator';
  }

  // Member 계열 (인증된 일반 사용자)
  if (
    allRoles.has('user') ||
    allRoles.has('customer') ||
    allRoles.has('member') ||
    allRoles.has('pharmacist') ||
    allRoles.has('seller') ||
    allRoles.has('vendor') ||
    allRoles.has('supplier') ||
    allRoles.has('partner')
  ) {
    return 'member';
  }

  // 기본: public
  return 'public';
}

// ============================================================================
// Service Context Detection
// ============================================================================

/**
 * 약사 정보에서 서비스 컨텍스트 도출
 */
function detectServiceFromPharmacist(
  pharmacistInfo?: ScopeAssignmentContext['pharmacistInfo']
): string | null {
  if (!pharmacistInfo) return null;

  // 약사가 승인되면 glucoseview 서비스 컨텍스트
  if (pharmacistInfo.approvalStatus === 'approved') {
    return 'glucoseview';
  }

  return null;
}

/**
 * 역할에서 서비스 컨텍스트 힌트
 */
function detectServiceFromRole(role: string, roles?: string[]): string[] {
  const services: string[] = [];
  const allRoles = new Set([role, ...(roles || [])]);

  // 역할에 따른 서비스 힌트
  // (실제로는 사용자의 조직/소속에 따라 결정되어야 함)
  // 여기서는 기본적인 매핑만 제공

  // super_admin/admin은 모든 서비스 접근 가능
  if (allRoles.has('super_admin') || allRoles.has('admin')) {
    return Object.keys(SERVICE_SCOPES);
  }

  return services;
}

// ============================================================================
// Main Scope Assignment Functions
// ============================================================================

/**
 * 컨텍스트에서 사용자 스코프 도출
 *
 * 스코프 할당 규칙:
 * 1. 역할에서 기본 스코프 레벨 결정 (admin > operator > member > public)
 * 2. 서비스 컨텍스트가 있으면 해당 서비스 스코프만 부여
 * 3. 서비스 컨텍스트가 없으면:
 *    - admin: 모든 서비스의 해당 레벨 스코프
 *    - 그 외: 명시적으로 부여된 스코프만
 * 4. 추가 스코프 병합
 */
export function deriveUserScopes(context: ScopeAssignmentContext): string[] {
  const { role, roles, serviceCode, additionalScopes, pharmacistInfo } = context;
  const scopeLevel = rolesToScopeLevel(role, roles);
  const scopes = new Set<string>();

  // 1. 서비스 컨텍스트 결정
  let targetServices: string[] = [];

  if (serviceCode) {
    // 명시적 서비스 컨텍스트
    targetServices = [serviceCode];
  } else if (pharmacistInfo) {
    // 약사 정보에서 서비스 도출
    const detectedService = detectServiceFromPharmacist(pharmacistInfo);
    if (detectedService) {
      targetServices = [detectedService];
    }
  }

  // Admin은 명시적 서비스가 없으면 모든 서비스 접근
  if (targetServices.length === 0 && scopeLevel === 'admin') {
    targetServices = Object.keys(SERVICE_SCOPES);
  }

  // 2. 서비스별 스코프 부여
  for (const service of targetServices) {
    // 해당 레벨 이하의 모든 스코프 부여 (계층적)
    const levels: ScopeLevel[] = ['public'];
    if (['member', 'operator', 'admin'].includes(scopeLevel)) {
      levels.push('member');
    }
    if (['operator', 'admin'].includes(scopeLevel)) {
      levels.push('operator');
    }
    if (scopeLevel === 'admin') {
      levels.push('admin');
    }

    for (const level of levels) {
      const levelScopes = getScopesByLevel(service, level);
      levelScopes.forEach(scope => scopes.add(scope));
    }
  }

  // 3. 약사 특수 처리
  if (pharmacistInfo?.approvalStatus === 'approved') {
    // 승인된 약사는 pharmacist 스코프 부여
    if (pharmacistInfo.role === 'operator') {
      // operator 역할 약사
      getScopesByLevel('glucoseview', 'operator').forEach(scope => scopes.add(scope));
    } else if (pharmacistInfo.role === 'admin') {
      // admin 역할 약사
      getScopesByLevel('glucoseview', 'admin').forEach(scope => scopes.add(scope));
    } else {
      // 일반 약사 (member 레벨)
      getScopesByLevel('glucoseview', 'member').forEach(scope => scopes.add(scope));
    }
  }

  // 4. 추가 스코프 병합
  if (additionalScopes) {
    additionalScopes.forEach(scope => scopes.add(scope));
  }

  return Array.from(scopes);
}

/**
 * 간단한 역할 기반 스코프 조회 (서비스 컨텍스트 없이)
 */
export function getBasicScopesForRole(role: string): string[] {
  return deriveUserScopes({ role });
}

/**
 * 특정 서비스의 운영자 스코프 조회
 */
export function getOperatorScopesForService(serviceCode: string): string[] {
  return deriveUserScopes({
    role: 'operator',
    serviceCode,
  });
}

/**
 * GlucoseView 약사 스코프 조회
 */
export function getPharmacistScopes(
  pharmacistRole: 'pharmacist' | 'operator' | 'admin',
  approved: boolean = true
): string[] {
  return deriveUserScopes({
    role: pharmacistRole === 'pharmacist' ? 'member' : pharmacistRole,
    pharmacistInfo: {
      role: pharmacistRole,
      approvalStatus: approved ? 'approved' : 'pending',
    },
  });
}

/**
 * KPA Society 운영자 스코프 조회
 */
export function getKpaSocietyOperatorScopes(): string[] {
  return deriveUserScopes({
    role: 'operator',
    serviceCode: 'kpa-society',
  });
}
