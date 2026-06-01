# IR-O4O-NETURE-OPERATOR-DOMAIN-IA-DESIGN-V1

**작성 일자**: 2026-05-31
**조사 환경**: HEAD (main) `51448ab5f` 시점 정적 코드 (read-only)
**조사 도구**: Read / Grep / Glob
**작업 성격**: read-only 설계 IR — 코드/DB/source 수정 없음
**선행 IR**: [IR-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-AUDIT-V1](IR-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-AUDIT-V1.md) (판정 B — menu/domain IA 정리 후 이행)

---

## 0. 핵심 결론 (TL;DR)

> ✅ **판정: 기본안 확정 (4-domain) + group mapping 구체화** — domain label 확정, group mapping 명시.
>
> Neture operator 를 KPA 3-domain(커뮤니티/매장 HUB/운영 공통) 으로 묶지 않고, **Supplier/B2B 축 4-domain** 으로 설계:
>
> | 순서 | Domain | emoji | 포함 group |
> |:---:|--------|:---:|-----------|
> | (top-pin) | 대시보드 | — | dashboard |
> | 1 | **공급·유통 운영** | 📦 | approvals, products |
> | 2 | **커머스·정산 운영** | 💳 | orders, stores |
> | 3 | **커뮤니티·콘텐츠 운영** | 💬 | users, forum, content, signage |
> | 4 | **운영 공통** | ⚙️ | analytics, system |
>
> - operator(isAdmin=false) sidebar 노출 항목 전부 **route 존재 — dead link 0**.
> - 기존 flat 대비 **group 재배치 + domain 헤딩 도입 = 중간 UX 변화** (항목/링크/active 불변).
> - 선행 하드 전제: **DomainIASidebar IA config 파라미터화** (operator-ux-core, additive, default=KPA 모델).
> - footer 제거(cross-service 정합) + Neture 전용 smoke 신규 필요.

---

## 1. 조사한 파일 목록

| # | 파일 | 용도 |
|---|------|------|
| 1 | [web-neture/.../config/operatorMenuGroups.ts](../../services/web-neture/src/config/operatorMenuGroups.ts) | UNIFIED_MENU / getAdminMenu / filterMenuByRole |
| 2 | [web-neture/.../config/operatorCapabilities.ts](../../services/web-neture/src/config/operatorCapabilities.ts) | ENABLED_CAPABILITIES (8개) |
| 3 | [web-neture/.../layouts/OperatorLayoutWrapper.tsx](../../services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx) | `filterMenuByRole(UNIFIED_MENU, false)` |
| 4 | [web-neture/.../NetureGlobalHeader.tsx](../../services/web-neture/src/components/NetureGlobalHeader.tsx) | header 브릿지 (profile/notif) |
| 5 | [web-neture/.../App.tsx](../../services/web-neture/src/App.tsx) (L967-1017) | operator route 정의 |
| 6 | [packages/ui/.../operator-shell/constants.ts](../../packages/ui/src/operator-shell/constants.ts) | STANDARD_GROUPS (group→capability/icon/label) |
| 7 | 선행 IR 3종 (migration-audit / layout-wrapper / sidebar) | 정합 기준 |

---

## 2. Neture 현재 operator group 목록

`UNIFIED_MENU` (OperatorGroupKey 11그룹). adminOnly 표기는 `filterMenuByRole(_, false)` 에서 operator sidebar 미노출:

| group | item | route | capability(STANDARD_GROUPS) | adminOnly | operator 노출 |
|-------|------|-------|:---:|:---:|:---:|
| dashboard | 대시보드 | `/operator` (exact) | — | | ✅ |
| dashboard | Action Queue | `/operator/actions` | — | | ✅ |
| users | 회원 관리 | `/operator/members` | USER_MANAGEMENT | | ✅ |
| users | 운영자 관리 | `/operator/operators` | | ✅ | ❌ |
| users | 회원 완전삭제 | `/admin/members` | | ✅ | ❌ |
| users | 문의 메시지 | `/operator/contact-messages` | | | ✅ |
| approvals | 가입 승인 | `/operator/applications` | MEMBERSHIP_APPROVAL | | ✅ |
| approvals | 유통 참여형 펀딩 | `/operator/market-trial` | | | ✅ |
| approvals | 서비스 승인 | `/operator/service-approvals` | | ✅ | ❌ |
| approvals | 공급자 활성화 | `/operator/suppliers` | | | ✅ |
| products | 상품 관리 | `/operator/all-registered-products` | STORE_MANAGEMENT | | ✅ |
| products | 카테고리/브랜드/마스터/카탈로그/매핑/정리 (6) | `/operator/categories` 등 | | ✅ | ❌ |
| stores | 매장 관리 | `/operator/stores` | STORE_MANAGEMENT | | ✅ |
| orders | 주문 관리 | `/operator/orders` | STORE_MANAGEMENT | | ✅ |
| orders | 파트너 현황/정산/파트너정산/커미션 (4) | `/operator/partners` 등 | | ✅ | ❌ |
| content | 홈페이지 CMS | `/operator/homepage-cms` | CONTENT_MANAGEMENT | | ✅ |
| content | 안내 문구 관리 | `/operator/guide-contents` | | | ✅ |
| content | 커뮤니티 광고 | `/operator/community-admin` | | ✅ | ❌ |
| signage | 사이니지 | `/operator/signage/hq-media` | SIGNAGE | | ✅ |
| forum | 포럼 신청 | `/operator/community` | COMMUNITY | | ✅ |
| forum | 삭제 요청 | `/operator/forum-delete-requests` | | | ✅ |
| forum | 포럼 분석 | `/operator/forum-analytics` | | | ✅ |
| analytics | AI 리포트 | `/operator/ai-report` | ANALYTICS | | ✅ |
| analytics | AI 카드 리포트 | `/operator/ai-card-report` | | | ✅ |
| analytics | AI 운영 | `/operator/ai-operations` | | | ✅ |
| analytics | Asset Quality | `/operator/ai/asset-quality` | | | ✅ |
| analytics | 운영 분석 | `/operator/analytics` | | | ✅ |
| analytics | 공급자 품질 | `/operator/supplier-quality` | | | ✅ |
| analytics | AI 관리/카드규칙/비즈팩 (3) | `/operator/ai-admin` 등 | | ✅ | ❌ |
| system | 알림 설정 | `/operator/settings/notifications` | SETTINGS | | ✅ |
| system | 역할 관리 | `/operator/roles` | | ✅ | ❌ |
| system | 이메일 설정 | `/operator/settings/email` | | ✅ | ❌ |

---

## 3. route/page 존재 여부

App.tsx L972-1016 (OperatorLayoutWrapper 하위) 와 §2 operator-노출 항목 대조:

| operator 노출 항목 | route 존재 |
|--------------------|:---:|
| 대시보드 `/operator` | ✅ NetureOperatorDashboard |
| Action Queue `/operator/actions` | ✅ OperatorActionQueuePage |
| 회원 관리 `/operator/members` | ✅ UsersManagementPage |
| 문의 메시지 `/operator/contact-messages` | ✅ OperatorContactMessagesPage |
| 가입 승인 `/operator/applications` | ✅ RegistrationRequestsPage |
| 유통 참여형 펀딩 `/operator/market-trial` | ✅ MarketTrialApprovalsPage |
| 공급자 활성화 `/operator/suppliers` | ✅ OperatorSupplierApprovalPage |
| 상품 관리 `/operator/all-registered-products` | ✅ AllRegisteredProductsPage |
| 매장 관리 `/operator/stores` | ✅ StoreManagementPage |
| 주문 관리 `/operator/orders` | ✅ OrdersManagementPage |
| 홈페이지 CMS `/operator/homepage-cms` | ✅ HomepageCmsPage |
| 안내 문구 관리 `/operator/guide-contents` | ✅ OperatorGuideContentsPage |
| 사이니지 `/operator/signage/hq-media` | ✅ SignageHqMediaPage |
| 포럼 신청 `/operator/community` | ✅ ForumManagementPage |
| 삭제 요청 `/operator/forum-delete-requests` | ✅ ForumDeleteRequestsPage |
| 포럼 분석 `/operator/forum-analytics` | ✅ ForumAnalyticsPage |
| AI 리포트 `/operator/ai-report` | ✅ OperatorAiReportPage |
| AI 카드 리포트 `/operator/ai-card-report` | ✅ AiCardReportPage |
| AI 운영 `/operator/ai-operations` | ✅ AiOperationsPage |
| Asset Quality `/operator/ai/asset-quality` | ✅ AssetQualityPage |
| 운영 분석 `/operator/analytics` | ✅ OperatorAnalyticsPage |
| 공급자 품질 `/operator/supplier-quality` | ✅ SupplierQualityPage |
| 알림 설정 `/operator/settings/notifications` | ✅ EmailNotificationSettingsPage |

