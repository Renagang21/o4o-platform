/**
 * KPA Society Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1: adminOnly 플래그 추가
 * WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1:
 *   KPA-only domain 매핑 추가 (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통).
 *   STANDARD_GROUPS 자체는 보존 — KPA 전용 KpaOperatorSidebar 가 domain 헤딩 + 그룹 정렬에 사용.
 *
 * 표준 11-그룹 키에 대한 라우트 매핑.
 * adminOnly 항목은 admin 역할만 표시.
 */

import type { OperatorGroupKey, UnifiedMenuItem } from '@o4o/ui';

/**
 * 통합 메뉴 구성
 * - 기존 operator 메뉴 + admin-only 항목 병합
 */
export const UNIFIED_MENU: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  users: [
    { label: '회원 관리', path: '/operator/members' },
    // WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1: 약국 서비스 신청 메뉴 제거 (라우트/API/DB 유지)
  ],
  approvals: [
    // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 자격 신청 관리 → lms 그룹으로 이동
    // WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1: GP/KCos 와 메뉴명 정렬
    { label: '공급 상품 신청 승인', path: '/operator/product-applications' },
    // WO-O4O-KPA-OPERATOR-ACTION-INTEGRITY-AND-APPROVAL-FLOW-COMPLETION-V1:
    //   공급자 CMS→HUB 콘텐츠 승인 + 사이니지 캠페인 요청 승인 (백엔드 kpa:operator 는 이미 존재,
    //   진입 화면만 부재였음 → 운영자 콘솔에 화면 연결).
    { label: '공급자 콘텐츠 승인', path: '/operator/approvals' },
    // WO-O4O-EVENT-OFFER-OPERATOR-APPROVAL-KPA-V1: 이벤트 오퍼 승인 관리
    { label: '이벤트 오퍼 승인', path: '/operator/event-offers' },
    // WO-O4O-KPA-SELLER-RECRUITMENT-OPERATOR-APPROVAL-FLOW-RESTORE-V1:
    //   판매자 모집 노출 승인 복원. 직전 정비의 "backend 부재 placeholder" 판단은 오진 —
    //   승인 기능은 실재한다: proxy `/api/v1/kpa/operator/recruitment-exposure`(requireKpaScope
    //   'kpa:operator', serviceKey='kpa-society' 고정) → setRecruitmentExposure(SERVICE_MISMATCH 가드·
    //   idempotent). 공급자 create=exposure_status PENDING 기본, browse/apply=APPROVED 강제.
    //   페이지(RecruitmentExposureApprovalPage)·라우트도 이미 live. GP/KCos 는 계속 노출 중이었고 KPA 만 회귀.
    //   유통 기능(운영자 승인 필요)이며 콘텐츠 무승인 게시와 별개.
    { label: '판매자 모집 노출 승인', path: '/operator/recruitment-exposure' },
  ],
  // WO-O4O-KPA-OPERATOR-PRODUCT-ORDER-VIEW-INTRODUCE-V1: 상품 현황 (view-only, 서비스 전역 조회).
  //   GP/KCos 와 동일한 products/orders 그룹/라벨.
  products: [{ label: '상품 현황', path: '/operator/products' }],
  // WO-O4O-KPA-OPERATOR-ORDER-VIEW-FRONTEND-WIRING-V1: 주문 현황 (view-only).
  //   backend GET /api/v1/kpa/operator/orders (kpa:operator) 연결.
  orders: [{ label: '주문 현황', path: '/operator/orders' }],
  // WO-O4O-OPERATOR-DASHBOARD-COMMUNITY-STORE-HUB-SPLIT-V1: stores 메뉴 복원 (매장 HUB 운영 축)
  // WO-O4O-OPERATOR-BLOG-WRITE-PAGE-KPA-V1: 매장 HUB 블로그 (운영자 게시 → 매장 가져가기)
  // WO-O4O-KPA-OPERATOR-POP-WRITE-PAGE-V1: 매장 HUB POP (운영자 게시 → 매장 가져가기)
  //   Store Menu Canonical Tree V1 의 'POP' 항목 운영자 게시 측 진입점. 라벨은 sidebar 일관성을
  //   위해 'HUB' prefix 유지 (블로그와 같은 prefix) — canonical 항목명 'POP' 자체는 보존.
  // WO-O4O-KPA-OPERATOR-QR-WRITE-PAGE-V1: 매장 HUB QR-code (운영자 템플릿 → 매장 가져가기)
  //   운영자는 QR "템플릿" 작성. 실제 QR slug 는 매장 가져가기 시 발급 (Phase 3-B 의
  //   store_qr_codes INSERT). canonical 항목명 'QR-code' 유지.
  stores: [
    // WO-O4O-KPA-OPERATOR-STORES-MENU-VISUAL-SECTION-V1:
    //   같은 stores 그룹 안에서 '매장 운영'(관리·채널) 과 '매장 HUB 자료'(게시 콘텐츠) 를 비클릭
    //   구획 라벨로 시각 구분. 그룹·route·권한·순서 불변, 각 구획 첫 항목에만 sectionLabel 지정.
    { label: '매장 관리', path: '/operator/stores', sectionLabel: '매장 운영' },
    { label: '채널 관리', path: '/operator/store-channels' },
    { label: '매장 HUB 블로그', path: '/operator/blog', sectionLabel: '매장 HUB 자료' },
    { label: '매장 HUB POP', path: '/operator/pop' },
    { label: '매장 HUB QR-code', path: '/operator/qr' },
    // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 매장 HUB 동영상 (운영자 게시 → 매장 가져가기 → QR 연결)
    { label: '매장 HUB 동영상', path: '/operator/video' },
    // WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1:
    //   운영자 게시 → 매장 가져가기(복사). 외국인 고객 대상 다국어 상품 안내 콘텐츠.
    { label: '매장 HUB 다국어 상품 콘텐츠', path: '/operator/multilingual-product-contents' },
    // WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 매장 배포용 태블릿 화면 세트 원본 제작.
    { label: '매장 HUB 태블릿 화면', path: '/operator/tablet/screen-sets' },
  ],
  // WO-KPA-OPERATOR-CONTENT-NOTICE-NEWS-MENU-NORMALIZATION-V1: "공지사항" + "콘텐츠 관리" → "공지사항/뉴스" 통합
  // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 자료실 관리 → resources 그룹으로, 강의 관리 → lms 그룹으로 이동
  // WO-O4O-CROSSSERVICE-OPERATOR-CONTENT-MENU-PARITY-V1: 설문조사 관리 추가 (route /operator/surveys 기존 존재).
  //   canonical Content 4항목(공지사항/뉴스 · Home 편집 · 콘텐츠 허브 · 설문조사 관리) 정합.
  content: [
    { label: '공지사항/뉴스', path: '/operator/content' },
    { label: 'Home 편집', path: '/operator/community' },
    { label: '콘텐츠 허브 관리', path: '/operator/docs' },
    { label: '설문조사 관리', path: '/operator/surveys' },
    // WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1:
    //   /operator/collaboration-requests 는 실기능 화면(협업·강의 문의 처리)인데 sidebar 진입점이
    //   없어 안내 문서 링크로만 도달 가능했다 → 기능 은폐. K-Cosmetics '문의 관리'(content 그룹)와
    //   같은 자리에 진입점을 복구한다. route/page/API 불변.
    { label: '협업 문의 관리', path: '/operator/collaboration-requests' },
  ],
  // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 자료실 독립 최상위 그룹
  resources: [
    { label: '자료실 관리', path: '/operator/resources' },
  ],
  // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1: 강의 독립 그룹 (강의 관리 + 강사 승인)
  // WO-O4O-GUIDE-CONTENT-EDITOR-UI-V1: 안내 문구 관리 추가 (LMS 레슨 작성 화면)
  lms: [
    { label: '강의 관리', path: '/operator/lms' },
    { label: '강사 승인', path: '/operator/qualification-requests' },
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
  ],
  signage: [

    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    { label: '강제 콘텐츠', path: '/operator/signage/forced-content' },
  ],
  // WO-KPA-OPERATOR-FORUM-MENU-ORDER-V1: 포럼 운영(허브)을 최상단으로 이동
  forum: [
    { label: '포럼 운영', path: '/operator/forum' },
    { label: '포럼 신청 관리', path: '/operator/forum-requests' },
    { label: '포럼 목록 관리', path: '/operator/forum-categories' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [
    { label: 'AI 리포트', path: '/operator/ai-report' },
    { label: '운영 분석', path: '/operator/analytics' },
  ],
  system: [
    // WO-O4O-KPA-POLICY-DOCUMENTS-SERVICE-POLICY-MIGRATION-V1:
    //   '법률 관리'(/operator/legal, legacy kpa_legal_documents) 메뉴 제거.
    //   정책문서 canonical 편집은 관리자 → 법정정보·약관 설정(service_policy_documents).
    //   route/page 는 보존(legacy 안내) — 후속 cleanup WO 에서 제거 판단.
    { label: '감사 로그', path: '/operator/audit-logs', adminOnly: true },
    { label: '역할 관리', path: '/operator/roles', adminOnly: true },
  ],
};

// WO-O4O-OPERATOR-MENU-ROLE-FILTER-COMMONIZATION-G3A-V1: filterMenuByRole / UnifiedMenuItem 은 @o4o/ui (operator-shell) 공통 구현 사용.
//   소비처(LayoutWrapper) 가 @o4o/ui 에서 직접 import 한다 — 위임 재수출을 두지 않는다.
//   서비스별 메뉴 정의(UNIFIED_MENU) 와 isAdmin 산출은 각 서비스에 유지.

// ─── Domain IA mapping ───
// WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1:
//   Domain IA 메타데이터 (OperatorDomainKey / DOMAIN_LABELS / GROUP_TO_DOMAIN /
//   DOMAIN_GROUP_ORDER / DOMAIN_DISPLAY_ORDER / TOP_PINNED_GROUPS) 는 3개 서비스 공통
//   @o4o/operator-ux-core 의 sidebar/operatorDomainIA 로 이동. (중복 제거 — 노출 결과 불변)

// WO-O4O-FRONTEND-MENU-AND-ROUTE-CONTRACT-COMMONIZATION-FULL-CLOSE-V1:
//   deprecated OPERATOR_MENU_ITEMS (하위호환 사본) 제거 — 저장소 전체 runtime consumer 0.
//   운영자 메뉴 정본은 UNIFIED_MENU + @o4o/ui 의 filterMenuByRole 이다.
