/**
 * O4O Platform Service Catalog
 *
 * WO-O4O-SERVICE-CATALOG-FOUNDATION-V1
 * 플랫폼 서비스 식별 정보의 단일 소스 (Single Source of Truth)
 *
 * 사용처:
 * - /check-email API 응답
 * - PASSWORD_MISMATCH 응답
 * - 가입 UX 서비스 표시
 * - Account Center (향후)
 * - 서비스 이동 handoff (향후)
 */

export interface O4OService {
  /** 서비스 식별 키 (DB service_key) */
  key: string;
  /** 서비스 표시 이름 */
  name: string;
  /** 서비스 도메인 */
  domain: string;
  /** 서비스 설명 */
  description: string;
  /** 가입 가능 여부 */
  joinEnabled: boolean;
}

export const O4O_SERVICES: O4OService[] = [
  {
    key: 'neture',
    name: 'Neture',
    domain: 'neture.co.kr',
    description: 'O4O 공급자 및 유통 플랫폼',
    joinEnabled: true,
  },
  {
    key: 'glycopharm',
    name: 'GlycoPharm',
    domain: 'glycopharm.co.kr',
    description: '약국 혈당 관리 서비스',
    joinEnabled: true,
  },
  {
    key: 'glucoseview',
    name: 'GlucoseView',
    domain: 'glucoseview.co.kr',
    description: '혈당 데이터 조회 서비스',
    joinEnabled: true,
  },
  {
    key: 'kpa-society',
    name: 'KPA Society',
    domain: 'kpa-society.co.kr',
    description: '약사 커뮤니티 서비스',
    joinEnabled: true,
  },
  {
    key: 'k-cosmetics',
    name: 'K-Cosmetics',
    domain: 'k-cosmetics.site',
    description: '화장품 유통 플랫폼',
    joinEnabled: true,
  },
];

/** 서비스 키 → O4OService 조회 */
const serviceMap = new Map(O4O_SERVICES.map(s => [s.key, s]));

/** 서비스 키로 서비스 정보 조회 */
export function getService(key: string): O4OService | undefined {
  return serviceMap.get(key);
}

/** 서비스 키로 표시 이름 조회 (없으면 키 반환) */
export function getServiceName(key: string): string {
  return serviceMap.get(key)?.name ?? key;
}

/** 가입 가능한 서비스 목록 */
export function getJoinableServices(): O4OService[] {
  return O4O_SERVICES.filter(s => s.joinEnabled);
}

/** 모든 서비스 키 목록 */
export function getAllServiceKeys(): string[] {
  return O4O_SERVICES.map(s => s.key);
}
