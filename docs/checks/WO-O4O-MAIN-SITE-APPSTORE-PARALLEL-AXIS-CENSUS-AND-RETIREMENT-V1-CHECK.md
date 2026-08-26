# WO-O4O-MAIN-SITE-APPSTORE-PARALLEL-AXIS-CENSUS-AND-RETIREMENT-V1 — CHECK

이미 퇴역한 `apps/main-site` 안에 남아 있던 **별도의 App Store 세계**를 전수조사하고
현행 App management canonical 과 충돌하지 않도록 병렬축만 제거한 기록.

- 기준 branch: `main`
- 착수 기준 commit: `ad0a8141f` (local HEAD), `origin/main` = `ae2644835`
- **최종 판정: `RETIRE_CONFIRMED`**
- DB schema change 0 / migration 0 / production write 0

---

## 1. Main-site App Store Census (§3)

`apps/main-site` 전수검색 결과. 미조사 0.

| 경로 | 분류 | 근거 |
|---|---|---|
| `src/appstore/index.ts` | `LEGACY` | 병렬축 barrel |
| `src/appstore/types.ts` | `LEGACY` | `AppManifest`·`AppRegistryEntry`·`AppStoreState` 등 자체 타입계 |
| `src/appstore/registry.ts` | `LEGACY` | client-side `AppRegistry` 5개 항목 (commerce/customer/admin/forum/forum-neture) |
| `src/appstore/manifestLoader.ts` | `STUB` | manifest 동적 import 실패 시 `createStubManifest()` 로 가짜 manifest 생성 |
| `src/appstore/loader.ts` | `ACTIVE_RUNTIME`(부팅 진입) → `NO_EFFECT` | `initializeAppStore()` 가 `main.tsx` 에서 호출됨. 단, 산출물을 읽는 소비처가 0 |
| `src/appstore/registryMerger.ts` | `INTERNAL_CLOSED_LOOP` | `FunctionRegistry`/`UIComponentRegistry` 의 **유일한** 소비처 |
| `src/components/ui/appstore/AppList.tsx` | `UNROUTED_UI` | `appStoreManager` 가 반환하는 `type: 'AppList'` 전용 |
| `src/components/ui/appstore/AppCard.tsx` | `UNROUTED_UI` | `AppList` 내부 |
| `src/components/ui/appstore/AppInstallButton.tsx` | `UNROUTED_UI` | `AppCard` 내부 |
| `src/components/ui/appstore/AppEnableToggle.tsx` | `UNROUTED_UI` | `AppCard` 내부 |
| `src/components/ui/appstore/index.ts` | `DEAD_REFERENCE` | 이 barrel 을 import 하는 코드 0 |
| `src/shortcodes/_functions/appstore/appStoreManager.ts` | `STUB` | install/uninstall/toggle 3개 핸들러가 전부 `alert('...will be implemented soon.')` |
| `src/views/appstore.json` | `DEAD_CONFIG` | §4 참조 |
| `src/components/registry/function.ts` (import·등록 2줄) | `ACTIVE_BUILD` | 병렬축 진입 등록 → 제거 대상 라인 |
| `src/components/registry/ui.tsx` (import·등록 4줄) | `ACTIVE_BUILD` | 동일 |
| `src/main.tsx` (`initializeAppStore()` 블록) | `ACTIVE_RUNTIME` | 부팅 부작용 → 제거 대상 |
| `tsconfig.json` · `vite.config.ts` 의 `@o4o-apps/signage` alias | **대상 아님** | 실재하는 `packages/@o4o-apps/signage` 용. App Store 병렬축과 무관 |

`UNKNOWN` **0**.

## 2. Runtime Reachability (§4)

`views/*.json` → route 생성 경로를 끝까지 추적했다.

```text
src/views/appstore.json
  └─ src/view/route-generator.ts : import.meta.glob('../views/*.json') → viewId 'appstore' → '/appstore'
       └─ src/view/loader.ts     : generateRoutes() 를 호출하는 유일한 파일
            └─ 이 파일을 import 하는 코드 = 0   ← 여기서 끊긴다
```

실제 라우터는 `src/App.tsx` → `src/router/index.tsx` 의 **명시적 React Router 표**이며
등록 경로는 `/login`, `/`, `/org/:orgId`, `/forum`, `/forum/post/:slug`, `/forum/write`,
`/lms*`, `/seller/dashboard*`, `/mypage/*`, `*`(404) 뿐이다. `/appstore` 는 없다.

