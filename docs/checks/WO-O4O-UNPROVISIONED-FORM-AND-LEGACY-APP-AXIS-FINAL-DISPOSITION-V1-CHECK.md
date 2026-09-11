# CHECK — WO-O4O-UNPROVISIONED-FORM-AND-LEGACY-APP-AXIS-FINAL-DISPOSITION-V1

> 상태: **CLOSED** (CI 확정 · §11)
> 작성일: 2026-09-11
> 기준 origin/main: `9d2a81292` (worktree `work/o4o-form-legacy-app-disposition-v1`, 최신 origin/main 위로 rebase 후 push)
> 선행: `WO-O4O-DEAD-SHORTCODE-RESIDUE-AND-PERMISSION-CONTRACT-FINAL-CLOSURE-V1` (CLOSED · `01808d025`) 의 유보 4건 중 Form 축 · legacy App 축 · 추적 산출물 · `WordPressGalleryShortcode` 를 본 WO 에서 처분

---

## 0. 요약

| 축 | 대상 | 판정 | 근거 요약 |
|---|---|---|---|
| A | unprovisioned Form / CPT Form Builder | **REMOVED** (기능 단위) | 운영 `forms` · `form_submissions` 테이블 부재 · 생성 migration 0 · 메뉴 0 · 외부 소비자 0 · 고유 기능 0 |
| B | legacy `App` entity · `apps` 테이블 축 | **REMOVED** (코드) · 테이블 DROP 없음 | 읽기 소비자 0 · 쓰기 소비자 = startup 자기 seed 1곳 · `app_usage_logs` 0 row · canonical = `AppRegistry` |
| C | `packages/types/src/**` 추적 산출물 | **ZERO** (116 파일 untrack + `.gitignore`) | 116/116 이 `.ts` 원본을 가진 tsc 산출물 · 수기 선언 0 · import 0 · CI 의존 0 |
| D | `WordPressGalleryShortcode` · `FormsController.ts` lint | **REMOVED** / Form 축과 함께 소멸 | 소비처 0 · 구조 = WP `[gallery]` shortcode 파싱 형태(중립 명칭 부여 대상 아님) |

운영 DB 변경: **0** (read-only 실측만 수행).

---

## 1. §7 운영 실측 (read-only · 2026-09-11)

Cloud SQL Auth Proxy + `psql` · 자격정보는 Secret Manager 에서 환경변수로만 사용 (출력·기록 0).

| 항목 | 결과 |
|---|---|
| `to_regclass('public.forms')` / `form_submissions` | **NULL / NULL** (부재) |
| `information_schema.tables` 중 `~* 'form'` | `platform_*` 6개뿐 (Form Builder 와 무관) |
| `apps` 테이블 | **존재 · 1 row** — `type=integration` · `slug=google-gemini-text` · `provider=google` · `status=active` · `isSystem=t` · `createdAt=2025-12-29` |
| `app_usage_logs` | 존재 · **0 row** |
| `apps` 로 향하는 inbound FK | 0 |
| `app_registry` | 2 row — `digital-signage-core` (core · active) · `partnerops` (standalone · inactive) |
| `ai_usage_logs` | 25 row (별도 축 · `AIUsageLog` — 보존) |

`apps` 의 유일한 row 는 `startup.service.ts#initializeAppSystem` 이 기동 시 스스로 seed 한 manifest 이며(아래 §3), 이를 읽는 코드가 0 이다. "의미 있는 운영 row" 로 판정하지 않는다 (§8 중지 조건 비해당). 테이블 DROP · row 삭제는 본 WO 에 포함하지 않는다 (§4 규정).

---

## 2. A축 — Form 전수조사

### 2-1. 흐름 표

