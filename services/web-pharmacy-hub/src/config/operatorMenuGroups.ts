/**
 * Pharmacy-Hub Operator Menu Items
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * KPA-Society / K-Cosmetics 와 동일한 계약을 따른다:
 *   UNIFIED_MENU (서비스별 정의) + filterMenuByRole(@o4o/ui) + DomainIASidebar(@o4o/operator-ux-core).
 * 서비스 전용 Sidebar 사본을 만들지 않는다.
 *
 * 노출 범위:
 *   route 없는 메뉴는 노출하지 않는다 (CLAUDE.md §1 Shared Module Change Rule — 데드링크 0).
 *   여기 있는 모든 항목은 App.tsx 에 실 route 와 실 화면이 있고, backend 가 연결돼 있다.
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
 *   커뮤니티(포럼) 운영 5화면 · 회원 관리 · 운영 분석 · 역할 관리를 공통 Core 채택으로 추가.
 *   매장 HUB / 상품 / 주문 / 이벤트 오퍼 / 공급 상품 운영은 Pharmacy-Hub 운영자 축에 두지
 *   않는다 (WO 명시 제외 대상).
 *
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1 (2026-09-16):
 *   Pharmacy-Hub 는 표준 Service Operator(STANDARD_CANDIDATE) — 서비스 전용 도메인 IA
 *   (가입·회원 운영 / 커뮤니티 운영 / 운영 공통)를 은퇴하고 @o4o/operator-ux-core DEFAULT_OPERATOR_DOMAIN_IA
 *   (서비스 운영 / 사업 운영 / 운영 관리)를 그대로 쓴다. 사업 운영 항목이 없으므로 그 도메인은 비어 있어
 *   노출되지 않는다 (REAL_SERVICE_DIFFERENCE — 운영자는 거래에 개입하지 않는다).
 *   `Supplier → Service Operator` 제공 콘텐츠 수신함(/operator/supplier-contents) 진입 추가.
 */

import type { OperatorGroupKey, UnifiedMenuItem } from '@o4o/ui';

// ─── Unified Menu ─────────────────────────────────────────────

export const UNIFIED_MENU: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>> = {
  // WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1:
  //   /operator 가 RoleEntryPage placeholder 에서 실제 대시보드(OperatorDashboardPage)로
  //   교체되어 데드링크가 아니게 되었으므로 KPA/KCos/Neture 와 동일하게 대시보드 항목을 노출한다.
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  // 가입 신청 관리 = service_memberships 승인/반려 (MEMBERSHIP_APPROVAL capability).
  // 실제 권한 경계는 backend pharmacy-hub:operator scope guard 가 강제한다.
  // WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1: 가입 신청 = 회원 관리 축 → 서비스 운영 (approvals 그룹 기본은 사업 운영).
  approvals: [{ label: '가입 신청 관리', path: '/operator/memberships', domain: 'service_operation' }],
  // 회원 관리 = 승인 완료 이후 사용자 축(목록·상태). 가입 신청 관리(멤버십 축)와 역할이 다르다.
  users: [{ label: '회원 관리', path: '/operator/members' }],
  // 커뮤니티(포럼) 운영 — 공통 /api/v1/forum/operator/* (serviceCode=pharmacy-hub) 채택.
  //   포럼 신청 관리는 포럼이 생성되는 유일한 경로라 콘솔 부재가 실기능 공백이었다.
  forum: [
    { label: '포럼 운영', path: '/operator/forum' },
    { label: '포럼 신청 관리', path: '/operator/forum-requests' },
    { label: '포럼 목록 관리', path: '/operator/forum-categories' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  // WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1:
  //   자료실 관리 = 공통 CMS(`/api/v1/cms/contents`, serviceKey=pharmacy-hub, type=knowledge).
  //   회원 자료실(/resources)은 이미 있었으나 등록 경로가 없어 항상 0건이었다
  //   (REQUIRED_BUT_MISSING). 신규 table/migration/backend route/권한 변경 없음.
  // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4:
  //   공지·뉴스 관리 = 공통 CmsContentManager + 공통 news controller
  //   (`/api/v1/pharmacy-hub/news/*`, 원장 cms_contents · serviceKey=pharmacy-hub).
  //   KPA/KCos 2 서비스가 이미 쓰는 화면의 채택이며 PH 전용 사본은 없다.
  // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#93):
  //   커뮤니티 콘텐츠 관리 = 회원이 작성해 검토 요청한 콘텐츠의 검토·게시 큐.
  //   공지·뉴스(운영자 발신)와 원장은 같고 축(subType)이 다르다 — 별도 항목으로 노출한다.
  content: [
    { label: '공지·뉴스 관리', path: '/operator/content' },
    { label: '커뮤니티 콘텐츠 관리', path: '/operator/community-contents' },
    // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 4 (#97):
    //   설문조사 관리 = 공통 /api/v1/surveys (serviceKey=pharmacy-hub) + 공통
    //   @o4o/operator-core-ui Surveys module. KPA/KCos 도 같은 content 그룹에 둔다.
    //   회원 응답 동선(/content/surveys)이 같은 WO 에서 함께 열려 dead-end 가 아니다.
    { label: '설문조사 관리', path: '/operator/surveys' },
    // WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1: `Supplier → Service Operator` 제공 콘텐츠 수신함.
    //   cms_contents(serviceKey='pharmacy-hub', authorRole='supplier') 를 그대로 읽는다 — 새 원장 · 상태 기계 없음.
    //   (공급자 → 약국 Store Hub 직접 경로는 종전대로 운영자 무개입 — 이 수신함은 §2-1 두 번째 경로만 받는다.)
    { label: '제공받은 콘텐츠', path: '/operator/supplier-contents' },
  ],
  resources: [{ label: '자료실 관리', path: '/operator/resources' }],
  // WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#95):
  //   강의 관리 = 공통 /api/v1/lms/operator/courses/*. backend allowlist 에
  //   pharmacy-hub role 을 추가만 했고 분기·사본은 없다.
  lms: [
    { label: '강의 관리', path: '/operator/lms' },
    // 동일 WO §4 (#96): 안내 문구 관리 = 공통 guide contents (serviceKey 경계).
    //   다른 서비스와 같은 lms 그룹에 둔다. KPA 의 '강사 승인'은
    //   KPA 전용 backend guard(requireKpaAdmin) 라 PH 에는 둘 수 없다(dead nav 금지).
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
  ],
  // 운영 분석 = 공통 /api/v1/operator/analytics/* (action_logs 기반).
  analytics: [{ label: '운영 분석', path: '/operator/analytics' }],
  // 역할 관리 = role_assignments (RBAC SSOT). 조회는 운영자, 변경은 platform admin 만
  //   (backend scope.isPlatformAdmin 강제) → adminOnly 로 노출.
  system: [{ label: '역할 관리', path: '/operator/roles', adminOnly: true }],
  // WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1:
  //   법정정보·약관 설정은 저장이 admin 권한인 화면이라 다른 4서비스와 동일하게
  //   관리자 영역(/admin/settings/legal-terms)으로 이동했다 → 운영자 메뉴에서 제거.
  //   config/adminMenuGroups.ts 가 해당 항목을 소유한다.
};

// ─── Domain IA ────────────────────────────────────────────────
// WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1: 서비스 전용 config(PHARMACY_HUB_OPERATOR_DOMAIN_IA) 제거.
//   OperatorLayoutWrapper 는 domainIAConfig 를 주입하지 않고 DEFAULT_OPERATOR_DOMAIN_IA 를 쓴다.