| 화면 | 판정 |
|---|---|
| `views/appstore.json` (`/appstore`) | **`UNROUTED` / `DEAD_ROUTE`** — 404 catch-all 로 떨어진다 |
| `AppList` / `AppCard` | **`UNROUTED`** — 렌더 진입점 없음 |
| `initializeAppStore()` | **`BUILD_ONLY`** 에 가까운 `ROUTED` 아님 — 부팅 시 실행되지만 화면 도달 0 |

부수 확인: `components/ViewRenderer.tsx` 를 import 하는 코드도 **0**. 즉 병렬축이 주입하던
레지스트리를 읽는 렌더러 자체가 연결돼 있지 않다.

## 3. `appStoreManager` 역할 (§5)

`appStoreManager` 는 `FunctionComponent` 하나이며 public API 는 반환 객체의 4개 필드다.

| 항목 | 실제 동작 | 판정 |
|---|---|---|
| lookup (`AppRegistry.map` + `getAllLoadedApps()`) | 레지스트리 5개 항목을 manifest/fallback 으로 투영 | `INTERNAL_CLOSED_LOOP` |
| render (`{ type: 'AppList', props }`) | ViewRenderer 가 연결돼 있지 않아 렌더 0 | `NO_EFFECT` |
| install (`onInstall`) | `alert('Installing app: … will be implemented soon.')` | `STUB` |
| uninstall (`onUninstall`) | `alert(...)` | `STUB` |
| activate/toggle (`onToggleEnable`) | `alert(...)` | `STUB` |
| config | 없음 | `DEAD` |
| load (`loader.ts::loadApp`) | manifest 로드 → 실패 시 stub → **가짜 컴포넌트** 생성 후 레지스트리 주입 | `NO_EFFECT` (소비처 0) |
| register (`registryMerger`) | `FunctionRegistry`/`UIComponentRegistry` 에 주입 | `INTERNAL_CLOSED_LOOP` |

현행 canonical 과의 관계:

| main-site 축 | 현행 canonical | 관계 |
|---|---|---|
| `src/appstore/registry.ts` 의 `AppRegistry` (5) | `APPS_CATALOG` (17) | 별개 데이터, 겹치는 항목 0 |
| `loader.ts` 의 `AppStoreState.apps` | `app_registry` 테이블 | in-memory Map, 영속 0 |
| `appStoreManager` 의 alert 핸들러 | `AppManager` facade (read-only) | 실제 write 0 |

## 4. `views/appstore.json` 계약 (§6)

```json
{ "viewId": "appstore",
  "layout": { "type": "DashboardLayout", "props": { "title": "App Store" } },
  "fetch": { "queryKey": ["appstore","apps"], "enabled": false, "initialData": [] },
  "components": [ { "type": "appStoreManager", "props": {} } ] }
```

| 질문 | 답 |
|---|---|
| 실제 화면 정의인가? | 형식상은 그렇다 |
| route/menu source 인가? | route generator 의 입력이지만 그 generator 가 실행되지 않는다 |
| mock/sample 인가? | `fetch.enabled: false`, `initialData: []` — 데이터 조회조차 꺼져 있다 |
| `appStoreManager` 만 읽는가? | 참조 컴포넌트는 `appStoreManager` 하나뿐 |
| 현재 build 에 포함되는가? | `import.meta.glob` 의 유일한 호출자가 unimported 라 번들에 도달하지 않는다 |

**판정: `DEAD_CONFIG`**

## 5. `@o4o-apps/*` 실체 (§7)

`packages/@o4o-apps/` 실제 내용: `content-app`, `learning-app`, `signage` **3개뿐**.

| 참조 | workspace | package.json | import caller | 판정 |
|---|---|---|---|---|
| `@o4o-apps/commerce` | 없음 | 없음 | 문자열 참조만(`registry.ts`) | **`MISSING_PACKAGE`** |
| `@o4o-apps/customer` | 없음 | 없음 | 문자열 참조만 | **`MISSING_PACKAGE`** |
| `@o4o-apps/admin` | 없음 | 없음 | 문자열 참조만 | **`MISSING_PACKAGE`** |
| `@o4o-apps/dropshipping` · `lms` | 없음 | 없음 | 주석 처리됨 | `HISTORICAL_PACKAGE` |
| `@o4o-apps/signage` | **있음** | 있음 | `components/registry/*` 에서 실제 import, tsconfig·vite alias 존재 | **`ACTIVE_PACKAGE` — 이번 대상 아님, 무변경** |

