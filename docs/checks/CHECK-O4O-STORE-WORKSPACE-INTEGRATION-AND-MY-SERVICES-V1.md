# CHECK-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1

> **WO**: `WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1` (실행본 §1–§27, 사용자 확정 · 2026-09-16)
> **일자**: 2026-09-16 · **기준 main**: `52a9df42a` (Supplier Workspace CLOSED `de728b3e6`/`69413f43e` 이후)
> **성격**: Store Workspace 상위 구조(Home / My Store / Store Hub / My Services) 통합 + My Services 최소 All view + 대표 홈 진입 정렬 + Supplier→Store Hub UI 편입 + KPA 모바일 전용 화면 RETIRE. 새 테이블 0 · migration 0 · schema 변경 0 · RBAC 변경 0 · 공통 셸 재작성 0 · 프로덕션 write 0.
> **상위 기준**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §3 · §4 · §4-1 · §6 · §9-1(5단계) · 선행 [`CHECK-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1`](CHECK-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1.md) §7-1 · [`CHECK-O4O-SERVICE-TENANT-FOUNDATION-V1`](CHECK-O4O-SERVICE-TENANT-FOUNDATION-V1.md)
> **구현 commit**: _(후속 commit 에서 기록)_

---

## 0. 한 줄 결론

세 서비스(KPA Society · K-Cosmetics · Pharmacy Hub)의 매장 화면 위에 **같은 상위 구조 `홈 / 내 매장 / 매장 HUB / 내 서비스`** 를 올렸다. 구현은 `@o4o/store-ui-core` `workspace/` 하나이고(경로는 서비스 `basePath` 에서 파생), 서비스는 조립만 한다 — `MyStoreShell` · `StoreHubShell` · `store-core` · `hub-core` · `asset-copy-core` 는 손대지 않았다. **My Store canonical = KPA 기반 공통 `MyStoreShell` 1개**(세 서비스 모두 공통 `StoreOwnerGuard` + 서비스 `MembershipGate`, 자산 경계 `organizationId`). **My Services** 는 기존 `GET /api/v1/work-scope/store-services` 하나를 출처로 `active ∧ workspaceAvailable` 만 진입시키고 나머지는 상태만 보인다(새 테이블 0 · 권한 판정 0). 대표 홈(Neture) "내 매장" 은 각 서비스 Store Workspace Home 으로 들어가며, 대상 서비스는 하드코딩 대신 catalog `storeWorkspaceEnabled` 파생으로 바꿨다(drift CLOSED). Supplier→Store Hub 는 KPA Store Hub `공급자 콘텐츠` 탭(열람 전용, canonical `kpa-society` 조회)으로 편입했다. KPA `/mobile/pharmacy`(`MobilePharmacyPage`) 는 RETIRE 하고 `/store/workspace` 로 COMPAT_REDIRECT 했다.

---

## 1. Fresh Census (§2 · §3) — origin/main `52a9df42a`

### 1-1. Store 표면 판정표

