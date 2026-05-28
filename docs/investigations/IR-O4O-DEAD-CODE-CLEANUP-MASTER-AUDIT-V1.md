# IR-O4O-DEAD-CODE-CLEANUP-MASTER-AUDIT-V1

> **목적:** O4O monorepo 전체 dead code cleanup 을 단계적으로 진행하기 위한 사전 조사(Master Audit).
>
> **이 문서는 cleanup 실행용이 아니라 cleanup 계획 수립용이다.**
> 삭제 가능성이 높아 보여도 즉시 삭제 대상으로 확정하지 않고, 후속 WO 에서 다시 한 번 범위를 좁혀 작업한다.

| 항목 | 값 |
|------|------|
| 작성일 | 2026-05-26 |
| 작성 방식 | 5 개 read-only Explore 에이전트 병렬 조사 + 종합 |
| 코드 수정 | 없음 |
| 파일 삭제 | 없음 |
| 커밋 | 없음 |
| Push | 없음 |

---

## 1. 조사 범위

### 1-A. 코드 범위

- `services/*` 전체 (web-kpa-society, web-glycopharm, web-k-cosmetics, web-neture, web-glucoseview, web-account, web-siteguide, signage-player-web, mobile-app, api-siteguide)
- `packages/*` 전체 (70+ 패키지)
- `apps/api-server/` 백엔드 라우트·컨트롤러·서비스·엔티티
- `apps/admin-dashboard/`, `apps/main-site/` UI

### 1-B. 조사 주제

1. Domain 잔재 — glucoseview / yaksa.site / groupbuy / service switcher / 삭제된 seed/test account
2. Frontend Route/Page dead code
3. Menu / Sidebar / Dashboard 잔재 링크
4. 공통 패키지 legacy export · 0-consumer 패키지
5. Frontend API client / hook layer dead code
6. API server 미등록 route / controller / service / entity
7. 정적 import 검색으로 잡히지 않는 참조 경로 (barrel export, lazy, registry, manifest, serviceKey 분기) — **오탐 방지용 reference map**
8. 최근 작업과 dead code 후보의 충돌 가능성

### 1-C. 보존 대상 (조사에서 제외하거나 "Preserve" 로만 분류)

- `apps/api-server/src/database/migrations/*` — 모든 migration 파일 (이미 실행된 schema 변경 이력)
- §3 / §14 (CLAUDE.md) Frozen Cores 18 종:
  - cms-core, auth-core, platform-core, organization-core
  - security-core, hub-core, ai-core, action-log-core, asset-copy-core, operator-ux-core, admin-ux-core
  - store-ui-core, store-asset-policy-core, store-core
  - types, ui (foundational)

---

## 2. 현재 git status 요약

