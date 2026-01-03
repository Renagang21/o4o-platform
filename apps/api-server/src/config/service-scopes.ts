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
 */
export type ScopeLevel = 'public' | 'member' | 'admin';

/**
 * 서비스별 스코프 정의
 */
export interface ServiceScopes {
  /** 공개 스코프 (인증 불필요) */
  public: string[];
  /** 회원 스코프 (로그인 필요) */
  member: string[];
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
    admin: [
      'glycopharm:products:write',
      'glycopharm:display:write',
      'glycopharm:forum:moderate',
      'glycopharm:application:manage',
    ],
  },

  /**
   * 글루코스뷰 스코프
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
    admin: [
      'neture:products:write',
      'neture:partners:manage',
      'neture:orders:manage',
    ],
  },

  /**
   * KPA Society 스코프
   */
  'kpa-society': {
    public: [
      'kpa:info:read',
    ],
    member: [
      'kpa:membership:read',
      'kpa:events:read',
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
 */
export function getAllScopes(serviceCode: string): string[] {
  const scopes = SERVICE_SCOPES[serviceCode];
  if (!scopes) return [];
  return [...scopes.public, ...scopes.member, ...scopes.admin];
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