| 표면 | 서비스 | 현행 | 판정 | 처리 |
|---|---|---|---|---|
| `/store` (`MyStoreShell` + `KpaStoreLayoutWrapper`) | KPA | 공통 셸 · `PharmacyGuard`(=공통 `StoreOwnerGuard('kpa')`+`MembershipGate`) | **KEEP_COMMON** (My Store canonical) | `banner` 슬롯에 `StoreWorkspaceNav` 조립 |
| `/store` (`MyStoreShell` + `StoreLayoutWrapper`) | KCos | 공통 셸 · `StoreOwnerRoute` | **ADOPT_STORE_WORKSPACE** | 동일 조립 (accent pink) |
| `/store-owner` (`MyStoreShell` + `StoreOwnerShell`) | PH | 공통 셸 · `StoreOwnerGuard('pharmacy-hub')`+`MembershipGate` | **ADOPT_STORE_WORKSPACE** | 동일 조립 · `navItems` 의 `매장 허브` 중복 진입 제거(상위 nav 가 맡음) · PG callback `/store-owner/payment/*` 불변 |
| `/store-hub` (`StoreHubShell` + `PharmacyHubLayout`) | KPA | Hub 공통 셸 | **MOVE_TO_STORE_HUB** (상위 탭 편입) | 셸 위에 `StoreWorkspaceNav` 조립 · `공급자 콘텐츠` 탭 신설 |
| `/store-hub` (`StoreHubShell` + `KCosmeticsHubLayout`) | KCos | Hub 공통 셸 | **MOVE_TO_STORE_HUB** | 셸 위에 `StoreWorkspaceNav` 조립 |
| `/store-hub` (`StoreOwnerShell` 재사용) | PH | 매장 셸 재사용(Hub 레이아웃 사본 없음) | **MOVE_TO_STORE_HUB** | `StoreOwnerShell.banner` 로 자동 편입 |
| `/store/workspace` · `/store/services` | KPA · KCos | 없음 | **신설 (STORE_HOME · MY_SERVICES)** | `StoreWorkspaceShell` + `StoreWorkspaceHomeView` / `MyServicesView` |
| `/store-owner/workspace` · `/store-owner/services` | PH | 없음 | **신설** | `StoreOwnerWorkspaceShell`(가드 동일) |
| `/mobile/pharmacy` (`MobilePharmacyPage`) | KPA | 모바일 전용 약국 경영 진입 화면 (별도 정보구조) | **RETIRE** | 파일 삭제 · `COMPAT_REDIRECT → /store/workspace` · `MobileBottomNav` 약국 탭 → `/store/workspace` |
| Neture 대표 홈 `my-store` 그룹 | Neture | handoff `returnPath=/store` (KPA·KCos) · `/store-owner` (PH) | **KEEP_COMMON (진입 정렬)** | `returnPath = <base>/workspace` |
| `neture-home-entry.controller.ts` `STORE_CAPABLE_SERVICES` 하드코딩 | api | `['kpa','cosmetics','pharmacy-hub']` 리터럴 | **TEMP_ALIAS → 파생값** | `listStoreCapableServices()` (catalog `storeWorkspaceEnabled` ∩ role registry) |

### 1-2. 기능 census (업무 의미 기준)

| 기능 | 분류 | 근거 |
|---|---|---|
| 매장 정보 · QR · POP · 자료함 · 사이니지 · 태블릿 · 상품 취급 · 주문 | **COMMON_STORE_OPERATION** | 세 서비스 `StoreDashboardConfig` 메뉴 축 동일 · 자산 경계 `organizationId` |
| PH 결제(`/store-owner/payment/*`) · 외국인 관광객 판매지원 | **SERVICE_SPECIFIC** | PH 만의 사업 프로그램 · PG callback 경로 불변 |
| Store Hub 진열(운영자 · 공급자 콘텐츠 · B2B 카탈로그 · 이벤트) | **HUB_DISCOVERY** | Hub 는 탐색·가져오기 공간(§14) |
| 가입 서비스 목록 · 상태 · 다른 서비스 진입 | **MY_SERVICE** | `/work-scope/store-services` (§7) |
| KPA 모바일 전용 약국 경영 홈 | **RETIRE** | 상위 구조가 모바일도 맡는다(§19) |

### 1-3. 설정 차이 판정 (§8)

| 차이 | 판정 |
|---|---|
| PH `basePath=/store-owner` vs KPA·KCos `/store` | **IMPLEMENTATION_TIMING_DIFFERENCE** — 경로 파생 규칙으로 흡수, rename 안 함(PG callback 보호) |
| PH 결제 · 외국인 판매지원 메뉴 | **REAL_STORE_CAPABILITY_DIFFERENCE** |
| KCos 에 다국어 상품 콘텐츠 Hub 탭 없음 · PH Store Hub 탭 집합 축소 | **IMPLEMENTATION_TIMING_DIFFERENCE** (이번 범위 밖) |
| `storeWorkspaceEnabled` | **SERVICE_MEMBERSHIP_DIFFERENCE** 의 UI metadata — 권한 SSOT 아님(§9) |
| My Services 화면 | **MISSING_IMPLEMENTATION → 이번에 신설** |

### 1-4. 프로덕션 read-only (§20 · 2026-09-16 · 값은 집계만)

`organization_service_enrollments` active: k-cosmetics 2 · kpa-society 7 · neture 3 · pharmacy-hub 8 (조직당 서비스별 active 1) · `organization_members` owner active 18 / manager 2 · 사용자-조직 1:1 15명, 1:5 1명 · `asset_snapshots` cms/kpa 1 · content/kpa 14 · resource/kpa 3 · signage/store-library 1 · `kpa_store_contents` direct/operator 6 · direct/store 7 · snapshot_edit/operator 2 · `store_execution_assets` generated 44 · uploaded 5 · `role_assignments` store_owner kpa 5 · cosmetics 4 · pharmacy-hub 6. → 1 Store : N Services 가 실제 데이터에 존재(복수 enrollment 조직) · 새 테이블 없이 My Services 가 성립한다.

