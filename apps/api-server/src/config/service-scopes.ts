/**
 * Service Scopes Registry
 *
 * Hard Cleanup v1: Service Registry와 1:1 대응하는 스코프 정의
 *
 * 각 서비스는 독립적인 스코프 네임스페이스를 가집니다.
 * 이를 통해:
 * - 토큰에 서비스별 권한 부여
 * - API 접근 제어
 * - 로그/감사 분리
 */

/**
 * 스코프 레벨
 * WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1: operator 레벨 추가
 */
export type ScopeLevel = 'public' | 'member' | 'operator' | 'admin';

/**
 * 서비스별 스코프 정의
 * WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1: operator 레벨 추가
 */
export interface ServiceScopes {
  /** 공개 스코프 (인증 불필요) */
  public: string[];
  /** 회원 스코프 (로그인 필요) */
  member: string[];
  /** 운영자 스코프 (operator 역할 필요) */
  operator: string[];
  /** 관리자 스코프 */
  admin: string[];
}

/**
 * 전체 서비스 스코프 레지스트리
 *
 * Hard Cleanup v1: Service Registry에 등록된 서비스만 포함
 * - glycopharm, glucoseview, neture, kpa-society, cosmetics
 *
 * 제거됨:
 * - k-cosmetics (API 없음)
 * - k-shopping (전면 제거)
 */
export const SERVICE_SCOPES: Record<string, ServiceScopes> = {
  /**
   * 글라이코팜 스코프
   */
  glycopharm: {
    public: [
      'glycopharm:products:read',
      'glycopharm:display:read',
    ],
    member: [
      'glycopharm:forum:read',
      'glycopharm:forum:write',
      'glycopharm:application:submit',
    ],
    operator: [
      'glycopharm:products:read',
      'glycopharm:display:read',
      'glycopharm:forum:read',
      'glycopharm:forum:write',
      'glycopharm:forum:moderate',
      'glycopharm:application:manage',
    ],
    admin: [
      'glycopharm:products:write',
      'glycopharm:display:write',
      'glycopharm:forum:moderate',
      'glycopharm:application:manage',
    ],
  },

  /**
   * 글루코스뷰 스코프 (혈당관리 = glycocare scope)
   * WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1
   */
  glucoseview: {
    public: [
      'glucoseview:info:read',
    ],
    member: [
      'glucoseview:customer:read',
      'glucoseview:customer:write',
      'glucoseview:pharmacist:read',
    ],
    operator: [
      'glucoseview:customer:read',
      'glucoseview:customer:write',
      'glucoseview:customer:manage',
      'glucoseview:pharmacist:read',
      'glucoseview:pharmacist:manage',
      'glucoseview:branch:read',
      'glucoseview:policy:manage',
      'glucoseview:content:manage',
      'glucoseview:certification:manage',
    ],
    admin: [
      'glucoseview:branch:manage',
      'glucoseview:pharmacist:manage',
      'glucoseview:customer:manage',
    ],
  },

  /**
   * 네처 스코프
   */
  neture: {
    public: [
      'neture:products:read',
    ],
    member: [
      'neture:orders:read',
      'neture:orders:write',
    ],
    operator: [
      'neture:products:read',
      'neture:orders:read',
      'neture:orders:manage',
      'neture:partners:read',
    ],
    admin: [
      'neture:products:write',
      'neture:partners:manage',
      'neture:orders:manage',
    ],
  },

  /**
   * KPA Society 스코프 (kpa_society scope)
   * WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1
   */
  'kpa-society': {
    public: [
      'kpa:info:read',
    ],
    member: [
      'kpa:membership:read',
      'kpa:events:read',
    ],
    operator: [
      'kpa:membership:read',
      'kpa:membership:manage',
      'kpa:events:read',
      'kpa:events:manage',
      'kpa:forum:read',
      'kpa:forum:write',
      'kpa:forum:manage',
      'kpa:content:manage',
      'kpa:policy:manage',
      'kpa:certification:manage',
      'kpa:groupbuy:manage',
    ],
    admin: [
      'kpa:membership:manage',
      'kpa:events:manage',
      'kpa:admin:access',
    ],
  },

  /**
   * Cosmetics 스코프
   */
  cosmetics: {
    public: [
      'cosmetics:products:read',
      'cosmetics:brands:read',
    ],
    member: [
      'cosmetics:orders:read',
      'cosmetics:orders:write',
    ],
    operator: [
      'cosmetics:products:read',
      'cosmetics:brands:read',
      'cosmetics:orders:read',
      'cosmetics:orders:manage',
    ],
    admin: [
      'cosmetics:products:write',
      'cosmetics:brands:write',
      'cosmetics:partners:manage',
      'cosmetics:admin:access',
    ],
  },
};

/**
 * 서비스의 모든 스코프 조회
 * WO-KPA-OPERATOR-SCOPE-UNIFICATION-V1: operator 레벨 포함
 */
export function getAllScopes(serviceCode: string): string[] {
  const scopes = SERVICE_SCOPES[serviceCode];
  if (!scopes) return [];
  return [...scopes.public, ...scopes.member, ...scopes.operator, ...scopes.admin];
}

/**
 * 스코프 레벨별 조회
 */
export function getScopesByLevel(serviceCode: string, level: ScopeLevel): string[] {
  const scopes = SERVICE_SCOPES[serviceCode];
  if (!scopes) return [];
  return scopes[level] || [];
}

/**
 * 스코프 존재 여부 확인
 */
export function hasScope(serviceCode: string, scope: string): boolean {
  return getAllScopes(serviceCode).includes(scope);
}

/**
 * 스코프에서 서비스 코드 추출
 * 예: 'glycopharm:products:read' → 'glycopharm'
 */