→ **operator 노출 항목 전부 route 존재 — dead link 0** ✅. (adminOnly 항목은 operator sidebar 미노출이므로 무관)

---

## 4. capability / adminOnly 현황

- **ENABLED_CAPABILITIES (8)**: USER_MANAGEMENT, MEMBERSHIP_APPROVAL, CONTENT_MANAGEMENT, COMMUNITY, SIGNAGE, STORE_MANAGEMENT, ANALYTICS, SETTINGS. → STANDARD_GROUPS 의 모든 사용 group capability 충족 (products/stores/orders = STORE_MANAGEMENT enabled). **capability gate 로 숨는 group 없음**.
- **adminOnly**: operator wrapper 가 `isAdmin=false` 고정 → adminOnly 항목 전부 operator sidebar 에서 제외 (admin 영역은 `getAdminMenu()` + AdminLayoutWrapper 별도). 이행 시 **false 보존 필수**.
- operator 노출 결과 group별 item 수: dashboard 2 / users 2 / approvals 3 / products 1 / stores 1 / orders 1 / content 2 / signage 1 / forum 3 / analytics 6 / system 1. → single-item group(products/stores/orders/signage/system)은 DomainIASidebar 에서 direct link 렌더, multi-item 은 collapsible.

> 참고: multi-item group 의 collapsible 헤더 라벨은 STANDARD_GROUPS 의 **영문 라벨**(Users/Approvals/Content/Forum/Analytics) — KPA/Glyco/KCos 와 동일한 기존 동작. domain 헤딩(국문)과 group 헤더(영문) 혼재는 pre-existing, 본 IR 범위 외.

---

## 5. 추천 domain 목록

KPA 중심 표현("매장 HUB 운영") 배제, Neture(공급자·파트너·유통펀딩·Market Trial·B2B 커머스) 성격 반영:

| Domain key | label | emoji | 성격 |
|-----------|-------|:---:|------|
| `supply_distribution` | **공급·유통 운영** | 📦 | 공급자 온보딩·활성화 + 유통 참여형 펀딩(Market Trial) + 상품 카탈로그 |
| `commerce_settlement` | **커머스·정산 운영** | 💳 | 주문 + 매장 + (admin: 파트너/정산/커미션) |
| `community_content` | **커뮤니티·콘텐츠 운영** | 💬 | 회원·문의 + 포럼 + 콘텐츠(CMS/안내) + 사이니지 |
| `common` | **운영 공통** | ⚙️ | 분석/AI + 시스템 (대시보드 top-pin) |

---

## 6. domain별 group mapping 초안

`GROUP_TO_DOMAIN` (Neture 전용 — STANDARD_GROUPS 11 key 전부 매핑, 미사용 group 도 안전 default):

```ts
const NETURE_GROUP_TO_DOMAIN: Record<OperatorGroupKey, NetureDomainKey> = {
  dashboard: 'common',            // top-pin 별도 처리
  approvals: 'supply_distribution',
  products:  'supply_distribution',
  orders:    'commerce_settlement',
  stores:    'commerce_settlement',
  users:     'community_content',
  forum:     'community_content',
  content:   'community_content',
  signage:   'community_content',
  resources: 'community_content',  // 미사용 — 안전 default
  lms:       'community_content',   // 미사용 — 안전 default
  analytics: 'common',
  system:    'common',
};
```

> **users 배치 결정 포인트**: 회원 관리 + 문의 메시지(2 item)를 `community_content`(사람·커뮤니티·콘텐츠 묶음)에 배치. 대안 = `common`(공통 회원 운영). 2-item orphan domain 회피 + forum/콘텐츠와 people-facing 정합으로 `community_content` 권장. **사용자 최종 확정 항목**.

---

## 7. domain 표시 순서

