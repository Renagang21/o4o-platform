# CHECK-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1

- **WO**: WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1 — KPA-Society 기준 4서비스 "내 매장 홈" 공통화
- **일자**: 2026-08-13
- **작업공간**: worktree `C:\tmp\o4o-common-my-store` / branch `work/commonization-my-store` (base `origin/main` = `0a2d88100`)
- **선행**: `IR-O4O-STORE-HOME-CROSSSERVICE-AUDIT-V1`, `WO-O4O-STORE-HOME-CANONICAL-SHELL-V1`
- **판정**: **PASS** (typecheck 4/4, build 4/4). 브라우저 smoke 는 미수행 — 아래 §5.

---

## 1. 기존 차이 (착수 시점)

| 항목 | KPA (`/store` StoreHomePage) | GlycoPharm (StoreOverviewPage) | K-Cosmetics (StoreCockpitPage) | PharmacyHub (HomePage) |
|---|---|---|---|---|
| StoreDashboardLayout | O | O | O | O |
| StoreHomeShell | 사용(슬롯 1개, 퇴화) | **사용(레퍼런스)** | 사용(슬롯 1개, 퇴화) | **미사용** |
| 홈 헤더(제목·부제·새로고침) | 자체 마크업 | HubLayout title | 자체 마크업 | 자체 `<header>` |
| loading/error/empty | 자체 3벌 | 셸 loading | 자체 3벌 | 자체 |
| KPI 카드 | 자체 4카드 | (인사이트 중심) | 템플릿 grid 자체 렌더 | 로컬 `SummaryCard` |
| 처리 필요 신호 | Live Signals 자체 | — | — | 결제 대기 안내 섹션 |
| 최근 활동 패널 | 자체 2개 | — | 최근 주문(빈 값이면 블록 자체가 사라짐) | 최근 주문 자체 |

→ 공통 셸은 있었으나 **헤더·상태·신호·KPI·활동 패널이 4서비스에 각각 중복**. PharmacyHub 는 셸 밖.

## 2. 공통 Core 와 서비스별 config/slot

**`@o4o/store-ui-core` 신규 (`src/components/home/`)**

| 컴포넌트 | 공통화한 것 | 서비스별로 남긴 것 |
|---|---|---|
| `StoreHomeMetricGrid` | 그리드·카드 chrome·로딩 스켈레톤·빈값 placeholder(`–`, 0 은 0 유지) | 항목/문구/링크/아이콘, `variant` 3종, `columnsClassName`, `content` escape hatch |
| `StoreHomeSignalList` | 신호 행 마크업·tone 5종·Link/`role=status` 분기 | 신호 문구·조건·목적지 |
| `StoreHomeActivityPanel` | 제목·더보기 링크·로딩·빈 상태 chrome | 행 렌더(children) |
| `StoreHomeStateView` | loading/error/empty 전면 상태·재시도·CTA | 문구·CTA 경로 |

**`StoreHomeShell` 확장 (전부 선택 prop — 기존 소비처 동작 불변)**
`title` / `subtitle` / `headerActions` / `statusSlot` / `signalsSlot` / `metricsSlot` / `children`

canonical 순서: `헤더 → storeSelector → banner → status → signals → metrics → aiSummary → insights → children → onboarding → beforeSections`

**서비스별 명칭 원천**: `@o4o/operator-ux-core` 의 `kpaConfig` / `kcosmeticsConfig` `uiText.storeHomeTitle`·`storeHomeSubtitle`, GlycoPharm 은 HubLayout title, PharmacyHub 는 자체 `config/service.ts`(BRAND). — **신규 config 축 만들지 않음.**

## 3. 4서비스 적용 결과

- **KPA** `services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx` — noStore/loading → `StoreHomeStateView`, Live Signals → `StoreHomeSignalList`, KPI 4종 → `StoreHomeMetricGrid(icon-centered)`, 홍보 성과·최근 활동 → `StoreHomeActivityPanel`, 실행 흐름 3단계 → `onboardingSlot`. 문구·링크·아이콘·집계 원본 유지.
- **GlycoPharm** `StoreOverviewPage.tsx` — **변경 없음**(레퍼런스 소비처). 셸 하위호환으로 무수정 통과 확인.
- **K-Cosmetics** `StoreCockpitPage.tsx` — 로딩/오류/빈 → `StoreHomeStateView`(재시도 `loadStores`, CTA `/operator/applications` 보존), 매장 select → `storeSelectorSlot`, 매장 상태 카드 → `statusSlot`, 템플릿 KPI → `StoreHomeMetricGrid(icon-inline, columnsClassName = tpl.layout.grid)`, 채널 비율은 `content` 로 원형 보존, 최근 주문 → `StoreHomeActivityPanel`.
  - **의도된 UX 변화 1건**: 주문 0건일 때 블록이 통째로 사라지던 것 → "아직 주문 내역이 없습니다" 빈 상태 노출(빈 상태 통일).
