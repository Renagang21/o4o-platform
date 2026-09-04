# CHECK-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1

- **WO**: `WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1`
- **작성일**: 2026-09-04
- **작업 브랜치**: `work/cross-service-my-store-runtime-contract-commonization-v1`
- **기준 SHA (base)**: `ef75f8e10` (= `origin/main` 시점)
- **KPA 기준 WO SHA**: `76025f7e0` (`WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1`)
- **작업 HEAD**: `64fce9db5` (위 KPA 브랜치를 merge 한 시점)

---

## 0. 전제 · 사전 공개 사항 (숨기지 않는다)

| 항목 | 사실 |
|---|---|
| WO §2 clean main | **미충족**. 기존 checkout(`c:\Users\home\coding\o4o-platform`)이 다른 세션 WIP 로 dirty. 해당 작업트리는 **건드리지 않고**, `origin/main`(`ef75f8e10`)에서 별도 worktree `C:/tmp/o4o-cross-store` 를 새로 만들어 작업했다. WIP 수정·삭제·stash **0건**. |
| WO §3 KPA WO 가 main 에 있는가 | **아니오**. `76025f7e0` 는 아직 `origin/main` 에 병합되지 않았다. 기준 계약을 확보하기 위해 본 브랜치에서 `origin/work/kpa-my-store-runtime-contract-quality-v1` 를 merge(`64fce9db5`)했다. **머지 순서는 KPA WO → 본 WO 이다.** |
| KPA 배포 후 프로덕션 E2E | **`KPA_POST_DEPLOY_E2E_PENDING`**. KPA 런타임 계약은 코드·테스트 수준에서 확정됐을 뿐 배포 후 프로덕션 E2E 는 미완이다. 본 문서는 KPA 런타임 종결을 과대 진술하지 않는다. |
| schema / migration | **0건** |
| 프로덕션 write | **0건** |

---

## 1. 4서비스 census (미조사 0)

조사 축: route / page / API client / backend route / 조직 resolver / 공통 패키지 / adapter / runtime 소비자 / 테스트.

### 1-1. 내 매장 태블릿 진열 (축 A·B 대상)

| 서비스 | 프론트 화면 | API client | 호출 경로(수정 전) | backend mount(수정 전) | 조직 해석(수정 전) |
|---|---|---|---|---|---|
| KPA | `@o4o/store-ui-core` + `@o4o/tablet-screen-set-editor` | 서비스 client | `/api/v1/kpa/store/tablets/*` | `createStoreTabletRoutes(ds,{storeOwnerServiceKey:'kpa'})` | KPA 축 (정상) |
| K-Cosmetics | `@o4o/store-ui-core` 공통 화면 | `services/tabletDisplayApi.ts` | **`/api/v1/store/tablets/*` (서비스 중립)** | 없음 (중립 mount 만) | **서비스 무관 fallback → 타 서비스 조직 선택 가능 (BUG)** |
| GlycoPharm | `@o4o/store-ui-core` 공통 화면 | `api/tabletDisplays.ts`, `api/tabletInterest.ts` | **`/api/v1/store/tablets/*`, `/api/v1/store/interest/*`** | 없음 (중립 mount 만) | **동일 BUG** |
| PharmacyHub | 자체 화면 + 편집기 | PH client | `/api/v1/pharmacy-hub/store-owner/*` | PH 전용 라우터 | `resolveOrganizationId` 주입 adapter (409 계약 자체 소유) |

### 1-2. 조직 resolver seam

- `apps/api-server/src/utils/store-organization.resolver.ts` — `StoreOwnerServiceKey = 'kpa' | 'glycopharm' | 'cosmetics' | 'pharmacy-hub'`, membership canonical key 매핑(`kpa→kpa-society`, `cosmetics→k-cosmetics`).
- `store-tablet.routes.ts` 는 **두 개의 seam** 을 이미 제공한다:
  1. `storeOwnerServiceKey` — 공통 resolver 를 서비스 축으로 스코프 (KPA 선례).
  2. `resolveOrganizationId` 주입 — PH 가 자기 409 계약(`STORE_NOT_CONNECTED` / `AMBIGUOUS_STORE_CONNECTION`)을 유지.
- **새 generic resolver 를 만들지 않았다** (§6-3). KCos/GP 는 1번 seam 을 재사용했고, 이는 `createStoreLocalProductRoutes(dataSource, serviceKey)` 의 기존 선례와 같은 축이다.

