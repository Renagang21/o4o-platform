/**
 * operatorDomainIA — Cross-service Operator Sidebar Domain IA metadata
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1 (최초 — 커뮤니티 운영 / 매장 HUB 운영 / 운영 공통)
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1 (2026-09-16 — 표준 Service Operator 최상위 IA 재정렬)
 *
 * 표준 Service Operator 의 최상위 IA 는 `O4O-ROLE-WORKSPACE-ARCHITECTURE-V1` §4 를 따른다:
 *
 *   Home
 *   ├─ 서비스 운영   (service_operation)   회원 · 가맹점(매장 = 회원 관리) · 공지 · 서비스 콘텐츠 · 포럼 ·
 *   │                                      자료 · 교육/LMS · 설문 · 안내 · 문의/협업 · 매장 지원 콘텐츠 ·
 *   │                                      사이니지/태블릿 자료 · 공급자가 제공한 콘텐츠 수신
 *   ├─ 사업 운영     (business_operation)  상품 · 상품 신청/취급 승인 · 공동구매 · 특가 · Event Offer ·
 *   │                                      프로모션 · 캠페인 · 판매자 모집 노출 승인 · 주문 · 사업 프로그램 승인
 *   └─ 운영 관리     (operations_management) 분석 · 서비스/시스템 설정 · 감사 로그 · 운영 정책
 *
 * 종전 "커뮤니티 운영 / 매장 HUB 운영 / 운영 공통" 은 표준 서비스의 최상위 IA 가 아니다 (RETIRED).
 * Content(서비스 콘텐츠)와 사업 프로그램은 별도 도메인이며 한쪽을 다른 쪽 하위로 두지 않는다 (§4).
 *
 * 분류 단위는 **메뉴 항목(route/page)** 이다. 그룹 키는 기본값(`groupToDomain`)만 주고, 한 그룹에
 * 서로 다른 업무가 섞인 경우(예: approvals = 콘텐츠 승인 + 상품 신청 승인) 서비스 `operatorMenuGroups.ts`
 * 가 `OperatorMenuItem.domain` 으로 항목 단위 override 한다. 이 메타데이터는 표시 전용이며 권한 · route ·
 * capability 판정을 바꾸지 않는다 (권한은 role_assignments + service_memberships + scope guard 그대로).
 *
 * Neture(SPECIAL) 는 자체 config(`NETURE_OPERATOR_DOMAIN_IA`)를 주입하므로 이 기본값의 영향을 받지 않는다.
 */

import type { OperatorGroupKey } from '@o4o/ui';

/** 표준 Service Operator 최상위 도메인 키 (ROLE-WORKSPACE-ARCHITECTURE §4) */
export type OperatorDomainKey = 'service_operation' | 'business_operation' | 'operations_management';

/** 도메인 헤딩 라벨 + 시각 토큰 (emoji 는 lucide 미매핑 시 fallback) */
export const DOMAIN_LABELS: Record<OperatorDomainKey, { label: string; emoji: string }> = {
  service_operation: { label: '서비스 운영', emoji: '🧭' },
  business_operation: { label: '사업 운영', emoji: '📦' },
  operations_management: { label: '운영 관리', emoji: '⚙️' },
};

/**
 * STANDARD_GROUPS key → 기본 도메인.
 *
 * 그룹 기본값은 "그 그룹의 대다수 항목" 기준이며, 항목 단위 예외는 서비스 메뉴의 `domain` 이 정한다.
 *   - stores  : 가맹점(매장) 관리 = 회원 관리의 한 축 + 매장 지원 콘텐츠(HUB 블로그/POP/QR/태블릿) → 서비스 운영
 *   - signage : 사이니지·태블릿 자료 = 매장 지원 콘텐츠 → 서비스 운영
 *   - approvals: 상품 신청 · 이벤트 오퍼 · 판매자 모집 노출 승인이 다수 → 사업 운영 (콘텐츠 승인 · 가입 승인은 항목 override)
 */
export const GROUP_TO_DOMAIN: Record<OperatorGroupKey, OperatorDomainKey> = {
  dashboard: 'operations_management', // top-pin 별도 처리 (TOP_PINNED_GROUPS)
  users: 'service_operation',
  approvals: 'business_operation',
  products: 'business_operation',
  stores: 'service_operation',
  orders: 'business_operation',
  content: 'service_operation',
  resources: 'service_operation',
  lms: 'service_operation',
  signage: 'service_operation',
  forum: 'service_operation',
  analytics: 'operations_management',
  system: 'operations_management',
};

/**
 * 도메인 별 그룹 표시 순서.
 *
 * 한 그룹이 두 도메인에 나타날 수 있다 (항목 단위 override 결과) — 그래서 `approvals` 는 서비스 운영 ·
 * 사업 운영 양쪽 순서에 모두 들어 있다. 실제 노출은 그 도메인으로 해석된 항목이 1개 이상일 때만 된다.
 *
 *   - service_operation   : 회원 → 승인(가입·콘텐츠) → 매장 → 콘텐츠 → 포럼 → 자료실 → 강의 → 사이니지
 *   - business_operation  : 상품 → 승인(상품 신청·이벤트 오퍼·모집 노출) → 주문
 *   - operations_management: 분석 → 시스템 (대시보드는 TOP_PINNED_GROUPS 에서 별도 처리)
 */