```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

- 세션 시작 시점에는 `services/web-glycopharm/src/api/appreciation.ts` · `services/web-k-cosmetics/src/api/appreciation.ts` 두 파일이 unstaged 였으나, 직전 커밋 `41c0c21a (feat(appreciation): WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1)` 에 포함되어 정리됨.
- IR 작성 시점에는 unstaged 파일 없음.

### 2-A. 직전 커밋 컨텍스트

```
41c0c21a feat(appreciation): WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1 — 6 page → AppreciationPanel 정렬
f5a5d63c feat(cosmetics): WO-O4O-COSMETICS-ORG-REUSE-AND-ENROLLMENT-V1 — organization 재사용 + service enrollment 정렬
d5ca30b6 feat(shared-space-ui): WO-O4O-APPRECIATION-PANEL-COMPONENT-EXTRACTION-V1 — 감사 포인트 공통 컴포넌트
247a2f0b fix(neture): WO-O4O-NETURE-SELLER-UI-LABEL-ALIGNMENT-V1
```

---

## 3. 최근 작업 파일과 충돌 가능성 매트릭스

### 3-A. 최근 30 일 변경 파일 통계

| 항목 | 값 |
|------|------|
| Unique 변경 파일 수 | 1,864 |
| 가장 활발한 영역 | web-kpa-society / web-glycopharm / web-k-cosmetics / web-neture / api-server kpa routes |
| 활동 0 인 영역 | services/web-glucoseview · packages/cgm-glucoseview · admin-dashboard/src/pages/groupbuy · main-site/src/pages/groupbuy · packages/groupbuy-yaksa |

### 3-B. 활성 WO 테마 (최근 30 commits)

1. **APPRECIATION** — GlycoPharm + K-Cosmetics 6 page → AppreciationPanel 통일 (`shared-space-ui`)
2. **LMS PHASE 3** — GlycoPharm instructor parity
3. **COSMETICS ORG REUSE / ENROLLMENT** — Store organization 중복 제거
4. **STORE PRODUCTION TYPES COMMONIZATION** — `@o4o/types` canonical
5. **NETURE UI / REGISTRATION 정렬** — Seller UI 라벨, business info
6. **STORE LIBRARY / EXECUTION** — Content → POP / QR production flow
7. **OPERATOR / ADMIN MENU 통합**

### 3-C. dead code 후보 × 최근 30 일 변경 교집합

| 후보 영역 | 최근 30 일 touch | 충돌 위험 |
|---------|:----------------:|:---------:|
| `services/web-glucoseview/` | 0 | 없음 |
| `packages/cgm-glucoseview/` | 0 | 없음 |
| `packages/groupbuy-yaksa/` | 0 (src/ 자체 없음) | 없음 |
| `apps/admin-dashboard/src/pages/groupbuy/` | 0 | 없음 |
| `apps/admin-dashboard/src/hooks/groupbuy/` | 0 | 없음 |
| `apps/admin-dashboard/src/components/groupbuy/` | 0 | 없음 |
| `apps/api-server/src/utils/cookie.utils.ts` (glucoseview 항목) | 0 (해당 라인 기준) | 매우 낮음 |
| `apps/api-server/src/modules/partner/guards/partner-context.guard.ts` (line 59) | 0 (해당 라인 기준) | 매우 낮음 |
| `services/web-kpa-society/src/api/mypage.ts` (groupbuy 항목) | 파일 자체는 touch (LMS 흐름) → 그러나 groupbuy 라인은 안전 | **낮음 — 라인 단위 작업 필요** |
| `services/web-{glycopharm,k-cosmetics}/src/api/appreciation.ts` | **방금 커밋됨** | **HIGH (Hold)** |

### 3-D. 충돌 주의 대상 (요청서에서 지정)

| 파일 | 상태 |
|------|------|
| `services/web-glycopharm/src/api/appreciation.ts` | 41c0c21a 에 커밋 완료. dead code 후보 아님. 단, **active WO 라인 — Hold** |
| `services/web-k-cosmetics/src/api/appreciation.ts` | 41c0c21a 에 커밋 완료. dead code 후보 아님. 단, **active WO 라인 — Hold** |

---

## 4. 정적 import 검색으로 잡히지 않는 참조 경로 매핑표

> **이 섹션의 목적:** Dead code 판정 시 false negative (살아있는 코드를 dead 로 잘못 판정) 방지.
>
> 다음 패턴이 발견된 영역은 단순 `grep import` 만으로 dead 결론 금지.

### 4-A. Barrel Exports

- 총 343 개 `index.ts` 파일, 1,323 개 re-export 문 식별
- Core 8-10 packages: 각 100-200 re-exports
- Feature services 6-8 packages: 각 40-60
- Domain extensions 20+ packages: 각 10-40
- 체이닝 패턴: `packages/ai-prompts/src/index.ts → ./store/index.js → upstream` 등 다단계 흔함

### 4-B. Dynamic Imports / Lazy Routes

- `services/web-k-cosmetics` 단독 137+ lazy routes
- `apps/admin-dashboard` route 모듈별 6-15 lazy pages
- `apps/main-site` 20+ lazy routes
- 패턴: `lazy(() => import('@/pages/...'))`, `lazy(() => import('@/pages').then(m => ({ default: m.X })))`

### 4-C. Route Configs

- `apps/admin-dashboard/src/App.tsx` — 모듈형 (`@/routes/*.routes.tsx`)
- `packages/cms-core/src/view-system/dynamic-router.ts` — manifest 기반, viewId 문자열로 컴포넌트 lookup
- ViewRegistry 등록 → DynamicRouter 가 viewId 로 resolve. 정적 import 와 무관.

### 4-D. Sidebar / Menu Configs (Data-Driven)

- `services/web-*/src/config/navigation.ts` — `{ label, href, visibleWhen }` 배열. 컴포넌트 직접 참조 없음.
- `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx` — `MenuItem[]` (id/label/path/roles 만 보유)
- `packages/cms-core/src/view-system/navigation-registry.ts` — manifest navigation 필드로 동적 등록

### 4-E. ServiceKey-Based Conditional Rendering

40+ 위치에서 동일 컴포넌트가 serviceKey 분기로 다르게 동작.

대표 위치:
- `apps/api-server/src/services/*PaymentEventHandler` — Neture / Glycopharm / KCosmetics / Lms (serviceKey 일치 시만 실행)
- `apps/api-server/src/services/event-offer-organization.helper.ts`
- `packages/operator-core-ui/.../OperatorMembersConsolePage` — `memberships.find(m => m.serviceKey === serviceKey)`
- `services/web-neture/.../UsersManagementPage`

**위험:** `if (serviceKey === 'neture')` 가드를 "안 쓰는 분기" 로 오인하고 삭제하면 해당 서비스 전체 기능 파괴.

### 4-F. Registry / Factory Patterns

| Registry | Entry | 등록자 | 조회자 | 키 |
|----------|-------|--------|--------|-----|
| `BlockRegistry` | `blockRegistry.registerMany()` | `block-renderer/src/renderers/index.ts` (auto) | `BlockRenderer.tsx` | blockType string |
| `ViewRegistry` | `viewRegistry.registerView()` | `cms-core` lifecycle/activate.ts | `dynamicRouter.ts` | viewId string |
| `NavigationRegistry` | `navigationRegistry.registerNav()` | cms lifecycle | header/sidebar | item.id string |
| `JobRegistry` | `jobRegistry.registerJobDefinition()` | `annualfee-yaksa` lifecycle | scheduler engine | job.id string |
| `CGMAdapterRegistry` | `cgmAdapterRegistry.register()` | CGM lifecycle | CGM orchestrator | adapterType string |
| `CPTRegistry` | `registry.register(cpt)` | backend startup | CPT editor/viewer | CPT type string |
| `ViewComponentRegistry` (admin) | `viewComponentRegistry.register()` | (per-route 수동) | DynamicRouteLoader | viewId string |

### 4-G. package.json `exports` 필드

- 대부분 `.` 단일 export
- 일부 multi-export:
  - `@o4o/block-renderer`: `./metadata` 별도
  - `@o4o-apps/cms-core`: `./manifest`, `./entities` 별도
  - `@o4o/auth-client`: `./types`, `./client`, `./sso-client`, `./cookie-client`, `./hooks`, `./rbac`

### 4-H. Manifest-Driven Lifecycle Hooks

```json
"lifecycle": {
  "install": "./lifecycle/install.js",
  "activate": "./lifecycle/activate.js",
  "deactivate": "./lifecycle/deactivate.js",
  "uninstall": "./lifecycle/uninstall.js"
}
```

- 발견 위치: `annualfee-yaksa`, `cgm-pharmacist-app`, `lms-yaksa`, `yaksa-scheduler`, `digital-signage-core` 등
- 이 lifecycle 모듈 안에서 ViewRegistry / NavigationRegistry / JobRegistry 등록 수행 → static grep 으로 보이지 않음
- **이것이 packages audit 의 "0 consumer" 판정과 reality 사이의 결정적 갭**

### 4-I. Phase R2 Disabled Routes (`register-routes.ts`)

`apps/api-server/src/bootstrap/register-routes.ts` 라인 324-343 에 명시:

| Route | Path | 상태 | 패키지 |
|-------|------|------|--------|
| Reporting | `/api/reporting` | **Phase R2 disabled** | `@o4o/reporting-yaksa` |
| AnnualFee | `/api/annualfee` | **Phase R2 disabled** | `@o4o/annualfee-yaksa` |
| Cosmetics Seller | `/api/v1/cosmetics-seller` | **Phase R2 disabled** | `@o4o/cosmetics-seller-extension` |
| Cosmetics Sample Display | — | **Phase R2 disabled** | `@o4o/cosmetics-sample-display-extension` |
| Cosmetics Supplier | — | **Phase R2 disabled** | `@o4o/cosmetics-supplier-extension` |

> **중요:** Phase R2 disabled = 패키지 자체는 보존된 상태로 라우트만 게이트. 의도적 보존 상태이므로 dead 가 아니라 **Hold (Phase R2 의도적 보류)**.

### 4-J. Top 10 — naive grep 으로 가장 오탐 위험 높은 영역

1. **Block Renderer type string lookups** (`blockRegistry.get('paragraph')`) — 50+ block 컴포넌트
2. **ServiceKey-scoped payment event handlers** — Neture/Glyco/KCos/LMS
3. **CMS View Registry lazy resolution** — 100+ view
4. **Lazy route components** — 137+ in web-k-cosmetics 단독
5. **Data-driven navigation configs**
6. **Job Scheduler Registry per-app jobs** — annualfee 11+ services
7. **PluginLoader runtime string import**
8. **CGM Adapter Registry**
9. **package.json export subpaths**
10. **Manifest lifecycle hooks** — annualfee-yaksa, lms-yaksa 등이 정확히 여기 해당

---

## 5. 전체 Dead Code Cleanup 단계 제안

| Phase | 범위 | 위험도 | 비고 |
|-------|------|:------:|------|
| **0** | Master Audit (본 IR) | — | 완료 |
| **1** | 폐기 도메인 잔재 (glucoseview / groupbuy hollow shells) | 낮음 | 다음 cleanup WO 후보 |
| **2** | Phase 1 결과의 type-union / serviceKey 잔재 line-by-line 정리 | 중간 | Phase 1 다음 |
| **3** | Frontend orphan pages (route 미등록, 메뉴 미등록) | 중간 | 서비스별 분리 (3-A, 3-B, 3-C, 3-D) |
| **4** | Menu / Sidebar / Dashboard quick-link 잔재 | 중간 | 서비스별 분리 |
| **5** | Frontend component dead code | 중간~높음 | 서비스별 분리, dynamic mapping 재검증 필수 |
| **6** | Frontend API client / hook layer dead code | 중간 | StoreHub endpoint 검증, token-refresh 통일 별도 |
| **7** | 공통 패키지 0-consumer 검증 (manifest-resolved 인지 재확인) | **높음** | lifecycle hook 활성화 여부 확정 후 진행 |
| **8** | API server entity / service dead code | 중간 | DataSource 등록 / shadow mode 검증 |
| **9** | Docs / test / mock 잔재 | 낮음 | 최후 진행 |

> Phase 7 (공통 패키지) 는 **manifest activation 검증 IR 별도 선행** 필수. 현 시점에서 즉시 삭제 부적합.

---

## 6. 우선 정리 가능한 후보 (Delete-likely · 높은 확신)

### 6-A. Glucoseview 잔재

| # | 항목 | 형태 | 검증 | 분류 |
|---|------|------|------|------|
| 1 | `services/web-glucoseview/` | 디렉토리 (src/ 없음, dist/만 잔존) | 30 일 touch 0 / 다른 서비스에서 참조 없음 | Delete-likely |
| 2 | `apps/api-server/src/utils/cookie.utils.ts` 의 `SERVICE_DOMAINS` 내 `'.glucoseview.co.kr'` 항목 (line 14, 26) | 코드 라인 | 다른 도메인은 살아있음 → line-level 작업 | Delete-likely |
| 3 | `apps/api-server/src/modules/partner/guards/partner-context.guard.ts` line 59 `allowedServices` 배열 내 `'glucoseview'` | 코드 라인 | partner-context 가 glucoseview 사용 안 함 | Delete-likely |
| 4 | `apps/api-server/src/controllers/OperatorNotificationController.ts` line 33 코멘트 내 `'glucoseview:operator'` 예시 | 주석 | 코멘트만, 동작 영향 없음 | Delete-likely (낮은 우선순위) |

### 6-B. Groupbuy 잔재 (Admin UI · Package)

| # | 항목 | 형태 | 검증 | 분류 |
|---|------|------|------|------|
| 5 | `packages/groupbuy-yaksa/` | 패키지 (src/ 없음) | api-server `register-routes.ts` 에 import / mount 없음 / 30 일 touch 0 | Delete-likely |
| 6 | `apps/admin-dashboard/src/pages/groupbuy/` (5 files) | 페이지 | `/api/groupbuy/*` 백엔드 미등록 → 호출 불가 | Delete-likely |
| 7 | `apps/admin-dashboard/src/hooks/groupbuy/` (3 files) | hook | 6번 페이지에서만 사용 | Delete-likely (6번과 함께) |
| 8 | `apps/admin-dashboard/src/components/groupbuy/` (3 files) | 컴포넌트 | 6번 페이지에서만 사용 | Delete-likely (6번과 함께) |
| 9 | `apps/admin-dashboard/src/routes/commerce.routes.tsx` 의 `/admin/groupbuy/*` 4 라우트 등록 | 라우트 등록 | 6번 페이지 삭제와 함께 제거 | Delete-likely |
| 10 | `services/web-kpa-society/src/api/mypage.ts` line 38 `type: '... | groupbuy | ...'` + line 173 `groupbuyParticipations` + line 186 `/mypage/groupbuys` | 코드 라인 | 타입 / 필드 / 엔드포인트 모두 leg / 백엔드 미존재 추정 → line-level 작업 | Delete-likely (사전 endpoint 검증 권장) |

### 6-C. 명백히 orphan 인 Frontend Pages (Delete-likely · 단, 사전 검증 권장)

| # | 항목 | 검증 | 분류 |
|---|------|------|------|
| 11 | `services/web-kpa-society/src/pages/auth/RegisterPendingPage.tsx` | App.tsx / AdminRoutes / OperatorRoutes 어디에도 import 없음, barrel export 만 | Delete-likely |
| 12 | `services/web-glycopharm/src/pages/forum/ForumFeedbackPage.tsx` | 라우트 등록 없음 | Delete-likely |
| 13 | `services/web-neture/src/pages/PlatformPrinciplesPage.tsx` | 라우트 등록 없음 (대체: `/o4o/intro`) | Delete-likely |

> 단, Frontend Audit 에이전트의 grep 범위가 lazy import 패턴을 모두 커버했는지 cleanup WO 시점에 재확인 필요.

---

## 7. 위험도가 높은 후보 (즉시 삭제 부적합 — 추가 조사 필요)

### 7-A. Yaksa 계열 패키지군

| 패키지 | Packages audit | API audit | Dynamic audit 시사 | 본 IR 결론 |
|--------|----------------|-----------|--------------------|-----------|
| `forum-yaksa` | "0 consumers, dead" | (언급 없음) | manifest lifecycle 가능 | **Needs-more-investigation** |
| `lms-yaksa` | "0 consumers, dead" | (언급 없음) | manifest lifecycle 가능 | **Needs-more-investigation** |
| `annualfee-yaksa` | "Active but Limited" | **Phase R2 disabled** | JobRegistry 등록자 | **Hold (Phase R2 의도적 보류)** |
| `membership-yaksa` | "Active but Limited" (annualfee, scheduler 가 사용) | (언급 없음) | yaksa subsystem 일원 | **Hold** |
| `yaksa-scheduler` | "Active but Limited" | (언급 없음) | JobRegistry 호스트 | **Hold** |
| `groupbuy-yaksa` | (없음) | (없음) | src/ 자체 없음 | Delete-likely (§6-B 5) |

> Packages audit 의 "0 consumer" 판정은 manifest activation 패턴을 반영하지 못함. lifecycle/activate.ts 가 실제 활성화되는지 (또는 disabled-apps.registry.ts 에 등록되었는지) 별도 IR 로 검증한 뒤에만 삭제 가능.

### 7-B. Ops 패키지군 (`partnerops` / `pharmacyops` / `sellerops` / `supplierops`)

- Packages audit: 4 개 모두 "백엔드 service/controller import 0, admin-dashboard UI 만 존재"
- 그러나 admin-dashboard 가 UI 를 띄운다는 것은 사용자가 화면을 보고 있을 가능성이 있음
- 실제 운영상 의도가 "UI shell + 추후 backend 연결 예정" 인지, "완전 폐기 예정" 인지 미확정
- **본 IR 결론: Needs-more-investigation** (별도 PM/사용자 확인 필요)

### 7-C. Cosmetics Extension 패키지군

- `cosmetics-seller-extension`, `cosmetics-sample-display-extension`, `cosmetics-supplier-extension`
- API audit: 모두 **Phase R2 disabled** 라고 명시
- **Hold (Phase R2 의도적 보류)** — 삭제 후보 아님

### 7-D. Organization 계열 패키지

- `organization-forum`, `organization-lms` — packages audit 가 "0 consumer" 분류
- 본 IR: forum-yaksa / lms-yaksa 와 동일 사유로 **Needs-more-investigation** (manifest 활성화 여부 확인 필요)

### 7-E. 기타 Needs-more-investigation 항목

| 항목 | 사유 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/LayoutBuilderPage.tsx` | StoreDashboardLayout 대체 여부 확정 필요 |
| `services/web-glycopharm/src/pages/apply/PharmacistApplyPage.tsx` | PharmacyApplyPage 와 병행 — 역할 분기인지 legacy 인지 |
| `services/web-glycopharm/src/api/storeHub.ts` 의 `/glycopharm/store-hub/*` 호출 | 백엔드 등록 미확인 |
| `services/web-kpa-society/src/api/token-refresh.ts` | `@o4o/auth-client` 표준에서 벗어난 custom 구현 — 통일 필요성 검토 |
| `o4o-ai-components` 패키지 | 3 컴포넌트 export, 0 consumer — 단, AI feature 후속 작업 예정 가능성 |
| `cgm-pharmacist-app` | 5 reference (config/vite/admin-dashboard 경로만) — runtime 사용 여부 미확정 |
| `apps/main-site/src/pages/groupbuy/` | KPA groupbuy 인지 별도 서비스인지 ownership 확정 필요 |
| `services/web-kpa-society/src/components/PlatformHeader.tsx` | GlobalHeader 로 대체되었는지 확정 필요 |
| `services/web-kpa-society/src/components/MyServicesSection.tsx` | 동적 렌더 가능성 |
| API server 내 `OperationsDashboard`, `CommissionPolicy`, `ShippingCarrier`, `ScreenTemplate`, `Alert` entities | DataSource 등록되어 있으나 사용처 미확정 |
| `ShadowModeService`, `ThemePresetService` | feature flag 게이트 — 운영 사용 여부 확정 필요 |

---

## 8. 보류해야 할 후보 (Hold · Preserve)

### 8-A. Preserve (절대 삭제 금지)

- **모든 migration 파일** — `apps/api-server/src/database/migrations/*`
- **18 개 Frozen Cores** — §1-C 명시
- **`apps/api-server/src/database/connection.ts` 내 "REMOVED" 주석 블록** — entity 삭제 audit trail
- **glucoseview 관련 migration 4 종** — 1771200000016 (test account 제거), 20260600000000 (DropGlucoseviewAndCgmTables) 등
- **`service_key='kpa-groupbuy'` DB 키** — Event Offer 의 canonical 식별자
- **`apps/api-server/src/routes/kpa/kpa.routes.ts` 의 `/groupbuy` mount** — Event Offer 의 canonical backend (이름만 legacy)

### 8-B. Hold (현재 운영 의도 있음)

- Phase R2 disabled 5 종 (§4-I) — `annualfee-yaksa`, `cosmetics-seller-extension`, `cosmetics-sample-display-extension`, `cosmetics-supplier-extension`, `reporting-yaksa`
- yaksa-scheduler / membership-yaksa — 활성 KPA fee subsystem
- `services/web-{glycopharm,k-cosmetics}/src/api/appreciation.ts` — 방금 커밋된 active WO 라인

---

## 9. 다른 작업과 충돌 가능성이 있는 파일

§3-C 매트릭스 기준으로, dead code 후보와 최근 30 일 변경 파일의 직접적 라인 수준 충돌은 **0 건**.

단 다음은 같은 파일 내 다른 라인을 작업하는 형태이므로 cleanup WO 시 **파일 전체가 아니라 라인 단위로 작업**해야 함:

| 파일 | 충돌 사유 | 권장 처리 |
|------|----------|----------|
| `services/web-kpa-society/src/api/mypage.ts` | 최근 LMS 흐름으로 같은 파일 다른 라인이 활발히 수정됨. groupbuy 라인만 라인 단위 제거 | 라인 단위 cleanup, 파일 전체 작업 금지 |
| `apps/api-server/src/utils/cookie.utils.ts` | 다른 서비스 도메인 항목은 active | line 14, 26 의 glucoseview 항목만 제거 |
| `apps/api-server/src/modules/partner/guards/partner-context.guard.ts` | 다른 서비스 가드는 active | line 59 의 `'glucoseview'` 만 제거 |
| `apps/admin-dashboard/src/routes/commerce.routes.tsx` | commerce 다른 라우트는 active | groupbuy 4 라우트만 제거 |

본 IR 작성 시점에 unstaged / WIP 파일은 없으므로 즉시 충돌 위험 0.

---

## 10. O4O 철학 / 현 구조 충돌 체크

### 10-A. CLAUDE.md / Business Philosophy 와의 정합성

- **§3 Frozen Cores 보호**: §1-C 에 명시. 삭제 후보에서 자동 제외.
- **§14 F11 (User/Operator Freeze)**: 본 IR 의 dead code 후보 중 `users` · `service_memberships` · `role_assignments` 3 테이블 또는 관련 entity 를 건드리는 항목 **없음**.
- **§4 / §11 (E-commerce Core, Operator Dashboard)**: 후보가 `checkoutService.createOrder()` 우회, OrderType 위반, OperatorDashboardLayout 우회 등에 해당하지 않음.
- **§7 Boundary Policy**: glucoseview 정리는 Broadcast / Community / StoreOps / Commerce 4 도메인 boundary 와 직교 — 충돌 없음.
- **§13 O4O 공통 구조 (Forum / LMS / Signage 단일 구조)**: 본 IR 의 후보가 Forum/LMS/Signage 공통 구조를 침범하지 않음.
- **Twin Axis (KPA + Neture) [[project_canonical_twin_axis]]**: 두 축 모두 active. 어느 축도 단축 표현으로 다루지 않음.

### 10-B. 잠재적 충돌 영역 (Hold 분류 정당화)

- **Yaksa subsystem (forum-yaksa / lms-yaksa / annualfee-yaksa / membership-yaksa / yaksa-scheduler)**:
  - KPA Society = 이전 yaksa.site 의 후속. 패키지명만 legacy 이고 KPA 운영의 일부일 수 있음.
  - 단순 "yaksa 라는 이름" 으로 삭제 판정 금지 — Twin Axis 의 KPA 축이 의존할 가능성.
- **Ops 패키지군 (partnerops / pharmacyops / sellerops / supplierops)**:
  - O4O Business Philosophy §3.2 "서비스 운영 사업자 (Operator)" 와 직접 관련된 이름
  - admin-dashboard UI 가 살아있는 만큼 운영자 일부 화면에 노출 가능
  - 폐기인지 미구현 stub 인지 PM 확인 필요

---

## 11. 다음 단계로 권장하는 첫 번째 cleanup WO 범위

### 11-A. 권장 후보: **WO-O4O-DEAD-CODE-DOMAIN-RESIDUE-CLEANUP-PHASE1-V1**

**범위:** §6-A (Glucoseview 잔재 1-3) + §6-B (Groupbuy admin UI 5-9)

**포함:**

1. `services/web-glucoseview/` 디렉토리 제거 (CI / Docker / pnpm-workspace.yaml 참조 확인 후)
2. `packages/groupbuy-yaksa/` 디렉토리 제거 (api-server package.json `@o4o-apps/groupbuy-yaksa` 의존성, register-routes.ts 의 line 342 dead 코멘트도 같이 제거)
3. `apps/admin-dashboard/src/pages/groupbuy/` · `hooks/groupbuy/` · `components/groupbuy/` 디렉토리 제거
4. `apps/admin-dashboard/src/routes/commerce.routes.tsx` 의 `/admin/groupbuy/*` 4 라우트 라인 제거
5. `apps/api-server/src/utils/cookie.utils.ts` line 14, 26 의 glucoseview 도메인 항목 line-level 제거
6. `apps/api-server/src/modules/partner/guards/partner-context.guard.ts` line 59 `allowedServices` 배열에서 `'glucoseview'` 라인 제거

**제외:**

- `services/web-kpa-society/src/api/mypage.ts` 의 groupbuy 라인 (Phase 1 다음 WO 로 분리 — 백엔드 `/mypage/groupbuys` 엔드포인트 실재 여부 사전 확인 필요)
- `apps/main-site/src/pages/groupbuy/` (ownership 확정 후 별도 WO)
- 모든 migration 파일 (Preserve)
- 모든 type-union 의 `glucoseview` literal (Phase 2 로 분리)
- 모든 packages dead 후보 (Phase 7 로 분리, manifest activation 검증 IR 선행 필요)

**선행 검증 (cleanup WO 시작 전):**

- `pnpm-workspace.yaml`, 각 service `Dockerfile`, CI workflow (`.github/workflows/*.yml`) 에서 `glucoseview` / `groupbuy-yaksa` 빌드 step 잔재 확인
- `apps/api-server/package.json` 의 `@o4o-apps/groupbuy-yaksa` 의존성 라인 확인 (있다면 제거 대상에 포함)
- `services/web-glucoseview` 가 Cloud Run 서비스로 배포되어 있는지 (`gcloud run services list`) — 본 IR 에서는 미확인. 배포되어 있다면 Cloud Run 측 정리도 별도 단계로 포함.

**위험도:** **낮음**
- 30 일 변경 활동 0
- 다른 코드의 import / route 등록 없음
- migration 미접근
- Frozen Core 미접근
- 활성 WO 라인과 직접적 충돌 0

**작업 단위 크기 판단:**

- 위 6 항목은 같은 테마(legacy 도메인 잔재) 이므로 하나의 PR 로 묶을 수 있음
- 단, 사용자가 "더 작게 쪼개기" 를 선호한다면 Phase 1-α (glucoseview 5 라인) / Phase 1-β (groupbuy 디렉토리들) 2 개로 분리 가능

### 11-B. 차순위 후보들 (Phase 1 이후)

| 우선순위 | 후보 | 사유 |
|:--------:|------|------|
| Phase 1-next | `services/web-kpa-society/src/api/mypage.ts` 의 groupbuy 라인 (§6-B 10) | 백엔드 endpoint 부재 사전 확인 필요 |
| Phase 1-next | §6-C 3 개 orphan page (`RegisterPendingPage`, `ForumFeedbackPage`, `PlatformPrinciplesPage`) | lazy import 재검증 후 |
| Phase 2 | type-union literal cleanup (`platform-store-policy.entity.ts` `| glucoseview`) | Phase 1 결과의 추수 작업 |
| Phase 3+ | Frontend orphan page 서비스별 정리 | Frontend audit 결과 기반 |
| Phase 7 (별도 IR 필요) | 공통 패키지 0-consumer 검증 | manifest activation IR 선행 |

---

## 부록 A. 5 개 병렬 조사 에이전트 산출물 요약

| Agent | 영역 | 핵심 산출 |
|-------|------|-----------|
| Domain Residue + Conflict Matrix | glucoseview/yaksa/groupbuy 잔재 + 30 일 변경 매트릭스 | 즉시 삭제 후보 6 항목 + Top 20 변경 파일 + 활성 WO 7 테마 |
| Frontend Services | 4 main web 서비스의 orphan route/page/component | 6 개 orphan page (3 high / 3 medium) + 메뉴 legacy 없음 확인 |
| Packages Legacy | 70+ packages consumer count + legacy 패키지 식별 | 9 개 SAFE-TO-REMOVE 후보 (manifest 확인 전), 18 개 Frozen 보존 확인 |
| API Server + Frontend API | 미등록 route / orphan controller / API client dead code | API server route 100% 등록 / `mypage.ts` groupbuy 라인 / StoreHub endpoint 검증 필요 |
| Dynamic Mapping | static-import-blind 참조 경로 | barrel/lazy/registry/serviceKey/manifest/lifecycle 8 패턴 + Top 10 오탐 위험 영역 |

---

## 부록 B. 최종 보고

| 항목 | 값 |
|------|------|
| 코드 수정 없음 | ✅ 확인 |
| 파일 삭제 없음 | ✅ 확인 |
| 커밋 없음 | ✅ 확인 |
| Push 없음 | ✅ 확인 |
| 조사 보고서 작성 위치 | `docs/investigations/IR-O4O-DEAD-CODE-CLEANUP-MASTER-AUDIT-V1.md` |
| 다음 cleanup WO 후보 1 개 | **WO-O4O-DEAD-CODE-DOMAIN-RESIDUE-CLEANUP-PHASE1-V1** (§11-A) |

---

*Updated: 2026-05-26*
*Status: Investigation complete — awaiting first cleanup WO scope confirmation*