fallback 동작 실측: `manifestLoader.loadManifest()` 는 `../../../packages/{folder}/manifest.json`
을 동적 import 한다. `packages/commerce|customer|admin/manifest.json` 은 **모두 없다**
(저장소 전체에서 `packages/*/manifest.json` 은 `packages/forum-core/manifest.json` 1개뿐).
따라서 세 앱은 항상 `createStubManifest()` 로 떨어져 **가짜 컴포넌트 10종**
(`ProductList`·`Cart`·`Checkout`·`AdminDashboard`·`UserManagement` 등)을 만들어
전역 `FunctionRegistry`/`UIComponentRegistry` 에 주입하고 있었다.

추가로 `forum`·`forum-neture` 항목의 `manifestPath` 는 `@o4o/forum-core/...` 형식이라
`loadManifest` 의 `/@o4o-apps\/([^/]+)/` 정규식에 매칭되지 않아 **항상 예외**로 끝난다.

즉 이 축은 dead 인 정도가 아니라 **전역 레지스트리를 가짜 컴포넌트로 오염시키는 부팅
부작용**이었다.

## 6. Build 계약 (§8)

| 항목 | 실측 |
|---|---|
| Cloud Run 서비스 | **없음** — `gcloud run services list` 10개 중 main-site 없음 |
| deploy workflow | **없음** — `.github/workflows/` 에서 main-site 를 언급하는 workflow 는 `ci-pipeline.yml` 하나이고 build matrix 용도 |
| CI build | **포함** — `ci-pipeline.yml` `build` job `matrix.app: [main-site, admin-dashboard]` → `scripts/ci-build-app.sh main-site` |
| root scripts | `build:main-site` / `build:apps` / `build:apps:all` / `build:web` 에 포함 |
| package 이름 | `@o4o/main-site-nextgen` (private) |
| test runner | **없음** — `package.json` 에 test script 0 |
| 다른 패키지의 dependency | **0** — `@o4o/main-site-nextgen` 을 의존하는 workspace 패키지 없음 |

→ **runtime 은 retire 됐지만 source build 는 여전히 CI 에서 강제된다.** 따라서 App Store
residue 는 clean build 에 영향을 주며(빌드·typecheck 대상), 제거 후 build 통과를
확인해야 한다(§10 참조).

## 7. 저장소 전체 Consumer Census (§9)

`git grep` 으로 `apps/main-site` 를 제외한 전 저장소를 스캔했다.

| 검색 축 | 결과 |
|---|---|
| `appStoreManager` | main-site 밖 **0** |
| `appstore/registry` · `appstore/loader` | main-site 밖 **0** |
| `views/appstore` | main-site 밖 **0** |
| `@o4o-apps/commerce|customer|admin` | main-site 밖 **0** |
| `main-site` 경로 참조 (raw-source / readFileSync) | **0** |
| `main-site` 문자열 일반 | `.github/CODEOWNERS`·`labeler.yml`·`ci-pipeline.yml`(build matrix)·root `package.json`(build script)·`scripts/ci-build-app.sh`·`BackupService.ts`(`apps/main-site/.env`)·`incident-policy.ts`(서비스명)·문서 68개 — 전부 **App Store 축과 무관** |
| api-server 주석 2건 (`register-routes.ts`, `public-appstore-read-retirement.spec.ts`) | `DOC_ONLY` — 선행 WO 가 남긴 경위 서술 |

**판정: `CONSUMER_ZERO`** (`ACTIVE_RUNTIME_CONSUMER` 0 / `ACTIVE_BUILD_CONSUMER` 0 /
`RAW_SOURCE_CONTRACT` 0 / `TEST_CONTRACT` 0)

## 8. 현행 App Store canonical 과 비교 (§10)

