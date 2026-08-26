# WO-O4O-MAIN-SITE-RESIDUAL-ORPHAN-AXIS-CENSUS-V1 — CHECK

**최종 판정: `RETIRE_CONFIRMED` (74 files)**

`apps/main-site/src` 에 남아 있던, live route graph 에도 이미 은퇴한 NextGen/ViewRenderer ·
App Store 폐포에도 속하지 않는 고아 축 **74 개** 를 전수조사하여 dead source 로 확정하고
축 단위로 한 번에 정리했다.

---

## §3 기준선 고정

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `4a4d2ccb8a3e6351c60ca81d1933db0f64a97aef` |
| origin/main | `6848133f1bf09bd702c8f22e71b6ac51f1da99d1` |
| ahead / behind | 4 / 8 |
| `git status --short` (시작 시점) | **비어 있음 (clean)** |
| `git diff --stat HEAD origin/main -- apps/main-site` | **빈 diff** |

시작 시점 shared worktree 는 clean 이었고, 분기(ahead 4 / behind 8) 에도 불구하고
`apps/main-site` 는 HEAD 와 `origin/main` 이 **완전히 동일**했다. 따라서 census · 삭제 ·
검증은 shared worktree 에서 수행하고(node_modules 가 여기에만 있다),
**push 만 최신 `origin/main` 기준 임시 worktree cherry-pick** 으로 처리했다.
`pull` · `rebase` · `autostash` 는 수행하지 않았다.

> **작업 중 나타난 foreign WIP (건드리지 않음)**
> 작업 도중 다른 세션이 아래를 unstaged/untracked 로 만들었다. 상태를 변경하지 않았고
> staging 대상에도 넣지 않았다.
> - `M .github/workflows/ci-pipeline.yml`
> - `M apps/api-server/src/database/entities.ts`
> - `M scripts/check-typeorm-entities.mjs`
> - `?? apps/api-server/src/__tests__/typeorm-entity-registry-guard.spec.ts`
> - `?? docs/checks/WO-O4O-TYPEORM-ENTITY-REGISTRY-INTEGRITY-GUARD-AND-CI-ADOPTION-V1-CHECK.md`

---

## §4 import graph 재생성

선행 WO 가 보고한 "약 75 개" 를 그대로 믿지 않고 **현재 HEAD 에서 다시 계산**했다.

`src/main.tsx` 를 진입점으로 정적 import graph 를 BFS 로 전개한다. 해석 대상은
`@/` alias · 상대 경로이며, 확장자 후보 `.ts .tsx .js .jsx .json .css` 와 `index.*` 를
모두 시도한다. 간선 추출 정규식 5 종: `from '...'` · `import('...')` · `require('...')` ·
bare `import '...'` · `import.meta.glob('...')`.

### 삭제 전

```
src total files  : 102
code files       : 100
non-code files   : 2   -> index.css, vite-env.d.ts
live reachable   : 27  (26 code + index.css)
orphan candidate : 74
unresolved specs : 0
```

**선행 WO 의 "75" 는 `74` 로 정정한다.**

분류:

| 분류 | 수 | 비고 |
|---|---|---|
| `LIVE_GRAPH` | 27 | `main.tsx` 로부터 도달 |
| `NEXTGEN_RETIRED` | 0 | WO #5 에서 이미 삭제 완료 (파일 잔존 0) |
| `APPSTORE_RETIRED` | 0 | WO #4 에서 이미 삭제 완료 (파일 잔존 0) |
| `ORPHAN_CANDIDATE` | 74 | 이번 WO 대상 |
| 미분류 | **0** | |

`unresolved specs 0` — 해석 실패한 상대/alias 지정자가 없으므로 "graph 가 못 본 간선"
때문에 orphan 으로 오분류된 파일은 없다.

### 핵심 구조 사실

**74 개 orphan 의 importer 는 전부 orphan 자신이다.** 즉 74 개는 live 진입점이 0 인
닫힌 부분그래프 여러 개를 이룬다. importer = 0 인 폐포 루트는 다음과 같다:

```
components/forum/ai/index.ts          components/forum/recommendations/index.ts
design/index.ts                       hooks/queries/** (17 전부)
hooks/useNotifications.ts             layouts/index.ts
lib/api/lmsYaksaMember.ts             pages/auth/index.ts
pages/dashboard/index.ts              pages/forum/index.ts
pages/lms/index.ts                    pages/yaksa/forum/index.ts
```

---

## §5 축 그룹핑 및 판정

| Axis | Files | Importer | Route | Runtime | 판정 |
|---|---|---|---|---|---|
| `hooks/queries/**` | 17 | 0 | 없음 | 없음 | `UNUSED_QUERY_LAYER` / 다수 `DEAD_API_CLIENT` |
| `hooks/useForumAI` · `useForumRecommendations` · `useNotifications` · `useRealtimeNotifications` | 4 | orphan 내부만 | 없음 | 없음 | `ORPHAN_DEAD` |
| `components/forum/{ai,notifications,recommendations}` | 12 | orphan 내부만 | 없음 | 없음 | `UNROUTED_UI` → `DEAD_UI` |
| `components/yaksa/forum` | 7 | orphan 내부만 | 없음 | 없음 | `HISTORICAL_KPA_COPY` → `DEAD_SOURCE` |
| `pages/yaksa/forum` | 7 | 0 | 없음 | 없음 | `HISTORICAL_KPA_COPY` → `DEAD_SOURCE` |
| `lib/yaksa/forum-data.ts` | 1 | orphan 내부만 | 없음 | 없음 | `HISTORICAL_KPA_COPY` → `DEAD_SOURCE` |
| `lib/api/lmsYaksaMember.ts` | 1 | 0 | 없음 | 없음 | `DEAD_SOURCE` |
| `design/**` (index · components · tokens · utils) | 20 | orphan 내부만 | 없음 | 없음 | `LEGACY_DESIGN_SYSTEM` → `DEAD_DESIGN_SOURCE` |
| dead barrel: `layouts/index.ts` · `pages/{auth,dashboard,forum,lms}/index.ts` | 5 | 0 | 없음 | 없음 | `ORPHAN_DEAD` |
| **합계** | **74** | | | | **미분류 0** |

---

## §6 `hooks/queries/*` 판정 — `UNUSED_QUERY_LAYER` / `DEAD_API_CLIENT`

17 개 파일 전부가 `axios` + `@tanstack/react-query` 의 얇은 스텁(21~44 줄)이며
**importer 0** 이다.

호출 endpoint 와 api-server mount 대조:

| endpoint | api-server mount | main-site consumer | 판정 |
|---|---|---|---|
| `/api/cart` | **없음** | 0 | `DEAD_API_CLIENT` |
| `/api/products` | **없음** | 0 | `DEAD_API_CLIENT` |
| `/api/admin/stats` · `/api/admin/sellers` · `/api/admin/suppliers` | **없음** | 0 | `DEAD_API_CLIENT` |
| `/api/customer/{account,profile,wishlist}` | **없음** | 0 | `DEAD_API_CLIENT` |
| `/api/seller/dashboard` · `/api/supplier/dashboard` | **없음** | 0 | `DEAD_API_CLIENT` |
| `/api/checkout` | 있음 (`checkoutRoutes`) | **0** | `UNUSED_QUERY_LAYER` |
| `/api/orders` | 있음 (`checkoutRoutes`) | **0** | `UNUSED_QUERY_LAYER` |
| `/api/partner/dashboard` | 있음 (`partnerRoutes`) | **0** | `UNUSED_QUERY_LAYER` |

WO §6 규칙 그대로: **API endpoint 자체가 active 여도 main-site hook 의 consumer 가 0 이면
별도 dead source** 다. 위 3 개 endpoint 는 api-server 쪽에서 그대로 유지되며 이번 삭제와
무관하다.

