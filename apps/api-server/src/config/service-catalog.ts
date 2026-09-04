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
  /**
   * 한글 표시 이름 (optional — 미지정 시 name 사용).
   * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1 에서 추가. 기존 서비스는 미지정으로 동작 불변.
   */
  nameKo?: string;
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
  /**
   * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
   *
   * Pharmacy-Hub (파머시 허브) — 공급자와 약국 경영자를 직접 연결하는 O4O 약국 전문 서비스.
   *
   * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1:
   *   joinEnabled false → true. 가입 신청 write-path(POST /api/v1/pharmacy-hub/join)와
   *   운영자 승인 콘솔(/api/v1/pharmacy-hub/operator/memberships)이 연결되었다.
   *   platform_services row 는 20270216000000-SeedPharmacyHubServiceAndRoles 에서 seed 한다.
   */
  {
    key: 'pharmacy-hub',
    name: 'Pharmacy-Hub',
    nameKo: '파머시 허브',
    domain: 'pharmacyhub.co.kr',
    description: '약국 경영자·공급자 직접 연결 약국 전문 서비스',
    joinEnabled: true,
  },
  /**
   * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
   *
   * KPA Branch (약사회 분회) — 209개 분회를 동급 tenant 로 두는 분회 홈페이지 SaaS.
   * domain 은 플랫폼 기본 호스트다. 분회 자체 도메인은 branch_domains 로 연결하며
   * 분회별 별도 배포·별도 백엔드는 만들지 않는다.
   * platform_services row 는 20270305000000-SeedKpaBranchServiceAndRoles 에서 seed 한다.
   * joinEnabled=false — 분회 소속은 자가 신청이 아니라 분회 운영자 승인 경로로만 생성된다.
   */
  {
    key: 'kpa-branch',
    name: 'KPA Branch',
    nameKo: '약사회 분회',
    domain: 'branch.kpa-society.co.kr',
    description: '약사회 분회 홈페이지 및 분회 회원 관리 서비스',
    joinEnabled: false,
  },
  /**
   * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1
   *
   * Cafe24 B2B — Cafe24 B2B 사업자의 거래처 매장에 O4O 매장 판매지원(설명서·QR·태블릿·
   * 사이니지)을 제공하는 서비스. 회원은 **Cafe24 회원 로그인만으로** 진입하며 O4O 자체
   * 가입 경로가 없다. 따라서 joinEnabled=false 이고 이 키는 /check-email·가입 UX 에
   * 노출되지 않는다. domain 은 플랫폼 기본 호스트다 (별도 배포 없음).
   * platform_services row 는 20270322000000-CreateCafe24MemberLinksAndSeedCafe24B2bService.
   */
  {
    key: 'cafe24-b2b',
    name: 'Cafe24 B2B',
    nameKo: 'Cafe24 B2B 매장 지원',
    domain: 'neture.co.kr',
    description: 'Cafe24 B2B 사업자의 거래처 매장 판매지원 서비스',
    joinEnabled: false,
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

/** 모든 서비스의 공식 origin (https://domain) 목록 — WO-O4O-DOMAIN-SSOT-CANONICALIZATION-V1 */
export function getServiceOrigins(): string[] {
  return O4O_SERVICES.map(s => `https://${s.domain}`);
}

/**
 * 서비스 키 → 공식 origin (`https://{domain}`).
 * 모르는 키면 undefined.
 *
 * WO-O4O-PASSWORD-RESET-EMAIL-LINK-PRODUCTION-URL-FIX-V1:
 *   비밀번호 재설정 이메일의 base URL 을 server 측에서 serviceKey 로 결정하기 위한 helper.
 *   클라이언트가 serviceUrl 을 제공하지 않더라도 production URL 이 보장된다.
 */
export function getServiceOrigin(key: string): string | undefined {
  const svc = serviceMap.get(key);
  return svc ? `https://${svc.domain}` : undefined;
}
