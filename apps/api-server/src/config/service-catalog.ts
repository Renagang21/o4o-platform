/**
 * O4O Platform Service Catalog
 *
 * WO-O4O-SERVICE-CATALOG-FOUNDATION-V1
 * 플랫폼 서비스 식별 정보의 단일 소스 (Single Source of Truth)
 *
 * 사용처:
 * - /check-email API 응답
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

import { resolveCanonicalServiceKey } from '@o4o/security-core';

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

/**
 * 매장 축이 없고 **운영자 업무 공간만** 있는 서비스의 자격.
 *
 * 같은 세 값이 다섯 서비스에 그대로 반복돼 있었다(`lecture` · `kpa-branch` · `cafe24-b2b` ·
 * `community` · `supplier` · `funding`). 리터럴을 늘어놓으면 한 곳만 고쳐 어긋나기 쉽고,
 * "이 조합이 무엇을 뜻하는지" 가 이름으로 드러나지 않는다.
 */
export const OPERATOR_ONLY_WORKSPACE: Readonly<ServiceWorkspaceCapability> = Object.freeze({
  workspaceMode: 'none',
  storeWorkspaceEnabled: false,
  operatorWorkspaceEnabled: true,
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
  /**
   * 서비스 도메인 — **canonical**. 새로 만드는 모든 URL(handoff · QR · 공개 랜딩 · 메일 링크)의 호스트.
   */
  domain: string;
  /**
   * 옛 호스트 — **수용 전용 (optional)**. WO-O4O-SERVICE-CATALOG-CANONICAL-DOMAIN-AND-PH-JOIN-CLEANUP-V1
   *
   *   canonical 로 옮긴 뒤에도 인쇄 QR · 외부 링크 · 북마크 때문에 같은 앱이 계속 서빙하는 호스트다.
   *   **요청이 들어왔을 때 어느 서비스인지 판정하는 데만 쓴다**(`session-origin`).
   *   URL 생성에는 쓰지 않는다 — `getServiceOrigin` · `getServicePublicOrigin` 은 `domain` 만 본다.
   *   여기서 빼는 것은 그 호스트의 로그인 세션 귀속을 끊는 일이므로 DNS · LB 정리와 같은 별도 WO 에서 한다.
   */
  legacyDomains?: readonly string[];
  /**
   * 공개 진입 경로 prefix (optional — 미지정 시 host 루트).
   *
   * WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
   *   **자기 host 를 갖지 않고 다른 서비스 host 의 path 아래에서** 서빙되는 서비스를 표현한다
   *   (종전 kpa-branch = kpa-society.co.kr/kpa. WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1
   *   로 kpa.neture.co.kr 로 옮겨 현재 이 값을 쓰는 서비스는 없다 — 응답 계약 `basePath: ''` 는 유지). `domain` 은 언제나 순수 hostname 으로 유지하고
   *   (CORS origin·쿠키 도메인 판정이 hostname 을 전제한다), 경로는 여기에만 둔다.
   *   반드시 '/' 로 시작하고 trailing '/' 는 두지 않는다.
   */
  basePath?: string;
  /** 서비스 설명 */
  description: string;
  /** 가입 가능 여부 */
  joinEnabled: boolean;
  /**
   * 로그인 자격 게이트 (optional — 미지정 = false). WO-O4O-SERVICE-NOT-MEMBER-AUTH-CONTRACT-RESTORATION-V1
   *
   *   true 면 이 서비스 호스트에서의 로그인은 **인증 성공 뒤** 이 서비스의 `service_memberships` row(상태 불문)를
   *   요구하고, 없으면 세션을 발급하지 않고 `SERVICE_NOT_MEMBER` 로 응답한다(`service-login-eligibility.policy`).
   *   **가입 신청이 그 서비스 호스트 밖에서 이뤄지는 서비스만** true 로 둔다 — 자기 호스트에서 로그인한 뒤
   *   신청하는 서비스(대표 진입 · `/join` · 로그인 후 신청)를 막으면 신규 사용자가 가입할 길이 사라진다.
   *   다른 서비스와 공유하는 호스트(두 서비스의 domain · legacyDomains 가 겹치는 호스트)에서는 판정하지 않는다.
   */
  loginMembershipRequired?: boolean;
  /**
   * Neture 세미프랜차이즈 이용 자격 (optional). WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1
   *
   *   값(세미프랜차이즈 key)이 있으면 이 서비스의 직접 로그인 게이트와 handoff 는 이 서비스 membership 이 없어도
   *   **내 매장(약국) 신청 active ∧ 이 세미프랜차이즈 가입 active** 인 약국 조직의 owner/admin/manager 를 통과시킨다
   *   (`modules/neture-pharmacy/services/semi-franchise-service-access`).
   *
   *   **독립 자격**: 이 서비스 membership 과 Neture 가입은 서로 독립이다.
   *     - 이 서비스 membership 이 active 가 아니면(없음 · pending · suspended · withdrawn 모두) Neture 자격을 따로 본다.
   *       이 서비스 가입의 정지 · 탈퇴가 Neture 자격을 정지시키지 않는다.
   *     - Neture 자격은 이 서비스 membership · role 을 만들거나 바꾸지 않는다 — 이 서비스 회원 전용 권한
   *       (membership active · `kpa:*` role 을 요구하는 backend 경로)은 Neture 자격으로 열리지 않는다.
   *     - 플랫폼 계정 자체의 정지 · 비활성 차단은 이 판정보다 먼저 적용된다(requireAuth · `user.isActive`).
   */
  semiFranchiseAccessKey?: string;
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
    // WO-O4O-SERVICE-CATALOG-CANONICAL-DOMAIN-AND-PH-JOIN-CLEANUP-V1: 로그인 전 진입(대표 홈)과 같은 호스트로 정렬.
    domain: 'pharmacy.neture.co.kr',
    legacyDomains: ['kpa-society.co.kr'],
    // 사업 의미 = 약국 사업자 대상 세미프랜차이즈 운영 서비스 (docs/baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md).
    //   role prefix `kpa:*` 는 이 키의 legacy 이름이며 KPA 분회(`kpa-branch` · kpa.neture.co.kr)가 아니다.
    //   WO-O4O-STORE-OWNER-RBAC-AND-SERVICE-SEMANTICS-FINAL-ALIGNMENT-V1: description 을 정본 의미로 맞췄다.
    //   종전 '약사 커뮤니티 서비스' 는 이 서비스 **안의 포럼**(약사 커뮤니티)을 서비스 전체 설명으로 쓴 것이라,
    //   약국 사업자 대상 운영 서비스라는 현재 의미와 어긋났다. 커뮤니티 자체의 이름은 community-catalog 가 따로 갖는다.
    description: '약국 사업자 매장 운영 서비스',
    joinEnabled: true,
    // 이 호스트 밖에서 이용 자격이 생긴다 — 미자격 사용자에게 이 호스트 세션을 주지 않는다.
    //   Neture 약국은 store.neture.co.kr 에서 내 매장(약국) 신청 · pharmacy 세미프랜차이즈 가입을 신청하며 kpa-society
    //   service_membership 은 생기지 않는다(DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §17) → 아래 semiFranchiseAccessKey.
    loginMembershipRequired: false,
    semiFranchiseAccessKey: 'pharmacy',
    // STANDARD_CANDIDATE — 매장 linkage(kpa) · kpa:store_owner · kpa:operator 가 현재 runtime 에 있다. 자동 활성화 아님.
    workspace: { workspaceMode: 'standard', storeWorkspaceEnabled: true, operatorWorkspaceEnabled: true },
  },
  {
    key: 'k-cosmetics',
    name: 'K-Cosmetics',
    // WO-O4O-SERVICE-CATALOG-CANONICAL-DOMAIN-AND-PH-JOIN-CLEANUP-V1: 로그인 전 진입(대표 홈)과 같은 호스트로 정렬.
    domain: 'retail.neture.co.kr',
    legacyDomains: ['k-cosmetics.site'],
    // 사업 의미 = 화장품 · 일반 소매 사업자 대상 세미프랜차이즈 운영 서비스 (O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1).
    description: '화장품 유통 플랫폼',
    // 운영 종료(WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1) — 신규 가입 · 매장/운영자 업무공간 진입을 닫는다.
    //   row 는 retired identity 로 남긴다: serviceKey · cosmetics:* role · 기존 membership · DB 는 후속 정리 대상(이번 범위 밖).
    joinEnabled: false,
    loginMembershipRequired: false,
    workspace: { workspaceMode: 'standard', storeWorkspaceEnabled: false, operatorWorkspaceEnabled: false },
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
   *
   * WO-O4O-SERVICE-CATALOG-CANONICAL-DOMAIN-AND-PH-JOIN-CLEANUP-V1:
   *   joinEnabled true → false. 약국은 KPA Society(pharmacy.neture.co.kr)로 들어가며 Pharmacy-Hub 를
   *   별도 신규 가입 서비스로 제시하지 않는다(대표 홈 「가입 가능한 서비스」 · 범용 `/auth/services/:key/join`).
   *   기존 membership · handoff(active 판정) · 서비스 자체 route(`/api/v1/pharmacy-hub/*`)는 이 값을 보지 않으므로 그대로다.
   *   domain 도 바꾸지 않는다 — 신규 canonical 호스트가 정해지지 않았다.
   */
  {
    key: 'pharmacy-hub',
    name: 'Pharmacy-Hub',
    nameKo: '파머시 허브',
    domain: 'pharmacyhub.co.kr',
    description: '약국 경영자·공급자 직접 연결 약국 전문 서비스',
    joinEnabled: false,
    // STANDARD_CANDIDATE — 매장 linkage(pharmacy-hub) · pharmacy-hub:store_owner · pharmacy-hub:operator 존재. 자동 활성화 아님.
    workspace: { workspaceMode: 'standard', storeWorkspaceEnabled: true, operatorWorkspaceEnabled: true },
  },
  /**
   * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 — Phase 1 Foundation
   *
   * 독립 O4O 강의 서비스. URL 은 Neture 브랜드 하위 도메인을 사용하지만
   * Service Identity / membership / role / runtime 은 neture 와 완전히 분리한다.
   * 일반 학습자는 role 없이 service_memberships(service_key='lecture') 로 판정하며,
   * 가입 UX·약관 게시가 준비되기 전까지 joinEnabled=false 로 둔다.
   */
  {
    key: 'lecture',
    name: 'O4O 강의',
    nameKo: 'O4O 강의',
    domain: 'study.neture.co.kr',
    description: '강의·학습·평가·수료를 제공하는 O4O 학습 서비스',
    joinEnabled: false,
    workspace: OPERATOR_ONLY_WORKSPACE,
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
   *   WO-O4O-SERVICE-CATALOG-CANONICAL-DOMAIN-AND-PH-JOIN-CLEANUP-V1: kpa-society 가 pharmacy.neture.co.kr 로
   *   옮길 때 이 항목은 DEFERRED 였다(handoff · 분회 slug 해석을 함께 바꿔야 했다).
   *
   * WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1:
   *   canonical = `https://kpa.neture.co.kr/{branchSlug}` (basePath 없음 · 앱은 root 진입을 이미 판정한다).
   *   handoff · 공개 URL · 세션 귀속(로그인 · 로그아웃 범위)이 모두 이 domain 하나에서 나온다.
   *   옛 공용 경로 `kpa-society.co.kr/kpa/*` 는 `legacyDomains` 에 넣지 **않는다** — 그 호스트의 루트는
   *   kpa-society(약국 사업자 서비스) 앱이고 세션 판정은 path 를 보지 않는다. 대신 분회 앱이 그 경로로
   *   들어온 방문을 canonical 호스트로 옮긴다(web-kpa-branch `lib/canonicalHost`) — 옛 경로에서 로그인하면
   *   세션이 kpa-society 로 귀속되기 때문이다.
   * platform_services row 는 20270305000000-SeedKpaBranchServiceAndRoles 에서 seed 한다.
   * joinEnabled=false — 분회 소속은 자가 신청이 아니라 분회 운영자 승인 경로로만 생성된다.
   */
  {
    // 사업 의미 = 약사 개인 대상 KPA 분회 서비스 (O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1). 매장 서비스가 아니다.
    key: 'kpa-branch',
    name: 'KPA Branch',
    nameKo: '약사회 분회',
    domain: 'kpa.neture.co.kr',
    description: '약사회 분회 홈페이지 및 분회 회원 관리 서비스',
    joinEnabled: false,
    // NO_STORE_WORKSPACE — tenant 축이 organization_service_enrollments 가 아니라 kpa_organizations · branch_memberships 다.
    // 매장 linkage 없음. kpa-branch:operator Operator Workspace 는 존재.
    workspace: OPERATOR_ONLY_WORKSPACE,
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
  /**
   * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3 — 커뮤니티 서비스.
   *
   * 주소는 **`community.neture.co.kr` 독립 서비스**다. 같은 `neture-web` 을 서빙하지만
   * (Cloud Run 서비스를 서브도메인 수만큼 만들지 않는다) 주소와 권한 경계는 독립이다.
   * 호스트 라우팅은 이미 `services/web-neture/src/lib/hostProfile.ts` 가 갖고 있고
   * `community` 프로필의 `/` 가 진입이므로 `basePath` 를 두지 않는다.
   * 개별 커뮤니티는 그 아래 개체(`communities.slug`)다.
   *
   * joinEnabled=false — **서비스 단위 자가 가입 경로를 열지 않는다.** 가입은 개별 커뮤니티
   * 단위(승인형 하나)이고, `service_memberships('community')` 는 그 승인의 **결과로** 생긴다
   * (community-lifecycle.service ensureServiceMembership). 여기를 true 로 두면 범용
   * `POST /auth/services/community/join` 이 어느 커뮤니티에도 승인받지 않은 사람에게
   * 서비스 진입 자격을 주어 개별 승인을 우회한다.
   *
   * platform_services row 는 seed 하지 않는다 — 런타임이 그 표를 읽지 않으며 `lecture` 도
   * 같은 상태다. 데이터 전용 migration 은 스키마 지문이 직전 상태와 같아져 C22 에 걸린다.
   */
  {
    key: 'community',
    name: 'O4O Community',
    nameKo: '커뮤니티',
    domain: 'community.neture.co.kr',
    description: '직역·관심 단위로 정보와 경험을 나누는 커뮤니티 서비스',
    joinEnabled: false,
    // 매장 축 없음. community:admin/operator 서비스 Operator Workspace는 존재.
    workspace: OPERATOR_ONLY_WORKSPACE,
  },
  /**
   * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4 — 공급자 서비스.
   *
   * **사업자 본인의 접근 경계가 아니다.** 공급자 사업자는
   * `organization_members(role=owner) → organizations(type='supplier') → neture_suppliers`
   * 로 판정하며 그것이 canonical authorization 이고 FROZEN 이다
   * (O4O-SUPPLIER-DOMAIN-BOUNDARY-V1 §7 — 이 WO 는 건드리지 않았다).
   * 이 키는 **그 영역을 운영하는 쪽**의 범위다: 공급자 심사·정지·서류 확인.
   * 두 축은 서로 다른 질문에 답하므로 인가 축이 둘로 갈라지는 것이 아니다.
   *
   * joinEnabled=false — 공급자 입점은 서비스 가입 신청이 아니라 조직 기반 심사다.
   * 같은 `neture-web` 을 서빙하며 호스트 라우팅은 `hostProfile.ts` 의 `supplier` 프로필이 갖는다.
   */
  {
    key: 'supplier',
    name: 'O4O Supplier',
    nameKo: '공급자',
    domain: 'supplier.neture.co.kr',
    description: '제품을 등록하고 매장에 공급하는 공급자 서비스',
    joinEnabled: false,
    workspace: OPERATOR_ONLY_WORKSPACE,
  },
  /**
   * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4 — 유통참여형 펀딩.
   *
   * 「유통참여형 펀딩」은 플랫폼 공통 제품명(market-trial)이고, 이 키는 그 **서브도메인
   * 운영자 범위**다. 종전에는 `neture:operator` 하나가 이 영역까지 열었다.
   * 같은 `neture-web` 을 서빙하며 호스트 라우팅은 `hostProfile.ts` 의 `funding` 프로필이 갖는다.
   */
  {
    key: 'funding',
    name: 'O4O Funding',
    nameKo: '유통참여형 펀딩',
    domain: 'funding.neture.co.kr',
    description: '매장이 신제품 유통에 참여해 함께 검증하는 펀딩 서비스',
    joinEnabled: false,
    workspace: OPERATOR_ONLY_WORKSPACE,
  },
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
 *   메일 링크(이메일 인증 · 운영자 초대)와 handoff 의 base URL 을 server 측에서
 *   serviceKey 로 결정한다. 클라이언트가 serviceUrl 을 제공하지 않아도 production URL 이 보장된다.
 *   (WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 비밀번호 재설정 메일 소비처는 은퇴했다.)
 */
export function getServiceOrigin(key: string): string | undefined {
  const svc = serviceMap.get(key);
  if (!svc) return undefined;
  // WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
  //   basePath 를 가진 서비스는 host 루트가 다른 서비스이므로 base URL 에 prefix 를 포함해야
  //   링크가 자기 앱으로 떨어진다. (kpa-branch 는 kpa.neture.co.kr 로 옮겨 현재 basePath 소비자 없음.)
  return `https://${svc.domain}${svc.basePath ?? ''}`;
}

/**
 * 역할 접두 키(`kpa` · `cosmetics`)까지 받아 공식 공개 origin 을 돌려준다.
 *   QR · 공개 랜딩 URL 을 서버가 만들 때 쓴다. 호스트를 파일마다 따로 적으면
 *   카탈로그와 어긋난다(예: 존재하지 않는 `cosmetics.neture.co.kr` — CHECK-O4O-URL-FIRST-CENSUS-V1 §7-1).
 */
export function getServicePublicOrigin(key: string): string | undefined {
  return getServiceOrigin(resolveCanonicalServiceKey(key));
}