| 책임 | main-site 축 | 현행 canonical | 비교 |
|---|---|---|---|
| metadata | `src/appstore/registry.ts` 의 `AppRegistry` 5항목 + stub manifest | `APPS_CATALOG` 17항목 | 별개·구식, 겹침 0 |
| operational state | in-memory `AppStoreState.apps` (프로세스 수명) | `app_registry` 테이블 | 영속성 없음 |
| admin read | 없음 (alert 스텁) | `/api/v1/admin/apps` | 대체 존재 |
| availability | 없음 | `/api/v1/apps/availability` | 대체 존재 |
| runtime loading | `loader.ts` 동적 manifest 로딩 + registry 주입 | **없음(의도적으로 없음)** | 선행 `MODULE_LOADER_RETIRE` 판정과 동일한 죽은 개념 |

**판정: `OBSOLETE_PARALLEL`** — 현행 canonical 이 전부 대체하며, `runtime loading` 은
선행 WO 에서 이미 은퇴 확정된 개념이다. `NO_REAL_CONTRACT` 에도 해당한다.

## 9. Retired Main-site 전체 계약과의 정합 (§11)

| 확인 | 결과 |
|---|---|
| Cloud Run 서비스 | 없음 ✅ |
| GCLB/NEG | 없음 (서비스가 없으므로) ✅ |
| deploy workflow | 없음 ✅ |
| organic traffic | 대상 없음(서비스 미존재) ✅ |
| unique viewer 제거 | 선행 `WO-O4O-MAIN-SITE-UNIQUE-VIEWER-MIGRATION-AND-PREVIEW-LINK-CLOSURE-V1` 에서 완료 ✅ |

App Store 축이 이 retired source 를 보존해야 할 이유였는가? **아니다.** 병렬축을 제거해도
main-site 에는 라우팅된 실제 화면(login/dashboard/forum/lms/seller)이 남는다(§13).

## 10. 최종 판정 (§12)

`RETIRE_CONFIRMED` 조건 전수 충족:

| 조건 | 결과 |
|---|---|
| runtime consumer 0 | ✅ 부팅 호출 1건은 축 자신의 진입점이며 산출물 소비처 0 (`NO_EFFECT`) |
| build consumer 0 또는 제거 가능 | ✅ `registry/function.ts`·`registry/ui.tsx`·`main.tsx` 3파일 소폭 수정으로 제거 가능 |
| external consumer 0 | ✅ |
| route reachability 0 | ✅ `/appstore` 는 라우터에 없고 view route generator 는 실행되지 않는다 |
| unique product function 0 | ✅ 전 기능이 `alert()` 스텁 |
| 현행 canonical 대체 존재 | ✅ `APPS_CATALOG` · `app_registry` · `/admin/apps` · `/apps/availability` |
| UNKNOWN 0 | ✅ |

§21 중지 조건 **전 항목 미해당**.

## 11. 변경 목록 (§13 최소 범위)

### 삭제 (13 파일 / 디렉터리 3개)

```
apps/main-site/src/appstore/index.ts
apps/main-site/src/appstore/loader.ts
apps/main-site/src/appstore/manifestLoader.ts
apps/main-site/src/appstore/registry.ts
apps/main-site/src/appstore/registryMerger.ts
apps/main-site/src/appstore/types.ts
apps/main-site/src/components/ui/appstore/AppCard.tsx
apps/main-site/src/components/ui/appstore/AppEnableToggle.tsx
apps/main-site/src/components/ui/appstore/AppInstallButton.tsx
apps/main-site/src/components/ui/appstore/AppList.tsx
apps/main-site/src/components/ui/appstore/index.ts
apps/main-site/src/shortcodes/_functions/appstore/appStoreManager.ts
apps/main-site/src/views/appstore.json
```

### 수정 (3)

| 파일 | 내용 |
|---|---|
| `apps/main-site/src/main.tsx` | `initializeAppStore` import + 부팅 호출 블록(10줄) 제거, 경위 주석 삽입 |
| `apps/main-site/src/components/registry/function.ts` | `appStoreManager` import 1줄 + 등록 2줄 제거, 경위 주석 삽입 |
| `apps/main-site/src/components/registry/ui.tsx` | `AppList`·`AppCard` import 2줄 + 등록 3줄 제거, 경위 주석 삽입 |

### 신규 (1)

- `apps/api-server/src/__tests__/main-site-appstore-parallel-axis-retirement.spec.ts`

### 건드리지 않은 것 (§14 보호 범위)

