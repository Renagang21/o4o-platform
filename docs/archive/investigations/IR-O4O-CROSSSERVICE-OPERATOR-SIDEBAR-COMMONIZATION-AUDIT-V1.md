# IR-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMONIZATION-AUDIT-V1

> Status: **read-only investigation**, no code modified
> Scope: KPA-Society / GlycoPharm / K-Cosmetics operator sidebar 공통화 가능성 감사
> Date: 2026-05-30
> Related WOs:
> - `WO-O4O-KPA-OPERATOR-SIDEBAR-DOMAIN-IA-RESTRUCTURE-V1` (KPA canonical)
> - `WO-O4O-GLYCOPHARM-OPERATOR-MENU-ALIGN-WITH-KPA-V1` (Glyco 정렬)
> - `WO-O4O-KCOS-OPERATOR-MENU-ALIGN-WITH-KPA-V1` (K-Cos 정렬)

## TL;DR

3개 sidebar 컴포넌트가 **JSX/hook/렌더 로직 100% 동일** (차이는 주석·컴포넌트명·props interface명 단 3종). `operatorMenuGroups.ts` 도메인 IA 메타데이터(`OperatorDomainKey`, `DOMAIN_LABELS`, `GROUP_TO_DOMAIN`, `DOMAIN_GROUP_ORDER`, `DOMAIN_DISPLAY_ORDER`, `TOP_PINNED_GROUPS`)는 세 서비스에서 **값과 타입 모두 동일**. 즉 sidebar **컴포넌트와 도메인 메타데이터는 즉시 공통화 가능**.

다만 운영 smoke test에서 발견된 **capability gate 차이 (Glyco STORE_MANAGEMENT 누락, K-Cos ANALYTICS 누락, Glyco/K-Cos COMMUNITY 누락 등) 가 정책으로 합의된 것인지 회귀인지가 미확정**. 공통화 자체를 막지는 않지만, 공통화 직후 회귀 검증 비용 + 정책 재정의 비용을 줄이려면 capability gate 정합 한 사이클 먼저 돌리는 것을 권고.

**판정: "일부 정리 후 공통화 가능"** — 코드 추출은 가능하나 capability 정합 IR/WO 1건이 선행되면 안전한 marshalling 효과.

---

## 1. 현재 sidebar 파일 구조

| 서비스 | Sidebar 컴포넌트 | Wrapper (operator layout) | Menu Config |
|--------|------------------|---------------------------|-------------|
| KPA-Society | `services/web-kpa-society/src/components/kpa-operator/KpaOperatorSidebar.tsx` (357 lines) | `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx` | `services/web-kpa-society/src/config/operatorMenuGroups.ts` |
| GlycoPharm | `services/web-glycopharm/src/components/glyco-operator/GlycoOperatorSidebar.tsx` (357 lines) | `services/web-glycopharm/src/components/layouts/OperatorLayoutWrapper.tsx` | `services/web-glycopharm/src/config/operatorMenuGroups.ts` |
| K-Cosmetics | `services/web-k-cosmetics/src/components/kcos-operator/KCosOperatorSidebar.tsx` (357 lines) | `services/web-k-cosmetics/src/components/layouts/OperatorLayoutWrapper.tsx` | `services/web-k-cosmetics/src/config/operatorMenuGroups.ts` |

공유 자산 (모든 서비스 공통 의존):
- `packages/ui/src/operator-shell/constants.ts` — `STANDARD_GROUPS` (단일 source of truth: 14 group keys + capability 매핑 + icon + 영문 라벨)
- `packages/ui/src/operator-shell/OperatorShell.tsx` — flat 11-feature sidebar (현재 3개 서비스 모두 우회)
- `@o4o/types` — `OperatorCapability`, `OperatorGroupKey`, `OperatorMenuItem`

### sidebar 컴포넌트 line-by-line diff 요약

`diff KpaOperatorSidebar.tsx GlycoOperatorSidebar.tsx` + `diff KpaOperatorSidebar.tsx KCosOperatorSidebar.tsx` 실측:

차이 항목 **단 3종**:
1. 파일 헤더 주석 (목적 설명, 참조 WO ID)
2. 컴포넌트 export 이름 (`KpaOperatorSidebar` / `GlycoOperatorSidebar` / `KCosOperatorSidebar`)
3. Props interface 이름 (`KpaOperatorSidebarProps` / `GlycoOperatorSidebarProps` / `KCosOperatorSidebarProps`)
4. KPA 에만 line 132-133 인라인 주석 2줄 더 있음 (top-pinned 단일 항목 가정 설명)