| 화면 · 라우트 | API | 백엔드 mount | DB table | 운영 사용 | 고유 기능 | 판정 |
|---|---|---|---|---|---|---|
| (관리자 메뉴) — `/cpt-engine` 진입 메뉴 없음 (`admin-menu.static.tsx` 0 · `useDynamicCPTMenu` 는 `content/:slug` · `taxonomies` 만) | — | — | — | 직접 URL 로만 도달 | — | `FORM_ACTIVE_MENU = ZERO` |
| `/cpt-engine/forms` → `FormsManager.tsx` | `GET /cpt/forms` | `routes/cpt.ts` → `/api/v1/cpt` (`register-routes.ts:31`) | `forms` | 테이블 부재 → 500 | 없음 | REMOVED |
| `/cpt-engine/forms/new` · `/forms/:id/edit` → `FormBuilder.tsx` | `GET/PUT /cpt/forms/:id` · `POST /cpt/forms` | 동일 | `forms` | 테이블 부재 | 없음 | REMOVED |
| `/cpt-engine/forms/:id/submissions` (FormsManager 가 navigate) | `GET /cpt/forms/:id/submissions` | 동일 | `form_submissions` | **프론트 라우트 자체가 없음** (dead link) | — | REMOVED |
| `CPTDashboardToolset` "Forms" 열 · "Create Form" 버튼 2곳 | → `/cpt-engine/forms/new?postType=` | — | — | dead link | — | REMOVED (열·버튼 제거) |
| `GET /cpt/forms/name/:name` (**비인증**) · `POST /cpt/forms/:id/submit` (**비인증**) | — | 동일 | `forms` / `form_submissions` | 외부 렌더링 소비자 0 (`git grep` 전 서비스 0) | — | REMOVED |
| `features/cpt-acf/services/cpt.api.ts#formApi` | `/cpt/forms/*` 7 메서드 | — | — | 소비자 0 | — | REMOVED |
| `FormPresets.tsx` · `api/presets.ts` · `FormPreset` entity (`/presets/forms`) | — | `presets` | `form_presets` | **별도 축** (Customizer preset) | — | **PRESERVED** |

### 2-2. 삭제 기준 대조

| 기준 | 실측 |
|---|---|
| 운영 DB table absent | ✅ `forms` · `form_submissions` NULL |
| 운영 데이터 zero | ✅ (테이블 부재) |
| 외부 소비자 zero | ✅ `/cpt/forms` 문자열 소비: admin `formApi`(소비자 0) · `FormsManager` · `FormBuilder` 뿐 |
| 활성 콘텐츠 렌더링 zero | ✅ `FormRenderer` 는 README 에만 존재 (파일 없음) |
| 사업 소유자 undefined | ✅ Priority Chain 어느 SSOT 에도 Form Builder 정의 없음 (`O4O-FORM-STANDARD-BASELINE-V1` 은 UI Form 표준이며 CPT Form Builder 와 무관) |
| 대체 필요 고유 기능 zero | ✅ |
| Form 과 submission 생명주기 | 동일 (submission 은 Form FK 전용 · 테이블 동시 부재) → 함께 제거 |
| 공유 CPT 보존 | ✅ `cpt.controller` · `FieldGroupsController` · `TaxonomiesController` · `FormPreset` · `/cpt-engine/*` 라우트 · `CPTDashboardToolset` 유지 |

### 2-3. 삭제 파일 / 수정 파일

삭제:
- `apps/api-server/src/entities/Form.ts` · `FormSubmission.ts`
- `apps/api-server/src/controllers/cpt/FormsController.ts` (→ lint 미사용 import 2건은 파일 소멸로 해소)
- `apps/api-server/src/types/form-builder.ts` (소비자 = FormsController 뿐)
- `packages/types/src/form-builder.ts` (+ 추적 산출물 4개) — `@o4o/types` 경유 외부 소비자 0 (`ConditionalLogic` 히트는 `cpt-acf/types/acf.types` 자체 정의 · `FormField` 히트는 `@o4o/operator-ux-core`)
- `apps/admin-dashboard/src/pages/cpt-engine/forms/**` (FormBuilder · FormsManager · SortableFormField)