---

## 2. 결정 (§4 ~ §19)

| # | 결정 | 근거 |
|---|---|---|
| D1 | 상위 구조 구현 = `@o4o/store-ui-core` `workspace/` 1개. `resolveStoreWorkspacePaths(config)` → `home=<base>/workspace` · `myStore=<base>` · `storeHub=/store-hub` · `myServices=<base>/services` | WO §5 · §6 |
| D2 | 서비스는 **조립만**: `MyStoreShell.banner` 슬롯 + Hub 레이아웃 위 `StoreWorkspaceNav` · Home/My Services 는 `StoreWorkspaceShell` | WO §5 (셸 재작성 금지) |
| D3 | `StoreHubShell.headerSlot` 은 aside 내부(모바일 drawer 안)라 상위 nav 를 거기 두면 모바일에서 사라진다 → 셸 **위**에 수평 nav 조립. `StoreHubShell` 무변경 | §19 |
| D4 | My Store canonical = KPA 기반 공통 `MyStoreShell`. KPA 진입 가드 `PharmacyGuard` 는 이미 공통 `StoreOwnerGuard('kpa')` + `MembershipGate` 이며 KPA 회원 자격(`kpa_pharmacist_profiles`)에 의존하지 않는다 — organization 소유 판정 그대로 | WO §4 |
| D5 | My Services 출처 = `GET /work-scope/store-services` 하나 · 표시 `active ∧ workspaceAvailable` · 진입 = 현재 서비스 내부 Link, 다른 서비스 `POST /auth/handoff`(https 만 수용) | WO §7 |
| D6 | `storeWorkspaceEnabled` 는 UI metadata — RBAC 변경 0 · 서버 권한 판정 무변경 | WO §9 |
| D7 | 대표 홈 "내 매장" `returnPath = <base>/workspace` · `STORE_CAPABLE_SERVICES` = `listStoreCapableServices()` 파생 (drift CLOSED) | WO §18 |
| D8 | Supplier→Store Hub UI 편입 = KPA `/store-hub/supplier-library` 열람 전용(사본 0) · canonical `kpa-society` 로 조회(선행 CHECK D10 drift 해소, 이 탭에 한함). KCos·PH Hub 탭은 IMPLEMENTATION_TIMING (후속) | WO §14 |
| D9 | 콘텐츠 출처 대응(문서 판정만): COMMUNITY=PASS · HUB=PASS · SERVICE=FOUNDATION_ONLY · DIRECT=PASS — ROLE-WORKSPACE §6 표 | WO §15 · §16 |
| D10 | `/mobile/pharmacy` RETIRE + COMPAT_REDIRECT · 모바일 별도 정보구조 없음(`MobileBottomNav` 기존 재사용) | WO §19 |
| D11 | PH `navItems` 의 `매장 허브` 링크 제거(상위 nav 중복) — 라우트 `/store-hub` 는 그대로 | §14 |

### 2-1. 라우트 판정

| 라우트 | 판정 |
|---|---|
| `/store` · `/store-hub` · `/store-owner` | KEEP_CANONICAL |
| `/store/workspace` · `/store/services` · `/store-owner/workspace` · `/store-owner/services` · `/store-hub/supplier-library` | KEEP_CANONICAL (신설) |
| `/mobile/pharmacy` | COMPAT_REDIRECT → `/store/workspace` (RETIRE_LATER: redirect 제거는 별도 WO) |
| `/store-owner/payment/success` · `/fail` | KEEP_CANONICAL · 불변 |
| `/hub` · `/hub/*` | 기존 COMPAT_REDIRECT 유지 |

---

