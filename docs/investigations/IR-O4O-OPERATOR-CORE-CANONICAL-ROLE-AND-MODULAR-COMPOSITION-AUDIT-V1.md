# IR-O4O-OPERATOR-CORE-CANONICAL-ROLE-AND-MODULAR-COMPOSITION-AUDIT-V1

> **WO**: `WO-O4O-OPERATOR-CORE-CANONICAL-ROLE-AND-MODULAR-COMPOSITION-AUDIT-V1`
> **성격**: read-only 조사 + 조사 결과에 따른 기준 문서 정비 (docs-only)
> **기준 commit**: `0502a7afb` (main)
> **선행 문서**: [`IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1`](IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1.md) · [`O4O-COMMONIZATION-STANDARD` V2](../architecture/O4O-COMMONIZATION-STANDARD.md)
> **작성일**: 2026-08-03
>
> 본 IR 은 **`@o4o/operator-core` 제거를 전제로 하지 않는다.** 운영자 구조 전체에서 어떤 패키지가 어떤 canonical 역할을 맡아야 하는지를 먼저 확정하고, 그 위에서 `operator-core` 의 위치를 판정한다.

---

## 1. 목적 · 범위

### 1.1 확정하려는 것 (WO §1)

> 서비스마다 필요한 운영자 기능 모듈을 **선택하여 구성**하고, 공통 기능은 **core 로 공유**하며, 서비스별 정책과 차이는 **extension 으로 주입**할 수 있는 운영자 아키텍처를 확정한다.

지원해야 하는 조건:

| # | 조건 | 본 IR 판정 |
|:-:|------|-----------|
| 1 | 회원관리는 여러 서비스 공통 | ✅ 이미 공통 모듈 존재 (§8) |
| 2 | 회원 **승인**은 서비스별로 있을 수도 없을 수도 | ✅ capability `MEMBERSHIP_APPROVAL` 로 분리됨 |
| 3 | 커뮤니티 없는 서비스도 구성 가능 | ✅ capability `COMMUNITY` + 모듈 미import 로 성립 (§9) |
| 4 | LMS 없는 서비스도 구성 가능 | ✅ Neture 가 실증 (§7) |
| 5 | 공급자·매장·상품·거래도 선택적 | ✅ group key + 모듈 단위 선택 (§7·§9) |
| 6 | 신규 서비스가 필요한 모듈만 채택 | ⚠ 가능하지만 **선언적 절차가 아니라 import 관행**에 의존 (§9) |
| 7 | 서비스 고유 기능을 core 에 강제 포함 금지 | ✅ 이미 명문화 (`OPERATOR-INTEGRATION-STATE-V1` 🔴 Extension) |

### 1.2 범위 밖

GlycoPharm 은 조사·비교·적용 검토 대상이 아니다. 본 IR 이 GlycoPharm 을 언급하는 경우는 **기존 코드에 실재하는 참조를 사실로 기록**할 때뿐이며, 그 기재는 요구사항의 근거로 사용하지 않는다(`historical out-of-scope`).

보호 파일 `apps/api-server/src/routes/service-admin.routes.ts` 는 열람·수정하지 않았다. 조사 시점 작업 트리는 clean 이었다.

---

## 2. 조사 방법 · 증거 기준

| 항목 | 기준 |
|------|------|
| **소비 판정** | `package.json` dependency 가 아니라 **실제 코드 참조** (`git grep`) |
| **소비 0 판정 시 재검증** | 정적 import 외에 dynamic import · Dockerfile COPY · tsconfig reference · tailwind content glob · build script · lockfile 을 각각 확인 |
| **역할 판정** | 패키지가 실제로 export 하는 것 + 실제 소비처가 사용하는 것 |
| **모듈 선택 가능성 판정** | "메뉴 숨김"과 "route 미등록"과 "번들 미포함"을 **분리해서** 확인 |
| **미확인** | 추정하지 않고 `INSUFFICIENT_EVIDENCE` 로 표기 |

조사 중 코드 변경 0 · package 변경 0 · route 변경 0 · DB 접근 0 · 배포 0.

---

## 3. 조사 A — `@o4o/operator-core` 의 현재 내용

### 3.1 실제 구성 (13 파일 · 약 694 L)

| 경로 | L | 성격 |
|------|--:|------|
| `src/index.ts` | 39 | public barrel |
| `src/types.ts` | 48 | `SignalStatus` · `OperatorSignal` · `OperatorHeroConfig` · `OperatorSignalCardConfig` · `OperatorActivityItem` · `OperatorDashboardConfig` |
| `src/layout/OperatorLayout.tsx` | 105 | Hero + ActionPanel + SignalCards + ActivityFeed 셸 |
| `src/layout/OperatorHero.tsx` | 56 | Hero 요약 |
| `src/layout/OperatorSignalCards.tsx` | 20 | 카드 그리드 |
| `src/layout/OperatorActivityFeed.tsx` | 54 | 활동 피드 |
| `src/layout/OperatorActionPanel.tsx` | 129 | AI 행동 제안 패널 |
| `src/components/SignalCard.tsx` | 59 | 카드 1장 |
| `src/components/StatusDot.tsx` | 22 | 상태 점 |
| `src/signal.ts` | 82 | `computeOverallSignal` · `computeForumSignal` · `computeContentSignageSignal` · `sortAndLimitActivity` |
| `src/threshold.ts` | 24 | `DEFAULT_THRESHOLD` · `ThresholdRule` |
| `src/action.ts` | 72 | `generateOperatorActions` · `OperatorActionSuggestion` · `OperatorActionTrigger` |
| `src/utils.ts` | 14 | `timeAgo` |