export function extractServiceFromScope(scope: string): string | null {
  const parts = scope.split(':');
  if (parts.length < 2) return null;
  return parts[0];
}

/**
 * 서비스에 스코프가 정의되어 있는지 확인
 */
export function hasAnyScopes(serviceCode: string): boolean {
  return getAllScopes(serviceCode).length > 0;
}

// ============================================================================
// WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1
// 서비스별 기본 스코프 매핑
// ============================================================================

import type { OperatorScopeKey } from '@o4o/types';

/**
 * 서비스 엔트리 포인트 식별자
 */
export type ServiceEntryPoint =
  | 'branch'           // 분회 서비스
  | 'pharmacy'         // 약국 서비스
  | 'glucosecare'      // 혈당관리 프로그램
  | 'forum'            // 약사 포럼
  | 'lms'              // 약사 개인 LMS
  | 'admin';           // 관리자 대시보드

/**
 * 서비스 엔트리 설정
 */
export interface ServiceEntryConfig {
  /** 서비스 엔트리 포인트 */
  entry: ServiceEntryPoint;
  /** 기본 운영자 스코프 키 */
  defaultScopeKey: OperatorScopeKey;
  /** 서비스 코드 (SERVICE_SCOPES 키) */
  serviceCode: string;
  /** 표시 이름 */
  displayName: string;
  /** 설명 */
  description: string;
  /** 프로그램 여부 (특수 정책 적용) */
  isProgram: boolean;
}

/**
 * 서비스 엔트리별 기본 스코프 매핑
 *
 * WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1:
 * - 각 서비스 진입 시 자동으로 적용될 기본 스코프
 * - glycocare는 프로그램 스코프로, 단독 서비스가 아님
 */
export const SERVICE_ENTRY_DEFAULTS: Record<ServiceEntryPoint, ServiceEntryConfig> = {
  branch: {
    entry: 'branch',
    defaultScopeKey: 'kpa_society',
    serviceCode: 'kpa-society',
    displayName: '분회 서비스',
    description: '분회 단위 조직 관리 서비스',
    isProgram: false,
  },
  pharmacy: {
    entry: 'pharmacy',
    defaultScopeKey: 'kpa_society',
    serviceCode: 'kpa-society',
    displayName: '약국 서비스',
    description: '약국 기본 서비스',
    isProgram: false,
  },
  glucosecare: {
    entry: 'glucosecare',
    defaultScopeKey: 'glycocare',
    serviceCode: 'glucoseview',
    displayName: '혈당관리 프로그램',
    description: '약국 서비스의 특수 프로그램 (혈당관리)',
    isProgram: true,
  },
  forum: {
    entry: 'forum',
    defaultScopeKey: 'kpa_society',
    serviceCode: 'kpa-society',
    displayName: '약사 포럼',
    description: '약사 커뮤니티 포럼',
    isProgram: false,
  },
  lms: {
    entry: 'lms',
    defaultScopeKey: 'kpa_society',
    serviceCode: 'kpa-society',
    displayName: '약사 LMS',
    description: '약사 개인 학습 관리 시스템',
    isProgram: false,
  },
  admin: {
    entry: 'admin',
    defaultScopeKey: 'kpa_society',
    serviceCode: 'kpa-society',
    displayName: '관리자 대시보드',
    description: '플랫폼 관리자 대시보드',
    isProgram: false,
  },
};

/**
 * 서비스 엔트리 포인트로 기본 스코프 키 조회
 */
export function getDefaultScopeKey(entry: ServiceEntryPoint): OperatorScopeKey {
  return SERVICE_ENTRY_DEFAULTS[entry].defaultScopeKey;
}

/**
 * 서비스 엔트리 포인트로 서비스 코드 조회
 */
export function getServiceCodeFromEntry(entry: ServiceEntryPoint): string {
  return SERVICE_ENTRY_DEFAULTS[entry].serviceCode;
}

/**
 * 서비스 엔트리 설정 조회
 */
export function getServiceEntryConfig(entry: ServiceEntryPoint): ServiceEntryConfig {
  return SERVICE_ENTRY_DEFAULTS[entry];
}

/**
 * URL 경로에서 서비스 엔트리 포인트 추출
 */
export function detectServiceEntryFromPath(path: string): ServiceEntryPoint | null {
  const pathLower = path.toLowerCase();

  if (pathLower.includes('/glucoseview') || pathLower.includes('/glucosecare') || pathLower.includes('/glycocare')) {
    return 'glucosecare';
  }
  if (pathLower.includes('/branch') || pathLower.includes('/chapter')) {
    return 'branch';
  }
  if (pathLower.includes('/pharmacy') || pathLower.includes('/yakguk')) {
    return 'pharmacy';
  }
  if (pathLower.includes('/forum') || pathLower.includes('/yaksa-forum')) {
    return 'forum';
  }
  if (pathLower.includes('/lms') || pathLower.includes('/learning')) {
    return 'lms';
  }
  if (pathLower.includes('/admin')) {
    return 'admin';
  }

  return null;
}

/**
 * 모든 서비스 엔트리 설정 조회
 */
export function getAllServiceEntryConfigs(): ServiceEntryConfig[] {
  return Object.values(SERVICE_ENTRY_DEFAULTS);
}

/**
 * 프로그램 서비스만 조회
 */
export function getProgramServices(): ServiceEntryConfig[] {
  return Object.values(SERVICE_ENTRY_DEFAULTS).filter(config => config.isProgram);
}

/**
 * 비프로그램 서비스만 조회
 */
export function getNonProgramServices(): ServiceEntryConfig[] {
  return Object.values(SERVICE_ENTRY_DEFAULTS).filter(config => !config.isProgram);
}
