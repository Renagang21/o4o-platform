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
 * - 서비스 이동 handoff (`POST /auth/handoff` · `/auth/handoff/exchange`)
 * - O4O 대표 진입(neture.co.kr) 로그인 예외 (`REPRESENTATIVE_ENTRY_SERVICE_KEY`)
 * - Service Workspace 자격 metadata (`workspace`) — WO-O4O-SERVICE-TENANT-FOUNDATION-V1
 *
 * WO-O4O-SERVICE-TENANT-FOUNDATION-V1 — Service Identity ≠ Service Workspace
 *   이 배열의 `key` 가 **Service Identity 의 canonical 집합**이다 (`platform_services.code` 와
 *   1:1 · role prefix 별칭 `kpa` / `cosmetics` 는 `@o4o/security-core` 의
 *   `resolveCanonicalServiceKey` 로 여기 키에 흡수된다 — 독립 서비스가 아니다).
 *   Service Workspace(My Services 노출) 자격은 identity 와 **별도 축**이며 `workspace` 에만 둔다.
 *   `platform_services.service_type`(community | tool | extension) 은 카탈로그 분류 축이고
 *   Workspace 자격이 아니다 — 두 축을 서로 유도하지 않는다.
 */

/**
 * Service Workspace(매장 · 운영자용 서비스 업무공간) 의 노출 방식 — WO-O4O-SERVICE-TENANT-FOUNDATION-V1
 *
 *   'standard'  : My Services 의 표준 Service Workspace 후보 (STANDARD_CANDIDATE). **자동 활성화가 아니다.**
 *   'special'   : 표준 Workspace 로 다루지 않는 서비스 (대표 진입 · 통합 축 등 별도 화면).
 *   'none'      : 매장 대상 Service Workspace 가 없다 (예: 분회 tenant 축).
 *   'undecided' : 현재 코드에 판정 근거가 없어 미정. 사업 판단 전까지 노출하지 않는다.
 *
 * 이 값은 **기술 분류(현재 runtime 의 근거)** 이지 사업 노출 정책·권한이 아니다. 접근 권한은
 * 각 서비스의 scope guard · membership · organization_members 가 그대로 판정한다.
 */
export type ServiceWorkspaceMode = 'standard' | 'special' | 'none' | 'undecided';

export interface ServiceWorkspaceCapability {
  workspaceMode: ServiceWorkspaceMode;
  /** 매장(organization)이 enrollment 를 통해 이 서비스의 Store-facing Workspace 를 가질 수 있는가 */
  storeWorkspaceEnabled: boolean;
  /** `{prefix}:operator` / `{prefix}:admin` 이 운영하는 Operator Workspace 가 현재 존재하는가 */
  operatorWorkspaceEnabled: boolean;
}

/** 근거 없는 서비스의 기본값. 카탈로그에 `workspace` 를 적지 않으면 이 값으로 읽힌다. */
export const UNDECIDED_SERVICE_WORKSPACE: Readonly<ServiceWorkspaceCapability> = Object.freeze({
  workspaceMode: 'undecided',
  storeWorkspaceEnabled: false,
  operatorWorkspaceEnabled: false,
});

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
  /**
   * 공개 진입 경로 prefix (optional — 미지정 시 host 루트).
   *
   * WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
   *   kpa-branch 처럼 **자기 host 를 갖지 않고 다른 서비스 host 의 path 아래에서**
   *   서빙되는 서비스를 표현한다. `domain` 은 언제나 순수 hostname 으로 유지하고
   *   (CORS origin·쿠키 도메인 판정이 hostname 을 전제한다), 경로는 여기에만 둔다.
   *   반드시 '/' 로 시작하고 trailing '/' 는 두지 않는다.
   */
  basePath?: string;
  /** 서비스 설명 */
  description: string;
  /** 가입 가능 여부 */
  joinEnabled: boolean;
  /**
   * Service Workspace 자격 metadata (optional — 미지정 시 `UNDECIDED_SERVICE_WORKSPACE`).
   * WO-O4O-SERVICE-TENANT-FOUNDATION-V1. 단일 출처 — 서비스별 `if (serviceKey === ...)` 분기 금지.
   */
  workspace?: ServiceWorkspaceCapability;
}

