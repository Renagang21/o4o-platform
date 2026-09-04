# CHECK-O4O-SIGNAGE-RESIDUAL-DEAD-RUNTIME-FINAL-RETIREMENT-V1

> **WO**: [WO-O4O-SIGNAGE-RESIDUAL-DEAD-RUNTIME-FINAL-RETIREMENT-V1](../work-orders/WO-O4O-SIGNAGE-RESIDUAL-DEAD-RUNTIME-FINAL-RETIREMENT-V1.md)
> **작성일**: 2026-09-04
> **상태**: 실행 완료

---

## 1. 기준 SHA

| 항목 | 값 |
|---|---|
| 작업 시작 base SHA | `3496d26bf` |
| 선행 WO merge SHA | `b64b2b61b` (PR #191 — `WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1`) |
| 작업 branch | `work/signage-residual-dead-runtime-final-retirement-v1` |

선행 legacy cleanup WO 의 코드 커밋(`3496d26bf`)이 base 이며, PR #191 merge 이후 `origin/main` 과의
코드 차이는 문서 커밋 1건(`f6b1a5fae`)뿐임을 확인했다.

---

## 2. census 방법 (WO §7)

4방향을 모두 적용했다.

| 방향 | 수단 |
|---|---|
| import graph | `pages/digital-signage/…` · `lib/api/digitalSignage` · 패키지 subpath import 전수 grep |
| route / menu 등록 | `DigitalSignageRouter.tsx` · `lms-marketing.routes.tsx` · `admin-menu.static.tsx` · `ViewComponentRegistry.ts` |
| raw-source literal | `node scripts/quality/check-literal-consumers.mjs --source …` + `readFileSync`/`existsSync` 계열 spec 전수 |
| 실제 runtime 진입점 | `register-routes.ts` mount prefix · `authClient` baseURL(`/api/v1`) · 프로덕션 GET 404 확인(read-only) |

---

## 3. 판정 결과 (미조사 0)

### 3-1. ACTIVE_RUNTIME — 보존

| 대상 | 근거 |
|---|---|
| `apps/api-server/src/routes/signage/**` | `register-routes.ts` 에서 `/api/signage/:serviceKey` · `/api/signage/:serviceKey/public` 로 실제 mount |
| `apps/admin-dashboard/src/pages/digital-signage/DigitalSignageRouter.tsx` | route 등록(`lms-marketing.routes.tsx:21,71-77`) + menu 진입점 존재 |
| `apps/admin-dashboard/src/pages/digital-signage/v2/ContentHub.tsx` | `globalContentApi` → `/api/signage/{serviceKey}/global/*` 실호출 |
| `apps/admin-dashboard/src/lib/api/signageV2.ts` | ContentHub 가 소비 |
| `@o4o-apps/digital-signage-core` → `./entities` · `SignageCoreEntities` | `apps/api-server/src/database/entities.ts:504-506` 에서 TypeORM 등록, `dashboard-assets.copy-handlers.ts` 가 소비 |
| Tablet ScreenSet 축 · forced-content 계약 | 이번 작업에서 **미접촉** |

### 3-2. DEAD_RUNTIME — 삭제

#### (a) frontend — `/api/v1/signage/*` 축 (백엔드 mount 0)

`apps/admin-dashboard/src/lib/api/digitalSignage.ts` 는 `API_BASE = '/signage'` 이고,
`authClient.api` 의 baseURL 은 항상 `/api/v1` 로 끝난다(`packages/auth-client/src/client.ts:358-373`).
따라서 이 client 의 모든 호출은 `/api/v1/signage/*` 로 나가는데,
`grep -rn "v1/signage" apps/api-server/src` = **0건**, 프로덕션 GET 도 **404** 였다.

| 삭제 | 파일 수 |
|---|---|
| `pages/digital-signage/action/**` | 2 |
| `pages/digital-signage/display/**` | 4 |
| `pages/digital-signage/media/**` | 6 |
| `pages/digital-signage/operations/**` | 4 |
| `pages/digital-signage/schedule/**` | 3 |
| `pages/digital-signage/admin/**` (Coming Soon placeholder · menu 진입점 0 · API 호출 0) | 4 |
| `pages/digital-signage/v2/MonitoringDashboard.tsx` (API 호출 주석처리 · mock 전용 · 은퇴된 Channel 개념 기반) | 1 |
| `lib/api/digitalSignage.ts` | 1 |

#### (b) admin menu / router

- `admin-menu.static.tsx` 의 dead child 4개(`operations` / `displays` / `media/sources` / `schedules`)를
  Content Hub 1개로 교체 → **데드링크 0 / 기능 은폐 0**.
  group `id: 'digital-signage'` 문자열은 **유지**했다 — `admin-menu-batch2.test.ts:89` 가 이 문자열을
  slice 구분자로 사용한다(§18).
- `DigitalSignageRouter.tsx` root redirect 를 `monitoring` → `content` 로 재지정하고 dead route 를 제거했다.
  `RemovedRouteRedirect` 안내 route 는 유지.

#### (c) package `@o4o-apps/digital-signage-core` — `./entities` 외 subpath consumer 0

`src/index.ts`, `src/backend/index.ts`, `backend/controllers/**`(13), `backend/services/**`(12),
`backend/lifecycle/**`(5), `backend/dto/**`(1), `backend/player/**`(7), `backend/engine/**`(3),
`backend/types/context.ts`, `backend/manifest.ts`, `backend/routes.ts` 삭제.
`package.json` 의 `.` / `./manifest` export 를 정리해 `main` · `types` · `.` 이 모두 entities 를 향하도록 했다.
`entities/**` 는 외부 import 가 없는 self-contained 모듈이라 영향 없음.

#### (d) stale 산출물

`apps/admin-dashboard/src/config/apps.config.{d.ts,d.ts.map,js,js.map}` — 커밋된 낡은 build 산출물이며
저장소에 마지막으로 남아 있던 `/api/v1/signage` 리터럴을 보유했다. 정본 `apps.config.ts` 에는 signage 항목이 없다.
Vite 기본 확장자 해석 순서상 `.js` 가 `.ts` 보다 앞서므로 잠재 오해석 요인이기도 했다.

### 3-3. DEFER_POLICY — 보존 + 보고

| 대상 | 사유 |
|---|---|
| `SignageEntities` · `AllSignageEntities` 및 Phase-6 entity 7종(`MediaSource` / `MediaList` / `MediaListItem` / `Display` / `DisplaySlot` / `Schedule` / `ActionExecution`) | TypeORM 미등록이나 물리 테이블이 존재할 수 있다. WO §17 "schema change = 0 / table DROP = 0" 로 이번 범위 밖 |
| `apps/digital-signage-agent` (13 files) | 매장 단말 device agent. `/api/digital-signage/*` 를 호출하나 해당 mount 0 · Cloud Run 미배포. 선행 CHECK(`CHECK-O4O-SIGNAGE-LEGACY-STACK-SIMPLIFICATION-AND-TABLET-AUTHORING-CLOSURE-V1`)에서 이미 DEFER 판정 — 제품 판단 필요 |
| `packages/digital-signage-core` 의 `express` · `@types/express` dependency | 소비처가 사라졌으나 dependency / lockfile 변경은 CLAUDE.md 중지 조건 |

### 3-4. TEST_ONLY / 보호 대상 guard — 삭제하지 않음

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/__tests__/channels-stack-retirement.spec.ts` | Channel 은퇴 guard (현재 계약 보호) |
| `signage-campaign-forced-content-tablet-surface.spec.ts` · `signage-forced-content-surface-read-contract.spec.ts` · `signage-forced-content-delete-not-found.spec.ts` | forced-content 계약 guard |
| `signage-cross-service-org-guard.spec.ts` · `signage-servicekey-canonicalization.spec.ts` · `signage-resource-id-validation.spec.ts` · `signage-media-library-route-order.spec.ts` · `signage-schedule-route-order.spec.ts` · `signage-player-web-deployment-contract.spec.ts` | 현행 route / boundary 계약 guard |
| `admin-menu-batch2.test.ts` · `admin-operation-boundary.test.ts` | admin 경계 guard |

stale test 로 삭제한 파일은 **0건**이다. 테스트 skip 도 **0건**이다(§19).

### 3-5. DOC_ONLY — 무조치 5건

- `docs/archive/audits/IR-O4O-OVERSIZED-FILE-AUDIT-PHASE2-V1.md`
- `docs/archive/investigations/IR-O4O-ADMIN-MENU-TAXONOMY-AUDIT-V1.md`
- `docs/checks/CHECK-O4O-SIGNAGE-LEGACY-STACK-SIMPLIFICATION-AND-TABLET-AUTHORING-CLOSURE-V1.md`
- `docs/investigations/IR-O4O-ADMIN-DASHBOARD-API-PATH-CONVENTION-INVENTORY-V1.md`
- `docs/work-orders/WO-O4O-SIGNAGE-RESIDUAL-DEAD-RUNTIME-FINAL-RETIREMENT-V1.md`

모두 과거 시점 기록물이므로 CLAUDE.md §16-1 에 따라 손대지 않는다.

---

## 4. raw-source / stale guard census (WO §18)

- `node scripts/quality/check-literal-consumers.mjs --source apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx`
  → 살아있는 소비처 10건, 그중 `RAW_SOURCE_CONTRACT` 2건이 `channels-stack-retirement.spec.ts:89,210`.
  두 지점의 단언(`path: '/admin/cms/channels'` 부재 / `path: '/admin/cms/slots'` 존재)은 이번 변경과 충돌하지 않는다.
- 삭제 대상 basename 을 `readFileSync` / `existsSync` / route inventory 로 참조하는 spec: **0건**.
- 삭제 후 전 저장소(`apps` `packages` `services` `scripts`) 재검색:
  - `v1/signage` 리터럴 **0건**
  - `digitalSignage` 참조 **0건**

---

## 5. 검증 결과 (WO §21)

| # | 항목 | 결과 |
|---|---|---|
| 1 | `node scripts/lint-ratchet.mjs` | **PASS** — ESLint 62 errors / 1671 warnings, error baseline 62 (exit 0) |
| 2 | `packages/digital-signage-core` build (`tsc`) | **PASS** — `dist/backend/entities` 만 산출 |
| 3 | api-server `tsc --noEmit` | 20 errors — 전부 미빌드 workspace package 의 TS2307 (`@o4o/ai-core` · `security-core` · `mail-core` · `payment-core` · `action-log-core` · `market-trial` · `platform-core/store-identity` · `forum-core/entities`). **signage 관련 0건**, 본 변경과 무관 |
| 4 | admin-dashboard `tsc --noEmit` | **PASS — 0 errors** (`build:packages` 후) |
| 5 | Signage / Tablet / forced-content spec (10 suite) | **PASS — 10 suites / 258 tests** |
| 6 | Channel retirement guard (`channels-stack-retirement.spec.ts`) | **PASS** (위 10 suite 에 포함) |
| 7 | admin-dashboard vitest (`admin-menu-batch2` · `admin-operation-boundary`) | **PASS — 2 files / 15 tests** |
| 8 | api-server 전체 Jest | **PASS — 217 suites / 3,606 tests** (아래 stale guard 1건 갱신 후) |
| 9 | `scripts/appstore-guard.ts` (CI AppStore Guard) | **PASS** — 14 packages, Catalog 14/14, FROZEN Core 무결 |
| 10 | admin-dashboard production build (`vite build`) | **PASS — built in 1m 2s** |

### 5-1. stale guard 갱신 1건 (WO §18 사례)

전체 Jest 1차 실행에서 `app-management-runtime-residue-retirement.spec.ts:214` 가 실패했다.
`packages/**/manifest.ts` 파일 수를 15로 단언하는데, 본 WO 가 소비처 0 인
`packages/digital-signage-core/src/backend/manifest.ts` 를 삭제해 14가 되었기 때문이다.

- skip 하지 않고(§19) **단언 값을 14로 갱신**하고 사유 주석을 남겼다.
- CI `AppStore Guard` 는 `*/src/manifest.ts` 만 glob 하므로 이 파일을 애초에 세지 않았다 → 스크립트 변경 불필요, 실행 결과 PASS.
- 갱신 후 전체 Jest **217/217 suites, 3,606/3,606 tests PASS**.

---

## 6. 회귀 확인 (WO §22)

| 항목 | 상태 |
|---|---|
| Tablet ScreenSet canonical 재생 경로 | 미접촉 |
| forced-content 계약 (`target_surface`) | 미접촉 |
| campaign writer `'both'` / manual writer 기본 `'signage'` | 미접촉 |
| Channel runtime 부활 | 0 — Channel 기반 화면은 오히려 제거 |
| production 데이터 write / DELETE | 0 (read-only GET 404 확인만 수행) |
| schema change · table DROP · migration | 0 |
| `cms_content_slots` · `organization_channels` · `external_channel_product_links` | 미접촉 |

---

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건

1. Phase-6 signage entity 7종 + 물리 테이블 처분
2. `apps/digital-signage-agent` 처분
