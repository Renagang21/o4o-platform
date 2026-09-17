# CHECK-O4O-STORE-HOME-CANONICAL-SHELL-V1

> **작업명:** WO-O4O-STORE-HOME-CANONICAL-SHELL-V1
> **유형:** 공통화 1차 구조 변경 — `@o4o/store-ui-core` 에 canonical `StoreHomeShell` 추가(additive) adopt. KPA/K-Cosmetics adopt 는 후속 WO.
> 렌더 순서·의미 보존(refresh→banner→AI요약→인사이트). backend/API/DB/package/lock/route 변경 0. StoreDashboardLayout/Sidebar/Menu 무변경. KPA/K-Cosmetics 무변경.
> 선행: IR-O4O-STORE-HOME-CROSSSERVICE-AUDIT-V1
>
> *Date: 2026-06-17*

---

## 0. 핵심 설계 결정 (제약 기반)

**`store-ui-core` 는 `@o4o/hub-core` 를 dependency 로 갖지 않으며, 본 WO 는 package.json 변경 금지.** → `StoreHomeShell` 은 `HubLayout`/`HubSection` 을 import 할 수 없다. 또한 "새 카드 시스템 생성 금지".

따라서 셸은 **카드 섹션을 직접 렌더하지 않는다.** 대신 3서비스 홈에서 카드 섹션 "위"에 공통으로 존재하는 **canonical pre-sections 영역**(새로고침/매장선택/배너/AI요약/인사이트/온보딩)을 공통화한다. 소비처는 이 셸을 **`HubLayout` 의 `beforeSections`** 로 주입한다. 카드 섹션 렌더는 `HubLayout`(서비스가 hub-core 의존) 이 계속 담당.

> WO 제안 props 중 `sections`/`signals`(raw data) 는 hub-core 의존이 필요해 **본 제약상 미채택**. 대신 카드 섹션은 HubLayout 에 위임하고, 셸은 그 위 영역을 슬롯으로 공통화. (3서비스 차이가 정확히 이 영역에 존재: KCos 매장선택 / KPA 온보딩 / 서비스별 배너·AI.)

---

## 1. 추가된 `StoreHomeShell` 파일/exports

| 파일 | 변경 |
|------|------|
| `packages/store-ui-core/src/components/StoreHomeShell.tsx` | **신규** — canonical pre-sections 셸 + 공통 인사이트 렌더 |
| `packages/store-ui-core/src/index.ts` | additive export: `StoreHomeShell`, `StoreHomeShellProps` |
| `docs/checks/CHECK-O4O-STORE-HOME-CANONICAL-SHELL-V1.md` | 본 CHECK |

**export(additive — 기존 export 무변경):**
```ts
export { StoreHomeShell } from './components/StoreHomeShell';
export type { StoreHomeShellProps } from './components/StoreHomeShell';
```

**의존:** 기존 store-ui-core deps 만 사용 — `@o4o/ui`(Card), `lucide-react`(peer, RefreshCw), 자체 `engine/storeInsightEngine`(StoreInsight). **hub-core 의존 추가 없음.**

---

## 2. 기존 `StoreDashboardLayout` 과의 관계

- `StoreDashboardLayout`(셸: header/sidebar/footer/menu) **무변경**. `StoreSidebar`/`resolveStoreMenu` **무변경**.
- 계층: `StoreDashboardLayout`(Outlet) → `StoreOverviewPage` → `HubLayout`(카드) ← `beforeSections={<StoreHomeShell/>}`.
- `StoreHomeShell` 은 `StoreDashboardLayout` 의 main content 안, `HubLayout` 헤더와 카드 섹션 사이에 렌더된다. Layout 셸과 책임이 겹치지 않음(Layout=프레임, Shell=본문 상단 운영영역).

---

## 3. `HubLayout` 재사용 방식

- `HubLayout` 은 그대로 사용 — title/subtitle/sections/signals/userRoles/onCardClick/onActionTrigger/footerNote 유지.
- `StoreHomeShell` 을 `HubLayout.beforeSections` 로 주입 → HubLayout 렌더 순서(header → **beforeSections** → sections → afterSections → footer) 상 카드 섹션 바로 위에 위치.
- **카드 렌더 로직(역할 필터 `filterSectionsByRole`, signal 주입, pulse 스타일) 전부 HubLayout 이 담당** — 셸이 중복 구현하지 않음. (새 카드 시스템 0)

---

## 5. props/slot 목록

