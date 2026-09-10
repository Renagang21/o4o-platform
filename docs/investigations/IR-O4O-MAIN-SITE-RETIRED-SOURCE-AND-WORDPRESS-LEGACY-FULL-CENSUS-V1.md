# IR-O4O-MAIN-SITE-RETIRED-SOURCE-AND-WORDPRESS-LEGACY-FULL-CENSUS-V1

> **성격**: 조사 전용(investigation-only). 코드 삭제 0 · runtime 수정 0 · `package.json`/`pnpm-lock.yaml` 수정 0 · DB/GCP/Artifact Registry 변경 0.
> **작성일**: 2026-09-10

---

## 1. 조사 기준 (§2 기준선)

| 항목 | 값 |
|---|---|
| 조사 worktree | `C:/tmp/o4o-admin-final-closure` |
| 브랜치 | `work/admin-authorization-registry-and-dead-surface-final-closure-v1` |
| **조사 기준 SHA** | **`d55c8fca79c0c3e7d0c200f9ecfaefafcbd64248`** (= `origin/main` tip, fast-forward 동기) |
| dirty 파일 | 0 |
| 선행 base | `b9198a76d` 에서 1차 수집 후 `d55c8fca7` 로 ff → 핵심 수치 전부 재검증(불변) |

**병렬 worktree(17개) 중 본 조사 축과 겹치는 것**

| 브랜치 | tip | origin/main 포함 | 판정 |
|---|---|---|---|
| `work/o4o-window-wp-retire-v1` | `30ff3f728` | **IN_MAIN** | 병합 완료 — 충돌 없음 |
| `work/o4o-final-code-only-retirement-v1` | `42654fbb1` | NOT_IN_MAIN | 해당 삭제(`packages/cosmetics-seller-extension`)는 **이미 `62c1fd6c7` 로 main 에 반영**됨(rebase 전 SHA 잔존). 충돌 없음 |

→ **중지 조건 8(다른 세션의 중첩 변경) 미발생.**

Codex 1차 조사는 전제로 쓰지 않고, 위 SHA 에서 소스 · CI · GCP · 프로덕션 API 를 직접 재현했다.

---

## 2. A축 — `apps/main-site` 전수조사

### 2.1 물리 범위 (§3.1)