```text
APPS_CATALOG            packages/**/manifest.ts       app_registry
/api/v1/admin/apps      /api/v1/apps/availability     AppManager
packages/@o4o-apps/signage 및 tsconfig·vite alias
packages/forum-core/manifest.json
apps/main-site 의 다른 모든 소스
```

## 12. 테스트 / 빌드 (§16·§17)

- `apps/main-site` typecheck (`tsc --noEmit`): **PASS**
- `apps/main-site` CI build (`bash scripts/ci-build-app.sh main-site`): **PASS** — 2036 modules transformed, `✅ Build completed successfully!`
- CI AppStore Guard (`scripts/appstore-guard.ts`): **PASSED** (14/14 앱 카탈로그 정합)
- 신규 guard spec + 선행 public-appstore guard: **2 suites / 45 tests PASS**
- api-server 전체 jest: 본 보고 §"테스트" 항 참조

신규 guard 가 고정하는 계약:

- 은퇴 경로 4종(`src/appstore/`, `src/components/ui/appstore/`,
  `src/shortcodes/_functions/appstore/`, `src/views/appstore.json`) 부활 금지
- `main.tsx` 의 AppStore 부팅 초기화 부활 금지 + 경위 주석 존속
- `registry/function.ts`·`registry/ui.tsx` 의 appstore import·등록 0
- main-site 전 소스에서 `appStoreManager` 참조 0, appstore 모듈 import 0,
  `@o4o-apps/commerce|customer|admin` 참조 0
- `apps`·`packages`·`services`·`scripts` 전 범위에서 main-site App Store 경로 참조 0
- `APPS_CATALOG` 유지 + `/api/v1/apps`·`/api/v1/admin/apps` mount 유지

## 13. Main-site 전체 source 잔여 판정 (§19)

App Store residue 제거 후 `apps/main-site/src` 잔여:

| 영역 | 파일 | 상태 |
|---|---|---|
| `pages/` (auth·dashboard·forum·lms·seller·yaksa forum) | 23 | **라우터에 실제 연결된 화면** |
| `components/` | 132 | 위 화면들이 사용 |
| `hooks/` · `context/` · `layouts/` · `lib/` · `design/` | 62 | 위 화면 지원 |
| `router/index.tsx` | 1 | 명시적 Route 표, 정상 |
| `view/` · `views/`(31) · `generator/` · `ai/` · `shortcodes/`(21) · `components/registry/` | 약 75 | **어디서도 import 되지 않는 NextGen ViewRenderer 세계** |

→ **판정: `HISTORICAL_SHELL`**

`EMPTY_SHELL` 이 아니다. 라우팅된 실제 기능 화면 7종이 남아 있으므로 전체 source
retirement 를 자동 제안하지 않는다. 다만 runtime 이 없으므로 "빌드만 되는 기능 소스"다.

## 14. DEAD_REFERENCE / UNKNOWN

- DEAD_REFERENCE: **0** (신규 guard 가 main-site 전 범위 + 저장소 4개 루트 스캔으로 고정)
- UNKNOWN: **0**
- MISSING_PACKAGE 참조: **0** (`@o4o-apps/commerce`·`customer`·`admin` 전부 제거됨)

## 15. 후속 후보

1. **main-site NextGen ViewRenderer 세계 전체** — `src/view/`(7), `src/views/`(31개 JSON),
   `src/generator/`(10), `src/ai/`(7), `src/shortcodes/`(21), `src/components/registry/`,
   `src/components/ViewRenderer.tsx`. 이번 조사에서 **`view/loader.ts` importer 0**,
   **`ViewRenderer` importer 0**, **`FunctionRegistry`/`UIComponentRegistry` 소비처 0**
   (registryMerger 제거로 완전히 0이 됨) 이 실측됐다. 별도 WO 로 census 권장.
2. **`apps/main-site` runtime-less build 대상 유지 여부** — Cloud Run·deploy workflow 가
   없는데 CI build matrix 와 root `build:*` 스크립트에는 남아 있다. 빌드 시간을 쓰는
   유일한 이유가 "소스 보존"이라면 build 대상에서 뺄지 판단 필요.
3. `packages/forum-core/manifest.json` — 저장소에서 유일하게 남은 `packages/*/manifest.json`
   이며 이번 은퇴로 유일 소비 경로(main-site manifestLoader)가 사라졌다. 다른 소비처
   확인 후 처분 판단.