```ts
const NETURE_TOP_PINNED_GROUPS = ['dashboard'];                       // 최상단 단독
const NETURE_DOMAIN_DISPLAY_ORDER = [
  'supply_distribution',   // 1 — Neture 핵심 축
  'commerce_settlement',   // 2
  'community_content',     // 3
  'common',                // 4
];

const NETURE_DOMAIN_GROUP_ORDER = {
  supply_distribution: ['approvals', 'products'],
  commerce_settlement: ['orders', 'stores'],
  community_content:   ['users', 'forum', 'content', 'signage'],
  common:              ['analytics', 'system'],
};

const NETURE_DOMAIN_LABELS = {
  supply_distribution: { label: '공급·유통 운영',     emoji: '📦' },
  commerce_settlement: { label: '커머스·정산 운영',   emoji: '💳' },
  community_content:   { label: '커뮤니티·콘텐츠 운영', emoji: '💬' },
  common:              { label: '운영 공통',           emoji: '⚙️' },
};
```

순서 근거: 대시보드(공통 진입) → 공급·유통(Neture 1차 가치) → 커머스·정산 → 커뮤니티·콘텐츠 → 운영 공통(분석/시스템 bottom).

---

## 8. 기존 flat menu 대비 UX 변화

| 측면 | 변화 |
|------|------|
| 항목 집합 | **불변** (operator 노출 항목 동일) |
| 링크/route | **불변** |
| active route 처리 | **불변** (isItemActive 동일) |
| group 위치 | **변화** — flat 순서(dashboard,users,approvals,products,stores,orders,content,signage,forum,analytics,system) → 4-domain 재배치. 예: approvals/products 가 상단(공급·유통)으로, users 가 하단(커뮤니티·콘텐츠)으로 이동 |
| domain 헤딩 | **신규** — 4개 국문 헤딩 + 대시보드 top-pin |
| group label | 불변 (STANDARD_GROUPS 영문 라벨) |
| item label | 불변 |
| 혼란 가능성 | **중간** — 회원 관리 위치가 상단→중하단 이동. 다만 domain 헤딩이 탐색 맥락 제공 → 순효과 가독성↑. 운영자 공지 권장 |

→ **단순 grouping 변화 + 헤딩 추가** (파괴적 변경 아님). label 변경 불필요, 링크/active 유지.

---

## 9. DomainIASidebar 파라미터화 필요성

- 현재 [DomainIASidebar](../../packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx) 가 [operatorDomainIA](../../packages/operator-ux-core/src/sidebar/operatorDomainIA.ts) (KPA 축: DOMAIN_DISPLAY_ORDER/GROUP_TO_DOMAIN/DOMAIN_LABELS/DOMAIN_GROUP_ORDER/TOP_PINNED_GROUPS)를 **static import**.
- Neture 가 다른 domain 집합을 쓰려면 **DomainIASidebar 가 IA config 를 prop 으로 주입받아야** 함.

권장 설계 (additive, backward-compatible):

```ts
export interface OperatorDomainIAConfig {
  domainDisplayOrder: string[];
  domainGroupOrder: Record<string, OperatorGroupKey[]>;
  domainLabels: Record<string, { label: string; emoji: string }>;
  groupToDomain: Record<OperatorGroupKey, string>;
  topPinnedGroups: OperatorGroupKey[];
}
// DomainIASidebarProps 에 optional domainIA?: OperatorDomainIAConfig 추가.
// 미지정 시 기존 operatorDomainIA(KPA 모델) default → KPA/Glyco/KCos 무변화.
```

- **기존 3 서비스(KPA/Glyco/KCos)**: prop 미전달 → default operatorDomainIA → **완전 무변화** (재빌드/smoke 로 검증).
- **OperatorAreaShell** 도 `domainIA` 를 선택 prop 으로 받아 DomainIASidebar 에 pass-through (또는 Neture wrapper 가 DomainIASidebar 직접 사용 고려 — 단 OperatorAreaShell 경유가 layout 정합).
- Operator OS Freeze: operator-ux-core 변경이나 **순수 additive·default 보존** → DomainIASidebar/OperatorAreaShell 추출과 동일 안전 분류.

---

## 10. Neture operatorMenuGroups 에 추가할 IA 메타 초안

[operatorMenuGroups.ts](../../services/web-neture/src/config/operatorMenuGroups.ts) 에 KPA 와 동형 메타 추가 (§5-7 확정안):