### 1-3. Screen Set

| 서비스 | Screen Set 관련 소스 파일 수 |
|---|---|
| KPA | 19 |
| Neture | 9 |
| PharmacyHub | 2 |
| K-Cosmetics | **0** |
| GlycoPharm | **0** |

### 1-4. Password Recovery (§14 — census only)

| 서비스 | 화면 |
|---|---|
| KPA | `AccountRecoveryPage`, `ResetPasswordPage` |
| K-Cosmetics | `AccountRecoveryPage`, `ResetPasswordPage`, `LoginPage`, `LoginModal` |
| GlycoPharm | `AccountRecoveryPage`, `ResetPasswordPage`, `LoginPage`, `LoginModal` |
| PharmacyHub | `ForgotPasswordPage`, `ResetPasswordPage`, `LoginPage` |

→ 화면 명칭·구성이 서비스마다 다르고 backend 계약은 이미 공통이다. 공통화 이득 불명확 → **NO_ACTION**.

### 1-5. §15 Account / Store Info — **범위 밖. 조사·수정하지 않았다.**

---

## 2. Cross-service 계약 매트릭스 (§17 — 미조사 0)

| 축 | KPA | K-Cosmetics | GlycoPharm | PharmacyHub | 판정 |
|---|---|---|---|---|---|
| **A. 조직 resolver 스코프** | 서비스 스코프 mount | **없음 → BUG** | **없음 → BUG** | 자체 resolver 주입 | KCos·GP `BUG` → 수정 / PH `NO_ACTION` |
| **B. TABLET 노출 사유 계약 (backend)** | 있음 | 있음(공유 라우터가 부여) | 있음 | 있음 | `FULLY_COMMON` — 변경 없음 |
| **B. 노출 사유 표시 (frontend)** | 편집기에서 표시 | **표시 안 함 → BUG** | **표시 안 함 → BUG** | 편집기에서 표시 | `COMMON_CORE_WITH_ADAPTER` → `@o4o/store-ui-core` 에 구현 |
| **C. isStoreOwner (frontend)** | `StoreOwnerGuard` + `isStoreOwnerDual` stale 회복 | `StoreOwnerGuard` | `StoreOwnerGuard` (membership role `pharmacy`) | `StoreOwnerGuard` | `FULLY_COMMON` (서비스 config = adapter) — 변경 없음 |
| **C. isStoreOwner (backend)** | `isStoreOwner(ds,uid,'kpa')` | 동일 SSOT | 동일 SSOT | PH 자체 resolver | `FULLY_COMMON` + PH `SERVICE_SPECIFIC` — 변경 없음 |
| **C. 계정 전역 자격 (`auth-helpers`)** | serviceKey 없이 계정 전역 | 동일 | 동일 | 동일 | 의도된 계정 축 → `NO_ACTION` |
| **D. Screen Set 편집기↔런타임** | 상위집합 | 코드 0 | 코드 0 | 축소 집합 | `SERVICE_SPECIFIC` → `NO_ACTION` (§9-3 KPA 상위집합 축소 금지) |
| **E. QR/상품 canonical landing** | `createStoreQrLandingController(...,'kpa')` | `...,'cosmetics'` | `...,'glycopharm'` | `PharmacyHubStoreQrController.publicLanding` (`opl.master_id` 조인) | 3서비스 `FULLY_COMMON` + PH `SERVICE_SPECIFIC` → 검증만, 변경 0 |

---

## 3. BUG 근거

### BUG-1 (P1) — KCos / GP 태블릿 화면의 조직 해석이 서비스 축이 아니다

- 두 서비스의 태블릿 client 가 서비스 중립 `/api/v1/store/tablets/*` 를 호출했다.
- 중립 mount 는 `storeOwnerServiceKey` 없이 동작하므로 `organization_members` 기준 결정적 정렬(`is_primary` → 최초 가입)로 조직을 고른다.
- 다중 조직 사용자(예: Neture 공급자 조직이 primary)의 경우 **KCos/GP 화면이 타 서비스 조직의 상품 풀**을 본다.
- 회귀 테스트 A 가 이 현상 자체를 고정하고(`poolOrgParams[0] === 'org-neture'`), B/C 가 수정 후 계약을 고정한다.

### BUG-2 (P1) — 공통 태블릿 화면이 노출 판정을 버린다