**책임 축 3개**: ①운영자 대시보드 **레이아웃 셸** ②**Signal 파생 엔진**(클라이언트 계산) ③**AI 행동 제안 생성**(클라이언트 계산).

### 3.2 생성 목적과 이력 (git)

| commit | 내용 |
|--------|------|
| `bd48832f0` | `operator-core` 패키지 추출 + KPA 대시보드 리팩터 (**최초 생성**) |
| `d52721607` | Neture 대시보드를 operator-core 로 전환 |
| `9ea35ad02` | React 19 통일 + GlycoPharm / K-Cosmetics 를 operator-core 로 전환 |
| `4f11055d6` | Signal 엔진을 shared core 로 추출 (`WO-OPERATOR-SIGNAL-CORE-V1`) |
| `a409ebcd2` | Signal threshold config 추가 |
| `1a5580924` | AI Action Layer 추가 |
| `31000fa4f` | Action Trigger 실행 계층 추가 |

즉 `operator-core` 는 **Cycle 1 이전 세대의 운영자 대시보드 공통화 1차 시도**이며, 당시 4개 서비스가 실제로 채택했다.

### 3.3 대체 이력 — 5-Block 전환

| commit | 내용 |
|--------|------|
| `f5de08c36` | Neture 대시보드 → 5-Block |
| `b19ff8809` | GlycoPharm → 5-Block *(historical)* |
| `3f321489a` | K-Cosmetics → 5-Block |
| `bf41b174f` | KPA-a → 5-Block |
| `7beb12e91` | KPA-b → 5-Block |

`KPA-UX-BASELINE-V1` §(168–169) 는 이 전환을 **before/after 로 명시 기록**한다:

> `@o4o/operator-core` OperatorLayout + Signal 패턴 → `@o4o/operator-ux-core` 5-Block

즉 **소비 0 은 방치의 결과가 아니라, 문서에 기록된 계획적 세대 교체의 결과**다.

### 3.4 후속 자산으로의 분화

`packages/store-ui-core/src/index.ts:8` 주석: `Extracted from @o4o/operator-core`.
→ 매장 축 레이아웃 계열은 `store-ui-core` 로 분리되어 **현재도 살아 있다**. `operator-core` 는 그 원본이었다.

### 3.5 잔여 export 의 후속 여부

| export | 후속 대체물 | 소비 |
|--------|-----------|:----:|
| `OperatorLayout` / `OperatorHero` / `OperatorSignalCards` / `OperatorActivityFeed` | `operator-ux-core` `OperatorDashboardLayout` (5-Block) | 0 |
| `OperatorActionPanel` · `generateOperatorActions` | `operator-ux-core` `ActionQueueBlock` + `ActionQueueItem` + backend action-queue | 0 |
| `computeOverallSignal` 외 signal 엔진 · `DEFAULT_THRESHOLD` | backend `CopilotEngineService.generateInsights()` (CLAUDE.md §11-3: **frontend client-side 생성 금지**) | 0 |
| `SignalCard` / `StatusDot` / `timeAgo` | 이름 동일 심볼이 타 패키지에 있으나 **별개 구현** | 0 |

> **오탐 주의**: `SignalCard` 는 `packages/ui/src/pages/operator/AiReportPage.tsx` 에도 등장하지만 그것은 파일 내부 지역 함수 `QualitySignalCard` 이며 operator-core 와 무관하다. `timeAgo` · `DEFAULT_THRESHOLD` 도 admin-dashboard / shortcodes / slow-threshold middleware 에 **동명 별개 구현**이 있다.

**판정**: operator-core 의 3개 책임 축은 모두 **후속 자산이 실재**하며, 그중 signal/action 축은 아키텍처 정책상(**AI 판단은 backend**) 프론트로 되돌릴 수 없다.

---

## 4. 조사 A-2 — 소비 실측

### 4.1 코드 소비: 0

```
git grep -nE "@o4o/operator-core['\"]" -- '*.ts' '*.tsx' '*.js' '*.jsx' ':!node_modules'
→ NO MATCHES
```

문자열 `operator-core` 전체 검색에서 코드 파일에 남은 것은 **주석 2건뿐**:
`packages/operator-core/src/index.ts:2`(자기 자신) · `packages/store-ui-core/src/index.ts:8`(유래 주석).

dynamic import(`import(`) · `require(` 형태의 참조도 0.

### 4.2 그러나 빌드 경로 참조는 **4서비스 × 4곳 = 16곳** 살아 있다

| 서비스 | package.json | Dockerfile (package.json COPY) | Dockerfile (소스 COPY) | tailwind content glob |
|--------|:---:|:---:|:---:|:---:|
| web-kpa-society | `:24` | `:29` | `:69` | `:6` |
| web-k-cosmetics | `:23` | `:26` | `:58` | `:6` |
| web-neture | `:22` | `:30` | `:63` | `:6` |
| web-glycopharm *(historical)* | `:23` | `:27` | `:61` | `:6` |

추가로 `pnpm-lock.yaml` 에 workspace link 5곳.

**tsconfig reference 0 · turbo/CI build script 참조 0 · 테스트 참조 0.**

> 이 표가 선행 IR 의 "dependency ≠ adoption" 사례를 정정·확장한다. 선행 IR 은 **3개 서비스 dependency**로 기록했으나, 실측은 **4개 서비스 × 4종류 참조**다. 특히 `tailwind.config.js` content glob 은 dependency 목록만 보면 보이지 않는 참조이므로, 향후 어떤 제거 작업이든 **package.json 만 지우면 끝나지 않는다.**

### 4.3 문서 소비