## 3. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/workspace/storeWorkspace.ts` (신규) | 경로 파생 · 탭 · 활성 판정 · `STORE_CONFIGS_BY_SERVICE_KEY` · `getStoreWorkspacePathsForService` |
| `packages/store-ui-core/src/workspace/StoreWorkspaceNav.tsx` · `StoreWorkspaceShell.tsx` · `StoreWorkspaceHomeView.tsx` · `MyServicesView.tsx` · `useStoreServices.ts` · `index.ts` (신규) | 상위 nav · 조립 셸 · Home 진입 hub · My Services 최소 All view · 조회 훅 |
| `packages/store-ui-core/src/api/createStoreServicesApi.ts` (신규) | `fetchStoreServices` · `resolveServiceEntryUrl`(handoff) · `selectMyServices` |
| `packages/store-ui-core/src/index.ts` | 위 export 추가 (additive) |
| `packages/store-ui-core/src/workspace/__tests__/storeWorkspace.test.tsx` (신규) | 계약 테스트 (§21 합성 시나리오 포함) |
| `apps/api-server/src/utils/store-owner.utils.ts` | `listStoreCapableServices()` (catalog `storeWorkspaceEnabled` ∩ role registry) |
| `apps/api-server/src/routes/neture/controllers/neture-home-entry.controller.ts` | 하드코딩 `STORE_CAPABLE_SERVICES` → 파생값 |
| `apps/api-server/src/__tests__/store-workspace-integration.spec.ts` (신규) | drift 0 · §21 시나리오 |
| `services/web-kpa-society/src/App.tsx` | workspace/services 라우트 · banner nav · `/mobile/pharmacy` redirect · `supplier-library` 라우트 |
| `services/web-kpa-society/src/components/MobileBottomNav.tsx` | 약국 탭 → `/store/workspace` · slug 판정에 `workspace|services` |
| `services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx` | 상위 nav 조립 · `공급자 콘텐츠` 항목 |
| `services/web-kpa-society/src/pages/pharmacy/HubSupplierLibraryPage.tsx` (신규) | Supplier→Store Hub 열람 페이지 |
| `services/web-kpa-society/src/pages/mobile/MobilePharmacyPage.tsx` | **삭제** (RETIRE) |
| `services/web-k-cosmetics/src/App.tsx` · `components/layouts/KCosmeticsHubLayout.tsx` | 동일 조립 (accent pink) |
| `services/web-pharmacy-hub/src/layouts/StoreOwnerShell.tsx` | banner nav · `StoreOwnerWorkspaceShell`(공통 `StoreTopBar` header · 가드 동일) · `PHARMACY_HUB_STORE_WORKSPACE_PATHS` |
| `services/web-pharmacy-hub/src/pages/store-owner/WorkspaceHomePage.tsx` · `MyServicesPage.tsx` (신규) · `src/App.tsx` | Home · My Services 라우트 |
| `services/web-neture/src/lib/home-entry.ts` · `__tests__/home-entry.service-states.test.ts` | `myStore` → `<base>/workspace` · 테스트 |
| `docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md` | §3-1 구현 상태 · §6 출처 대응표 · §9-1 5단계 |

**무변경**: `MyStoreShell` · `StoreHubShell` · `StoreTopBar` · `store-core` · `hub-core` · `asset-copy-core` · `service-tenant.resolver.ts` · `service-catalog.ts` · RBAC · DB · `package.json`.

---

## 4. 검증 (§21)

| 항목 | 결과 |
|---|---|
| `store-ui-core` vitest (`npx vitest run --config packages/store-ui-core/vitest.config.mjs`) | **PASS 6 files / 84 tests** (신규 계약 테스트 포함: 경로 파생 3서비스 · 탭 순서 · 활성 판정 8케이스 · `selectMyServices` 매장 A(KPA active·KCos active·PH inactive·타 조직 row 제외) · handoff https-only · `MyServicesView` 렌더 · nav aria-current) |
| api-server jest `store-workspace-integration.spec.ts` + `work-scope-store-resolution.spec.ts` | **PASS 19 tests** (`listStoreCapableServices` = catalog `storeWorkspaceEnabled` 집합 · neture/kpa-branch/cafe24-b2b 제외 · §21 시나리오 fold) |
| api-server `tsc --noEmit` | PASS |
| web-neture vitest (`home-entry.service-states` · `HomeEntryPanel.back-navigation`) | **PASS 17 tests** (신규: `returnPath` = `/store/workspace` ×2 · `/store-owner/workspace`) |
| `tsc --noEmit` KPA · KCos · PH · Neture | PASS ×4 |
| `vite build` KPA · KCos · PH · Neture | PASS ×4 |
| 합성 시나리오 매장 A (§21) | 서버 fold(`foldEnrollmentsToStoreServices`) · 클라이언트 선별(`selectMyServices`) · 화면(`MyServicesView`) 세 층 모두 KPA+KCos 진입 · PH `이용 중지` 표시 · 타 조직 row 비노출 |