> **혼동 주의:** live seller dashboard 는 `hooks/queries/useSellerDashboardData.ts` 가 아니라
> `pages/seller/dashboard/useSellerDashboard.ts` 라는 **다른 파일**을 쓴다. 전자는 중복
> dead layer 이고 후자는 live 로 유지된다.

또한 `/api/v1/store/cart/*` (CLAUDE.md 3-A 보호 대상) 은 이 축과 무관하다 —
삭제된 hook 은 canonical 이 아닌 `/api/cart` 를 부르고 있었다.

---

## §7 `components/forum/*` 판정 — `UNROUTED_UI` → `DEAD_UI`

live forum route 컴포넌트의 실제 import:

```
pages/forum/ForumListPage.tsx   → react, react-router-dom, @o4o/auth-client,
                                  @/context, @/components/common
pages/forum/ForumDetailPage.tsx → react, react-router-dom, @o4o/auth-client,
                                  @o4o/content-editor, @/context, @/components/common
```

**live forum route 는 `@/components/forum` 을 단 한 줄도 참조하지 않는다.**
따라서 `ai`(3) · `notifications`(6) · `recommendations`(3) 12 개는 라우팅되지 않는
별도 기능 레이어이며 `DEAD_UI` 다. live forum route 는 그대로 보호된다(§15).

---

## §8 yaksa 축 판정 — `HISTORICAL_KPA_COPY` → `DEAD_SOURCE`

대상 16 개: `components/yaksa/forum/**`(7) · `pages/yaksa/forum/**`(7) ·
`lib/yaksa/forum-data.ts`(1) · `lib/api/lmsYaksaMember.ts`(1).

**이름이 겹친다는 이유로 `services/web-kpa-society` 와 동일 소유권으로 보지 않았다.**
실측 결과:

- `services/web-kpa-society/src/components/forum/` 은 **완전히 다른 구현**을 갖고 있다 —
  `ClosedForumAccessBlocker` · `ForumActivitySection` · `ForumHubSection` ·
  `ForumSearchBar` · `ForumSearchResults` · `ForumWritePrompt`.
  main-site 의 `YaksaForumHome` · `YaksaForumPostList` 계열과 이름이 하나도 겹치지 않는다.
- `services/web-kpa-society` 는 main-site 를 import 하지 않는다 (참조 0).
- `services/web-kpa-society/src/lib/api/` 에는 `signageV2.ts` 만 있고
  `lmsYaksaMember.ts` 는 없다.
- main-site 의 라우터에 `/yaksa` 경로가 없다.

저장소 전역에서 `YaksaForum*` 로 잡히는 main-site 밖 히트는 **전부
`YaksaForumMeta`** — `apps/api-server/src/types/forum.types.ts` 와
`packages/forum-core` 의 **백엔드 metadata 타입**이다. main-site UI 컴포넌트와 이름만
겹치며 소비 관계가 없다. 이 타입들은 유지된다.

`lib/api/lmsYaksaMember.ts` (373 줄) 는 main-site 안에서 importer 가 0 이다.
`docs/investigations/CHECK-O4O-LMS-KPA-FRONTEND-API-CONTRACT-RESIDUE-CLEANUP-V1.md` 가
이 파일을 언급하지만 이는 **문서 참조**이며 코드 소비가 아니다.

---

## §9 design 축 판정 — `LEGACY_DESIGN_SYSTEM` → `DEAD_DESIGN_SOURCE`

대상 20 개: `design/index.ts` · `design/components/**`(10) · `design/tokens/**`(6) ·
`design/utils/**`(3).

결정적 증거 — **`apps/main-site/tailwind.config.js` 가 동일한 값을 직접 인라인하고 있고
`@/design/tokens` 를 import 하지 않는다.**