- **PharmacyHub** `HomePage.tsx` — 셸 최초 채택. 로컬 `SummaryCard` 제거 → `StoreHomeMetricGrid(label-top)`, 결제 대기 안내 → `StoreHomeSignalList`(amber, `/store-owner/orders`), 최근 주문 → `StoreHomeActivityPanel(padded=false)`, 바로가기 grid 는 서비스 로컬 children 유지. 결제 화면 직접 링크 금지 규칙 유지.

**미변경 확인**: route, guard/권한, API endpoint·응답 계약, 집계 의미, package.json/lockfile, DB/migration.

## 4. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` web-kpa-society | PASS (0) |
| `tsc --noEmit` web-k-cosmetics | PASS (0) |
| `tsc --noEmit` web-pharmacy-hub | PASS (0) |
| `tsc --noEmit` web-glycopharm | PASS (0) |
| `vite build` 4서비스 | PASS 4/4 |
| StoreHomeShell 소비처 전수 grep | 4개(위 4서비스)뿐 — 외부 회귀 없음 |
| 데스크톱/모바일 | 반응형 클래스 기준 정적 확인(`grid-cols-2 lg:grid-cols-4`, 헤더 `flex-wrap`, 새로고침 `shrink-0 whitespace-nowrap`) |

**미수행**: 4서비스 프로덕션 브라우저 smoke. 본 브랜치는 배포되지 않으므로 main 병합 후 별도 수행 필요.

## 5. 변경 파일 · commit

신규 4 / 수정 5 (`packages/store-ui-core` 6, `services/*` 3)

| commit | 범위 |
|---|---|
| `b6b4fa13b` | store-ui-core canonical 파트 4종 + 셸 슬롯 확장 |
| `3a99afd48` | KPA 적용 |
| `8996ce713` | K-Cosmetics 적용 |
| `e924809c0` | PharmacyHub 적용 |
| (본 커밋) | CHECK 문서 |

branch `work/commonization-my-store` push. **main 직접 병합 없음.**

## 6. 다음 공통화 대상 제안

1. **매장 바로가기(Quick Actions)** — 4서비스 모두 자체 grid. 본 WO 에선 소비처 1개뿐이라 보류했으나, 이제 4곳 형태가 드러났으므로 `StoreHomeShortcutGrid` 로 수렴 가능.
2. **매장 상태 헤더(statusSlot 내부)** — K-Cosmetics·PharmacyHub 가 거의 동형(매장명 + 상태 배지 + 경고문). `StoreHomeStoreStatusCard` 후보.
3. **AI 운영 요약 카드** — 현재 GlycoPharm/KPA 각자. Backend `CopilotEngineService` 계약이 공통이므로 렌더만 수렴 가능.
4. **주문 목록 행(row)** — K-Cosmetics·PharmacyHub 최근 주문 행이 동형. `orderStatusBadge`/`won` 유틸 공통화 선행 필요.

---

## 7. 병행 작업 통합 (2026-08-13 추가)

같은 WO 를 다른 에이전트가 `work/commonization-my-store` 에 먼저 구현·push 한 것을 발견해 **force-push 없이 merge** 로 통합했다.

| 대상 | 처리 |
|---|---|
| `StoreHomeShell` | 본 브랜치 판(title/subtitle + status/signals/metrics + children)을 채택. 상대 판의 순수 slot API(`headerSlot`/`summarySlot`/`activitySlot`/`quickActionsSlot`)는 동일 목적이라 중복 축을 만들지 않고 대체 |
| 상대 판의 `contentClassName`(간격 보존 wrapper) | **유지** — 본 셸에 반영 |
| `services/web-pharmacy-hub/.../HomePage.tsx` | 본 브랜치 판 채택(공통 파트 4종까지 사용하는 상위 집합) |
| handled-products 공통 계약 (`packages/store-ui-core/src/types/handledProducts.ts`, package.json `./handled-products` export, KPA/PH API 타입) | **전량 보존** — 후속 WO-O4O-MY-STORE-HANDLED-PRODUCTS-VIEW-COMMONIZATION-V1 의 기반 |
| `CHECK-O4O-MY-STORE-HANDLED-PRODUCTS-CROSSSERVICE-COMMONIZATION-V1.md` | 보존 |

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