export const O4O_SERVICES: O4OService[] = [
  {
    key: 'neture',
    name: 'Neture',
    domain: 'neture.co.kr',
    description: 'O4O 공급자 및 유통 플랫폼',
    joinEnabled: true,
    // SPECIAL — O4O 대표 진입(REPRESENTATIVE_ENTRY_SERVICE_KEY) · 공급자 축. 매장 identity 축이 없다
    // (`STORE_SERVICE_ORG_LINKAGE` 미등재 → WorkScope STORE_IDENTITY_NOT_SUPPORTED). 운영자 scope 는 존재.
    workspace: { workspaceMode: 'special', storeWorkspaceEnabled: false, operatorWorkspaceEnabled: true },
  },
  {
    key: 'kpa-society',
    name: 'KPA Society',
    domain: 'kpa-society.co.kr',
    description: '약사 커뮤니티 서비스',
    joinEnabled: true,
    // STANDARD_CANDIDATE — 매장 linkage(kpa) · kpa:store_owner · kpa:operator 가 현재 runtime 에 있다. 자동 활성화 아님.
    workspace: { workspaceMode: 'standard', storeWorkspaceEnabled: true, operatorWorkspaceEnabled: true },
  },
  {
    key: 'k-cosmetics',
    name: 'K-Cosmetics',
    domain: 'k-cosmetics.site',
    description: '화장품 유통 플랫폼',
    joinEnabled: true,
    // STANDARD_CANDIDATE — 매장 linkage(cosmetics) · cosmetics:store_owner · cosmetics:operator 존재. 자동 활성화 아님.
    workspace: { workspaceMode: 'standard', storeWorkspaceEnabled: true, operatorWorkspaceEnabled: true },
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
    // STANDARD_CANDIDATE — 매장 linkage(pharmacy-hub) · pharmacy-hub:store_owner · pharmacy-hub:operator 존재. 자동 활성화 아님.
    workspace: { workspaceMode: 'standard', storeWorkspaceEnabled: true, operatorWorkspaceEnabled: true },
  },
  /**
   * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
   *
   * KPA Branch (약사회 분회) — 209개 분회를 동급 tenant 로 두는 분회 홈페이지 SaaS.
   * domain 은 플랫폼 기본 호스트다. 분회 자체 도메인은 branch_domains 로 연결하며
   * 분회별 별도 배포·별도 백엔드는 만들지 않는다.
   *
   * WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
   *   공용 공개 URL 은 별도 서브도메인이 아니라 `https://kpa-society.co.kr/kpa/{branchSlug}` 다
   *   (LB `o4o-global-lb` / path-matcher-kpa-society 의 `/kpa`·`/kpa/*` pathRule).
   *   따라서 domain=kpa-society.co.kr + basePath=/kpa 로 표현한다.
   *   `/kpa` 는 URL prefix 일 뿐 tenant 가 아니다 — 분회는 slug 또는 Host 로만 해석한다.
   * platform_services row 는 20270305000000-SeedKpaBranchServiceAndRoles 에서 seed 한다.
   * joinEnabled=false — 분회 소속은 자가 신청이 아니라 분회 운영자 승인 경로로만 생성된다.
   */
  {
    key: 'kpa-branch',
    name: 'KPA Branch',
    nameKo: '약사회 분회',
    domain: 'kpa-society.co.kr',
    basePath: '/kpa',
    description: '약사회 분회 홈페이지 및 분회 회원 관리 서비스',
    joinEnabled: false,
    // NO_STORE_WORKSPACE — tenant 축이 organization_service_enrollments 가 아니라 kpa_organizations · branch_memberships 다.
    // 매장 linkage 없음. kpa-branch:operator Operator Workspace 는 존재.
    workspace: { workspaceMode: 'none', storeWorkspaceEnabled: false, operatorWorkspaceEnabled: true },
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
    // UNDECIDED — 회원은 Cafe24 로그인 전용(O4O 세션 회원 아님 · 대표 홈 STORE_CAPABLE_SERVICES 제외) 이고
    // cafe24-b2b:operator role 이 없다. My Services 노출은 사업·통합 판단 후 별도 WO.
    workspace: { workspaceMode: 'undecided', storeWorkspaceEnabled: false, operatorWorkspaceEnabled: false },
  },
];

/**
 * O4O 대표 진입 서비스 키 — WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1
 *
 * neture.co.kr 은 O4O 전체의 대표 진입 화면이다. 다른 O4O 서비스 회원(service_memberships
 * row 보유자)은 Neture membership 이 없어도 이 키로 로그인해 대표 홈에 도달할 수 있어야 한다.
 * 이 예외는 **로그인 허용**에만 적용되며 Neture 역할·membership 을 만들거나 부여하지 않는다
 * (서비스별 권한 판정은 기존 scope guard 가 그대로 담당한다).
 */
export const REPRESENTATIVE_ENTRY_SERVICE_KEY = 'neture';

/** 서비스 키 → O4OService 조회 */
const serviceMap = new Map(O4O_SERVICES.map(s => [s.key, s]));

/** 서비스 키로 서비스 정보 조회 */
export function getService(key: string): O4OService | undefined {
  return serviceMap.get(key);
}

/**
 * 서비스 키 → Service Workspace 자격 (canonical key 기준. 별칭·미등록 키는 UNDECIDED).
 * WO-O4O-SERVICE-TENANT-FOUNDATION-V1 — Workspace 자격의 단일 읽기 지점.
 */
export function getServiceWorkspaceCapability(key: string): ServiceWorkspaceCapability {
  return serviceMap.get(key)?.workspace ?? UNDECIDED_SERVICE_WORKSPACE;
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

/**
 * 모든 서비스의 공식 origin (https://domain) 목록 — WO-O4O-DOMAIN-SSOT-CANONICALIZATION-V1
 *
 * origin 은 scheme+host 다. basePath 는 origin 의 일부가 아니므로 여기에 붙이지 않는다
 * (CORS / 화이트리스트 판정 축). base URL 이 필요하면 `getServiceOrigin` 을 쓴다.
 */
export function getServiceOrigins(): string[] {
  return Array.from(new Set(O4O_SERVICES.map(s => `https://${s.domain}`)));
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
  if (!svc) return undefined;
  // WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
  //   basePath 를 가진 서비스(kpa-branch)는 host 루트가 다른 서비스이므로
  //   base URL 에 prefix 를 포함해야 링크가 자기 앱으로 떨어진다.
  return `https://${svc.domain}${svc.basePath ?? ''}`;
}
