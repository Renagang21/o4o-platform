/**
 * Service Entry Configuration (Frontend)
 *
 * WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1
 *
 * 서비스별 기본 스코프 매핑 (프론트엔드용)
 * 서버의 service-scopes.ts와 동기화
 */

import type { OperatorScopeKey } from '@o4o/types';

// ============================================================================
// Types
// ============================================================================

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
  /** 표시 이름 */
  displayName: string;
  /** 설명 */
  description: string;
  /** 프로그램 여부 (특수 정책 적용) */
  isProgram: boolean;
  /** 라우트 패턴 (URL 매칭용) */
  routePatterns: string[];
}

// ============================================================================
// Service Entry Defaults
// ============================================================================

/**
 * 서비스 엔트리별 기본 스코프 매핑
 */
export const SERVICE_ENTRY_DEFAULTS: Record<ServiceEntryPoint, ServiceEntryConfig> = {
  branch: {
    entry: 'branch',
    defaultScopeKey: 'kpa_society',
    displayName: '분회 서비스',
    description: '분회 단위 조직 관리 서비스',
    isProgram: false,
    routePatterns: ['/admin/branch', '/admin/chapter'],
  },
  pharmacy: {
    entry: 'pharmacy',
    defaultScopeKey: 'kpa_society',
    displayName: '약국 서비스',
    description: '약국 기본 서비스',
    isProgram: false,
    routePatterns: ['/admin/pharmacy', '/admin/yakguk'],
  },
  glucosecare: {
    entry: 'glucosecare',
    defaultScopeKey: 'glycocare',
    displayName: '혈당관리 프로그램',
    description: '약국 서비스의 특수 프로그램 (혈당관리)',
    isProgram: true,
    routePatterns: ['/admin/glucoseview', '/admin/glucosecare', '/admin/glycocare'],
  },
  forum: {
    entry: 'forum',
    defaultScopeKey: 'kpa_society',
    displayName: '약사 포럼',
    description: '약사 커뮤니티 포럼',
    isProgram: false,
    routePatterns: ['/admin/forum', '/admin/yaksa-forum'],
  },
  lms: {
    entry: 'lms',
    defaultScopeKey: 'kpa_society',
    displayName: '약사 LMS',
    description: '약사 개인 학습 관리 시스템',
    isProgram: false,
    routePatterns: ['/admin/lms', '/admin/learning'],
  },
  admin: {
    entry: 'admin',
    defaultScopeKey: 'kpa_society',
    displayName: '관리자 대시보드',
    description: '플랫폼 관리자 대시보드',
    isProgram: false,
    routePatterns: ['/admin'],
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * URL 경로에서 서비스 엔트리 포인트 감지
 */
export function detectServiceEntryFromPath(path: string): ServiceEntryPoint | null {
  const pathLower = path.toLowerCase();

  // 구체적인 패턴부터 매칭 (glucosecare가 admin보다 먼저)
  for (const [entry, config] of Object.entries(SERVICE_ENTRY_DEFAULTS)) {
    if (entry === 'admin') continue; // admin은 마지막에 체크

    for (const pattern of config.routePatterns) {
      if (pathLower.startsWith(pattern.toLowerCase())) {
        return entry as ServiceEntryPoint;
      }
    }
  }

  // 마지막으로 admin 체크
  if (pathLower.startsWith('/admin')) {
    return 'admin';
  }

  return null;
}

/**
 * 서비스 엔트리 포인트로 기본 스코프 키 조회
 */
export function getDefaultScopeKey(entry: ServiceEntryPoint): OperatorScopeKey {
  return SERVICE_ENTRY_DEFAULTS[entry].defaultScopeKey;
}

/**
 * 서비스 엔트리 설정 조회
 */
export function getServiceEntryConfig(entry: ServiceEntryPoint): ServiceEntryConfig {
  return SERVICE_ENTRY_DEFAULTS[entry];
}

/**
 * 현재 경로의 서비스 엔트리 설정 조회
 */
export function getCurrentServiceEntryConfig(path: string): ServiceEntryConfig | null {
  const entry = detectServiceEntryFromPath(path);
  return entry ? SERVICE_ENTRY_DEFAULTS[entry] : null;
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