- backend 는 모든 mount 에서 `tabletVisible` / `tabletVisibilityReason` / `tabletChannel` 을 붙여 준다.
- `@o4o/tablet-screen-set-editor`(KPA/PH/Neture)만 이를 표시했고, KCos/GP 가 공유하는 `@o4o/store-ui-core` 태블릿 화면은 필드를 버렸다.
- 결과: 매장 경영자가 상품을 진열에 넣어도 공개 태블릿에 나오지 않는 **무증상 실패**.

---

## 4. 공통 core ↔ adapter 경계 (본 WO 의 핵심 결론)

```
공통 core                                    서비스 adapter
─────────────────────────────────────────    ─────────────────────────────────────────
store-tablet.routes.ts (라우트·응답 계약)     mount 시 storeOwnerServiceKey / qrServiceKey /
annotateTabletVisibility (노출 판정)            operatorTemplateServiceKey (KPA·KCos·GP)
resolveStoreTabletChannelState               resolveOrganizationId 주입 (PharmacyHub — 409 계약)
store-owner.utils.isStoreOwner (SSOT)        SERVICE_ROLES config (role prefix/membership key/role)
@o4o/store-ui-core 태블릿 화면 · 사유 문구     서비스 API client 의 BASE 경로
StoreOwnerGuard (판정 흐름)                   labels / accent / renderDenied / staleRecovery
```

- **새 공통 패키지 생성 없음** — §13 임계(3서비스 이상 + 동일 의미 + 실제 중복 코드 + adapter 분리 가능 + 유지비 감소)를 충족하지 않는다. 축 B 는 이미 존재하는 `@o4o/store-ui-core` 안에서 해결된다.
- **PH 를 `storeOwnerServiceKey` 로 이관하지 않는다** — PH 는 403 이 아닌 409(`STORE_NOT_CONNECTED` / `AMBIGUOUS_STORE_CONNECTION`)를 반환하는 별도 계약이며, 이관하면 API 계약이 바뀐다 → `NO_ACTION` 으로 명시 보존.

---

## 5. 변경 파일

| 파일 | 축 | 내용 |
|---|---|---|
| `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts` | A | `createStoreTabletRoutes` 를 `storeOwnerServiceKey:'cosmetics'` 로 mount (local-products 와 같은 조직 축) |
| `apps/api-server/src/routes/glycopharm/glycopharm.routes.ts` | A | 동일 (`'glycopharm'`) |
| `services/web-k-cosmetics/src/services/tabletDisplayApi.ts` | A·B | `BASE='/cosmetics/store'`, 노출 필드 타입 추가 |
| `services/web-glycopharm/src/api/tabletDisplays.ts` | A·B | `BASE='/glycopharm/store'`, 노출 필드 타입 추가 |
| `services/web-glycopharm/src/api/tabletInterest.ts` | A | `/glycopharm/store/interest/*` |
| `packages/store-ui-core/src/components/tablet/types.ts` | B | `TabletVisibilityReason` · `TABLET_VISIBILITY_NOTICE` · `StoreTabletChannelState` + additive optional 필드 |
| `packages/store-ui-core/src/components/tablet/tabletHelpers.ts` | B | 후보에 `tabletVisible` / `visibilityNotice` 전달 |
| `packages/store-ui-core/src/components/tablet/TabletProductPoolPanel.tsx` | B | 행별 "노출 불가 — 사유" 표시 (**선택은 막지 않는다**) |
| `packages/store-ui-core/src/components/tablet/StoreTabletDisplaysView.tsx` | B | TABLET 채널 미승인/부재 배너 |
| `packages/store-ui-core/src/components/tablet/index.ts` | B | 신규 상수·타입 export |
| `apps/api-server/src/__tests__/cross-service-my-store-tablet-scoped-mount.spec.ts` | A·B | 신규 회귀 테스트 10건 |

**게이트 완화 0건** — TABLET 채널 status bypass / OPC bypass / public resolver gate 제거 / 서비스별 임시 hardcode 어느 것도 없다 (§7-4). 서비스 중립 mount 는 back-compat 으로 유지한다.

---

## 6. 검증