```ts
// ─── Neture Operator Domain IA — IR-O4O-NETURE-OPERATOR-DOMAIN-IA-DESIGN-V1 ───
export type NetureDomainKey =
  'supply_distribution' | 'commerce_settlement' | 'community_content' | 'common';

export const NETURE_DOMAIN_LABELS: Record<NetureDomainKey, { label: string; emoji: string }> = {
  supply_distribution: { label: '공급·유통 운영',     emoji: '📦' },
  commerce_settlement: { label: '커머스·정산 운영',   emoji: '💳' },
  community_content:   { label: '커뮤니티·콘텐츠 운영', emoji: '💬' },
  common:              { label: '운영 공통',           emoji: '⚙️' },
};

export const NETURE_GROUP_TO_DOMAIN: Record<OperatorGroupKey, NetureDomainKey> = { /* §6 */ };
export const NETURE_DOMAIN_GROUP_ORDER: Record<NetureDomainKey, OperatorGroupKey[]> = { /* §7 */ };
export const NETURE_DOMAIN_DISPLAY_ORDER: NetureDomainKey[] =
  ['supply_distribution','commerce_settlement','community_content','common'];
export const NETURE_TOP_PINNED_GROUPS: OperatorGroupKey[] = ['dashboard'];

// → OperatorDomainIAConfig 형태로 묶어 DomainIASidebar/OperatorAreaShell 에 주입.
export const NETURE_OPERATOR_DOMAIN_IA = { /* 위 5개를 config 객체로 조립 */ };
```

> UNIFIED_MENU / filterMenuByRole / getAdminMenu / OPERATOR_MENU_ITEMS 는 **유지** — IA 메타만 추가.

---

## 11. footer 유지/제거 판단

- 현재 Neture operator 는 OperatorShell **기본 footer**(`© 2026 Neture. 플랫폼 운영` + `메인으로`) 렌더 중.
- OperatorAreaShell 은 footer 미보유. KPA/Glyco/KCos operator 영역도 **footer 없음**.
- **권장: 제거** (cross-service 정합). "메인으로" 는 GlobalHeader(브랜드 로고/네비)로 대체 가능, 카피라이트는 operator 내부 영역에 필수 아님.
- 리스크 낮음. 단 **smoke 로 footer 부재 확인** + 필요 시 OperatorAreaShell 에 optional footer slot 추가는 별도 판단(현 시점 불필요).

---

## 12. Neture 전용 smoke 필요 범위

- smoke2.mjs 는 glyco/kcos 만 — **Neture 미커버**. 신규 smoke(또는 smoke2 확장) 필요:
  - origin: neture.co.kr `/operator`
  - **domain 헤딩 4개 노출**: 공급·유통 운영 / 커머스·정산 운영 / 커뮤니티·콘텐츠 운영 / 운영 공통
  - 대시보드 top-pin + Action Queue
  - 핵심 항목: 가입 승인 / 유통 참여형 펀딩 / 공급자 활성화 / 상품 관리 / 주문 관리 / 회원 관리 / 포럼 / AI 리포트 / 알림 설정
  - profile dropdown: 관리자·운영·**공급자·파트너** 대시보드 href + 마이페이지/설정
  - active route / collapse / footer 부재
  - 계정: SSOT Neture 운영자(`sohae2100@gmail.com` 통합 운영자 또는 `operator-neture@o4o.com`)
- baseline: 이행 **전 flat 스냅샷 사전 캡처**(before) 후 항목 집합 동등성 비교 (flat→domain 은 의도된 diff).

---

## 13. 최종 판정

### ✅ **기본안 확정 (4-domain) + group mapping 구체화**

| 기준 | 결과 |
|------|------|
| 4-domain 후보 적합성 | ✅ Supplier/B2B 축 정합 (KPA "매장 HUB" 배제) |
| group mapping 명확성 | ✅ §6 GROUP_TO_DOMAIN 확정 (users 배치만 사용자 최종 확인) |
| dead link | ✅ 0 (operator 노출 항목 전부 route 존재) |
| domain label | ✅ 공급·유통 / 커머스·정산 / 커뮤니티·콘텐츠 / 운영 공통 |
| UX 변화 | ⚠️ 중간 (group 재배치 + 헤딩) — 파괴적 아님 |
| 선행 전제 | DomainIASidebar 파라미터화 (하드 전제) |