수정:
- `apps/api-server/src/routes/cpt.ts` — Forms Routes 10개 + import 제거
- `apps/api-server/src/database/entities.ts` — Form · FormSubmission 등록 제거
- `apps/api-server/src/types/index.ts` — `form-builder` re-export 제거
- `packages/types/src/index.ts` — `form-builder` export 제거
- `apps/admin-dashboard/src/pages/cpt-engine/index.tsx` — Forms Routes 3개 + import 제거
- `apps/admin-dashboard/src/pages/cpt-engine/CPTDashboardToolset.tsx` — `handleCreateForm` · Forms 열 2곳 · 버튼 2곳 · 헤더 문구 · 미사용 `FileText` import 제거
- `apps/admin-dashboard/src/features/cpt-acf/services/cpt.api.ts` — `formApi` 제거
- `apps/admin-dashboard/src/features/cpt-acf/README.md` — Rendering a Form · Forms API · Data Flow · FormRenderer · Forms not submitting 절 제거, 상단 안내 1줄

---

## 3. B축 — legacy App vs canonical AppRegistry

| 비교 항목 | legacy `App` / `apps` | canonical `AppRegistry` / `app_registry` |
|---|---|---|
| DB table | `apps` (1 row · 자기 seed) · `app_usage_logs` (0 row) | `app_registry` (2 row) |
| entity 등록 | `entities.ts` `App` · `AppUsageLog` | `entities.ts` `AppRegistry` |
| API route | **0** (`routes/apps.ts` · `controllers/apps.controller.ts` 는 이미 제거됨 — `8d58243bf` · `32273509a`) | `/api/v1/admin/apps/*` (`routes/admin/apps.routes.ts`) · `/api/v1/apps/availability` (`app-availability.routes.ts`) |
| read consumer | **0** (`app-registry.service.ts` 의 `getBySlug/getByProvider/getByCategory/getAllActive/getUsageStats` 호출처 0 — `getBySlug` 만 startup 자기 seed 판정용) | `AppManager` (`app-manager.facade.ts` `getRepository(AppRegistry)`) · ModuleLoader · admin AppStore 화면 (`api/admin-apps.ts`) |
| write consumer | `startup.service.ts#initializeAppSystem` 1곳 (없으면 `google-gemini-text` insert) | `AppManager` install/activate · migrations |
| 운영 row | 1 (`google-gemini-text` · 2025-12-29 자기 seed) | 2 |
| 관리자 화면 | 0 | AppStore (admin) |
| 배포 소비 | 0 (`ci-appstore-guard.yml` 은 `app-manifests/appsCatalog.ts` 만 감시) | AppStore Guard · ModuleLoader |
| 최종 소유권 | 없음 (AI 실행 정본은 서버측 AI proxy `@o4o/ai-core` · `AIUsageLog` 는 `ai-policy-executor.service.ts` 가 직접 기록) | AppStore / AppManager |

삭제 기준 대조: legacy row = 1 이나 **코드 자체가 만든 seed · 읽기 0** / runtime consumer 0 / external API consumer 0 / canonical replacement = `AppRegistry` / unique function 0 (`getUsageStats` 는 호출처 0 · `AIUsageLog` 집계는 legacy 축 없이도 그대로 가능).

삭제:
- `apps/api-server/src/entities/App.ts` (+ `AppManifest` 인터페이스 — 외부 import 0 · `@o4o/types` 의 `AppManifest` 는 별개 타입)
- `apps/api-server/src/entities/AppUsageLog.ts`
- `apps/api-server/src/services/app-registry.service.ts`

수정:
- `apps/api-server/src/services/startup.service.ts` — `initializeAppSystem` 메서드 + 호출 제거 (`initializeDatabase` → `initializeMonitoring` 순서 유지)
- `apps/api-server/src/database/entities.ts` — `App` · `AppUsageLog` 등록 제거 · `AppRegistry` 유지
- `apps/api-server/src/__tests__/app-instances-retirement.spec.ts` — `app-registry.service.ts` 를 읽던 검사를 부재 단언으로 갱신