JSX 마크업, useState/useMemo/useLocation hook 사용, `STANDARD_GROUPS.find()` 매칭, capability gate 로직, `isItemActive()` / `isGroupActive()` 함수, `flatGroupsForMobile`, desktop aside + mobile horizontal tab nav — **모두 byte 단위 동일**.

---

## 2. 서비스별 operator menu config 비교

### 2.1 Domain IA 메타데이터 (`operatorMenuGroups.ts` 후반부)

| 키 | KPA | GlycoPharm | K-Cosmetics |
|----|-----|------------|-------------|
| `OperatorDomainKey` 타입 | `'community' \| 'store_hub' \| 'common'` | 동일 | 동일 |
| `DOMAIN_LABELS` | `💬 커뮤니티 운영 / 🏪 매장 HUB 운영 / ⚙️ 운영 공통` | 동일 | 동일 |
| `GROUP_TO_DOMAIN` | 11개 키 매핑 | 동일 | 동일 |
| `DOMAIN_GROUP_ORDER.community` | `['users','forum','content','lms','resources']` | 동일 | 동일 |
| `DOMAIN_GROUP_ORDER.store_hub` | `['stores','approvals','signage']` | `['stores','products','orders','approvals','signage']` | `['stores','products','orders','approvals','signage']` |
| `DOMAIN_GROUP_ORDER.common` | `['analytics','system']` | 동일 | 동일 |
| `DOMAIN_DISPLAY_ORDER` | `['community','store_hub','common']` | 동일 | 동일 |
| `TOP_PINNED_GROUPS` | `['dashboard']` | 동일 | 동일 |

차이: `DOMAIN_GROUP_ORDER.store_hub` 하나 — KPA 는 `products/orders` 그룹 자체가 UNIFIED_MENU 에 없어 ordering 배열에도 미포함. Glyco/K-Cos 는 두 그룹 보유로 포함. 본질적 차이가 아니며 KPA 도 똑같이 5-슬롯 배열을 가져도 무방 (빈 그룹은 `resolvedDomains` 단계에서 자연 reject).

### 2.2 UNIFIED_MENU 그룹 카탈로그 (서비스별 메뉴 항목)

| group | KPA | GlycoPharm | K-Cosmetics |
|-------|-----|------------|-------------|
| `dashboard` | 대시보드 | 대시보드 | 대시보드 |
| `users` | 회원 관리 | 회원 관리 | 회원 관리 |
| `approvals` | 상품 신청, 이벤트 오퍼 승인, 협업 문의 | 매장 승인, 약사 회원 관리, 이벤트 오퍼 승인 | 신청 관리, 이벤트 오퍼 승인 |
| `products` | — | 상품 관리 | 상품 관리 |
| `stores` | 매장 관리, 채널 관리, **매장 HUB 블로그/POP/QR-code** | 약국 관리, 매장 관리, 채널 관리, **약국 HUB 블로그/POP/QR** | 내 매장, 매장 관리, 채널 관리, **매장 HUB 블로그/POP/QR** |
| `orders` | — | 주문 관리 | 주문 관리 |
| `content` | 공지/뉴스, Home 편집, 콘텐츠 허브 | 가이드라인, 공지/뉴스, 설문조사 | 공지/뉴스, 설문조사 |
| `resources` | 자료실 관리 | 자료실 관리 | 자료실 관리 |
| `lms` | 강의 관리, 강사 승인, **안내 문구 관리** | 강의 관리, 강사 승인, **안내 문구 관리** | 강의 관리, **안내 문구 관리** |
| `signage` | HQ 미디어, HQ 플레이리스트, 템플릿, 강제 콘텐츠 | HQ 미디어, HQ 플레이리스트, 템플릿, 콘텐츠 허브, 콘텐츠 라이브러리, 강제 콘텐츠 | 사이니지 콘텐츠, HQ 미디어, HQ 플레이리스트, 템플릿 |
| `forum` | 포럼 운영, 포럼 관리, 삭제 요청, 포럼 분석 | 포럼 관리, 포럼 신청, 포럼 삭제 요청, 커뮤니티 관리, 포럼 분석 | 포럼 신청, 삭제 요청, 포럼 분석 |
| `analytics` | AI 리포트, 운영 분석 | AI 리포트, AI 사용량, AI 정산, 운영 분석 | AI 리포트 |
| `system` | 법률 관리(admin), 감사 로그(admin), 역할 관리(admin) | 서비스 설정(admin), 회원 관리 Admin(admin) | — |
| `care` | — | — | — |