→ **추가 조사 불필요. 설계 확정.** 단 §6 의 `users` domain 배치(community_content vs common) 1건만 사용자 최종 결정 권장.

---

## 14. 후속 WO 후보

| 순서 | WO (가칭) | 범위 | 의존 |
|:---:|-----------|------|------|
| 1 | **WO-O4O-OPERATOR-UX-CORE-DOMAINIASIDEBAR-IA-CONFIG-PARAM-V1** | DomainIASidebar(+OperatorAreaShell) 에 optional `domainIA` config prop 추가. default=현 KPA operatorDomainIA. 기존 3 서비스 무변화 검증(tsc+build+smoke) | 본 IR 확정 |
| 2 | **WO-O4O-NETURE-OPERATOR-MENU-DOMAIN-IA-METADATA-V1** | Neture operatorMenuGroups.ts 에 §10 IA 메타 추가 (NETURE_OPERATOR_DOMAIN_IA) | 1 후 |
| 3 | **WO-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-V1** | Neture wrapper: OperatorShell → OperatorAreaShell + DomainIASidebar(NETURE_OPERATOR_DOMAIN_IA). isAdmin=false 보존, footer 제거, NetureGlobalHeader slot | 1,2 후 |
| 4 | **CHECK-O4O-NETURE-OPERATOR-SIDEBAR-LAYOUT-MIGRATION-SMOKE-V1** | Neture 전용 운영 smoke (§12) | 3 후 |

> 1+2 를 한 PR 로 묶어도 되나, **1(파라미터화)이 3(이행)의 하드 전제**. 1 은 기존 3 서비스에 default 무영향이라 독립 진행 가능.

---

## 15. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 판정 |
|------|------|
| **Twin Axis (KPA Community + Neture Supplier/B2B canonical)** | ✅ **정합** — Neture 전용 4-domain(공급·유통/커머스·정산/커뮤니티·콘텐츠/운영 공통)으로 KPA 축 재사용 회피. supplier/market-trial/정산을 "매장 HUB"로 오분류하지 않음 → Twin Axis drift 제거 |
| 사업 철학 §3.2 (Operator = 공급자 자료 수신·구성 + 매장 지원 + 운영 수익) | ✅ 공급·유통 + 커머스·정산 domain 이 Operator 의 공급자·수익 책임 반영 |
| O4O 공통 구조 §13 (메커니즘 공통, 데이터 축별 격리) | ✅ DomainIASidebar/OperatorAreaShell(메커니즘) 공통 + domain IA(정책) 축별 주입 — 정합 경로 |
| Operator OS Freeze (F1) | ⚠️ DomainIASidebar 파라미터화 = Freeze 변경이나 additive·default 보존 → 안전. WO 보고 명시 필요 |
| Workspace UX 직교성 | ✅ sidebar IA 한정, workspace 진입/정책 무관. (Neture 의 supplier/partner 워크스페이스는 별도 route — operator sidebar 와 직교) |
| Drift 방지 | ✅ Neture 전용 IA 가 곧 drift 방지 (KPA 강제 재사용 회피) |

**결론**: O4O 철학과 완전 정합. KPA IA 재사용을 피하고 Neture 축 전용 domain IA 를 설계함으로써 Twin Axis 원칙을 충족. 메커니즘 공통화 + 정책 파라미터화가 철학상 올바른 형태.

---

## 16. Working tree 격리 / commit 정책

- 조사 시작 시점 working tree clean (HEAD `51448ab5f`, 다른 세션 WIP 0).
- 본 IR 문서 1개만 생성. **read-only — 코드/Neture menu/공통 컴포넌트/route/header/capability 미변경.**
- commit 시 본 IR 문서 1개만 path-restricted. `git add .` / `-am` 금지.

---

> **상태**: 설계 IR 완료. 판정 = **4-domain 확정**(공급·유통 / 커머스·정산 / 커뮤니티·콘텐츠 / 운영 공통). 후속 4단계(DomainIASidebar 파라미터화 → Neture IA 메타 → 이행 WO → Neture smoke). `users` domain 배치 1건만 사용자 최종 확인 권장.