| 값 | `design/tokens/colors.ts` | `tailwind.config.js` |
|---|---|---|
| primary | `#1A73E8` | `#1A73E8` |
| primary dark | `#0F4EB3` | `#0F4EB3` |
| secondary | `#F97316` | `#F97316` |
| neutral 900 | `#0F172A` | `#0F172A` |

즉 실제로 스타일을 만들어내는 정본은 tailwind config 이고, `design/tokens` 는 그것과
분리된 **평행 사본**이다.

추가 확인:
- 저장소 전체에서 `@/design` importer **0**
- Storybook 설정 없음 (`apps/main-site` 에 `.storybook` 부재)
- `postcss.config.js` · `vite.config.ts` 에서 design 축 참조 0

WO §9 지침대로 **미사용 design system 전체를 "미래 대비용" 으로 보존하지 않는다.**

---

## §10 기타 orphan 축 — 미분류 0

| 파일 | importer | 판정 |
|---|---|---|
| `hooks/useForumAI.ts` (192줄) | `components/forum/ai/*` (orphan) | `ORPHAN_DEAD` |
| `hooks/useForumRecommendations.ts` (245줄) | `components/forum/recommendations/*` (orphan) | `ORPHAN_DEAD` |
| `hooks/useNotifications.ts` (200줄) | 0 | `ORPHAN_DEAD` |
| `hooks/useRealtimeNotifications.ts` (231줄) | `hooks/useNotifications.ts` (orphan) | `ORPHAN_DEAD` |
| `layouts/index.ts` | 0 | `ORPHAN_DEAD` (dead barrel) |
| `pages/auth/index.ts` | 0 | `ORPHAN_DEAD` (dead barrel) |
| `pages/dashboard/index.ts` | 0 | `ORPHAN_DEAD` (dead barrel) |
| `pages/forum/index.ts` | 0 | `ORPHAN_DEAD` (dead barrel) |
| `pages/lms/index.ts` | 0 | `ORPHAN_DEAD` (dead barrel) |

**74 개 전부 축에 배정되었다. 미분류 파일 0.**

---

## §11 Dynamic Consumer Census

### main-site 내부