보존: `AppRegistry.ts` · `AppManager.ts` · `app-manager/**` · `admin/apps.routes.ts` · `app-availability.routes.ts` · `AIUsageLog.ts` · 실행 완료 migration 전부 · `apps` / `app_usage_logs` 테이블 (DROP 없음).

---

## 4. C축 — `packages/types/src/**` 추적 산출물 전수 분류

| 항목 | 결과 |
|---|---|
| 추적 파일 수 | **116** (`.js` 29 · `.js.map` 29 · `.d.ts` 29 · `.d.ts.map` 29 — `src/*` 26 + `src/auth/*` 3) — WO 의 58 은 `.js`+`.d.ts` 만 센 수 |
| 대응 `.ts` 원본 | **116/116 존재** → `HAND_WRITTEN_DECLARATION` 0 · `SOURCE_OF_TRUTH` 0 |
| 최초 추적 | `7be4b8a58` (2025-08-01) · `dc89df8ff` (2025-08-03) · `d2e37b255` (2025-12-09 "forum-yaksa: Use src directory for compiled files" — 해당 서비스는 현재 부재) |
| `package.json` `main` / `types` / `exports` | 전부 `./dist/**` (`PACKAGE_EXPORT_REQUIRED` 0) |
| `tsconfig.json` | `outDir: ./dist` · `rootDir: ./src` — src 로 emit 하지 않음 |
| import 소비 (`types/src/*.js|d.ts` 경로) | 앱 · 서비스 · 패키지 · scripts · `.github` 전부 **0** (`shortcode-domain-retirement.spec.ts` 의 raw-source 검사 1건은 본 WO 에서 갱신) |
| admin `tsconfig.paths` `@o4o/types` → `packages/types/src` | `.ts` 우선 해석 — 산출물 제거 후 `type-check` PASS 로 확인 |
| vite alias | `packages/types/dist` |
| clean build 재생성 | `npm run clean && npm run build` 후 `src/` 아래 `.js/.d.ts` **0** (dist 에만 생성) |
| CI 의존 | 0 |
| 최종 분류 | **116 = TRACKED_BUILD_ARTIFACT (STALE_OUTPUT)** — 이전 WO 에서 `permissions.d.ts/js` 를 수기로 맞추던 구조 종료 |

처분: 116 파일 untrack(삭제) + `.gitignore` 에 `/packages/types/src/**/*.{js,js.map,d.ts,d.ts.map}` 4줄 (probe 파일로 ignore 동작 확인).

다른 package 동일 문제 (본 WO 범위 밖 · 보고만):

| package | 추적 산출물 | 비고 |
|---|---|---|
| `packages/auth-client/src` | 28 | `axios.d.ts` 는 원본 없음 → 수기 선언 가능성 (분리 판정 필요) |
| `packages/forum-core/src/**` | 34 | `ForumTag.d.ts/.js` 원본 없음 → 분리 판정 필요 |
| `packages/utils/src/tailwind-merge.d.ts` · `packages/o4o-ai-components/src/vite-env.d.ts` | 각 1 | 수기 선언 (산출물 아님) |

---

## 5. D축

| 항목 | 조사 | 처분 |
|---|---|---|
| `WordPressGalleryShortcode` (`components/editor/blocks/gallery/types.ts:161`) | import 소비처 **0** (같은 디렉터리 6개 컴포넌트는 `GalleryImage` · `GalleryAttributes` · Props 만 import). 구조 = `{ tag: 'gallery', attrs: {ids, columns, size, link, orderby, order, include, exclude}, type: 'self-closing' }` — WordPress `[gallery]` shortcode 파싱 결과 형태 그 자체 | shortcode runtime 무관한 gallery 타입이 아니므로 중립 명칭 부여 대상이 아니다 → 소비처 0 dead 타입으로 **REMOVED** (`GalleryImage` · `GalleryAttributes` 등 정본 타입 보존) |
| `FormsController.ts` 미사용 import (`FormNotification` · `FormConfirmation`) | Form 축 삭제 | 파일 소멸로 해소 (lint baseline 잔존 0) |

