/**
 * K-Cosmetics Operator Menu Items
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-AUTH-RBAC-CLEANUP-V1: UNIFIED_MENU + filterMenuByRole 도입
 * WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
 *   KPA-Society / GlycoPharm 와 동일한 도메인 IA (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통)
 *   로 UNIFIED_MENU 재배치 + Domain IA 메타데이터 추가.
 *   - content 의 안내 문구 관리 → lms 그룹 (KPA 정합)
 *   - content 의 자료실 관리 → 신규 resources 그룹 (KPA 정합)
 *
 * 표준 11-그룹 키에 대한 라우트 매핑.
 */

import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';

// ─── Unified Menu Item (adminOnly 지원) ───────────────────────

export interface UnifiedMenuItem extends OperatorMenuItem {
  adminOnly?: boolean;
}

export const UNIFIED_MENU: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>> = {
  dashboard: [{ label: '대시보드', path: '/operator', exact: true }],
  // WO-O4O-K-COSMETICS-OPERATOR-ROUTE-CANONICALIZATION-V1: /operator/members (KPA/GlycoPharm canonical)
  users: [{ label: '회원 관리', path: '/operator/members' }],
  approvals: [
    // WO-O4O-CROSSSERVICE-OPERATOR-APPROVAL-GROUP-LABEL-ALIGN-V1:
    //   '신청 관리' → '매장 가입 신청 관리' (ApplicationsPage = 매장 가입신청 관리 의미 명확화).
    //   공통 항목(공급 상품 신청 승인 → 이벤트 오퍼 승인) 순서를 KPA/GP 와 정합.
    { label: '매장 가입 신청 관리', path: '/operator/applications' },
    // WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1
    { label: '공급 상품 신청 승인', path: '/operator/product-applications' },
    // WO-O4O-EVENT-OFFER-KCOS-OPERATOR-APPROVAL-V1
    { label: '이벤트 오퍼 승인', path: '/operator/event-offers' },
    // WO-O4O-OPERATOR-APPROVALS-SELLER-RECRUITMENT-EXPOSURE-MENU-REMODEL-V1:
    //   운영자 승인 = 모집 제품의 자기 서비스 노출 승인(판매자 개별 승인 아님). 노출 승인 backend 부재 → 준비중 안내(B안).
    //   '매장 가입 신청 관리'(매장 온보딩)는 본 WO 제거 대상 아님 → 유지.
    { label: '판매자 모집 노출 승인', path: '/operator/recruitment-exposure' },
  ],
  // WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-LABEL-CLARIFY-GP-KCOS-V1: view-only 콘솔 → '상품 현황'
  products: [{ label: '상품 현황', path: '/operator/products' }],
  stores: [
    { label: '내 매장', path: '/operator/store-cockpit' },
    { label: '매장 관리', path: '/operator/stores' },
    // WO-O4O-KCOSMETICS-OPERATOR-STORE-CHANNELS-V1
    { label: '채널 관리', path: '/operator/store-channels' },
    // WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
    { label: '매장 HUB 블로그', path: '/operator/blog' },
    { label: '매장 HUB POP', path: '/operator/pop' },
    { label: '매장 HUB QR', path: '/operator/qr' },
  ],
  // WO-O4O-OPERATOR-PRODUCT-ORDER-VIEW-LABEL-CLARIFY-GP-KCOS-V1: view-only(조회 전용) → '주문 현황'
  orders: [{ label: '주문 현황', path: '/operator/orders' }],
  // WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1:
  //   content 그룹에서 안내 문구 관리 → lms, 자료실 관리 → resources 로 분리.
  // WO-O4O-CROSSSERVICE-OPERATOR-CONTENT-MENU-PARITY-V1:
  //   canonical Content 라벨 정합 — '공지/뉴스 관리' → '공지사항/뉴스' (KPA/GP 와 동일 라벨).
  //   Home 편집(/operator/community) · 콘텐츠 허브(/operator/docs) 는 K-Cosmetics 에 route 부재 →
  //   dead link 방지 위해 메뉴 미추가 (후속 별도 WO: page/route 신설 필요).
  content: [
    { label: '공지사항/뉴스', path: '/operator/content-management' },
    // WO-O4O-KCOSMETICS-OPERATOR-SURVEYS-V1
    { label: '설문조사 관리', path: '/operator/surveys' },
    // WO-O4O-KCOS-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1:
    //   문의 처리(목록·상세·답변·상태/메모)는 operator 업무 → operator 로 이관 신설.
    //   문의 '설정'은 admin 유지(/admin/settings/contact). backend 가드 operator 레벨로 조정(scopeRoleMapping 엄격 대응).
    { label: '문의 관리', path: '/operator/contacts' },
  ],
  // WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1: 자료실 독립 그룹 (KPA 정합)
  resources: [
    // WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1
    { label: '자료실 관리', path: '/operator/resources' },
  ],
  // WO-KCOS-OPERATOR-LMS-BOOTSTRAP-V1
  // WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1: 안내 문구 관리 추가 (KPA lms 그룹 정합)
  lms: [
    { label: '강의 관리', path: '/operator/lms' },
    // WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1
    { label: '안내 문구 관리', path: '/operator/guide-contents' },
  ],
  // WO-O4O-CROSSSERVICE-OPERATOR-SIGNAGE-MENU-PARITY-V1:
  //   Content 성격 메뉴('사이니지 콘텐츠' /signage/content)를 Signage 하위에서 제거 —
  //   GlycoPharm 과 동일한 canonical 4-항목 구조 정합. route/page 는 보존(orphan 허용,
  //   StoreCockpitPage 내부 링크로 도달 가능). Signage 는 디지털 사이니지 운영 메뉴.
  signage: [
    { label: 'HQ 미디어', path: '/operator/signage/hq-media' },
    { label: 'HQ 플레이리스트', path: '/operator/signage/hq-playlists' },
    { label: '템플릿', path: '/operator/signage/templates' },
    // WO-O4O-KCOSMETICS-OPERATOR-MENU-FORCED-CONTENT-ADD-V1
    { label: '강제 콘텐츠', path: '/operator/signage/forced-content' },
  ],
  forum: [
    // WO-O4O-KCOSMETICS-OPERATOR-STORE-CHANNELS-V1: /operator/community dead link 제거 (route 없음)
    // WO-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-LABEL-ORDER-PARITY-V1: KPA canonical 라벨 정합 (신청 관리)
    // WO-O4O-CROSSSERVICE-OPERATOR-FORUM-HUB-READONLY-INTRODUCE-V1: read-only 운영 허브 도입
    { label: '포럼 운영', path: '/operator/forum' },
    { label: '포럼 신청 관리', path: '/operator/forum-requests' },
    { label: '삭제 요청', path: '/operator/forum-delete-requests' },
    { label: '포럼 분석', path: '/operator/forum-analytics' },
  ],
  analytics: [{ label: 'AI 리포트', path: '/operator/ai-report' }],
};

// ─── Role-based Filter ────────────────────────────────────────

export function filterMenuByRole(
  menu: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>>,
  isAdmin: boolean,
): Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> {
  const result: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {};
  for (const [key, items] of Object.entries(menu)) {
    const filtered = (items as UnifiedMenuItem[]).filter(i => !i.adminOnly || isAdmin);
    if (filtered.length > 0) {
      result[key as OperatorGroupKey] = filtered;
    }
  }
  return result;
}

// ─── Domain IA mapping ───
// WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1:
//   Domain IA 메타데이터 (OperatorDomainKey / DOMAIN_LABELS / GROUP_TO_DOMAIN /
//   DOMAIN_GROUP_ORDER / DOMAIN_DISPLAY_ORDER / TOP_PINNED_GROUPS) 는 3개 서비스 공통
//   @o4o/operator-ux-core 의 sidebar/operatorDomainIA 로 이동. (중복 제거 — 노출 결과 불변)

// ─── Legacy Export (deprecated — use UNIFIED_MENU) ────────────

export const OPERATOR_MENU_ITEMS = UNIFIED_MENU;