| 항목 | 결과 |
|---|---|
| 신규 spec (10건) | PASS |
| 관련 Jest 4 suite (44건) | PASS |
| `node scripts/lint-ratchet.mjs` | exit 0 — ESLint 55 errors / 1391 warnings (**error baseline 55 유지**) |
| `apps/api-server` `tsc --noEmit` | **0 errors** (workspace 패키지 빌드 후) |
| typecheck: web-k-cosmetics / web-glycopharm / web-kpa-society / web-pharmacy-hub | 4/4 PASS |
| vite build: 위 4서비스 | 4/4 PASS (15.65s / 17.60s / 19.43s / 15.36s) |
| api-server 전체 Jest | **228 suites / 3,812 tests 전량 PASS** (exit 0, 139s) — 실패 0 |

### 6-1. CI 후속 — SonarCloud 중복도 게이트 (PR #207)

`origin/main` merge 후 SonarCloud Quality Gate 가 **FAILED** 했다. 실패 조건은 하나뿐이다.

| 조건 | 값 | 임계 |
|---|---|---|
| `new_duplicated_lines_density` | **14.6%** | 3% |

파일별(신규 라인 중 중복 비율): `cross-service-...spec.ts` 27.8% / `kpa-my-store-tablet-runtime-contract.spec.ts` 30.1% /
`web-k-cosmetics/.../tabletDisplayApi.ts` 75.0% / `web-glycopharm/src/api/tabletDisplays.ts` 52.6% — 나머지 전 파일 0.0%.

**게이트 우회·임계 완화·`NOSONAR` 를 쓰지 않고, 실제 중복을 제거했다.** 새 공통화 기능을 추가한 것이 아니라
이미 이번 PR 안에 들어 있던 **같은 선언의 중복을 하나로 모은 것**이다.

| 중복 | 조치 |
|---|---|
| 두 spec 의 stub DataSource · MEMBERSHIPS · makeApp | `src/__tests__/helpers/store-tablet-org-stub.ts` 로 추출. **판정 로직은 stub 에 넣지 않는다** — SQL 분기별 고정 응답만 두고, 시나리오 차이(채널 상태·slug·service_key·조직 목록)는 인자로 받는다 |
| KCos / GP client 의 `PoolSupplierProduct` · `ProductPool.tabletChannel` 동일 선언 | `@o4o/store-ui-core` 에 `StoreTabletPoolSupplierProductRow` 를 추가하고 두 client 는 이를 import (채널 상태는 기존 `StoreTabletChannelState` 재사용) |

재검증: 두 spec **21건 PASS** · KCos/GP `tsc --noEmit` 0 errors · api-server 전체 Jest 재실행 결과는 아래 표와 동일.

**기존 결함(본 WO 원인 아님)**: `packages/financial-core` 빌드가 tsup "No input files" 로 실패한다 → 워크스페이스 빌드는 `--no-bail` 로 수행했다.

---

## 7. E2E (§16)

| 서비스 | 결과 |
|---|---|
| KPA | KPA WO 범위에서 수행 · 배포 후 프로덕션 E2E 는 `KPA_POST_DEPLOY_E2E_PENDING` |
| K-Cosmetics | **`E2E_BLOCKED_AUTH`** — `docs/local/TEST-ACCOUNTS.local.md` 에 KCos store_owner 프로덕션 credential 없음. 우회 credential 생성하지 않았다. |
| GlycoPharm | **`E2E_BLOCKED_AUTH`** — 동일 사유 |
| PharmacyHub | 코드 변경 0 (계약 보존 확인만) |

→ 변경된 두 서비스는 라우트·조직 해석·응답 계약을 **스텁 DataSource 기반 회귀 테스트 10건**으로 고정했고, 실 브라우저 E2E 는 credential 확보 시점으로 미룬다. 이를 PASS 로 위장하지 않는다.

---

## 8. 잔여 SERVICE_SPECIFIC / 후속

| 항목 | 판정 |
|---|---|
| PH 조직 해석 409 계약 | `SERVICE_SPECIFIC` — 유지 |
| Screen Set (KCos/GP 코드 0) | `SERVICE_SPECIFIC` — KPA 상위집합 축소 금지(§9-3) |
| `auth-helpers` 계정 전역 자격 | `NO_ACTION` |
| Password Recovery | `NO_ACTION` (census only) |
| KCos/GP 프로덕션 store-owner E2E | **미완 — credential 확보 후 후속** |
| KPA 배포 후 프로덕션 E2E | **미완 — `KPA_POST_DEPLOY_E2E_PENDING`** |
| `packages/financial-core` 빌드 실패 | 본 WO 범위 밖 · 별도 WO 필요 |