| 패턴 | 결과 |
|---|---|
| `import.meta.glob(` | **0** |
| `require(` | **0** |
| `React.lazy` / `lazy(` | `router/index.tsx` 8 개뿐 |
| route string 기반 동적 해석 | 없음 — 라우터는 명시적 `<Route>` 표 |
| component name literal 매핑 | 없음 (registry 축은 WO #4/#5 에서 제거됨) |

router 의 `lazy()` 대상 8 개는 전부 live 다:
`DashboardPage` · `LoginPage` · `ForumListPage` · `ForumDetailPage` ·
`MyCoursesPage` · `CourseDetailPage` · `LessonPage` · `SellerDashboardPage`.

### 저장소 외부 (identifier)

`YaksaForum*` · `YaksaCategoryList` · `YaksaModerationPanel` · `YaksaNoticeCard` ·
`YaksaOrgNavigation` · `YaksaRoleBadge` · `forum-data` · `lmsYaksaMember` ·
`useForumAI` · `useForumRecommendations` · `useRealtimeNotifications` ·
`NotificationPopover` · `NotificationFeedPage` · `RecommendationList` ·
`useAdminSellerList` · `useAdminSupplierList` · `useSupplierDashboardData` ·
`usePartnerDashboardData` · `useWishlist` · `useMyAccount` 전역 검색 결과:

- **코드 히트는 전부 `YaksaForumMeta`** (api-server `types/forum.types.ts`,
  `packages/forum-core`, `services/forum/recommendation/*`) — **백엔드 타입, 이름만 중복**
- `packages/forum-yaksa/dist/manifest.js` 의 `YaksaForumService` ·
  `YaksaForumCommunity` — 백엔드 서비스/엔티티 이름, main-site UI 와 무관
- 나머지는 전부 `docs/**` 의 과거 조사 문서 (문서 참조, 코드 소비 아님)

**→ 외부 코드 consumer 0**

### raw-source consumer

`main-site/src` 경로를 문자열로 읽는 코드 전수조사 결과, **은퇴 74 개 경로를 읽는
코드는 0** 이다. 발견된 참조는 전부 다른 대상이다:

| 위치 | 대상 | 이번 삭제와의 관계 |
|---|---|---|
| `.github/CODEOWNERS:14-15` | `src/components/` · `src/pages/` (디렉터리 glob) | 파일 단위 지정 아님 — 영향 없음 |
| `sonar-project.properties:9,18` | `apps/main-site/src` 전체 | 경로 단위 — 영향 없음 |
| `packages/organization-core/tsconfig.json:22` | `@/*` → main-site alias | **해당 패키지에 `@/` import 가 0** — 사문 |
| `scripts/verify-shortcodes.ts:76` · `scripts/audit/check-shortcode-registry.ts:92,167` | `src/components/shortcodes` | WO #5 에서 이미 삭제된 경로. 이번 축과 무관 (아래 §14 후속 항목) |
| `packages/appearance-system/**` | `src/utils/css-generator.ts` · `src/lib/theme/tokens.ts` | 주석/TODO. 해당 파일들은 WO #5 에서 이미 삭제됨 |
| `apps/api-server/src/__tests__/main-site-nextgen-viewrenderer-retirement.spec.ts:37` | `router/index.tsx` (live) | live 경로 — 유지됨 |

---

## §12 barrel / type-only 분석

**barrel 에 남아 있다는 이유만으로 active 판정하지 않았다.**

- `components/forum/{ai,recommendations}/index.ts` · `components/yaksa/forum/index.ts` ·
  `pages/yaksa/forum/index.ts` · `design/index.ts` · `design/{components,tokens}/index.ts`
  → **재export 대상이 전부 orphan**. barrel 과 대상이 함께 삭제된다.
- `layouts/index.ts` · `pages/{auth,dashboard,forum,lms}/index.ts`
  → **재export 대상은 live** 이지만 barrel 자체의 importer 가 **0** 이다.
  라우터는 `@/layouts/MainLayout` · `@/pages/forum/ForumListPage` 처럼 **파일을 직접**
  import 한다. 따라서 barrel 만 삭제하고 대상 파일은 전부 유지된다.
  (`layouts/index.ts` 는 WO #5 가 보수적으로 남겨 둔 파일이다.)
- type-only re-export (`export type { ForumPostAIMeta } from '@/hooks/useForumAI'` 등)
  도 전부 orphan → orphan 방향이라 함께 사라진다.
- `pages/seller/dashboard/index.ts` 는 라우터가 `@/pages/seller/dashboard` 로
  **디렉터리 import** 하므로 **live** — 삭제 대상이 아니다.

---

## §13 build / typecheck 의미

`apps/main-site/tsconfig.json` 은 `"include": ["src"]` 이므로 tsc 는 **import graph 가
아니라 디렉터리 전체**를 검사한다. 이것이 WO #6 에서 확인한 사실이고, 이번 삭제로
그 격차가 해소된다:

| 시점 | tsc 검사 대상 | Vite graph 도달 | 격차 |
|---|---|---|---|
| 삭제 전 | 100 code files | 26 code files | **74** |
| 삭제 후 | 26 code files | 26 code files | **0** |

lint(`eslint .`) 대상도 74 개 줄어든다. lint-ratchet 은 warning 총량이 감소하는 방향이라
회귀하지 않는다.

---

## §14 package dependency census

`apps/main-site/package.json` 기준, live / orphan 별 사용처 실측:

| dependency | live 사용 | orphan 사용 | 판정 | 이번 조치 |
|---|---|---|---|---|
| `@o4o/auth-client` | 8 | 1 | `ACTIVE_DEP` | 유지 |
| `@o4o/content-editor` | 3 | 1 | `ACTIVE_DEP` | 유지 |
| `@o4o/ui` | 1 | 0 | `ACTIVE_DEP` | 유지 |
| `@tanstack/react-query` | 1 (`main.tsx` `QueryClientProvider`) | 17 | `ACTIVE_DEP` | 유지 |
| `axios` | **0** | 17 | **`ORPHAN_DEP`** | **변경 없음 (후속)** |
| `react` · `react-dom` | 전역 | — | `ACTIVE_DEP` | 유지 |
| `react-router-dom` | 12 | 0 | `ACTIVE_DEP` | 유지 |
| `typescript` · `vite` · `@vitejs/plugin-react` · `@types/*` | — | — | `BUILD_ONLY` | 유지 |
| `tailwindcss` · `postcss` · `autoprefixer` | — | — | `BUILD_ONLY` | 유지 |
| `tsx` | 0 | 0 | `ORPHAN_DEP` (WO #5 부터) | **변경 없음 (후속)** |

> **`@tanstack/react-query` 가 살아남는 근거:** orphan 17 개가 사라져도
> `main.tsx` 가 `QueryClient` · `QueryClientProvider` 로 앱 전체를 감싸고 있다.
> 이것이 `axios`(live 0) 와 갈리는 지점이다.

**dependency / lockfile 변경 0.** `axios` · `tsx` 는 dead 로 확정되었으나,
package.json 만 고치면 `--frozen-lockfile` CI 가 깨지고 lockfile 재생성은 monorepo
전역에 파급된다. main-site 는 배포 대상이 아니라 미사용 선언이 무해하므로,
이번 WO 는 **source orphan 만 닫고** dependency 잔재는 후속으로 분리한다.

### 후속 정리 대상 (이번 범위 밖, 손대지 않음)

1. `apps/main-site/package.json` 의 `axios` · `tsx` 제거 + lockfile 갱신
2. 루트 `package.json:84` `verify:shortcodes` → `scripts/verify-shortcodes.ts`
   (이미 삭제된 `apps/main-site/src/components/shortcodes` 참조, CI 미사용)
3. `scripts/audit/check-shortcode-registry.ts` · `scripts/audit/shortcode-registry-report.json`
   (동일 경로 참조, stale 산출물)
4. `packages/organization-core/tsconfig.json` 의 main-site `@/*` alias (사문)

---

## §15 live route 7 축 보호

| Route | Page | Reachable deps | 유지 여부 |
|---|---|---|---|
| `/login` | `pages/auth/LoginPage.tsx` | `@/context`, `@o4o/auth-client` | **유지** |
| `/` · `/org/:orgId` | `pages/dashboard/DashboardPage.tsx` | `@/context`, `@/components/common` | **유지** |
| `/forum` · `/forum/post/:slug` · `/forum/write` | `pages/forum/ForumListPage.tsx` · `ForumDetailPage.tsx` | `@/context`, `@/components/common`, `@o4o/content-editor` | **유지** |
| `/lms` · `/lms/courses` | `pages/lms/MyCoursesPage.tsx` | `@/components/common` | **유지** |
| `/lms/course/:id` | `pages/lms/CourseDetailPage.tsx` | `@/components/common` | **유지** |
| `/lms/course/:courseId/lesson/:lessonId` | `pages/lms/LessonPage.tsx` | `@/components/common` | **유지** |
| `/seller/dashboard` · `/seller/dashboard/:sellerId` | `pages/seller/dashboard/` (5 files) | 자체 api/types/hook | **유지** |
| `/mypage/*` · `*` (404) | 인라인 placeholder (`router/index.tsx`) | — | **유지** |

공통 shell: `main.tsx` · `App.tsx` · `index.css` · `router/index.tsx` ·
`layouts/MainLayout.tsx` · `components/common/*`(7) · `context/*`(3) — 전부 유지.

### 삭제 후 graph 재계산

```
src total files  : 28
code files       : 26
non-code files   : 2   -> index.css, vite-env.d.ts
live reachable   : 27  (26 code + index.css)
orphan candidate : 0
unresolved specs : 0
```

**live route loss 0 / route import break 0 / orphan 0**

---

## §16 source asset 재판정

삭제 후 `apps/main-site` 는 **`MINIMAL_SHELL`** 이다.

- 파일 28 개(코드 26 + `index.css` + `vite-env.d.ts`), orphan 0, 전부 live route 에 도달
- runtime 은 이미 은퇴 (Cloud Run 서비스 없음, deploy workflow 없음)
- CI 는 WO #6 이후 `type-check:frontend` + `eslint .` 의 lightweight check 만 수행
- **`EMPTY_SHELL` 은 아니다** — 8 개 lazy route 를 가진 동작하는 SPA 이고 빌드도 성공한다

WO §16 지침대로 **main-site 전체 삭제는 수행하지 않았다.**

---

## §17 retire 기준 충족 확인

| 조건 | 실측 |
|---|---|
| live route graph 도달 | **0** |
| 정적 importer (orphan 폐포 밖) | **0** |
| dynamic consumer (`import()` · `lazy` · `glob` · `require`) | **0** |
| route string / component name literal 참조 | **0** |
| 저장소 외부 코드 consumer | **0** |
| raw-source consumer | **0** |

**6 개 조건 전부 0 → `RETIRE_CONFIRMED`.** `UNKNOWN` 축 없음.

---

## §18 retire 범위

명시 경로만 지정해 삭제했다 (`git add .` 미사용).

```
git rm -r apps/main-site/src/components/forum      (12)
          apps/main-site/src/components/yaksa      ( 7)
          apps/main-site/src/design                (20)
          apps/main-site/src/hooks                 (21)
          apps/main-site/src/pages/yaksa           ( 7)
          apps/main-site/src/lib                   ( 2)

git rm    apps/main-site/src/layouts/index.ts
          apps/main-site/src/pages/auth/index.ts
          apps/main-site/src/pages/dashboard/index.ts
          apps/main-site/src/pages/forum/index.ts
          apps/main-site/src/pages/lms/index.ts    ( 5)
```

합계 **74 삭제**. `git diff --cached --name-status` 검증 결과:
- `D` 74 건, 그 외 상태 0 건
- `apps/main-site/src/` 밖 경로 **0**
- live 경로(`main.tsx` · `App.tsx` · `router/` · `layouts/MainLayout` ·
  `components/common/` · `context/` · live page · `index.css` · `vite-env.d.ts`) 혼입 **0**

---

## §19 test contract

신규: `apps/api-server/src/__tests__/main-site-residual-orphan-axis-retirement.spec.ts`
(**45 tests, 전부 통과**)

- 은퇴 디렉터리 6 개 · dead barrel 5 개 부재 단언
- live 경로 15 개 존재 단언
- router 의 lazy 대상 8 개 유지 단언 + 은퇴 축 미참조 단언
- main-site 전역 은퇴 축 import 0 (design · hooks · lib · forum UI · yaksa UI · yaksa page)
- dead barrel 재진입 0
- 저장소 전역 raw-source 참조 0
- `web-kpa-society` → main-site import 0 (소유권 분리 재확인)
- live dependency 5 종 유지 + `main.tsx` `QueryClientProvider` 유지

> 저장소 전역 walk 를 하는 단언 1 건이 약 105 초 걸린다. 기존
> `main-site-appstore-parallel-axis-retirement.spec.ts` 와 동일한 패턴이며,
> 정확성을 위해 범위를 줄이지 않았다.

---

## §20 검증 결과

| 항목 | 결과 |
|---|---|
| `apps/main-site` `tsc --noEmit` | **exit 0** |
| `eslint apps/main-site/src` + 신규 spec | **0 errors** / 3 warnings (전부 live 파일의 기존 warning) |
| 신규 retirement guard spec | **45 / 45 PASS** |
| api-server `__tests__` 전량 (retirement·contract 포함) | **119 suites / 2244 tests PASS** |
| `scripts/ci-build-app.sh main-site` (검증 목적 1 회) | **exit 0**, 2036 modules, 25.84 s |
| 삭제 후 import graph | orphan **0**, unresolved **0**, live **27** |

build 산출물(`apps/main-site/dist`)은 `.gitignore` 대상이라 staging 에 섞이지 않았다.
빌드 결과 chunk 에 live route 8 개가 그대로 나타난다 (`LoginPage` · `DashboardPage` ·
`ForumListPage` · `ForumDetailPage` · `MyCoursesPage` · `CourseDetailPage` ·
`LessonPage` + seller dashboard).

**CI 재등록은 하지 않았다** — WO #6 의 `REDUCE_TO_LIGHTWEIGHT_CHECK` 를 유지한다.

기존 warning 3 건(이번 변경과 무관, live 파일):
```
context/OrganizationContext.tsx 145:14  'err' is defined but never used
context/OrganizationContext.tsx 225:6   useEffect missing dependency 'reloadOrganization'
pages/auth/LoginPage.tsx        42:14   'err' is defined but never used
```

---

## §21 production 영향

**production 재배포 없음.** 이번 변경은 source-only 이며 대상은 이미 runtime 이
은퇴한 historical main-site 다.

- DB schema change **0** / migration **0** / production write **0**
- Cloud Run 서비스 영향 **0** (main-site 는 배포 대상이 아니다)
- 보호 축 무변경: `APPS_CATALOG` · `packages/**/manifest.ts` · `app_registry` ·
  `/api/v1/admin/apps` · `/api/v1/apps/availability` · `AppManager` ·
  `store_cart_items` · `checkout_orders` · `/api/v1/store/cart/*`

---

## §22 CI 회귀 확인

| 항목 | 결과 |
|---|---|
| main-site full build matrix 재등록 | **0** (`ci-pipeline.yml` matrix 는 `[admin-dashboard]` 유지) |
| `type-check:frontend` 유지 | **유지** (main-site tsc exit 0) |
| lint 유지 | **유지** (0 errors, warning 총량 감소) |
| admin-dashboard build 영향 | **0** (main-site 외부 변경 0) |
| deploy workflow 영향 | **0** (main-site deploy workflow 부재) |

`.github/workflows/ci-pipeline.yml` 은 다른 세션이 수정 중(unstaged)이며
**이번 커밋에 포함하지 않았다.**

---

## §23 Git 안전

| 항목 | 결과 |
|---|---|
| `autostash` | **0** |
| foreign staged/unstaged 상태 변경 | **0** |
| staged scope guard | **PASS** |
| path-specific commit | **적용** (`git commit -- <paths>`) |
| commit 자체 delta 검증 | **PASS** |

`pull` · `rebase` · `autostash` 미수행. `git add .` 미사용.
shared branch 가 `origin/main` 대비 분기 상태이므로, push 는 최신 `origin/main` 에서
만든 **임시 worktree cherry-pick** 방식으로 처리했다.

---

## §24 중지 조건 점검

| 중지 조건 | 발생 여부 |
|---|---|
| 다른 app/package 가 직접 import | **없음** (§11) |
| dynamic consumer 발견 | **없음** (§11) |
| live route 손실 위험 | **없음** (§15) |
| `UNKNOWN` 판정 축 | **없음** (§5, 미분류 0) |

전 축 `RETIRE_CONFIRMED` — 중단 사유 없이 완주했다.

---

## §25 요약

- **74 개 orphan 전부 dead 확정 → 삭제 완료. 잔여 orphan 0.**
- `apps/main-site/src` 는 102 → 28 파일 (코드 100 → 26) 로 축소, `MINIMAL_SHELL`.
- live route 7 축 · 8 lazy 컴포넌트 전원 보존, build/typecheck/lint 전부 통과.
- dependency · lockfile · CI · DB · production 변경 **0**.
- `axios` · `tsx` · shortcode 잔재 스크립트는 근거와 함께 **후속 항목**으로 명시 (§14).