---

## 6. §9 회귀 테스트 계약

신규 `apps/api-server/src/__tests__/unprovisioned-form-and-legacy-app-axis-final-disposition.spec.ts` (20 tests):

| 계약 | 검사 |
|---|---|
| unprovisioned Form route/menu/runtime = 0 | Form 파일 4개 부재 · `entities.ts` 등록 0 · `cpt.ts` `/forms` 라우트 0 · `types/index.ts` re-export 0 · `@o4o/types` form-builder 0 · admin 화면/라우트/`formApi` 0 · forms CREATE/DROP migration 0 |
| CPT generic runtime preserved | `cpt.controller` · `FieldGroupsController` · `TaxonomiesController` · `FormPreset` · `CPTDashboardToolset` · `preset.ts` 존재 |
| legacy App runtime consumer = 0 | `App.ts` · `AppUsageLog.ts` · `app-registry.service.ts` 부재 · `entities.ts` 등록 0 · startup seed 0 · api-server 전 `.ts` 코드 줄에서 import 0 |
| canonical AppRegistry preserved · app availability preserved | `AppRegistry.ts` 등록 · `AppManager` · facade `getRepository(AppRegistry)` · `admin/apps.routes.ts` · `app-availability.routes.ts` 존재 |
| `AIUsageLog` 보존 · apps DROP migration 0 | 명시 검사 |
| tracked src build artifacts = 0 | `packages/types/src` 산출물 0 · `.gitignore` 4 규칙 · `package.json` exports 전부 dist |
| WordPressGalleryShortcode runtime name = 0 | admin `src` 전수 0 · `GalleryImage`/`GalleryAttributes` 보존 |

갱신: `shortcode-domain-retirement.spec.ts` (B축·C축을 부재 단언으로 · `permissions.d.ts/js` 부재 단언) · `app-instances-retirement.spec.ts`.

---

## 7. §10 검증 결과

| 명령 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm run build:packages` | exit 0 · 이후 `packages/types/src` 산출물 0 |
| `packages/types` `npm run clean && npm run build` | dist 에 `form-builder.*` 미생성 (clean build 정합) |
| `pnpm run type-check:frontend` | OK |
| `pnpm --filter @o4o/api-server exec tsc --noEmit` | exit 0 |
| `pnpm --filter @o4o/admin-dashboard run type-check` | exit 0 |
| `pnpm --filter @o4o/admin-dashboard run lint` | **0 errors** (487 warnings — 기존 baseline) |
| `pnpm --filter @o4o/admin-dashboard run build` | ✓ built |
| api-server Jest 전체 | **248/249 suites · 4078/4086 tests PASS** — 실패 1 suite = `local-agent-oneclick-pairing.spec.ts` 8건, 원인 = 포트 `127.0.0.1:47821` 을 로컬에서 실행 중인 별도 `node.exe`(PID 4444 · o4o-local-agent) 가 점유 → 테스트 서버 기동 timeout. 본 WO 변경과 무관(환경) · 사용자 프로세스는 종료하지 않음 |
| 신규 spec + 갱신 spec 2개 | 20 + 38 + 8 PASS |
| admin Vitest | 15 files · 308 tests PASS |
| AppRegistry · availability · CPT 관련 spec | Jest 전체에 포함 · PASS |

---

## 8. §13 Git

- path-specific stage · `node scripts/git/check-staged-scope.mjs` 확인 후 `git commit -- <paths>`
- 구현 커밋 `824a0e1d4` · CHECK 커밋 `ec6579e44` (origin/main `02deb3e1d` 위 rebase 후 push) · CI 확정 커밋 (§11)
- force-push 없음 · 최신 origin/main 위 rebase 후 `git push origin HEAD:main`

---

## 9. 최종 판정

```text
FORM_PRODUCTION_TABLE              = ABSENT
FORM_PRODUCTION_DATA               = ZERO
FORM_ACTIVE_MENU                   = ZERO
FORM_ACTIVE_ROUTES                 = ZERO
FORM_ACTIVE_API                    = ZERO
FORM_FINAL_DISPOSITION             = REMOVED