### 2.3 ENABLED_CAPABILITIES (각 서비스 `config/operatorCapabilities.ts`)

| Capability | KPA | GlycoPharm | K-Cosmetics | STANDARD_GROUPS 가 의존하는 group |
|------------|-----|------------|-------------|------------------------------------|
| `USER_MANAGEMENT` | ✓ | ✓ | ✓ | `users` |
| `MEMBERSHIP_APPROVAL` | ✓ | ✓ | ✓ | `approvals` |
| `CONTENT_MANAGEMENT` | ✓ | ✓ | ✓ | `content`, `resources`, `lms` |
| `COMMUNITY` | ✓ | ❌ | ❌ | `forum` |
| `SIGNAGE` | ✓ | ✓ | ✓ | `signage` |
| `STORE_MANAGEMENT` | ✓ | ❌ | ✓ | `products`, `stores`, `orders` |
| `ANALYTICS` | ✓ | ✓ | ❌ | `analytics` |
| `CARE` | ❌ | ✓ | ❌ | `care` |
| `SETTINGS` | ✓ | ❌ | ❌ | `system` |

---

## 3. 공통 구조

세 서비스가 **동일 패턴 + 동일 코드** 로 보유:

1. **Top-pinned 단독 항목** — `TOP_PINNED_GROUPS = ['dashboard']`, 도메인 헤딩 외부 최상단 단독 링크.
2. **3-domain heading** — `💬 커뮤니티 운영 / 🏪 매장 HUB 운영 / ⚙️ 운영 공통` (이모지 + 한국어 라벨 동일).
3. **Group collapse** — `useState<Set<OperatorGroupKey>>(initialOpen)`, `toggleGroup` 동일, active group 자동 open.
4. **Active route 처리** — `isItemActive(path, exact)` 함수: exact 일치 / `/signage/*` 는 startsWith / 그 외 `path === pathname || pathname.startsWith(path+'/')`.
5. **Capability gate** — `STANDARD_GROUPS.find(g => g.key === groupKey)` 후 `if (standard.capability && !capabilities.includes(standard.capability)) continue;`
6. **Empty domain reject** — 도메인 안 그룹이 0개면 `resolvedDomains` 단계에서 `null` 반환 → 도메인 헤딩 hide.
7. **Desktop aside + mobile horizontal tabs** — 동일 마크업, 동일 Tailwind 클래스.

---

## 4. 서비스별 차이

### 4.1 컴포넌트 레벨 (sidebar.tsx)

- **파일 헤더 주석 + 컴포넌트 이름 + props interface 이름** — 그 외 0.

### 4.2 메뉴 데이터 레벨 (UNIFIED_MENU)

- **라벨 단어 선택**: 매장 vs 약국 (GlycoPharm 만 "약국 HUB 블로그/POP/QR", KPA/K-Cos 는 "매장 HUB ..."). 이는 도메인 어휘 차이로 의도된 변형.
- **그룹 보유 차이**: KPA `products`/`orders` 미보유, K-Cos `system` 미보유, 모두 `care` 미보유.
- **그룹 내 메뉴 항목 차이**: approvals/forum/content/lms/signage 각각 항목 카탈로그 다름 (서비스 도메인 특화).
- **adminOnly 플래그**: KPA system 그룹 항목 + Glyco system 그룹 항목이 admin-only. KPA approvals/lms 일부 admin-only 패턴 사용 검토 (현재는 모두 visible).

### 4.3 capability 레벨

- KPA 가 capability 8/9 보유 → 가장 풍부. Glyco 는 STORE_MANAGEMENT/COMMUNITY/SETTINGS 미보유. K-Cos 는 ANALYTICS/COMMUNITY/SETTINGS/CARE 미보유.

### 4.4 wrapper 레벨

- KPA: `KpaOperatorLayoutWrapper` (`KpaGlobalHeader` + 자체 layout)
- Glyco: `OperatorLayoutWrapper` (`GlycoGlobalHeader` + 자체 layout, `KpaOperatorLayoutWrapper` 와 구조 동일)
- K-Cos: `OperatorLayoutWrapper` (`KCosGlobalHeader` + 자체 layout, 위와 구조 동일)