| prop | 타입 | 역할 |
|------|------|------|
| `loading` | boolean | 새로고침 disable/spin, 인사이트 숨김 |
| `onRefresh` | () => void | 미주입 시 새로고침 버튼 미표시 |
| `refreshLabel` | string | 기본 '새로고침' |
| `storeSelectorSlot` | ReactNode | **다중 매장 선택(K-Cosmetics)**. 단일 매장이면 미주입 |
| `bannerSlot` | ReactNode | 서비스 배너(예: 주문/매출 준비중). 조건은 서비스가 결정 |
| `aiSummarySlot` | ReactNode | AI 운영 요약(서비스 데이터/문구) |
| `insights` | StoreInsight[] | 공통 인사이트 렌더(엔진 산출). 빈 배열/미주입/loading 시 미표시 |
| `insightsTitle` | string | 기본 '경영 인사이트' |
| `onInsightAction` | (target) => void | 인사이트 action 클릭 |
| `onboardingSlot` | ReactNode | **초기 사용자/빈 상태(예: KPA 실행 흐름 3단계)** |
| `beforeSections` | ReactNode | canonical 슬롯 외 escape hatch |

**렌더 순서:** refresh → storeSelectorSlot → bannerSlot → aiSummarySlot → insights → onboardingSlot → beforeSections.

---

## 6. K-Cosmetics 다중 매장 슬롯 대응 가능성

- `storeSelectorSlot` 으로 매장 select UI 주입 가능(refresh 바로 아래, 최상단). 단일 매장 서비스는 미주입 → 영향 0.
- K-Cosmetics adopt 시: `getMyStores()` → select → `onStoreChange` 는 **서비스 page/adapter 책임**(셸은 storeId 를 알지 않음, 슬롯만 제공) → 설계 원칙(셸이 API/도메인 미인지) 충족.
- 매장 메타 헤더(매장명/상태/역할/멤버수)는 `storeSelectorSlot` 내부 또는 별도 후속에서 `HubLayout.title` 영역 활용 — adopt WO 에서 확정.

→ **대응 가능.** (후속 `WO-...-KCOSMETICS-ADOPT-V1`)

## 7. KPA 온보딩 슬롯 대응 가능성

- `onboardingSlot` 으로 KPA "실행 흐름 3단계" 카드 주입 가능. 노출 조건(빈 상태/초기 사용자)은 서비스가 결정.
- 운영 데이터 충분 시 KPA page 가 `onboardingSlot` 미주입 → 운영 상태판으로 동작.

→ **대응 가능.** (후속 `WO-...-KPA-ADOPT-V1`)

---

## 8. 이번 WO에서 변경하지 않은 것

- ✅ `StoreDashboardLayout` / `StoreSidebar` / `resolveStoreMenu` 동작 **무변경**
- ✅ `hub-core`(HubLayout/HubSection) **무변경**
- ✅ **KPA / K-Cosmetics 코드 변경 0**
- ✅ backend / API / DB / migration **변경 0**
- ✅ **package.json / lock 변경 0** (hub-core 의존 미추가 — 셸 설계로 회피)
- ✅ route 변경 0
- ✅ 새 API 통합 계층 / 새 카드 시스템 **생성 0**

---

## 9. 검증 결과

| 항목 | 결과 |
|------|------|
| `store-ui-core` typecheck (`tsc -p tsconfig.json --noEmit`) | **PASS (exit 0)** |
| 렌더 순서/의미 | — |
| 정적 분석 | 새 카드 시스템 0, hub-core 의존 0, additive export only |
| KPA/K-Cosmetics 무변경 | 코드 미접촉 확인 |
| backend/DB/package/lock | 변경 0 확인 |
| browser smoke | **미수행** — 배포 후 권장(아래 후속 §10-SMOKE). 코드상 마크업/순서 보존이라 회귀 위험 낮음 |

> 3서비스 공통화 완료는 KCos/KPA adopt WO 후 별도 판정.

---

## 10. 완료 판정

StoreDashboardLayout/Sidebar/Menu·hub-core·KPA·K-Cosmetics·backend·API·DB·package·route 변경 0. K-Cosmetics 다중매장(`storeSelectorSlot`)·KPA 온보딩(`onboardingSlot`) 수용 슬롯 문서화.

## 11. 후속 WO

2. **`WO-O4O-STORE-HOME-KCOSMETICS-ADOPT-V1`** — `storeSelectorSlot`(다중매장) 포함 adopt. (KCos 홈 = `StoreCockpitPage`)
3. **`WO-O4O-STORE-HOME-KPA-ADOPT-V1`** — KPA `StoreHomePage` adopt, 실행 흐름 → `onboardingSlot` 강등.

---

*Date: 2026-06-17 · store home canonical shell 1차 · PASS · StoreDashboardLayout/Sidebar/Menu·hub-core·KPA·KCos·backend·API·DB·package·route 변경 0 · 다중매장/온보딩 슬롯 문서화 · browser smoke 배포후 권장 · KCos/KPA adopt 후속.*