LEGACY_APPS_TABLE                  = PRESENT
LEGACY_APP_ACTIVE_CONSUMERS        = ZERO
CANONICAL_APP_REGISTRY             = PRESERVED
APP_AVAILABILITY_REGRESSION        = PASS
LEGACY_APP_FINAL_DISPOSITION       = REMOVED

TRACKED_SRC_BUILD_ARTIFACTS        = ZERO
WORDPRESS_GALLERY_SHORTCODE_NAME   = REMOVED
ADMIN_LINT_ERRORS                  = ZERO
PRODUCTION_DATA_CHANGE             = ZERO
OTHER_SERVICE_REGRESSION           = PASS
CI_PIPELINE                        = SUCCESS
CODEQL                             = SUCCESS

UNPROVISIONED_FORM_AND_LEGACY_APP_AXIS_FINAL_DISPOSITION
  = CLOSED
```

`LEGACY_APPS_TABLE = PRESENT` 주석: `apps` 테이블은 1 row(코드 자기 seed) 로 남는다. DROP · row 삭제는 §4 규정대로 본 WO 에 포함하지 않았다. 후속 처분(DROP migration) 은 별도 WO.

---

## 10. 유보 · 후속 (본 WO 범위 밖)

1. `apps` (1 row) · `app_usage_logs` (0 row) 테이블 DROP — 별도 WO (실행 완료 migration 보존 원칙).
2. `packages/auth-client/src` (28) · `packages/forum-core/src/**` (34) 추적 산출물 — 수기 선언 후보(`axios.d.ts` · `ForumTag.d.ts/.js`) 분리 판정 후 정리.
3. `archive/**` 보존 정책 → O4O 전역 dead-code census (사용자 지시 순서).

---

## 11. CI 확정 (§11)

push SHA `ec6579e44` 의 CI Pipeline · CodeQL 은 다른 세션의 연속 push (`252b2ceb6` → `2e5d355cc` → `8b4a568b7` → `3558825f8` → `e21046870` → `ba4ab7ffe` → `9522253fe`) 로 concurrency 취소가 반복되었다. 취소 실행은 성공으로 기록하지 않으며, 재실행하지 않고 **선형 후손** 실행으로 확정한다 (`git merge-base --is-ancestor ec6579e44 9522253fe` = true).

| 워크플로 | run ID | SHA | 결과 |
|---|---|---|---|
| Deploy API Server (Cloud Run) | 34552853215 | `ec6579e44` (본 push) | success |
| Deploy Admin Dashboard (Cloud Run) | 34552853247 | `ec6579e44` (본 push) | success |
| Deploy Web Services (Cloud Run) | 34552853245 | `ec6579e44` (본 push) | success |
| CI Pipeline | 34552853284 | `ec6579e44` | cancelled (concurrency) → 후손 확정 |
| CI Pipeline | 34556318187 | `9522253fe` (선형 후손 · ancestor 확인) | **success** |
| CodeQL Security Analysis | 34552853252 | `ec6579e44` | cancelled (concurrency) → 후손 확정 |
| CodeQL Security Analysis | 34556318192 | `9522253fe` (선형 후손) | **success** |
| AppStore Guard | — | `ec6579e44` | path filter (`packages/**/manifest.ts` · `packages/**/lifecycle/**` · `app-manifests/appsCatalog.ts`) 대상 미변경 → 미기동. 최근 success = `428349dab` (2026-09-10) |

후손 `9522253fe` 까지의 상류 커밋은 본 WO 삭제 대상 파일을 접촉하지 않았다 (rebase 시점 `git diff --stat` 무겹침 · 제거 import 재유입 grep 0 · rebase 후 api-server `tsc --noEmit` exit 0).