`docs/` 하위 `operator-core`(-ui 제외) 언급은 `O4O-COMMONIZATION-STANDARD` 2건, `KPA-UX-BASELINE-V1` 2건, `docs/archive/audits/IR-O4O-OPERATOR-DASHBOARD-DEADCODE-AUDIT-V1` 3건.

archive 감사 문서는 이미 다음과 같이 판정한 바 있다(`:208–211`):

> `@o4o/operator-core` 타입은 `operator-ux-core`에 의해 완전 대체됨. Legacy 문서화 또는 정리 권장.

본 IR 은 그 판정을 **부정하지 않되, 그것만으로 제거를 결론짓지 않는다**(§11).

---

## 5. 조사 B — 운영자 패키지 책임 경계

### 5.1 현재 실재하는 책임 매트릭스

| 축 | `ui` | `operator-ux-core` | `operator-core-ui` | `admin-ux-core` | `operator-core` |
|----|:----:|:----:|:----:|:----:|:----:|
| UI primitive | ✅ BaseTable 등 | ✅ Form/List/Pagination/SearchBar | — | — | 일부(StatusDot) |
| layout / shell | — | ✅ `OperatorAreaShell` · `OperatorDashboardLayout` | — | ✅ `AdminDashboardLayout` | ✅ `OperatorLayout` *(대체됨)* |
| navigation | ✅ `STANDARD_GROUPS` · `OperatorGroupKey` · `OperatorMenuItem` | ✅ `DomainIASidebar` · `operatorDomainIA` | — | — | — |
| module composition | — | ⚠ 부분 (sidebar 조합만) | — | — | — |
| page module | — | ⚠ 일부 (`member-list` · `RecruitmentExposureConsole`) | ✅ **19 모듈** | — | — |
| API contract / adapter | — | ✅ `useStandardListQuery` · `normalizePaginatedResponse` | ✅ 모듈별 `*Api` / `*Client` 인터페이스 | — | — |
| config | — | ✅ `ServiceConfig` (표현 전용) | ✅ 모듈별 `*Config` | — | ✅ `OperatorDashboardConfig` *(대체됨)* |
| capability | ✅ `STANDARD_GROUPS[].capability` | ✅ `DomainIASidebar` 필터 | — | — | — |
| permission | ⚠ `isAdminOrOperator` 만 (`operator-ux-core/nav`) | — | — | — |
| runtime context | ❌ **없음** | ❌ | ❌ | ❌ | ❌ |
| module registry | ❌ **없음** | ❌ | ❌ | ❌ | ❌ |
| service extension 등록 | ❌ **없음** (slot props 로만) | ⚠ props slot | ⚠ props slot | — | — |
| service bootstrap | ❌ **없음** (서비스 App.tsx) | — | — | — | — |

`OperatorCapability` enum 자체는 `@o4o/types` 에 있다(8 값: USER_MANAGEMENT / MEMBERSHIP_APPROVAL / CONTENT_MANAGEMENT / COMMUNITY / SIGNAGE / STORE_MANAGEMENT / ANALYTICS / SETTINGS).

### 5.2 확인된 구조 공백 (WO §7)

| 공백 항목 | 상태 | 근거 |
|-----------|:----:|------|
| 운영자 module registry | **없음** | 어떤 패키지에도 "모듈 등록/조회" API 없음. 모듈 선택 = 서비스가 import 하느냐 마느냐 |
| 선택형 feature registration | **없음** | `OperatorAreaShell` 은 이미 계산된 `menuItems` 를 props 로 받는다 |
| 서비스별 capability composition | **부분 존재** | `ENABLED_CAPABILITIES` 배열이 서비스 `src/config/operatorCapabilities.ts` 에 존재. 다만 **패키지가 제공하는 계약이 아니라 서비스 로컬 관행** |
| 공통 operator runtime / context | **없음** | Provider 없음. 각 서비스가 자체 `AuthContext` + props drilling |
| 메뉴 ↔ module 연결 계약 | **없음** | `UNIFIED_MENU` 의 `path` 와 route 등록이 **문자열로만 연결**. 타입 수준 연결 없음 |
| 서비스 extension 등록 계약 | **없음** | 확장은 전부 컴포넌트 props slot (`renderEditModal` · `extraRowActions` · `drawerExtraSections` · `aboveBlocks` 등) |

> 이 6개 공백이 곧 "운영자 플랫폼 core 로 승격할 자리가 실제로 존재하는가"에 대한 답이다. **존재한다.** 다만 현재 그 자리를 채우고 있는 패키지는 없다.

### 5.3 참고 — 가장 가까운 기존 registry 패턴

`packages/store-ui-core/src/config/menuCapabilityMap.ts` 의 `resolveStoreMenu(config, enabledCaps)` 가 **매장 축에서는** capability 기반 메뉴 해석을 패키지가 제공한다(`MENU_CAPABILITY_MAP` + 빈 섹션 제거). 운영자 축에는 이에 대응하는 함수가 없고, 같은 일을 `DomainIASidebar` 내부와 서비스 `filterMenuByRole` 이 나눠서 한다.

---

## 6. 조사 B-2 — 세대 관계 정리

```
[1세대]  @o4o/operator-core           Hero + Signal + Action  (클라이언트 계산)
             │  대체 (5-Block 전환 5 commit, KPA-UX-BASELINE-V1 기록)
             ▼
[2세대]  @o4o/operator-ux-core        5-Block + List/Form 원시 + Sidebar/Shell
             │  그 위에 축적
             ▼
[3세대]  @o4o/operator-core-ui        19 페이지 모듈 (adapter + config + slot)

[분화]   @o4o/store-ui-core           operator-core 로부터 매장 축 분리 (현역)
[병행]   @o4o/admin-ux-core           Admin 4-Block (운영자 축과 별개, 4서비스 소비 중)
```