세 wrapper 모두: `useAuth` → `isAdminOrAbove(user.roles, '<serviceKey>')` → `filterMenuByRole(UNIFIED_MENU, isAdmin)` → `<ServiceGlobalHeader />` → `<ServiceOperatorSidebar menuItems capabilities sidebarTopOffset="top-20" />` → `<Outlet />`. **isAdminOrAbove 의 두 번째 인자만 다르고** (kpa/glycopharm/cosmetics) 나머지 동일.

---

## 5. capability gate 처리 방식

**현재 위치**: sidebar 컴포넌트 내부, `resolvedDomains` 계산 단계.

```ts
const standard = STANDARD_GROUPS.find((g) => g.key === groupKey);
if (!standard) continue;
if (standard.capability && !capabilities.includes(standard.capability)) continue;
```

**효과**: capability 가 활성화 안 된 그룹은 sidebar 렌더에서 누락 + 빈 도메인은 헤딩까지 hide. 운영 smoke test (`out2/`)에서 직접 확인됨:

| 관측 | 원인 |
|------|------|
| Glyco 매장 HUB 안 Stores/products/orders 미표시 | Glyco ENABLED_CAPABILITIES 에 `STORE_MANAGEMENT` 없음 → 3개 그룹 모두 차단 |
| K-Cos 운영 공통 헤딩 자체 미표시 | K-Cos ENABLED_CAPABILITIES 에 `ANALYTICS` 없음 → common 도메인 유일 그룹 차단 → 빈 도메인 헤딩 hide |
| Glyco/K-Cos forum 메뉴 UNIFIED_MENU 정의되어 있으나 운영 미노출 | `COMMUNITY` capability 없음 |
| Glyco system 그룹 정의되어 있으나 운영 미노출 | `SETTINGS` capability 없음 |

**정합성 관찰**: 세 서비스 UNIFIED_MENU 에 forum/system 등 그룹이 정의되어 있는데 capability 가 비활성이라 dead-defined 상태가 존재. 본 IR 의 핵심 risk surface.

---

## 6. 공통 컴포넌트 추출 가능성

### 6.1 sidebar 컴포넌트 자체

✅ **즉시 추출 가능.** 차이가 주석·이름뿐이므로 단일 컴포넌트로 통합해도 동작이 100% 동일.

추출 후보 위치 (선택지):
- `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` (가장 자연스러움 — operator UX 영역 SSOT)
- `packages/ui/src/operator-shell/DomainIASidebar.tsx` (현재 `OperatorShell` 옆에 sibling 으로)
- 별도 신규 패키지 (불필요)

### 6.2 도메인 IA 메타데이터

✅ **즉시 추출 가능.** `OperatorDomainKey`, `DOMAIN_LABELS`, `GROUP_TO_DOMAIN`, `DOMAIN_DISPLAY_ORDER`, `TOP_PINNED_GROUPS`, `DOMAIN_GROUP_ORDER` 모두 세 서비스에서 동일. 공통 모듈로 옮기되 `DOMAIN_GROUP_ORDER.store_hub` 는 5-슬롯(`stores,products,orders,approvals,signage`)으로 정규화 — KPA 에서 `products/orders` 가 없어도 `resolvedDomains` 가 자연 reject 하므로 무해.

### 6.3 wrapper 레벨

⚠️ **조건부 추출 가능.** 3개 wrapper 가 본질적으로 동일하지만 다음 변수가 서로 다름:
- `<ServiceGlobalHeader />` 슬롯
- `isAdminOrAbove(roles, serviceKey)` 의 serviceKey
- max-width / padding / bg 색상은 동일

→ `<OperatorAreaLayout serviceKey="kpa" header={<KpaGlobalHeader/>}>` 같은 패턴으로 공통화 가능. 단, header 슬롯은 서비스마다 분리되어야 하므로 children/slot prop 으로 받음.

### 6.4 capability gate 처리 위치

⚠️ **재배치 검토 필요.** 현재 sidebar 내부에 hardcoded. 공통화 시 그대로 sidebar 안에 두는 것이 자연스러우나, "capability 정책이 sidebar 렌더링 정책을 덮어쓰는" 현재 구조가 의도된 정책인지 확인 후 추출.

---

## 7. 공통화 시 필요한 props/API 초안