### 4-1. Production smoke (§22)

_(배포 후 후속 commit 에서 기록 — 배포 전에는 PENDING)_

---

## 5. Re-census (§23)

| 항목 | 결과 |
|---|---|
| `MobilePharmacyPage` 참조 | 0 (redirect 주석 · `MobileBottomNav` compat 판정만) |
| 하드코딩 `STORE_CAPABLE_SERVICES` 리터럴 | 0 (`listStoreCapableServices()` 파생 1곳) |
| 상위 구조 구현 수 | 1 (`packages/store-ui-core/src/workspace/`) · 서비스 사본 0 |
| `MyStoreShell` 소비처 | KPA · KCos · PH 3 (구현 1) |
| `/work-scope/store-services` 소비처 | `createStoreServicesApi` 1 (서비스별 http 어댑터 3) |
| 새 테이블 · migration · RBAC 변경 | 0 |
| PG callback 경로 | 불변 (`/store-owner/payment/success|fail`) |

---

## 6. 문서 정합 (§24 · CLAUDE.md §16)

| 문서 | 상태 | 처리 |
|---|---|---|
| `O4O-ROLE-WORKSPACE-ARCHITECTURE-V1` §3 · §6 · §9-1 | 구현 상태 · 출처 대응 미기재 | WO 범위 내 갱신 (§3-1 신설 · §6 표 · §9-1 5단계 완료) |
| `O4O-STORE-MENU-CANONICAL-TREE-V1` | 상위 구조를 정하지 않음(HUB↔내 매장 항목 축) · §5.1 출처 4종은 ROLE-WORKSPACE §6 표가 참조 | 무변경 (drift 없음) |
| `STORE-LAYER-ARCHITECTURE` (F3) | Frozen · 셸 무변경이라 모순 없음 | 무변경 |
| `STORE-PRODUCTS-CANONICAL-V1` · `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` | 상위 구조 무관 | 무변경 |
| `O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-V1` | 사이드바 6종 표준 — 상위 nav 는 사이드바 밖 수평 nav 라 표준 대상 아님 | 무변경 · 상위 nav 표준 편입은 별도 WO 후보 |
| `CANONICAL-INDEX` | 행 변경 없음 | 무변경 |

`문서 정합: 발견 1건(ROLE-WORKSPACE §6 대응 미확정 → 이번 WO 로 확정) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(상위 nav 의 반응형 표준 편입)`

---

## 7. 후속 (FOLLOWUP)

1. KCos · PH Store Hub 에 `공급자 콘텐츠` 탭 (IMPLEMENTATION_TIMING) · Hub mixed 목록 편입 · KPA Store Hub 나머지 탭의 cms `'kpa'` legacy serviceKey 정렬(선행 CHECK D10 잔여).
2. `/mobile/pharmacy` COMPAT_REDIRECT 제거 (RETIRE_LATER).
3. My Services 출처 값(`SERVICE`) 신설 — Service Operator Workspace 단계(§9-1 6).
4. 상위 `StoreWorkspaceNav` 의 반응형 표준 편입 여부 — 별도 WO 후보.

---

## 8. 최종 판정

```text
STORE_WORKSPACE=PASS
MY_STORE_CANONICAL=KPA_BASED_COMMON
MY_STORE_IMPLEMENTATION=1 (MyStoreShell · 세 서비스 조립 · 메뉴 집합 차이는 REAL_STORE_CAPABILITY_DIFFERENCE/IMPLEMENTATION_TIMING_DIFFERENCE)
STORE_HUB=PASS (상위 탭 편입 3서비스 · supplier-library UI 편입 = KPA)
MY_SERVICES=PASS (최소 All view · active ∧ workspaceAvailable · handoff 진입)
STORE_HOME=PASS (최소 진입 hub 3서비스)
STORE_SERVICE_SOURCE=work-scope/store-services
NEW_MEMBERSHIP_TABLE=0
CONTENT_SOURCE_MAPPING COMMUNITY=PASS HUB=PASS SERVICE=FOUNDATION_ONLY DIRECT=PASS
STORE_CAPABLE_DRIFT=CLOSED
SERVICE_ROUTE_COMPAT=/mobile/pharmacy→/store/workspace · /hub→/store-hub(기존)
PRODUCTION_SMOKE=PENDING_DEPLOY (배포 후 §4-1 에 기록)
NEXT=GO_SERVICE_OPERATOR_WORKSPACE
```