**따라서 `operator-core-ui` 가 "operator-core 의 모든 canonical 책임을 승계했다"는 서술은 부정확하다.** 정확히는 **layout 책임은 `operator-ux-core` 가, page module 책임은 `operator-core-ui` 가, 매장 축은 `store-ui-core` 가, signal/AI 책임은 backend 가** 나눠 승계했다.

---

## 7. 조사 C — 서비스별 운영자 모듈 구성 (실측)

상태값: `COMMON_MODULE_USED` / `THIN_WRAPPER` / `SERVICE_EXTENSION` / `BESPOKE` / `NOT_ADOPTED` / `NOT_APPLICABLE` / `OPTIONAL_MODULE` / `UNKNOWN`

| 모듈 축 | KPA Society | K-Cosmetics | Neture | PharmacyHub |
|---------|:---:|:---:|:---:|:---:|
| 대시보드 (5-Block) | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `NOT_ADOPTED` |
| 사이드바 / 영역 셸 | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` (전용 domain IA 주입) | `NOT_ADOPTED` (운영자 셸 없음) |
| 회원 관리 | `SERVICE_EXTENSION` (`KpaEditUserModal` + KPA 전용 콘솔) | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `BESPOKE` (§8) |
| 회원 **승인** | `COMMON_MODULE_USED` (members 콘솔 내) | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `BESPOKE` (approve/reject 전용 화면) |
| 조직 / 매장 | `THIN_WRAPPER` (`OperatorStoresList`) | `THIN_WRAPPER` | `THIN_WRAPPER` | `NOT_ADOPTED` |
| 공급자 | `SERVICE_EXTENSION` (공급자 콘텐츠 승인) | `SERVICE_EXTENSION` | `SERVICE_EXTENSION` (공급자 축이 서비스 본체) | `BESPOKE` (공급자 상품 제공 설정) |
| 상품 | `THIN_WRAPPER` (`OperatorProductStatusPage`) | `THIN_WRAPPER` | `NOT_ADOPTED` | `BESPOKE` |
| 주문 / 거래 | `THIN_WRAPPER` (`OperatorOrderStatusPage`) | `THIN_WRAPPER` | `NOT_ADOPTED` | `BESPOKE` (B2B 주문·결제 — 서비스 고유) |
| 상품 신청 승인 | `THIN_WRAPPER` (`ProductApplicationManagementConsole`) | `THIN_WRAPPER` | `NOT_ADOPTED` | `NOT_APPLICABLE` |
| 콘텐츠 (CMS) | `COMMON_MODULE_USED` (`CmsContentManager`) | `COMMON_MODULE_USED` | `NOT_ADOPTED` | `NOT_ADOPTED` |
| 자료실 | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `NOT_ADOPTED` | `NOT_ADOPTED` |
| 커뮤니티 / 포럼 | `COMMON_MODULE_USED` ×5 모듈 | `COMMON_MODULE_USED` ×5 | `OPTIONAL_MODULE` — requests/categories/delete-requests 만 (analytics·hub 미채택) | `NOT_ADOPTED` |
| LMS | `COMMON_MODULE_USED` (courses + instructor ×3) | `COMMON_MODULE_USED` (instructor-courses) | **`NOT_ADOPTED` — 의도된 경계** | `NOT_APPLICABLE` |
| 사이니지 | `SERVICE_EXTENSION` (HQ 콘솔 KPA 구현) | `NOT_ADOPTED` | `NOT_ADOPTED` | `NOT_APPLICABLE` |
| 안내 문구 | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `NOT_ADOPTED` |
| 법정정보 · 연락처 설정 | `COMMON_MODULE_USED` ×2 | `COMMON_MODULE_USED` ×3 | `COMMON_MODULE_USED` ×2 | `NOT_ADOPTED` |
| 축 네비게이션 카드 | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `NOT_ADOPTED` |
| Admin 4-Block | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `COMMON_MODULE_USED` | `NOT_ADOPTED` |

**활성 capability 실측**

| 서비스 | ENABLED_CAPABILITIES |
|--------|----------------------|
| KPA | 8/8 전부 |
| Neture | 8/8 전부 |
| K-Cosmetics | 7/8 (`SETTINGS` 미활성) |
| PharmacyHub | **파일 자체 없음** (`src/config/` = `service.ts` 39 L 단 1개) |

> **핵심 관찰**: Neture 는 `LMS` · `cms-content` · `resources` · `forum-analytics` · `forum-hub` · `product-applications` · `product-order-view` 를 **채택하지 않은 채로 정상 동작**한다. 즉 조건 3·4·5(커뮤니티/LMS/상품·거래 선택적)는 **이미 실증되어 있다.** 다만 그 선택이 **선언이 아니라 import 유무**로만 표현된다(§9).

---

## 8. 조사 D — 회원관리 공통 Core 가능성

### 8.1 공통 모듈이 요구하는 계약

`@o4o/operator-core-ui/modules/members` 의 `OperatorMembersConsolePage` 는 다음을 요구한다.

**필수** — `serviceKey: string`(union 아님 → 신규 서비스 수용 가능) · `client: MembersConsoleClient` · `roleTabs` · `renderEditModal`
**`MembersConsoleClient` 6 메서드** — `list` · `listAll` · `stats` · `updateStatus` · `batchUpdateStatus` · `updatePassword`
**선택** — `statusTabs` · `getPrimaryRole` · `extraColumns` · `drawerExtraSections` · `renderDeleteFlow` · `extraRowActions` · `extraBulkActions` · `serverSort` · `syncUrl`

확장 흡수력은 충분히 검증돼 있다(Neture 의 registration approve/reject 를 `updateStatus` 내부 endpoint 라우팅으로 흡수, GP/K-Cos/Neture 의 서로 다른 삭제 UX 를 `renderDeleteFlow` 로 흡수).

### 8.2 PharmacyHub 현재 구현

`pages/operator/MembershipsPage.tsx`(268 L) + `MembershipDetailPage.tsx`(196 L). 자체 fetch·자체 테이블·`window.confirm` / `window.prompt` 기반 승인·반려.

Backend 는 **4 엔드포인트만** 존재한다:

```
GET   /api/v1/pharmacy-hub/operator/memberships
GET   /api/v1/pharmacy-hub/operator/memberships/:membershipId
PATCH /api/v1/pharmacy-hub/operator/memberships/:membershipId/approve
PATCH /api/v1/pharmacy-hub/operator/memberships/:membershipId/reject
```

### 8.3 계약 대비 gap

| `MembersConsoleClient` | PharmacyHub backend | 비고 |
|------------------------|:---:|------|
| `list` | ✅ | 단 응답이 **membership row** (User 중심 `UserData` 아님) |
| `listAll` | ❌ | 역할 탭 카운트용. limit=1000 호출로 대체 가능 |
| `stats` | ❌ | 통계 엔드포인트 없음 |
| `updateStatus` | ⚠ | approve/reject 2개로 분리. adapter 에서 라우팅 가능 |
| `batchUpdateStatus` | ❌ | 일괄 처리 없음 |
| `updatePassword` | ❌ | 운영자 비밀번호 변경 기능 자체가 서비스에 없음 |
| `renderEditModal` (필수) | ❌ | 회원 편집 화면 자체가 없음 |

### 8.4 판정

> **`CORE_CONTRACT_EXPANSION_REQUIRED`**

이유: 데이터 모델(User 중심 vs membership 중심)과 **필수 prop 3개**(`renderEditModal` 필수 · `updatePassword` 필수 · `stats` 필수)가 "승인만 하는 서비스"를 수용하지 못한다. `REUSE_WITH_ADAPTER` 로 내리려면 adapter 가 존재하지 않는 기능을 가짜로 구현해야 하므로 부적절하다.

필요한 core 변경(이번 작업 범위 밖, 후속 WO 대상):
1. `renderEditModal` · `updatePassword` · `stats` · `listAll` · `batchUpdateStatus` 를 **optional 로 완화**하고 미제공 시 해당 UI 를 숨긴다.
2. membership 중심 응답을 `UserData` 로 정규화하는 어댑터 헬퍼를 제공하거나, `UserData` 를 최소 필드 집합으로 축소한다.

> **주의**: 위 1·2 는 K-Cos/Neture/KPA 가 이미 소비 중인 공통 모듈의 계약 변경이므로 `O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` 대상이다. **PharmacyHub 편입을 이유로 기존 3서비스 동작을 바꾸는 방식은 금지**하며, 완화는 전부 additive/optional 이어야 한다.

PharmacyHub 의 **B2B 주문·결제·거래 조건·전용 membership 업무 의미**는 서비스 고유 업무이며 본 판정의 대상이 아니다(`O4O-COMMONIZATION-STANDARD` §3.3 ③).

---

## 9. 조사 E — 선택형 모듈 구성 가능성

### 9.1 현재 메커니즘 (실측)

| 질문 | 실측 결과 |
|------|----------|
| optional dependency 로 선언되는가 | ❌ 아니다. `operator-core-ui` 는 4서비스 모두 **필수 dependency** |
| dependency 없이 build 되는가 | ⚠ 미검증 (`INSUFFICIENT_EVIDENCE` — 전체 build 는 WO §4 상 실행 금지) |
| 미채택 = 메뉴만 숨김인가, route 미등록인가 | **메뉴만 숨김**. capability 는 `DomainIASidebar` 의 그룹 표시만 제어하고, route 는 `OperatorRoutes.tsx` 에 **무조건 등록**된다 |
| 미채택 모듈이 번들에 포함되는가 | **서비스가 import 하지 않으면 포함되지 않는다.** 모듈별 subpath export (`./modules/{name}`) 가 실재하므로 선택 소비가 성립 |
| capability 와 module registration 이 분리되는가 | ❌ **분리되어 있지 않다.** capability=OFF 여도 모듈은 import 되어 있고 route 도 살아 있다. 반대로 모듈을 import 하지 않아도 capability 는 ON 일 수 있다 |

subpath 소비 실측(모듈 선택이 실제로 일어나고 있음을 보여주는 증거):

| 모듈 subpath | KPA | K-Cos | Neture |
|---|:--:|:--:|:--:|
| `forum-requests` / `forum-delete-requests` / `forum-categories` | ✅ | ✅ | ✅ |
| `forum-analytics` / `forum-hub` | ✅ | ✅ | **✗** |
| `cms-content` / `resources` | ✅ | ✅ | **✗** |
| `contact-inquiry` | **✗** | ✅ | **✗** |
| `members` | ✅ | ✅ | ✅ |
| `service-legal` / `service-contact-settings` / `guide-contents` | ✅ | ✅ | ✅ |

root barrel 경유 소비: KPA 21 · K-Cos 18 · Neture 5. Neture 는 root barrel 에서 `CommonEditUserModal` · `AxisNavigationSection` · `OperatorStoresList` 3개만 쓴다.

### 9.2 구조적 한계 3가지

1. **route 는 capability 를 모른다.** capability OFF 인 기능도 URL 직접 접근 시 화면이 뜬다(권한은 backend guard 가 막지만, 프론트 IA 상으로는 dead-not-hidden). `OperatorRoutes.tsx` 의 30+ route 는 전부 정적 import 이며 조건부 등록이 없다.
2. **root barrel 경유 소비가 모듈 경계를 흐린다.** `product-order-view` · `lms-courses` · `instructor-*` · `stores` · `dashboard` 는 subpath export 가 **없어** root barrel 로만 접근된다. 즉 "이 모듈만 채택" 을 표현할 수 없는 모듈이 존재한다.
3. **채택 선언이 없다.** 어떤 서비스가 어떤 운영자 모듈을 채택했는지는 **grep 해야만 알 수 있다.** 신규 서비스가 "필요한 모듈만 고르는" 절차가 문서로도 코드로도 정의돼 있지 않다.

### 9.3 목표 구조 (개념 — 본 IR 은 구현하지 않는다)

```
Operator Platform Core
  ├── runtime / context        (현재 없음)
  ├── module registry          (현재 없음)
  ├── navigation composition   (operator-ux-core 에 부분 존재)
  ├── capability / permission  (@o4o/types + ui STANDARD_GROUPS 에 분산)
  └── extension contract       (props slot 관행으로만 존재)