```ts
// packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx (proposed)

import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';
import type { OperatorCapability } from '@o4o/types';

export type OperatorDomainKey = 'community' | 'store_hub' | 'common';

export interface DomainIASidebarProps {
  /** capability + adminOnly 필터 끝난 메뉴. 호출처(wrapper)가 사전 필터 수행. */
  menuItems: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>>;

  /** 서비스 활성 Capability. capability gate 입력. */
  capabilities: OperatorCapability[];

  /** sticky top offset Tailwind 클래스. default 'top-6'. GlobalHeader 사용 시 'top-20'. */
  sidebarTopOffset?: string;

  /** 도메인 헤딩 라벨/이모지 override (현재 한국어 라벨 default). 다국어 지원 시 사용. */
  domainLabels?: Record<OperatorDomainKey, { label: string; emoji: string }>;

  /** 도메인별 그룹 표시 순서 override. 서비스가 store_hub 안 products/orders 순서를 변경하고 싶을 때. */
  domainGroupOrder?: Record<OperatorDomainKey, OperatorGroupKey[]>;

  /** group → domain 매핑 override. 사실상 0 케이스이지만 escape hatch. */
  groupToDomain?: Record<OperatorGroupKey, OperatorDomainKey>;

  /** 도메인 표시 순서. default ['community','store_hub','common']. */
  domainDisplayOrder?: OperatorDomainKey[];

  /** 도메인 헤딩 외부 최상단 고정 group. default ['dashboard']. */
  topPinnedGroups?: OperatorGroupKey[];
}
```

**디자인 결정**:
- `menuItems` + `capabilities` 만 **필수**. 그 외 모두 optional + 합리적 default.
- 서비스별 UNIFIED_MENU + filterMenuByRole 은 **호출처(wrapper)** 에 유지 — admin/operator role 정의는 서비스 정책이므로 분리.
- override props 는 escape hatch — 다국어/디자인 시스템 확장 대비. v1 에서는 default 만으로 3개 서비스 충족.

### Wrapper 공통화 (선택)

```tsx
// packages/operator-ux-core/src/layout/OperatorAreaLayout.tsx (proposed, v2)

interface OperatorAreaLayoutProps {
  serviceKey: 'kpa' | 'glycopharm' | 'cosmetics' | string;
  header: React.ReactNode;
  menuItems: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>>;
  capabilities: OperatorCapability[];
  children?: React.ReactNode;
}
```

v1 에서는 sidebar 만 추출, wrapper 는 서비스별 thin shell 유지 권장.

---

## 8. 위험요소

| # | 위험 | 영향 | 완화책 |
|---|------|------|--------|
| 1 | **Capability gate 정책 회귀** | Glyco 의 forum/system, K-Cos 의 forum/analytics 메뉴가 dead-defined → 공통화로 노출되면 UX 회귀처럼 보일 수 있음 | 공통화 전 capability 정책 IR 1건 선행 (의도/회귀 분리) |
| 2 | **Active route 오판** | `isItemActive` 가 `/signage/*` 만 startsWith, 그 외는 정확 매칭 + child path. 서비스가 자체 prefix (`/operator/foo`) 외 패턴 (예: redirect target 이 다름) 가지면 active 잘못 표시 | 추출 후 3개 서비스 운영 smoke 재실행 — 본 IR 의 smoke2.mjs 재사용 가능 |
| 3 | **DOMAIN_GROUP_ORDER 정규화 차이** | KPA 가 5-슬롯으로 정규화될 때 `products/orders` 가 비어있어도 무해하나 향후 KPA 가 두 그룹을 도입할 때 위치 결정 충돌 | 5-슬롯으로 정규화하고 KPA UNIFIED_MENU 의 향후 변경은 별도 WO 로 처리 |
| 4 | **packages 경계 변경** | 새 패키지에 sidebar 를 두면 Dockerfile 의 file-by-file COPY 블록 영향 (관련 memory 항목: dockerfile-package-dependencies). 4개 서비스 (kpa-society, glycopharm, k-cosmetics, neture) Dockerfile 모두 갱신 필요 | `packages/operator-ux-core` (이미 존재) 에 추가하여 신규 패키지 회피. 단, 4 서비스 모두 `@o4o/operator-ux-core` 의존성에 추가되었는지 확인 |
| 5 | **TypeScript 빌드 ref pattern** | k-cosmetics 는 `tsc -b` 패턴 (memory 항목: typescript-build-verification). 공통 컴포넌트 추출 후 모든 서비스에서 `tsc --noEmit` 회귀 검증 필요 | WO 검증 단계에 명시 |
| 6 | **lucide-react icon 의존성** | 추출된 패키지는 `lucide-react` 를 peer dep 로 가져야 함. 현재 sidebar 가 사용 중 (`Home, Users, ... Settings` 등) | peer dep 명시 |
| 7 | **운영 smoke 재검증 비용** | 3개 서비스 × 2 페이지 (/operator + /operator/members) + 1 프로필 dropdown — 본 IR 의 `c:/tmp/smoke/smoke2.mjs` 재실행으로 ~30초 | 자동화 자산 보존 |
| 8 | **STANDARD_GROUPS 변경 동기화** | sidebar 가 `STANDARD_GROUPS` 의 icon/label 을 직접 import. STANDARD_GROUPS 가 packages/ui 에 있고 새 sidebar 가 packages/operator-ux-core 에 있으면 cross-package import 가 자연스럽지만 cyclic 가능성 점검 | 공통화 PR 에서 dependency graph 확인 |