| 항목 | 값 |
|---|---|
| tracked 파일 | **38** |
| `src/**` 파일 | **28** |
| 패키지명 | `@o4o/main-site-nextgen` (private, 미배포) |
| package scripts | `dev` / `build`(`tsc && vite build`) / `preview` / `typecheck` |
| dependencies | `@o4o/auth-client`, `@o4o/content-editor`, `@o4o/ui`, `@tanstack/react-query`, `react`, `react-dom`, `react-router-dom` |
| devDependencies | `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `typescript`, `vite`, `tailwindcss`, `autoprefixer`, `postcss`, `@types/node` |
| tsconfig | `include:["src"]`, `paths` 의 `@/*` → `./src/*`, `references` → `tsconfig.node.json` |
| Vite config | alias `@` → `src`, **dev server port 5175** |
| pnpm-lock importer | `pnpm-lock.yaml:1099` 의 `apps/main-site:` 블록 존재 |
| 전용 테스트 | **0** (main-site 내 test/spec/vitest/jest 파일 0) |
| api-server raw-source 회귀 spec | **6건** (§2.4 표) |
| 빌드 산출물 추적 잔재 | `vite.config.js` · `vite.config.d.ts` 가 소스와 함께 tracked |
| README 선언 | `상태: RETIRED_RUNTIME (2026-08-20)` |

### 2.2 Runtime 도달성 (§3.2)

`src/main.tsx` 진입점에서 정적 import graph 를 재구성했다(상대 import + `@/` alias + `React.lazy` 동적 import 전수).

```
main.tsx → App.tsx → router/index.tsx
                     ├ @/components/common (index → 6 컴포넌트)
                     ├ @/context (index → AuthContext, OrganizationContext)
                     ├ @/layouts/MainLayout
                     └ lazy x 8 → dashboard/DashboardPage, auth/LoginPage,
                                  forum/ForumListPage, forum/ForumDetailPage,
                                  lms/MyCoursesPage, lms/CourseDetailPage, lms/LessonPage,
                                  seller/dashboard (index → SellerDashboard, useSellerDashboard,
                                                    sellerDashboard.api, sellerDashboard.types)
```

| 분류 | 수 | 비고 |
|---|---:|---|
| `ACTIVE_REACHABLE` | 12 | `main.tsx`, `App.tsx`, `index.css`, `vite-env.d.ts`, `router/index.tsx`, `layouts/MainLayout.tsx`, `context/*`(3), common barrel 계열 |
| (그 중 common 컴포넌트) | 7 | `components/common/*` — router 가 직접 소비 |
| `LAZY_ROUTE_REACHABLE` | 12 | 페이지 8 + seller 하위 모듈 4 |
| `PLACEHOLDER` | 라우트 2 | `/forum/write`, `/mypage/*` — JSX 인라인 "준비 중" 문자열, 구현 파일 없음 |
| `MOCK_OR_TEST_FALLBACK` | 라우트 2 | `/seller/dashboard`, `/seller/dashboard/:sellerId` — `sellerId="test-seller-001"` 하드코딩 |
| `DEAD_SOURCE` | **0** | 선행 `RESIDUAL-ORPHAN-AXIS` 정리로 고아 축 이미 제거됨 |
| `DOCUMENTATION_ONLY` | 1 | `README.md` |

**28개 src 파일 전부가 진입점에서 도달 가능**하다. 즉 "고아 코드만 지우면 되는 상태"가 아니라 **셸 전체가 도달 가능하지만 대상 API 가 없는 상태**다.

### 2.3 라우트 · API 전수표 (§3.2 · §3.3)

프로덕션 실측: `https://api.neture.co.kr/api/v1/*` 비인증 GET (read-only). 401 = 라우트 존재(가드 인터셉트), 404 = 라우트 부재.

| route | 화면 | 호출 API | 프로덕션 | 인증 | 실제 서비스 소유자 | 고유 기능 | 판정 |
|---|---|---|---|---|---|---|---|
| `/` | DashboardPage | `GET /dashboard` | **404** | RequireAuth | 없음(미구현 API) | 없음 | `DEAD_AGAINST_PRODUCTION` |
| `/org/:orgId` | DashboardPage(동일) | `GET /dashboard` + `GET /organizations/:orgId` | **404** / 존재 | RequireAuth | organizations = api-server 공통 | 없음 | `DEAD_AGAINST_PRODUCTION` |
| `/login` | LoginPage | `authClient.login()` | 존재 | 공개 | auth-core 공통 | 없음 | `DUPLICATE_OF_SHARED` |
| `/forum` | ForumListPage | `GET /forum/categories`, `GET /forum/posts` | **200** | RequireAuth | `packages/forum-core` + `web-k-cosmetics` + admin-dashboard | 없음 | `DUPLICATE_OF_SHARED` |
| `/forum/post/:slug` | ForumDetailPage | `GET /forum/posts/slug/:slug`, `/adjacent`, `/comments`, `POST /comments`, `DELETE /posts/:id` | 200 계열 | RequireAuth | 동상 | 없음 | `DUPLICATE_OF_SHARED` |
| `/forum/write` | — | 없음 | — | RequireAuth | — | 없음 | **`PLACEHOLDER`** ("글쓰기 페이지 준비 중...") |
| `/lms` · `/lms/courses` | MyCoursesPage | `GET /lms/my-courses` | **404** (api-server 내 `my-courses` 정의 0건) | RequireAuth | `packages/lms-core`/`lms-client` + `web-kpa-society` + `web-pharmacy-hub` | 없음 | `DEAD_AGAINST_PRODUCTION` |
| `/lms/course/:id` | CourseDetailPage | `GET /lms/courses/:id`, `/lessons`, `POST /lms/enroll` | 200 / 401 | RequireAuth | 동상 | 없음 | `DUPLICATE_OF_SHARED` |
| `/lms/course/:courseId/lesson/:lessonId` | LessonPage | `GET /lms/courses/:id`, lesson, adjacent, `POST /lms/progress` | 200 / 401 | RequireAuth | 동상 | 없음 | `DUPLICATE_OF_SHARED` |
| `/seller/dashboard` | SellerDashboardPage (`sellerId="test-seller-001"` 고정) | `/api/v1/cosmetics-seller/*` | **404** | RequireAuth | **없음** | 없음 | **`MOCK_OR_TEST_FALLBACK` + DEAD** |
| `/seller/dashboard/:sellerId` | 동상(파라미터 없으면 `test-seller-001` 폴백) | `/api/v1/cosmetics-seller/*`, `/api/v1/cosmetics-sample/*` | **404** | RequireAuth | **없음** | 없음 | **`MOCK_OR_TEST_FALLBACK` + DEAD** |
| `/mypage/*` | — | 없음 | — | RequireAuth | — | 없음 | **`PLACEHOLDER`** ("마이페이지 준비 중...") |

**API 소비처 대조 결론**

- `/api/v1/cosmetics-seller/*` · `/api/v1/cosmetics-sample/*` — `register-routes.ts` 주석(394-395행)이 명시하듯 **한 번도 mount 된 적이 없고**, 실행 패키지 `@o4o/cosmetics-seller-extension` 도 삭제됨(`git ls-files packages/cosmetics-seller-extension` → 0). 프로덕션 404 실측과 일치.
- `/api/v1/dashboard` — 존재하는 것은 `/api/v1/dashboard/assets`(401) 뿐. bare `/dashboard` 는 mount 0 · 프로덕션 404.
- `/api/v1/lms/marketing/*` · `/api/v1/lms/bundles` — 404 (선행 Phase R7 삭제 확인).
- forum · lms/courses · organizations 는 **살아 있으나 전부 공통 축**이며, 운영 소비자는 `web-kpa-society` · `web-pharmacy-hub` · `web-k-cosmetics` · admin-dashboard 다. main-site 는 소유자가 아니다.

**실패 은폐 (§3.3 마지막 항목) — 확인됨**

- `DashboardPage.tsx` 의 `catch {}` 가 404 를 삼키고 `stats: { forumPosts: 0, forumComments: 0, coursesCompleted: 0 }` 더미로 대체한다. 화면상 "정상 0건"으로 보인다.
- `sellerDashboard.api.ts` 전 함수가 `if (!res.ok) return null;` + `catch { return null; }` 로 실패를 `null` 로 은폐한다. 또한 `authClient` 대신 raw `fetch('/api/v1/...')` 를 쓴다(CLAUDE.md §1 API 호출 규칙 위반).
- 이는 저장소의 "조회 실패 삼킴 계약화" 방향과 정반대이며, **main-site 를 되살릴 경우 이 파일들은 계약 위반으로 재작성 대상**이 된다.

### 2.4 외부 소비처 전수표 (§3.4)

역검색 대상: `apps/main-site` / `@o4o/main-site-nextgen` / `o4o-main-site` / port 5175 / main-site export · component · type / main-site route URL / Artifact Registry image name.
(숫자 `5175` 는 HFF 상품설명 데이터 JSON·JSONL 수십 건에 우연히 포함되어 `docs/checks/data/` · `src/scripts/data/` 를 제외하고 재검색했다.)

| # | 소비처 | 내용 | 분류 |
|---|---|---|---|
| 1 | `.github/CODEOWNERS:13-15` | `/apps/main-site/**` 소유 팀 3줄 | `DOCUMENTATION` |
| 2 | `.github/labeler.yml:7` | PR 라벨 glob | `CI_BUILD_OR_TYPECHECK` |
| 3 | `.github/workflows/ci-pipeline.yml:223-229` | build matrix **제외 근거 주석** (matrix = `[admin-dashboard]` 만) | `DOCUMENTATION` (은퇴 근거) |
| 4 | `package.json:42-46` | `build:main-site` + 이를 호출하는 `build:apps` / `build:apps:all` / `build:web` | `CI_BUILD_OR_TYPECHECK` |
| 5 | `scripts/ci-build-app.sh:55` | `"main"\|"main-site"` case → `cd apps/main-site && pnpm run build` | `CI_BUILD_OR_TYPECHECK` |
| 6 | `tsconfig.base.json:75` | project reference `./apps/main-site` | `CI_BUILD_OR_TYPECHECK` |
| 7 | `pnpm-lock.yaml:1099` | `apps/main-site:` importer 블록 | `CI_BUILD_OR_TYPECHECK` |
| 8 | `packages/organization-core/tsconfig.json:22` | `@/*` path 에 `../../apps/main-site/src/*` 포함 | `CI_BUILD_OR_TYPECHECK` (typecheck 전용) |
| 9 | `scripts/development/dev.sh:157` | 로컬 dev 서버 기동 | `DEAD_REFERENCE` |
| 10 | `scripts/update-package-versions.sh:75` | `MAIN_PKG` engines 갱신 | `DEAD_REFERENCE` |
| 11 | `apps/api-server/src/services/BackupService.ts:277` | 백업 대상 env 목록의 `apps/main-site/.env` | `DEAD_REFERENCE` (파일 존재 시에만 동작하는 optional 항목) |
| 12 | `apps/api-server/src/bootstrap/setup-middlewares.ts:45` | CORS allowlist 의 `http://localhost:5175` | `DEAD_REFERENCE` (로컬 dev 포트, 프로덕션 영향 0) |
| 13 | `packages/appearance-system/src/css-generators.ts:6`, `src/tokens.ts:16`, `README.md:133` | 이미 삭제된 `main-site/src/utils/css-generator.ts` · `src/lib/theme/tokens.ts` 를 참조하는 주석·TODO | `HISTORICAL` (경로 부재) |
| 14 | `apps/admin-dashboard/src/docs/mobile-header-implementation.md` | 삭제된 `main-site/src/components/mobile/*` 등 8건 참조 | `HISTORICAL` (문서 drift) |
| 15 | `scripts/audit/REGISTRY_AUDIT_REPORT.md:202,208` | 삭제된 shortcode 경로 참조 | `HISTORICAL` |
| 16~21 | `apps/api-server/src/__tests__/` 6개 spec (아래 표) | raw-source 회귀 계약 | **`REGRESSION_GUARD`** |

**`ACTIVE_RUNTIME` 분류 소비처 = 0건.** 다른 워크스페이스 패키지가 main-site 를 `import` 하는 경우 0건이다(main-site 는 export barrel 자체가 없고 `private: true`).

**회귀 spec 6건 — 삭제 시 갱신 필수 목록**

| spec | main-site **존재**를 단언하는 항목 | 삭제 시 영향 |
|---|---|---|
| `main-site-ci-build-contract.spec.ts` | main-site 에 `typecheck` 스크립트 존재 / 루트 aggregate build 계약 유지 / `type-check:frontend` 가 main-site 포함 | **깨짐 — 갱신 필수** |
| `main-site-residual-dependency-cleanup.spec.ts` | `pnpm-lock.yaml` 의 `apps/main-site:` importer 블록 존재 / `main.tsx` 의 `QueryClientProvider` 유지 | **깨짐 — 갱신 필수** |
| `main-site-residual-orphan-axis-retirement.spec.ts` | router 의 live lazy 8개 유지 / live route 7축 보호 | **깨짐 — 갱신 필수** |
| `main-site-nextgen-viewrenderer-retirement.spec.ts` | `layouts/MainLayout.tsx` 유지 / package.json 의 build·typecheck 유지 / README 의 RETIRE 근거 | **깨짐 — 갱신 필수** |
| `main-site-appstore-parallel-axis-retirement.spec.ts` | `main.tsx` 가 AppStore 를 초기화하지 않음 / retire 사유 주석 잔존 | **깨짐 — 갱신 필수** |
| `ci-build-app-target-validity.spec.ts` | `ci-build-app.sh` 의 `cd` 대상 디렉터리 실재 / 호출하는 루트 script 실재 | **깨짐 — `ci-build-app.sh` · 루트 script 와 lockstep 갱신 필수** |

> 이 6건은 "은퇴한 축이 되살아나지 않는다"는 **가드**이지 main-site 를 살려두는 근거가 아니다. 다만 삭제 WO 는 **소스 삭제와 동일 커밋에서 이 6개 spec 을 갱신**해야 한다(§3.6 마지막 요건).

### 2.5 운영 · 배포 실측 (§3.5, read-only)

| 항목 | 실측 | 결과 |
|---|---|---|
| Cloud Run service | `gcloud run services list --region=asia-northeast3` → glucoseview-web, k-cosmetics-web, kpa-branch-web, kpa-society-web, neture-web, o4o-admin-dashboard, o4o-core-api, pharmacy-hub-web, signage-player-web | **`o4o-main-site` 없음** |
| `describe o4o-main-site` | `ERROR: Cannot find service [o4o-main-site]` | 서비스 부재 확정 (revision 조회 대상 없음 = revision 0) |
| Domain mapping | `gcloud beta run domain-mappings list` → 0건 | 매핑 0 |
| LB backend service | 8개 — glucoseview / k-cosmetics / kpa-branch / kpa-society / neture-web-http / o4o-core-api / pharmacy-hub / o4o-admin-dashboard | **main-site 백엔드 없음** |
| Serverless NEG | 8개 (위와 1:1) | **main-site NEG 없음** |
| Scheduler / Job | Cloud Scheduler API **자체가 프로젝트에 미활성** | scheduler 0 |
| GitHub Actions deploy workflow | README, automation×2, ci-appstore-guard, ci-guard-policy, ci-pipeline, ci-security, deploy-admin, deploy-api, deploy-web-services, e2e-auth-runtime | **`deploy-main-site.yml` 부재** |
| Artifact Registry (4개 repo 전수) | `cloud-run-source-deploy`(12 image) · `o4o-api`(4) · `siteguide` · `us/gcr.io`(10) | **main-site 이미지 0 — 선행 CHECK 의 orphan image 제거 주장이 실제로 완료되었음을 확인** |
| 최근 30일 요청 로그 | 서비스가 존재하지 않으므로 조회 대상 없음 | 트래픽 0 |

### 2.6 A축 판정 (§3.6)

| 요건 | 결과 |
|---|---|
| 운영 runtime 0 | ✅ Cloud Run / LB / NEG / domain / scheduler 전부 0 |
| 배포 target 0 | ✅ deploy workflow 0 · CI build matrix 제외 · Artifact 이미지 0 |
| 외부 package import 0 | ✅ `ACTIVE_RUNTIME` 소비처 0 (import 0건) |
| 고유 기능 0 또는 이미 대체됨 | ✅ 12 라우트 중 고유 기능 **0**. forum/LMS/organizations 는 공통 축이며 소유자는 다른 서비스. 나머지는 404 · placeholder · test 폴백 |
| CI · root script · lockfile 정리 경계 확인 | ✅ 정리 대상 확정 (§5.1) |
| 삭제 시 다른 서비스 영향 0 | ✅ 단 `packages/organization-core/tsconfig.json` path 와 `tsconfig.base.json` reference 는 **동시 수정 필요**(미수정 시 typecheck 실패) |
| 필요한 회귀 테스트 갱신 목록 확정 | ✅ 6건 (§2.4) |

```text
MAIN_SITE_DISPOSITION = FULL_SOURCE_DELETE_READY
```

---

## 3. B축 — WordPress · shortcode 전 저장소 census (§4)

검색 범위: `apps/**` · `packages/**` · `services/**` · `.github/**` · `scripts/**` · 루트 config. `archive/**` 는 **별도 집계**.
검색어: wordpress / WordPress / @wordpress / window.wp / wp-json / wp_posts / wp_ / gutenberg / shortcode / wordpress-block-parser / featured_media / published_at / block registry / block parser / CPT / WordPressTable / WordPressListLayout.

### 3.1 archive 와 active source 분리 집계 (§7-6)

| 집계 대상 | 파일 수 |
|---|---:|
| **active source** (apps/packages/services/.github/scripts + 루트 config, 데이터 파일 제외) | **212** (문서 포함) |
| 그 중 **실행 코드** (`.ts` / `.tsx` / `.js` / `.json`) | **99** |
| **archive** (`archive/**` + `docs/archive/**`) | **36** |

**두 수치를 합산하지 않는다.** archive 36건은 이번 판정 대상이 아니며, 보존 정책이 정해지기 전에는 손대지 않는다.

### 3.2 결정적 실측 — WordPress runtime

| 검사 | 결과 |
|---|---|
| `from '@wordpress/…'` / `"@wordpress/…"` 의존 | **0건** (테스트 포함 전체) |
| `window.wp` / `globalThis.wp` 실행 코드 | **0건** — 유일한 문자열 출현은 `legacy-wordpress-block-editor-retirement.spec.ts`(부재를 단언하는 회귀 가드) |
| `wp-json` / `wp_posts` | **0건** |
| `packages/shortcodes` | **디렉터리 부재** (0 파일) |
| shortcode parser / renderer | **0건** (`parseShortcode` · `renderShortcode` · `ShortcodeRenderer` · `shortcode-parser` 전부 0) |

### 3.3 분류표

| # | 대상 | 실체 | 분류 |
|---|---|---|---|
| 1 | `packages/block-renderer` (`BlockRenderer`, `WordPressBlock` 타입, `block-parser.ts`, `colors.ts`, `typography.ts`) | **프로덕션 콘텐츠를 렌더**한다 — `web-kpa-society` 의 `QrLandingPage` · `StoreDirectContentPage` · `OperatorContentDetailPage`, `packages/forum-core/ForumBlockRenderer`, admin-dashboard AI block registry SSOT | **`WORDPRESS_COMPATIBILITY_CONTRACT` + 보존 대상** |
| 2 | `packages/types/src/cpt/post.ts` 의 `featured_media` · `comment_status` · `ping_status` | 해당 필드를 읽는 코드 **0건** (선언 파일 외 소비처 0) | `WORDPRESS_COMPATIBILITY_CONTRACT` (미사용) — 소비처별 판단 필요 |
| 3 | `CustomPost` / `CustomPostType` / CPT engine (admin-dashboard `cpt-engine`, api-server `services/cpt/*`, `entities/CustomPost.ts`) | 현행 O4O 콘텐츠 모델. 20여 개 소비처 실재 | **`GENERIC_O4O_CONTENT_MODEL`** — legacy 아님 |
| 4 | `published_at` (35개 파일) · `sticky` (60+ 파일) | forum_posts, store_pops, store_videos, legal_documents, multilingual content, UI sticky header/table 등 **현행 O4O 도메인** | **`GENERIC_CMS_FALSE_POSITIVE`** |
| 5 | `shortCode` (camelCase) — `foreign-visitor-partner-qr-code.*`, `/foreign-visitor/affiliate/:shortCode` | 외국인 관광객 파트너 QR 의 살아 있는 public 라우트 | **`GENERIC_CMS_FALSE_POSITIVE`** (WordPress 무관) |
| 6 | `FormsController.ts:228,403` · `entities/Form.ts:73` 의 `shortcode: "[form name=…]"` | 문자열을 **생성만** 하고, 파싱·렌더하는 코드는 저장소 전체에 0건 | **`DEAD_EXECUTABLE`** |
| 7 | `entities/App.ts` 의 `shortcodes?: []` 필드 · type enum `'shortcode'` | 구형 `apps` 테이블 메타데이터. 현행 canonical 은 `AppRegistry`(주석에 명시) | **`DEAD_EXECUTABLE`** |
| 8 | `User.ts:263` · `role-assignment.service.ts:352-353` 의 `'shortcodes.manage'` 권한 문자열 | 백엔드가 `user.permissions` 를 채우지 않으므로 판정에 쓰이지 않음 | **`DEAD_EXECUTABLE`** |
| 9 | `gallery/types.ts:161` 의 `WordPressGalleryShortcode` 인터페이스 | 타입 이름만 WordPress | **`COMMENT_OR_NAMING_ONLY`** |
| 10 | admin-dashboard `blocks/**`, `components/editor/blocks/gutenberg/**`, `BlockRegistry.ts` (약 60 파일) | 자체 구현 블록 에디터. `@wordpress/*` 의존 0. 주석·클래스명만 Gutenberg 어휘 | **`COMMENT_OR_NAMING_ONLY`** (일부 `GENERIC_O4O_CONTENT_MODEL`) |
| 11 | `legacy-wordpress-block-editor-retirement.spec.ts` · `shortcode-domain-retirement.spec.ts` · `block-registry-report-untrack.spec.ts` · `final-code-only-retirement-closure.spec.ts` · `registry-audit-*.spec.ts` | **이미 삭제된 축의 부재를 단언**하는 재도입 방지 계약 | **`REGRESSION_GUARD`** — legacy 로 오판 금지 |
| 12 | `apps/admin-dashboard/public/themes/twenty-four/theme.json` | 테마 프로필 JSON (WordPress 유래 스키마 어휘) | `WORDPRESS_COMPATIBILITY_CONTRACT` — 소비 확인 후 판단 |
| 13 | `archive/**` + `docs/archive/**` 36건 | 기록물 | **`ARCHIVE_ONLY`** — 보존 정책 미정, 판정 유보 |
| 14 | `docs/checks` 46 · `docs/investigations` 14 등 | 과거 시점 기록물 (CLAUDE.md §16-1 대상 외) | `DOCUMENTATION_STALE` — 손대지 않는다 |

### 3.4 §4 "중요" 4개 함정 준수 확인

- **이름만으로 legacy 판정 금지** → `post` / `page` / `block` / `media` / `category` / `taxonomy` / `slug` / `CPT` 는 전부 현행 O4O 콘텐츠 모델로 확인(#3, #4). legacy 로 올리지 않았다.
- **archive 와 활성 소스 합산 금지** → §3.1 에서 212 / 36 분리 집계. 합산 수치를 만들지 않았다.
- **이미 삭제된 축의 부재를 단언하는 회귀 테스트를 legacy 로 오판 금지** → #11 을 `REGRESSION_GUARD` 로 분리. 유일한 `window.wp` 문자열이 회귀 spec 이라는 점을 명시.
- **다른 서비스가 소비하는 block renderer / CPT 계약을 삭제 후보로 두지 않음** → #1 은 `web-kpa-society` 3개 프로덕션 화면이 소비하므로 **보존 대상**으로 못 박았다. #3 CPT 도 동일.

---

## 4. 기존 CHECK 정합성 (§5)

| 선행 CHECK 축 | 주장 | 현재 실측 | 정합 |
|---|---|---|---|
| MAIN-SITE-DECOMMISSION | Cloud Run service 0 · deploy workflow 0 | 서비스 부재 · `deploy-main-site.yml` 부재 | ✅ |
| MAIN-SITE-CI-BUILD-CONTRACT | build matrix 제외, 경량 검사만 유지 | matrix `[admin-dashboard]` · `type-check:frontend` + lint ratchet 유지 | ✅ |
| MAIN-SITE-NEXTGEN-VIEWRENDERER-RETIREMENT | 197 파일 은퇴, live 27~28 파일만 | src 28 파일 · `src/view` · `src/views` · `src/generator` · `src/ai` · `src/shortcodes` · `components/registry` 전부 부재 | ✅ |
| MAIN-SITE-RESIDUAL-DEPENDENCY-CLEANUP | `axios` · `tsx` 제거, lockfile Case A | package.json 에 없음 · importer 블록 존재 | ✅ |
| SHORTCODE-DOMAIN-RETIREMENT | `packages/shortcodes` 부재 · renderer 0 · cosmetics-seller-extension 부재 | 전부 확인 | ✅ |
| LEGACY-WORDPRESS-BLOCK-EDITOR-RETIREMENT | `@wordpress/*` 의존 0 | 0건 | ✅ |
| WINDOW-WP-POLYFILL-RETIREMENT | `window.wp` 진입점 0 | 실행 코드 0건(회귀 spec 문자열만) | ✅ |
| RETIRED-MAIN-SITE-LMS-MARKETING-RESIDUE-CLEANUP | `/api/v1/lms/marketing/*` · `/lms/bundles` 404 | 프로덕션 404 실측 | ✅ |

**정합하지 않는 문서 · 링크 · 현재형 서술 (별도 보고 — 본 IR 에서 수정하지 않음)**

| 위치 | 문제 | 성격 |
|---|---|---|
| `apps/admin-dashboard/src/docs/mobile-header-implementation.md` | 존재하지 않는 `main-site/src/components/mobile/*` 등 8개 경로를 현재형으로 서술 | 앱 내부 문서(§16-1 대상 외) — 삭제 WO 에서 함께 판단 |
| `packages/appearance-system/README.md:133`, `src/css-generators.ts:6`, `src/tokens.ts:16` | 삭제된 `main-site/src/utils/css-generator.ts` · `src/lib/theme/tokens.ts` 를 참조하는 주석·TODO | 주석 drift |
| `scripts/audit/REGISTRY_AUDIT_REPORT.md:202,208` | 삭제된 shortcode 경로 참조 | 감사 산출물(기록물) |
| `apps/main-site/vite.config.js` · `vite.config.d.ts` | `.ts` 소스와 함께 빌드 산출물이 tracked | 저장소 위생 |

CLAUDE.md §16-1 의 **기준 문서**(`docs/baseline` · `docs/architecture` · `docs/rules` · `docs/rbac` · `docs/platform` · `docs/guides`)에는 `apps/main-site` 참조가 **0건**이다 — 기준 문서 drift 없음.

---

## 5. 삭제 경계 / 보존 경계

### 5.1 삭제 경계 (A축 — 별도 구현 WO 에서 수행)

1. `apps/main-site/**` 38 파일 전체
2. 루트 `package.json` — `build:main-site` 및 이를 호출하는 `build:apps` · `build:apps:all` · `build:web`
3. `scripts/ci-build-app.sh` — `"main"|"main-site"` case + usage 안내
4. `tsconfig.base.json` — `./apps/main-site` project reference
5. `packages/organization-core/tsconfig.json` — `@/*` path 의 main-site 항목
6. `pnpm-lock.yaml` — `apps/main-site:` importer 블록 (lockfile 재생성)
7. `.github/CODEOWNERS` 3줄 · `.github/labeler.yml` glob
8. `.github/workflows/ci-pipeline.yml` 의 제외 근거 주석 (삭제되면 근거 자체가 무의미)
9. `setup-middlewares.ts` CORS 의 `localhost:5175` · `BackupService.ts` 의 `apps/main-site/.env` · `scripts/development/dev.sh` · `scripts/update-package-versions.sh`
10. **회귀 spec 6건 동시 갱신** (§2.4)

### 5.2 보존 경계 (건드리지 않는다)

1. **`packages/block-renderer`** — `web-kpa-society` 의 QR 랜딩 · 매장 직접 콘텐츠 · 운영자 콘텐츠 상세 3개 프로덕션 화면과 `forum-core` 가 소비. **중지 조건 6 대상.**
2. **CPT / `CustomPost` / `CustomPostType`** — 현행 O4O 콘텐츠 모델.
3. **forum · LMS · organizations 백엔드** — 공통 구조(CLAUDE.md §13). main-site 삭제와 무관.
4. **`published_at` · `sticky` · `slug` · `post` · `page` · `media` · `category` · `taxonomy`** — 일반 콘텐츠 모델. 이름만으로 손대지 않는다.
5. **`shortCode`(camelCase) 축** — foreign-visitor QR 파트너 링크, 살아 있는 public 라우트.
6. **회귀 spec 전체** — 부재를 단언하는 가드. 삭제 대상이 아니라 갱신 대상이다.
7. **`archive/**` 36건** — 보존 정책 미정. 손대지 않는다.

---

## 6. 중지 조건 발생 여부 (§6)

| # | 조건 | 발생 | 근거 |
|---|---|---|---|
| 1 | main-site 전용 프로덕션 기능·데이터 | **미발생** | 고유 기능 0 · 전용 테이블 0 · 12 라우트 전부 404 / placeholder / 공통축 중복 |
| 2 | 다른 서비스가 main-site 를 import | **미발생** | import 0건 · `private: true` · export barrel 없음 |
| 3 | 활성 배포 · 도메인 · 트래픽 | **미발생** | Cloud Run / LB / NEG / domain / workflow / 이미지 전부 0 |
| 4 | WordPress 호환 필드의 외부 API 소비자 | **미발생 (완전 증명은 아님)** | `featured_media` · `comment_status` · `ping_status` 는 선언 파일 외 소비처 0건. 저장소 밖 소비자는 확인 불가 → 해당 필드 제거는 **별도 판단 필요** |
| 5 | shortcode 의 실제 콘텐츠 · DB 소비 | **미발생** | parser / renderer 0건. `[form …]` 은 생성만 하고 파싱 0 |
| 6 | block renderer 가 프로덕션 콘텐츠를 렌더 | **⚠ 발생 — B축 한정** | `@o4o/block-renderer` 는 `web-kpa-society` 3화면 + forum-core 가 소비. **삭제 후보로 두지 않는다.** A축 삭제와는 무관 |
| 7 | archive 삭제 필요 + 보존 정책 미정 | **⚠ 발생 — 판정 유보** | archive 36건은 이번 범위에서 판정하지 않음. 보존 정책 결정 필요 |
| 8 | 다른 세션의 중첩 변경 | **미발생** | §1 표 참조 |
| 9 | DB · GCP write 필요 | **미발생** | 전 조사 read-only |

→ **A축 진행을 막는 중지 조건 0건.** 6 · 7 은 B축의 범위 제한 사유이며 A축 삭제를 막지 않는다.

---

## 7. 후속 WO 제안

| 순서 | WO (제안) | 범위 |
|---|---|---|
| 1 | `WO-O4O-MAIN-SITE-FULL-SOURCE-DELETION-V1` | §5.1 삭제 경계 10항목을 **한 커밋**으로. 회귀 spec 6건 lockstep 갱신 + `pnpm install` lockfile 재생성 + `type-check:frontend` · `eslint .` · api-server Jest 전량 통과 |
| 2 | `WO-O4O-WORDPRESS-COMPAT-FIELD-CONSUMER-DECISION-V1` | `featured_media` · `comment_status` · `ping_status` 3필드 + `theme.json` 의 소비처별 판단(제거 / 계약 유지). **`block-renderer` · CPT 는 범위 밖(보존)** |
| 3 | `WO-O4O-DEAD-SHORTCODE-RESIDUE-CLEANUP-V1` | `DEAD_EXECUTABLE` 3축(`[form …]` 생성 · `App.ts` shortcodes 필드/enum · `shortcodes.manage` 권한 문자열)의 제거 여부 판단 |
| 4 | `IR-O4O-ARCHIVE-RETENTION-POLICY-V1` | `archive/**` + `docs/archive/**` 보존 정책 결정 (조사 · 정책 전용) |
| 5 | (후행) 저장소 전역 dead code census | 1~4 종료 후, 그 결과를 기준선으로 |

> 지시대로 **main-site 폐기와 저장소 전역 legacy 정비를 한 번에 수행하지 않는다.** 1번을 먼저 닫고 그 결과를 기준으로 2~4 를 진행한다.

---

## 8. 최종 판정

```text
MAIN_SITE_FINAL_DISPOSITION        = FULL_SOURCE_DELETE_READY
MAIN_SITE_UNIQUE_FUNCTIONS         = ZERO
MAIN_SITE_EXTERNAL_CONSUMERS       = ACTIVE_RUNTIME 0 / CI_BUILD_OR_TYPECHECK 7 / REGRESSION_GUARD 6 / DOCUMENTATION 2 / HISTORICAL 3 / DEAD_REFERENCE 4
MAIN_SITE_DEPLOYMENT               = ZERO (Cloud Run 0 · LB/NEG 0 · domain 0 · workflow 0 · scheduler 0)
MAIN_SITE_ARTIFACT_RESIDUAL        = ZERO (Artifact Registry 4개 repo 전수 확인)
ACTIVE_WORDPRESS_RUNTIME           = ZERO (@wordpress/* 0 · window.wp 0 · wp-json 0 · wp_posts 0)
ACTIVE_SHORTCODE_RUNTIME           = ZERO (parser/renderer 0 · packages/shortcodes 부재)
WORDPRESS_COMPATIBILITY_CONTRACTS  = 3 (block-renderer = 보존 필수 / cpt/post.ts WP-compat 3필드 = 소비처 0 / theme.json = 확인 필요)
GENERIC_CMS_FALSE_POSITIVES        = published_at · sticky · slug · post · page · media · category · taxonomy · CPT · shortCode(camelCase)
ARCHIVE_POLICY_REQUIRED            = YES (archive 36건 · 판정 유보)
READY_FOR_IMPLEMENTATION_WO        = YES (A축 한정 · B축은 소비처별 후속 판단)
```
