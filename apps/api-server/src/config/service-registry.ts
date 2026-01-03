/**
 * Service Registry
 *
 * Hard Cleanup v1: 실제 운영 중인 서비스만 등록
 *
 * 플랫폼에서 운영되는 모든 서비스(웹 채널)를 정의합니다.
 * 이 레지스트리를 통해:
 * - 서비스 존재 여부 확인
 * - 요청별 서비스 컨텍스트 분리
 * - 로그/모니터링 분리
 * - 권한 스코프 관리
 */

/**
 * 서비스 채널 타입
 */
export type ServiceChannelType = 'web' | 'api' | 'admin' | 'mobile';

/**
 * 서비스 상태
 */
export type ServiceStatus = 'active' | 'development' | 'planned' | 'deprecated';

/**
 * 서비스 정의
 */
export interface ServiceDefinition {
  /** 서비스 고유 코드 */
  code: string;
  /** 서비스 표시 이름 */
  name: string;
  /** 서비스 설명 */
  description: string;
  /** 채널 타입 */
  channelType: ServiceChannelType;
  /** 연결된 도메인 (있는 경우) */
  domain?: string;
  /** API prefix */
  apiPrefix: string;
  /** 서비스 상태 */
  status: ServiceStatus;
  /** 전용 API 존재 여부 */
  hasDedicatedApi: boolean;
  /** 등록일 */
  registeredAt: string;
}

/**
 * 등록된 서비스 목록
 *
 * Hard Cleanup v1: 실제 운영 중인 서비스만 등록
 * - glycopharm: 약국 디스플레이/포럼 서비스
 * - glucoseview: 혈당 모니터링 서비스
 * - neture: B2C 대표 서비스
 * - kpa-society: 약사회 SaaS 서비스
 * - cosmetics: 화장품 도메인 서비스
 *
 * 제거됨:
 * - k-cosmetics: 웹만 존재, API 없음 (재설계 필요 시 재등록)
 * - k-shopping: 전면 제거 (Hard Cleanup v1)
 */
export const SERVICE_REGISTRY: Record<string, ServiceDefinition> = {
  /**
   * 글라이코팜 - 약국 디스플레이/포럼 서비스
   */
  glycopharm: {
    code: 'glycopharm',
    name: 'GlycoPharm',
    description: '약국 디스플레이 및 포럼 서비스',
    channelType: 'web',
    domain: 'glycopharm.co.kr',
    apiPrefix: '/api/v1/glycopharm',
    status: 'active',
    hasDedicatedApi: true,
    registeredAt: '2024-12-01',
  },

  /**
   * 글루코스뷰 - 혈당 모니터링 서비스
   */
  glucoseview: {
    code: 'glucoseview',
    name: 'GlucoseView',
    description: '혈당 모니터링 및 관리 서비스',
    channelType: 'web',
    domain: 'glucoseview.co.kr',
    apiPrefix: '/api/v1/glucoseview',
    status: 'active',
    hasDedicatedApi: true,
    registeredAt: '2024-12-01',
  },

  /**
   * 네처 - B2C 대표 서비스
   */
  neture: {
    code: 'neture',
    name: 'Neture',
    description: 'B2C 대표 서비스 (상품/파트너 관리)',
    channelType: 'web',
    domain: 'neture.co.kr',
    apiPrefix: '/api/v1/neture',
    status: 'active',
    hasDedicatedApi: true,
    registeredAt: '2024-12-01',
  },

  /**
   * KPA Society - 약사회 SaaS 서비스
   */
  'kpa-society': {
    code: 'kpa-society',
    name: 'KPA Society',
    description: '약사회 SaaS 서비스',
    channelType: 'web',
    domain: 'kpa-society.co.kr',
    apiPrefix: '/api/v1/kpa',
    status: 'active',
    hasDedicatedApi: true,
    registeredAt: '2024-12-01',
  },

  /**
   * Cosmetics - 화장품 도메인 서비스
   */
  cosmetics: {
    code: 'cosmetics',
    name: 'Cosmetics',
    description: '화장품 상품/브랜드/파트너 관리',
    channelType: 'api',
    apiPrefix: '/api/v1/cosmetics',
    status: 'active',
    hasDedicatedApi: true,
    registeredAt: '2024-12-01',
  },
};

/**
 * 서비스 코드로 서비스 정의 조회
 */
export function getService(code: string): ServiceDefinition | undefined {
  return SERVICE_REGISTRY[code];
}

/**
 * 서비스 존재 여부 확인
 */
export function isRegisteredService(code: string): boolean {
  return code in SERVICE_REGISTRY;
}

/**
 * 활성 서비스 목록 조회
 */
export function getActiveServices(): ServiceDefinition[] {
  return Object.values(SERVICE_REGISTRY).filter(
    (s) => s.status === 'active' || s.status === 'development'
  );
}

/**
 * 전용 API가 있는 서비스 목록
 */
export function getServicesWithDedicatedApi(): ServiceDefinition[] {
  return Object.values(SERVICE_REGISTRY).filter((s) => s.hasDedicatedApi);
}

/**
 * 도메인으로 서비스 조회
 */
export function getServiceByDomain(domain: string): ServiceDefinition | undefined {
  return Object.values(SERVICE_REGISTRY).find((s) => s.domain === domain);
}