Optional Operator Modules      (= 현재 operator-core-ui 19 모듈)
  Members · Organizations · Suppliers · Stores · Products ·
  Content · Community · LMS · Orders/Payments · Settings
```

> **이 구조를 이번 작업에서 새로 구현하지 않는다.** 본 절은 §5.2 공백이 채워질 자리를 명시하기 위한 것이며, 실제 도입 여부·시점·패키지 이름은 별도 WO 의 판단이다.

---

## 10. 조사 F — Core / Extension 경계 판정

판정값: `CORE_READY` / `CORE_EXTENSION_READY` / `CORE_CONTRACT_MISSING` / `EXTENSION_SEAM_MISSING` / `SERVICE_CONFIG_ONLY` / `SERVICE_ONLY` / `DO_NOT_UNIFY`

| 기능 축 | 판정 | 근거 |
|---------|:----:|------|
| 5-Block 대시보드 셸 | `CORE_READY` | 3서비스 동일 소비, `aboveBlocks` slot 으로 확장 흡수 |
| 운영자 영역 셸 + 사이드바 | `CORE_EXTENSION_READY` | `domainIAConfig` 주입으로 Neture 4-domain 축 수용 실증 |
| 회원 목록/상세 콘솔 | `CORE_EXTENSION_READY` (기존 3서비스) / `CORE_CONTRACT_MISSING` (승인 전용 서비스) | §8 |
| 회원 편집 모달 | `CORE_EXTENSION_READY` | `CommonEditUserModal` + `KpaEditUserModal` 병존이 정상 형태 |
| 매장 목록 | `CORE_EXTENSION_READY` | `StoresApi` adapter + `StoresConfig` |
| 상품·주문 현황 | `CORE_EXTENSION_READY` | fetcher 주입형 |
| 포럼 5모듈 | `CORE_READY` | CLAUDE.md §13(포럼=플랫폼 공통 구조)와 정합 |
| LMS 운영자 모듈 | `CORE_EXTENSION_READY` | Neture 미채택은 gap 아님 |
| 사이니지 HQ 콘솔 | `EXTENSION_SEAM_MISSING` | KPA 서비스 코드에만 존재. 2번째 소비 축이 생기기 전엔 추출 금지 |
| 법정정보 · 연락처 설정 | `CORE_READY` | 3서비스 동일 |
| 안내 문구 | `CORE_READY` | — |
| 운영자 capability 목록 | `SERVICE_CONFIG_ONLY` | 서비스별 `ENABLED_CAPABILITIES` 가 올바른 형태 |
| 서비스 표현(용어·CTA) | `SERVICE_CONFIG_ONLY` | `ServiceConfig` 의 정의된 책임 |
| 운영자 module registry / runtime context | `CORE_CONTRACT_MISSING` | §5.2 |
| PharmacyHub B2B 주문·결제·거래조건 | `DO_NOT_UNIFY` | 서비스 고유 업무 |
| KPA 공급자 콘텐츠 승인 / 이벤트 오퍼 승인 | `SERVICE_ONLY` | 도메인 의존 강함 |

---

## 11. 조사 G — `@o4o/operator-core` 4대안 평가

> **전제**: 실제 import 0 은 `RETIRE` 의 근거 **중 하나일 뿐**이며, 자동 결론이 아니다.

| 대안 | 성립 조건 | 실측 대조 | 판정 |
|------|----------|----------|:----:|
| **A. `KEEP_AS_IS`** | 현재 형태로 다시 소비될 여지가 있음 | Signal/Action 은 CLAUDE.md §11-3(AI 판단=backend)와 **정면 충돌**. Layout 은 5-Block 이 대체 | ✗ |
| **B. `REDEFINE_AS_OPERATOR_PLATFORM_CORE`** | 이름이 비어 있고, 채울 책임(§5.2 공백 6종)이 실재함 | 이름은 실질적으로 비어 있고 공백도 실재. **단** 현재 내용(Hero/Signal/Action)과 새 책임은 **아무 관련이 없어** 사실상 신규 패키지를 헌 이름에 넣는 것 | △ **조건부 성립** |
| **C. `MERGE_OR_RENAME_WITH_EXISTING_OPERATOR_PACKAGES`** | 잔여 코드 중 타 패키지가 흡수할 가치가 있는 것이 있음 | 흡수 대상 0. 매장 축은 이미 `store-ui-core` 로 분화 완료 | ✗ |
| **D. `RETIRE_AS_SUPERSEDED_PACKAGE`** | ①후속 자산 실재 ②세대 교체가 계획적·문서화 ③잔여 소비 0 ④제거 전 재검증 목록 확보 | ①§3.5 ✅ ②`KPA-UX-BASELINE-V1` ✅ ③§4.1 ✅ ④§4.2 (16곳) ✅ | ✅ |

### 11.1 판정

> **`RETIRE_AS_SUPERSEDED_PACKAGE`** — 단 **B 와 배타적이지 않다.**

정확한 판정 문장:

> `@o4o/operator-core` 는 **legacy dead package 라서가 아니라, 계획적 세대 교체로 대체가 완료된 superseded package** 다. 운영자 플랫폼이 앞으로 필요로 하는 core(§5.2 의 module registry · runtime context · extension 등록 계약)는 **실재하는 공백이지만, `operator-core` 의 잔여 코드와는 아무 연속성이 없다.** 따라서 "operator-core 를 그 자리에 재정의(B)"하는 것은 이름 재사용일 뿐이며, 재정의 여부는 **operator-core 은퇴와 독립적으로 판단**해야 한다.

### 11.2 은퇴 실행 시 필수 선행 재검증 (본 IR 은 실행하지 않음)

1. `package.json` dependency 4서비스
2. `Dockerfile` COPY 2줄 × 4서비스 — **누락 시 빌드 실패 유형의 참조**
3. `tailwind.config.js` content glob 4서비스
4. `pnpm-lock.yaml` workspace link
5. dynamic import / build script / tsconfig reference — 현재 0 이나 제거 시점 재확인
6. `store-ui-core` 유래 주석 — 문서적 가치가 있으므로 문구만 조정
7. `KPA-UX-BASELINE-V1` 의 before/after 기재는 **삭제 금지** (Cycle 1 검증 기록)

---

## 12. Canonical 운영자 아키텍처 (현재 실재 구조의 명문화)

본 IR 이 확정하는 **현재 시점의 canonical 역할 분담**:

| 계층 | 패키지 | canonical 책임 |
|------|--------|---------------|
| **L0 공통 상수·계약** | `@o4o/types` · `@o4o/ui` | `OperatorCapability` enum · `STANDARD_GROUPS` (13 group key + capability 매핑) · `OperatorMenuItem` |
| **L1 운영자 UX 원시** | `@o4o/operator-ux-core` | 5-Block 대시보드 · List/Form 원시 · `DomainIASidebar` · `OperatorAreaShell` · 표현용 `ServiceConfig` |
| **L2 운영자 페이지 모듈** | `@o4o/operator-core-ui` | 19개 선택형 페이지 모듈. 각 모듈 = adapter(`*Api`/`*Client`) + `*Config` + slot |
| **L2' 관리자 UX** | `@o4o/admin-ux-core` | Admin 4-Block (운영자 축과 별개) |
| **L3 서비스 구성** | 서비스 `src/config/*` | `ENABLED_CAPABILITIES` · `UNIFIED_MENU` · domain IA · route 등록 |
| **L4 서비스 extension** | 서비스 `pages/operator/*` | 서비스 고유 업무. **core 강제 흡수 금지** |
| **(은퇴 대상)** | `@o4o/operator-core` | 없음 — L1/L2/backend 로 분산 승계 완료 |

**모듈 선택 규칙 (현재 성립하는 형태)**

1. 서비스는 필요한 모듈만 `@o4o/operator-core-ui/modules/{name}` 에서 import 한다. 미채택 모듈은 번들에 포함되지 않는다.
2. 서비스는 `ENABLED_CAPABILITIES` 로 사이드바 그룹 노출을 제어한다.
3. 서비스는 `UNIFIED_MENU` 로 그룹별 항목을 제공한다. **route 등록은 별개 작업이며 capability 와 연동되지 않는다.**
4. 서비스 고유 정책은 모듈 props slot 으로 주입한다. core 에 `if (service === 'X')` 분기를 넣지 않는다.
5. 소비 축이 2개 미만인 기능은 core 로 추출하지 않는다.

---

## 13. 기준 문서 부정합 목록

| # | 문서 | 부정합 | 조치 |
|:-:|------|--------|------|
| 1 | `OPERATOR-CORE-DESIGN-V1` | 문서 전체가 `@o4o/operator-core-ui` 설계 기준인데 **제목·본문에서 `operator-core` 와 이름이 1글자 차이**로 혼동 가능. 두 패키지의 세대 관계가 어디에도 없음 | §14 — 상단에 세대 관계 note 추가 |
| 2 | `OPERATOR-CORE-DESIGN-V1` §2.3 | 기재된 `package.json` 이 실제와 다름 (`version 1.0.0` / `main: ./dist/index.js` / `operator-ux-core` 가 peerDependencies) — 실제는 `0.1.0` · `./src/index.ts` · dependencies + **14개 subpath exports** | §14 — 실제 상태 note 추가 (설계 원문은 보존) |
| 3 | `OPERATOR-INTEGRATION-STATE-V1` | 대상이 **KPA / GlycoPharm / K-Cosmetics 3서비스**로 고정. 현재 공식 4서비스와 어긋남. Neture·PharmacyHub 부재 | §14 — 스코프 note 추가 |
| 4 | `OPERATOR-INTEGRATION-STATE-V1` §1.3 | "Core Layer 구조(목표 형태)"에 module registry / runtime context / extension 등록 계약이 없음 → **선택형 모듈 구조가 명시되지 않음** | §14 — 본 IR 링크 + 공백 명시 |
| 5 | `O4O-COMMONIZATION-STANDARD` §10 축 C | `@o4o/operator-core` 를 "legacy · seam 정비" 대상으로만 나열 → **"legacy 제거 대상"으로 오해될 여지** | §14 — superseded 판정과 "재정의는 별개 판단"을 명시 |
| 6 | `operator-ux-core` `ServiceKey` | `'kpa-society' \| 'glycopharm' \| 'k-cosmetics'` — **Neture·PharmacyHub 부재**. 코드 사실이며 본 WO 범위 밖(코드 변경 금지) | 후속 WO 로 이관 (§15) |

---

## 14. 문서 개정 내역

본 IR 과 같은 커밋에서 수행한 **docs-only** 개정:

| 문서 | 개정 내용 |
|------|----------|
| `docs/architecture/OPERATOR-CORE-DESIGN-V1.md` | 상단에 **세대 관계 note** 신설 — `operator-core`(1세대, superseded) ↔ `operator-core-ui`(3세대) 구분 + §2.3 기재와 실제 package.json 차이 명시 |
| `docs/architecture/OPERATOR-INTEGRATION-STATE-V1.md` | 상단에 **스코프 note** 신설 — 3서비스 기준 문서임을 명시, 현재 공식 4서비스와의 관계 + §1.3 목표 구조에 빠진 공백 6종을 본 IR 로 연결 |
| `docs/architecture/O4O-COMMONIZATION-STANDARD.md` | §10 축 C 의 `operator-core` 기재를 **`superseded` 판정 + 재정의 독립 판단** 문구로 정정 |

**수정하지 않은 문서 (WO §14.3)**: `IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1` · 기존 완료 CHECK · 과거 Cycle 1 조사 문서 · `KPA-UX-BASELINE-V1` · `docs/archive/**`.
→ 선행 IR 의 "3개 서비스 dependency" 기재에 대한 정정(실측 4서비스 × 4종 참조)은 **본 IR §4.2 에서 명시**하는 방식으로 처리했다.

---

## 15. 후속 과제

| 순위 | 과제 | 성격 | 비고 |
|:---:|------|------|------|
| 1 | `IR-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1` | read-only | 화면군 10 × 판정값 9. 본 IR §8 의 members 판정을 입력으로 사용 |
| 2 | `WO-O4O-OPERATOR-MEMBERS-CONSOLE-CONTRACT-RELAXATION-V1` | 코드 (공유 모듈) | §8.4 의 optional 완화. `O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1` 적용 필수 |
| 3 | `WO-O4O-OPERATOR-CORE-RETIREMENT-V1` | 소규모 코드 | §11.2 의 7개 재검증 선행. **본 IR 은 실행하지 않음** |
| 4 | `IR-O4O-OPERATOR-MODULE-REGISTRY-NECESSITY-V1` | read-only | §5.2 공백 6종을 실제로 core 로 만들 필요가 있는지 판단. 신규 서비스 1개 더 생기기 전엔 과설계 위험 |
| 5 | `WO-O4O-OPERATOR-UX-CORE-SERVICEKEY-REALIGNMENT-V1` | 소규모 코드 | §13-6. `ServiceKey` union 에 neture / pharmacy-hub 정합 |
| 6 | `IR-O4O-OPERATOR-ROUTE-CAPABILITY-COUPLING-V1` | read-only | §9.2-1. capability OFF 기능의 route 노출 정책 판단 |

---

## 16. 결론

1. **`@o4o/operator-core` 는 dead code 가 아니라 superseded package 다.** 3개 책임 축(layout / signal / AI action)은 각각 `operator-ux-core` 5-Block, backend `CopilotEngineService`, `operator-ux-core` ActionQueue 로 승계됐고, 매장 축은 `store-ui-core` 로 분화했다. 세대 교체는 5개 commit 과 `KPA-UX-BASELINE-V1` 에 기록돼 있다.
2. **판정은 `RETIRE_AS_SUPERSEDED_PACKAGE`** 이나, 은퇴 실행은 본 IR 범위 밖이며 §11.2 의 16곳 빌드 경로 참조 재검증이 선행돼야 한다. **import 0 만으로 제거를 결론짓지 않았다.**
3. **"operator-core-ui 가 모든 canonical 책임을 보유한다"는 서술은 부정확하다.** 책임은 L0~L4 5계층으로 분산돼 있으며, §12 가 그 분담을 명문화한다.
4. **선택형 운영자 모듈 구성은 이미 작동한다.** Neture 가 LMS·CMS·자료실·포럼 일부를 채택하지 않은 채 정상 동작하는 것이 실증이다. 다만 그 선택은 **선언이 아니라 import 유무**이며, route 는 capability 를 모르고, subpath export 가 없는 모듈이 있어 경계가 고르지 않다.
5. **운영자 플랫폼 core 로 승격할 자리(module registry · runtime context · extension 등록 계약 등 6종)는 실재하는 공백**이다. 그러나 이를 `operator-core` 이름에 넣을지는 은퇴 판단과 **독립적으로** 결정해야 한다. 공식 서비스가 4개인 현재 시점에서 registry 를 선구현하는 것은 과설계 위험이 있으므로 후속 IR 로 분리했다.
6. **회원관리는 공통 core 로 갈 수 있으나, 지금 계약 그대로는 "승인만 하는 서비스"를 수용하지 못한다.** `CORE_CONTRACT_EXPANSION_REQUIRED` — 필수 prop 3개를 optional 로 완화하는 additive 변경이 필요하며, 기존 3서비스 동작을 바꾸는 방식은 금지한다.

---

*Date: 2026-08-03 · read-only 조사 + docs-only 개정 · 코드 0 · package 0 · route 0 · DB 0 · 배포 0 · GlycoPharm 무접촉 · `service-admin.routes.ts` 무접촉*
