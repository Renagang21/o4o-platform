/**
 * Operator Policy Types
 *
 * WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1
 *
 * 운영자(operator) 역할의 스코프 기반 정책 정의
 *
 * 핵심 원칙:
 * 1. 운영자 Role은 단 하나 ('operator')
 * 2. 기능 차이는 스코프와 정책으로만 처리
 * 3. 혈당관리(glycocare) / kpa-society는 정책 스코프 차이로만 구분
 */

// ============================================================================
// Operator Scope Types
// ============================================================================

/**
 * 운영자 스코프 키
 * - glycocare: 혈당관리 지원약국 전용
 * - kpa_society: kpa-society 전체 서비스
 */
export type OperatorScopeKey = 'glycocare' | 'kpa_society';

/**
 * 운영자 대상 타입
 */
export type OperatorTargetType = 'pharmacy' | 'branch' | 'pharmacist';

// ============================================================================
// Operator Policy Configuration
// ============================================================================

/**
 * 운영자 정책 설정
 */
export interface OperatorPolicy {
  /** 스코프 키 */
  scopeKey: OperatorScopeKey;

  /** 표시 이름 */
  displayName: string;

  /** 설명 */
  description: string;

  /** 가입 조건 */
  joinRequirements: {
    /** 엄격도 (strict: 엄격, relaxed: 완화) */
    strictness: 'strict' | 'relaxed';
    /** 필수 필드 목록 */
    requiredFields: string[];
    /** 승인 필요 여부 */
    requiresApproval: boolean;
  };

  /** 적용 대상 */
  targetTypes: OperatorTargetType[];

  /** 기능 권한 */
  features: {
    /** 포럼 개설 가능 여부 */
    canCreateForum: boolean;
    /** 콘텐츠 제공 관리 가능 여부 */
    canManageContent: boolean;
    /** 공식 인증 관리 가능 여부 */
    canManageCertification: boolean;
    /** 운영 정책 관리 가능 여부 */
    canManagePolicy: boolean;
    /** 가입 조건 관리 가능 여부 */
    canManageJoinRequirements: boolean;
    /** 서비스 활성화 관리 가능 여부 */
    canManageServiceActivation: boolean;
  };

  /** 콘텐츠 타입 */
  contentTypes: string[];

  /** 인증 기준 */
  certificationCriteria: 'program' | 'association';
}

// ============================================================================
// Default Policies
// ============================================================================

/**
 * 혈당관리(GlycoCare) 운영자 정책
 */
export const GLYCOCARE_OPERATOR_POLICY: OperatorPolicy = {
  scopeKey: 'glycocare',
  displayName: '혈당관리 운영자',
  description: '혈당관리 지원약국 운영자',

  joinRequirements: {
    strictness: 'strict',
    requiredFields: ['license_number', 'pharmacy_name', 'pharmacy_address', 'chapter_id'],
    requiresApproval: true,
  },

  targetTypes: ['pharmacy'],

  features: {
    canCreateForum: false,
    canManageContent: true,
    canManageCertification: true,
    canManagePolicy: true,
    canManageJoinRequirements: true,
    canManageServiceActivation: true,
  },

  contentTypes: ['glucose_management', 'health_education', 'pharmacy_guide'],

  certificationCriteria: 'program',
};

/**
 * KPA Society 운영자 정책
 */
export const KPA_SOCIETY_OPERATOR_POLICY: OperatorPolicy = {
  scopeKey: 'kpa_society',
  displayName: 'KPA 운영자',
  description: '대한약사회 서비스 운영자',

  joinRequirements: {
    strictness: 'relaxed',
    requiredFields: ['license_number', 'organization_id'],
    requiresApproval: true,
  },

  targetTypes: ['pharmacy', 'branch', 'pharmacist'],

  features: {
    canCreateForum: true,
    canManageContent: true,
    canManageCertification: true,
    canManagePolicy: true,
    canManageJoinRequirements: true,
    canManageServiceActivation: true,
  },

  contentTypes: ['association_news', 'education', 'forum', 'events'],

  certificationCriteria: 'association',
};

/**
 * 스코프별 운영자 정책 맵
 */
export const OPERATOR_POLICIES: Record<OperatorScopeKey, OperatorPolicy> = {
  glycocare: GLYCOCARE_OPERATOR_POLICY,
  kpa_society: KPA_SOCIETY_OPERATOR_POLICY,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 스코프 키로 운영자 정책 조회
 */
export function getOperatorPolicy(scopeKey: OperatorScopeKey): OperatorPolicy {
  return OPERATOR_POLICIES[scopeKey];
}

/**
 * 유효한 운영자 스코프 키인지 확인
 */
export function isValidOperatorScope(scope: string): scope is OperatorScopeKey {
  return scope === 'glycocare' || scope === 'kpa_society';
}

/**
 * 운영자가 특정 기능을 사용할 수 있는지 확인
 */
export function canOperatorUseFeature(
  scopeKey: OperatorScopeKey,
  feature: keyof OperatorPolicy['features']
): boolean {
  const policy = OPERATOR_POLICIES[scopeKey];
  return policy?.features[feature] ?? false;
}

/**
 * 운영자의 대상 타입 목록 조회
 */
export function getOperatorTargetTypes(scopeKey: OperatorScopeKey): OperatorTargetType[] {
  const policy = OPERATOR_POLICIES[scopeKey];
  return policy?.targetTypes ?? [];
}

/**
 * 모든 운영자 스코프 키 조회
 */
export function getAllOperatorScopeKeys(): OperatorScopeKey[] {
  return Object.keys(OPERATOR_POLICIES) as OperatorScopeKey[];
}