---

## 9. 후속 WO 필요 여부

### 9.1 본 IR 결과로 즉시 가능한 WO 후보

**A. (선행 권고) Capability 정합 IR + WO**

- **IR**: `IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1`
- **목적**: Glyco forum/system, K-Cos forum/analytics, KPA care 등 정책 의도/회귀 여부 명확화
- **산출물**: 각 서비스 ENABLED_CAPABILITIES 의 의도 명세 + UNIFIED_MENU 와의 정합 매트릭스
- **선행 권고 이유**: 공통화 직후 위 dead-defined 그룹이 운영자에게 노출 회귀처럼 보일 가능성 차단

**B. (주 작업) 공통 sidebar + 도메인 IA 메타데이터 추출 WO**

- **WO**: `WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1`
- **목적**: `DomainIASidebar` + 도메인 IA 메타데이터를 `@o4o/operator-ux-core` (또는 `@o4o/ui`) 로 추출, 3개 서비스가 import 사용
- **범위**:
  1. `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` 신규 (KpaOperatorSidebar 의 logic 복사)
  2. `packages/operator-ux-core/src/sidebar/operatorDomainIA.ts` 신규 (DOMAIN_LABELS, GROUP_TO_DOMAIN, DOMAIN_GROUP_ORDER, DOMAIN_DISPLAY_ORDER, TOP_PINNED_GROUPS)
  3. 3개 서비스의 `KpaOperatorSidebar.tsx`/`GlycoOperatorSidebar.tsx`/`KCosOperatorSidebar.tsx` 삭제 + wrapper 에서 새 import 로 교체
  4. 3개 서비스의 `operatorMenuGroups.ts` 에서 도메인 IA 메타데이터 6개 export 제거 (UNIFIED_MENU + filterMenuByRole 만 유지)
- **검증**:
  - `tsc --noEmit` 3 서비스 모두 clean
  - Vite transform probe 3 서비스
  - 운영 smoke (`c:/tmp/smoke/smoke2.mjs`) 재실행 — 사이드바 IA + 라벨 grep 동일 결과
- **추정 변경량**: 신규 패키지 파일 2건, 삭제 3건, 수정 3-6건 (wrapper + operatorMenuGroups.ts)

**C. (선택) Wrapper 공통화 WO**

- **WO**: `WO-O4O-CROSSSERVICE-OPERATOR-LAYOUT-WRAPPER-COMMON-V1`
- **목적**: 3개 wrapper 의 본질적 동일 부분을 `<OperatorAreaLayout>` 으로 추출, header 는 슬롯
- **선후관계**: B 이후. B 단독으로도 충분한 가치 (sidebar 357 줄 × 3 = ~1000 줄 제거).

### 9.2 결론

- **즉시 필요**: A (capability 정합) — 본 IR 발견의 직접 후속
- **준비 완료**: B (sidebar 추출) — A 끝나면 작업 가능
- **선택**: C (wrapper 추출) — B 후 별도 사이클

---

## 10. Current Structure vs O4O Philosophy Conflict Check

CLAUDE.md SSOT Priority Chain (`O4O-BUSINESS-PHILOSOPHY-V1` → `O4O-3-ROLE-FLOW-BASELINE-V1` → Operator UX Baselines → Store Side Standards → 영역별 Freeze) 와의 충돌 검토:

| SSOT | 본 IR 결론과의 정합 | 비고 |
|------|---------------------|------|
| `O4O-BUSINESS-PHILOSOPHY-V1` §3.2 Operator 정의 | ✅ 정합 | "서비스 운영 사업자 (자료 수신·등록·구성 + AI 활용 + 매장 실행 자산 제작 + 큐레이션 + 매장 지원 + 운영 수익)" — sidebar 도메인 IA (커뮤니티 / 매장 HUB / 운영 공통) 가 이 정의의 권한 매트릭스에 정합 |
| `O4O-3-ROLE-FLOW-BASELINE-V1` §2 책임 매트릭스 | ✅ 정합 | 매장 HUB 운영 축에 stores/products/orders/approvals/signage 가 모이는 구조가 책임 매트릭스의 "운영 자산 제작 + 매장 지원" 흐름과 일치 |
| `O4O-OPERATOR-CANONICAL-WORKFLOW-V1` (검수·승인 UX) | ✅ 정합 | approvals 그룹이 매장 HUB 안에 위치, 도메인 헤딩으로 명시적 분리 |
| `O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1` (5 Workspace UX) | ⚠️ **부분 정합 / 후속 검토** | A 자료 등록 / B AI 작업 / C 큐레이션 / D 매장 지원 / E 운영 수익 → 5 Workspace 가 sidebar 의 어디에 매핑되는지 본 IR 범위 외. CLAUDE.md §11 `OPERATOR-DASHBOARD-STANDARD-V1 §5-6~§5-9` 의 A~F 6 Workspace 가 도메인 IA 와 직교(orthogonal)이거나 혼재 가능 — 공통화 PR 에서 Workspace 매핑을 sidebar 가 강제하지 않도록 주의 |
| `O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1` | ✅ 정합 | 매장 HUB 블로그/POP/QR 가 stores 그룹 안에 위치 (HUB Publishing 진입점) |
| `O4O-STORE-MENU-CANONICAL-TREE-V1` | ✅ 정합 | 매장 HUB 측 6 항목 진입점이 stores 그룹에 모임 |
| `BASELINE-OPERATOR-OS-V1` (Freeze F1, operator-ux-core 포함) | ⚠️ **경계 확인 필요** | sidebar 를 `@o4o/operator-ux-core` 에 추가하면 Freeze 영역 변경 — F1 명문에 따라 "버그 수정·성능 개선·문서·테스트는 허용" 이며 신규 컴포넌트 추가는 "구조 변경" 으로 분류될 가능성. **공통화 WO 시 명시적 Freeze 변경 WO 라벨 필요** |
| `RBAC-FREEZE-DECLARATION-V1` (Freeze F9) | ✅ 정합 | sidebar 가 RBAC role 을 직접 검사하지 않음 — wrapper 의 `isAdminOrAbove` 로 분리 유지 |

**충돌 결론**: 본 IR 결과로 공통화를 진행해도 핵심 사업 철학·3자 Flow·HUB Publishing·Store Menu canonical 와 충돌 없음. 다만 두 가지 주의:

1. **5/6 Workspace UX vs 3-domain IA** — 도메인 IA 는 권한·기능 축, Workspace 는 작업 흐름 축. 본 sidebar 공통화는 도메인 IA 만 다루며 Workspace 진입은 sidebar 외부 (예: 대시보드 5/6-Block) 책임. 공통 sidebar 가 Workspace 를 강제하지 않도록 명시.
2. **Operator OS Freeze (F1) 경계** — 추출 위치가 `@o4o/operator-ux-core` 라면 Freeze 영역 추가/이동을 WO 본문에 명시 + 별도 Freeze 변경 WO 검토.

---

## 판정

> **일부 정리 후 공통화 가능 (Conditional GO).**
>
> - **(필수 선행) Capability 정합 IR/WO** (위 9.1.A) — Glyco/K-Cos UNIFIED_MENU 에 정의되었으나 capability 차단으로 dead-defined 인 forum/system/analytics 그룹의 정책 의도/회귀 확정.
> - 그 후 **공통 sidebar + 도메인 IA 메타데이터 추출 WO** (위 9.1.B) — 즉시 진행 가능.
> - Wrapper 공통화는 (9.1.C) 별도 사이클.

본 IR 은 코드 수정 없이 read-only 로 완료. 차후 WO 진입 시 본 문서를 reference 로 인용 가능.