export const DOMAIN_GROUP_ORDER: Record<OperatorDomainKey, OperatorGroupKey[]> = {
  service_operation: ['users', 'approvals', 'stores', 'content', 'forum', 'resources', 'lms', 'signage'],
  business_operation: ['products', 'approvals', 'orders'],
  operations_management: ['analytics', 'system'],
};

/** 도메인 표시 순서 (sidebar top → bottom) */
export const DOMAIN_DISPLAY_ORDER: OperatorDomainKey[] = [
  'service_operation',
  'business_operation',
  'operations_management',
];

/** sidebar 최상단 고정 항목 — 도메인 헤딩과 무관하게 항상 sidebar 첫 영역에 노출.
 *  대시보드(Home)는 모든 도메인의 진입점이므로 sidebar 최상단에 단독 배치.
 */
export const TOP_PINNED_GROUPS: OperatorGroupKey[] = ['dashboard'];

// ─── Domain IA Config (서비스별 주입) — WO-O4O-OPERATOR-UX-CORE-DOMAINIASIDEBAR-IA-CONFIG-PARAM-V1 ───

/**
 * Operator sidebar domain IA config — 위 5개 메타데이터를 한 묶음으로 정의.
 *
 * DomainIASidebar 가 서비스별 domain IA 를 주입받기 위한 타입. 도메인 키는 서비스마다
 * 다를 수 있으므로(표준 = service_operation/business_operation/operations_management,
 * Neture SPECIAL = 공급·유통/커머스·정산/…) `string` 으로 일반화한다. group key 는 공통 OperatorGroupKey 를 유지한다.
 *
 * 항목 단위 배치 규칙 (DomainIASidebar):
 *   item 의 도메인 = `item.domain ?? groupToDomain[group]`
 *   도메인 D 의 그룹 G 에는 `groupOrder[D]` 에 G 가 있고, 위 규칙으로 D 로 해석된 항목만 들어간다.
 */
export interface OperatorDomainIAConfig {
  /** 도메인 키 → 헤딩 라벨 + emoji */
  labels: Record<string, { label: string; emoji: string }>;
  /** STANDARD_GROUPS key → 기본 도메인 키 (항목의 `domain` 이 우선) */
  groupToDomain: Record<OperatorGroupKey, string>;
  /** 도메인 키 → 그룹 표시 순서 (한 그룹이 여러 도메인에 나타날 수 있다) */
  groupOrder: Record<string, OperatorGroupKey[]>;
  /** 도메인 표시 순서 (sidebar top → bottom) */
  displayOrder: string[];
  /** sidebar 최상단 고정 그룹 */
  topPinnedGroups: OperatorGroupKey[];
}

/**
 * Default domain IA — 표준 Service Operator (KPA-Society / K-Cosmetics / Pharmacy-Hub)
 * (서비스 운영 / 사업 운영 / 운영 관리).
 *
 * DomainIASidebar 가 `domainIAConfig` prop 미주입 시 사용한다.
 */
export const DEFAULT_OPERATOR_DOMAIN_IA: OperatorDomainIAConfig = {
  labels: DOMAIN_LABELS,
  groupToDomain: GROUP_TO_DOMAIN,
  groupOrder: DOMAIN_GROUP_ORDER,
  displayOrder: DOMAIN_DISPLAY_ORDER,
  topPinnedGroups: TOP_PINNED_GROUPS,
};

/**
 * 순수 해석 함수 — 서비스 메뉴 × IA config → 도메인별 (그룹, 항목) 배치.
 * DomainIASidebar 가 그대로 쓰며, 테스트가 렌더 없이 같은 규칙을 검증할 수 있도록 분리했다.
 * capability 게이트는 여기서 하지 않는다 (사이드바가 STANDARD_GROUPS 로 판정).
 */
export interface ResolvedDomainGroupItems<TItem extends { domain?: string }> {
  domainKey: string;
  groupKey: OperatorGroupKey;
  items: TItem[];
}

export function resolveDomainGroupItems<TItem extends { domain?: string }>(
  menuItems: Partial<Record<OperatorGroupKey, TItem[]>>,
  config: OperatorDomainIAConfig,
): ResolvedDomainGroupItems<TItem>[] {
  const out: ResolvedDomainGroupItems<TItem>[] = [];
  for (const domainKey of config.displayOrder) {
    const groupOrder = config.groupOrder[domainKey] ?? [];
    for (const groupKey of groupOrder) {
      const items = (menuItems[groupKey] ?? []).filter(
        (item) => (item.domain ?? config.groupToDomain[groupKey]) === domainKey,
      );
      if (items.length === 0) continue;
      out.push({ domainKey, groupKey, items });
    }
  }
  return out;
}
