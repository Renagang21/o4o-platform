# WO-O4O-MAIN-SITE-NEXTGEN-VIEWRENDERER-DOMAIN-CENSUS-AND-RETIREMENT-V1 — CHECK

- **작업일**: 2026-08-26
- **시작 기준 commit**: `8bd585269` (worktree clean, `HEAD == origin/main`, foreign staged/unstaged/untracked 0)
- **최종 판정**: **`RETIRE_CONFIRMED`**
- **DB 변경**: schema change 0 / migration 0 / production write 0 / SELECT 0 (DB 접근 자체가 불필요한 조사였다)

---

## 1. 대상

`apps/main-site` 안에 남아 있던 **NextGen 화면 생성 프레임워크 전체**.
JSON View 스키마를 런타임에 해석해 화면을 조립하는, 실제 라우터와 별개인 병렬 렌더링 세계다.

사용자가 지목한 7개 축:

```
apps/main-site/src/view/
apps/main-site/src/views/*.json
apps/main-site/src/generator/
apps/main-site/src/ai/
apps/main-site/src/shortcodes/
apps/main-site/src/components/registry/
ViewRenderer.tsx
```

개별 파일 정리가 아니라 **프레임워크 전체가 dead 인지 증명하고 한 번에 retire** 하는 것이 이번 WO 의 목표다.

---

## 2. 조사 방법

식별자 grep 만으로 consumer 0 을 선언하지 않았다. 세 가지 독립 방법으로 교차 검증했다.

| # | 방법 | 내용 |
|---|---|---|
| A | **정적 import graph 도달성 분석** | 전용 도구를 작성해 `@/` alias · 상대경로 · 동적 `import()` · `import.meta.glob` 을 모두 해석하고, `src/main.tsx` 를 진입점으로 하는 도달 집합을 계산 |
| B | **빌드 산출물 문자열 검사** | 실제 vite 빌드 결과 `dist/assets/*.js` 에서 프레임워크 고유 식별자를 grep (A 와 독립적인 확인) |
| C | **저장소 전체 raw-source 검사** | `git grep` 으로 exact path literal · import 문 · package.json script · workspace dependency · 문서 참조를 확인 |

도구 A 는 신뢰성 확인을 위해 `ForumListPage.tsx` · `DashboardPage.tsx` 의 실제 import 줄과 대조해
결과가 일치함을 확인한 뒤 사용했다.

---

## 3. 측정값 — runtime 도달성

`src/main.tsx` 에서 정적으로 도달하는 파일은 **27개**이며, 그중 NextGen 축은 **0개**다.

```
App.tsx
components/common/{EmptyState,Loading,OrganizationUI,PageHeader,Pagination,Toast,index}
context/{AuthContext,OrganizationContext,index}
index.css
layouts/MainLayout.tsx
main.tsx
pages/auth/LoginPage.tsx
pages/dashboard/DashboardPage.tsx
pages/forum/{ForumDetailPage,ForumListPage}
pages/lms/{CourseDetailPage,LessonPage,MyCoursesPage}
pages/seller/dashboard/{SellerDashboard,index,sellerDashboard.api,sellerDashboard.types,useSellerDashboard}
router/index.tsx
```

실제 라우팅은 `src/router/index.tsx` 의 **명시적 Route 표**다.
`views/*.json` 으로부터 route 를 만드는 `view/route-generator.ts` 는 `view/loader.ts` 를 통해서만
쓰이는데, **`view/loader.ts` 를 import 하는 코드가 저장소 전체에 0개**다.
즉 32개 View JSON 은 어떤 URL 에도 연결되지 않는다.

### 도메인 폐포 (closure)

NextGen 축을 진입점으로 잡고 폐포를 계산하면 **192개 파일**이 나온다.
**live 27개와의 교집합은 0** — 프레임워크 전체를 제거해도 살아 있는 파일을 단 하나도 건드리지 않는다.

| 그룹 | 파일 수 |
|---|---:|
| `components/blocks/` | 60 |
| `components/ui/` | 40 |
| `views/*.json` | 32 |
| `shortcodes/_functions/` | 21 |
| `generator/` | 9 |
| `view/` | 7 |
| `ai/` | 6 |
| `layouts/` (`MainLayout` 제외) | 6 |
| `lib/cms/` | 4 |
| `components/registry/` | 3 |
| `lib/analytics/` | 3 |
| `components/ViewRenderer.tsx` | 1 |

> 사용자 WO 는 "JSON view 31개" 로 적었으나 **실측은 32개**다.
> 33번째였던 `views/appstore.json` 은 선행 WO(`…APPSTORE-PARALLEL-AXIS…`, commit `b5db69810`)에서 이미 제거됐다.

### 방향성 확인 — 왜 blocks/ui/layouts/lib 까지 같은 축인가

지목된 7개 축 **바깥**에서 7개 축 **안쪽**을 가리키는 의존은 딱 3개뿐이고, 전부 type-only 다.

```
layouts/DefaultLayout.tsx : import type { ViewSchema } from '@/view/types'
lib/cms/adapter.ts        : import type { ViewSchema, ViewComponentSchema } from '@/view/types'
lib/cms/loader.ts         : import type { ViewSchema } from '@/view/types'
```

나머지 간선은 모두 **안쪽 → 바깥쪽** 이다.
`ViewRenderer.tsx` 가 `blocks/BlockRegistry` · `blocks/BlockRenderer` · `blocks/CMSBlockWrapper` 를 직접 import 하고,
`components/registry/ui.tsx` 가 `components/ui/**` 40개를 전부 import 한다.
즉 `blocks/` · `ui/` · `layouts/` · `lib/cms` · `lib/analytics` 는 **별개 축이 아니라 이 프레임워크의 렌더링 계층**이다.
7개 축만 지우면 이 3개 파일이 컴파일 불가가 되고, 그 연쇄로 결국 같은 폐포에 도달한다.

---

## 4. 측정값 — 빌드 산출물 (독립 확인)

제거 **이전** 상태에서 빌드한 `dist/assets/*.js` 를 grep 한 결과:

| 검색어 | 히트 |
|---|---:|
| `ViewRenderer` | 0 |
| `FunctionRegistry` | 0 |
| `UIComponentRegistry` | 0 |
| `generateRoutes` | 0 |
| `viewGenerator` | 0 |
| `analyzeIntent` | 0 |
| `adminSellerList` | 0 |
| `productList` | 0 |
| `DashboardLayout` | 0 |

프레임워크는 **배포 산출물에 단 한 번도 나타난 적이 없다.**

**결정적 사후 검증:** 197개 파일을 제거한 뒤 다시 빌드했더니
vite module count 가 **제거 전과 완전히 동일한 2036** 이었다.
번들 그래프의 변화량이 0 이라는 것은 이 파일들이 애초에 그래프에 없었다는 직접 증거다.

---

## 5. 측정값 — tooling 축과 닫힌 dead loop

`generator/` 와 `ai/` 는 런타임 코드가 아니라 CLI 다. 진입점은 `apps/main-site/package.json` 의 4개 스크립트뿐이었다.

```
"generate:view": "tsx src/generator/cli.ts"
"generate:ai":   "tsx src/ai/cli/generateFromAI.ts"
"list:views":    "tsx src/generator/cli.ts list"
"delete:view":   "tsx src/generator/cli.ts delete"
```

이 CLI 들이 만드는 산출물은 `views/*.json` 인데, **그 JSON 을 렌더링하는 코드가 없다.**
생성기 → 산출물 → (소비처 없음) 으로 닫힌 dead loop 이므로 도구 축도 함께 은퇴한다.

---

## 6. 측정값 — 외부·계약 소비

| 확인 항목 | 결과 |
|---|---|
| workspace dependency | `apps/main-site` 를 의존성으로 선언한 package **0개**. 루트 `package.json` 의 `build:main-site` 스크립트만 존재 |
| 다른 app 의 import | 0 |
| `apps/admin-dashboard/src/pages/preview/ViewPreview.tsx` | `// Import Main Site's ViewRenderer logic` **주석만** 남아 있고, 자체 `ViewSchema` interface 를 로컬 정의해 쓴다. main-site import 0 → **별개 축, 미변경** |
| `apps/api-server` CMS `isCompatibleWithViewRenderer()` | server 측 CMS 엔티티의 별개 개념 → **미변경** |
| `packages/@o4o-apps/signage/ui/SignagePlayer.tsx` | placeholder 주석만 (`<ViewRenderer …>` 은 주석 안) → **미변경** |
| Cloud Run 서비스 / deploy workflow | 없음 (선행 WO 에서 이미 폐기 확인) |
| 외부·파트너 계약 | main-site 는 브라우저 앱이며 공개 API 계약을 제공하지 않는다. 배포 대상도 아니므로 외부 계약 가능성 0 |
| 문서 참조 | 4건 — 전부 `docs/checks/` · `docs/archive/` 기록물. CLAUDE.md §16-1 에 따라 **손대지 않는다** |

## 7. 측정값 — 변경 정지

| 대상 | 마지막 커밋 |
|---|---|
| `src/view/` | 2025-12-04 |
| `src/components/ViewRenderer.tsx` | 2025-12-04 |
| `src/lib/cms/` · `src/lib/analytics/` | 2025-12-08 |
| `src/generator/` · `src/ai/` · `src/components/blocks/` | 2026-08-07 (`chore: reduce lint policy baseline` — 기계적) |
| `src/views/` · `src/shortcodes/` · `src/components/registry/` · `src/components/ui/` | 2026-08-26 (`b5db69810` — 선행 App Store 은퇴 WO) |

**마지막 기능 커밋은 2025-12-08**, 이후 약 8.5개월간 기능 변경 0이다.

---

## 8. 판정

| 후보 | 판정 근거 |
|---|---|
| `ACTIVE_FRAMEWORK` | ❌ runtime 도달 0, 번들 부재 |
| `PARTIAL_ACTIVE` | ❌ live 27개와의 교집합이 0. 부분적으로도 살아 있지 않다 |
| `HISTORICAL_SHELL` | ❌ shell 로 유지할 소비처·계약이 없다 (앞선 WO 의 main-site 라우팅 shell 과 달리 이 축은 진입점 자체가 없다) |
| `UNKNOWN` | ❌ 세 가지 독립 방법이 모두 같은 결론 |
| **`RETIRE_CONFIRMED`** | ✅ **확정** |

---

## 9. 실행한 변경

**삭제 197개** (도메인 폐포 192 + README 3 + 고아 barrel 2):

| 그룹 | 파일 수 | 비고 |
|---|---:|---|
| `src/components/ui/` | 42 | 폐포 40 + 고아 barrel `cms/index.ts` · `forum/index.ts` (삭제 대상만 re-export) |
| `src/components/blocks/` | 60 | 디렉터리 전체 |
| `src/views/*.json` | 32 | 디렉터리 전체 |
| `src/shortcodes/` | 21 | 디렉터리 전체 |
| `src/generator/` | 10 | 폐포 9 + `README.md` |
| `src/ai/` | 7 | 폐포 6 + `README.md` |
| `src/view/` | 7 | 디렉터리 전체 |
| `src/layouts/` | 6 | `MainLayout.tsx` · `index.ts` **유지** |
| `src/lib/cms/` | 5 | 폐포 4 + `README.md` |
| `src/lib/analytics/` | 3 | 디렉터리 전체 |
| `src/components/registry/` | 3 | 디렉터리 전체 |
| `src/components/ViewRenderer.tsx` | 1 | |

**수정 3개:**

- `apps/main-site/package.json` — 삭제된 CLI 를 가리키던 `generate:view` · `generate:ai` · `list:views` · `delete:view` 4개 스크립트 제거. `dev` · `build` · `preview` · `typecheck` 는 유지 (CI 검증 대상). **dependency · lockfile 변경 0**
- `apps/main-site/README.md` — 문서 전체가 삭제된 프레임워크 설명이었으므로 은퇴 근거 문서로 재작성
- `apps/api-server/src/__tests__/main-site-nextgen-viewrenderer-retirement.spec.ts` — **신규** 재등록 방지 계약 (40 tests)
- `apps/api-server/src/__tests__/main-site-appstore-parallel-axis-retirement.spec.ts` — 선행 WO guard 의 registry 단언 3건을 "존재한다" → "존재하지 않는다" 로 반전 (§10-1)

`src/` 잔여 파일 102개 (진입점 27개 + 별도 축 고아 75개 · §11 참조).

---

## 10. 검증

| 항목 | 결과 |
|---|---|
| `apps/main-site` `tsc --noEmit` | **PASS** (error 0) |
| `bash scripts/ci-build-app.sh main-site` | **PASS** — 2036 modules, 제거 전과 동일 |
| 신규 guard spec | **PASS** — 1 suite / **40 tests** |
| api-server 전체 jest | **PASS** — 아래 §10-1 |
| CI AppStore Guard | **PASS** |
| 보호 범위 회귀 | `APPS_CATALOG` · `/api/v1/admin/apps` · `/api/v1/apps/availability` 단언 모두 PASS |

### 10-1. 전체 테스트

**최종: `Test Suites: 203 passed, 203 total` / `Tests: 3409 passed, 3409 total`** — 실패 0.

중간에 발견해 처리한 실패 1건을 기록한다(숨기지 않는다).

선행 WO 의 guard spec `main-site-appstore-parallel-axis-retirement.spec.ts` 가
`components/registry/function.ts` · `ui.tsx` 에 대해 **"파일이 존재하고 appstore import 가 없다"** 를
단언하고 있었다. 이번 WO 가 `components/registry/` 디렉터리 자체를 제거하면서 3개 테스트가 깨졌다.

→ **"파일 자체가 없다" 로 단언을 뒤집었다.** 더 강한 상태이므로 선행 WO 가 지키려던 계약
(App Store 항목이 registry 를 통해 되살아나지 않는다)은 그대로 유지된다. 뒤집은 이유는
해당 spec 안에 주석으로 남겼다.

또한 첫 전체 실행에서 `encryption-key-rotation-runner.spec.ts` 가 함께 실패했으나,
이는 다른 세션의 미커밋 WIP 가 작업 트리에 들어와 있던 시점의 결과이며
재실행 시 정상 통과했다. **이번 WO 의 변경과 무관하다.**

---

## 11. 범위 밖 발견 — 별도 WO 제안

이번 WO 의 폐포에도 live 집합에도 속하지 **않는** 파일이 `apps/main-site/src` 에 **75개** 남아 있다.
NextGen 축과 무관한 **별개의 dead 축**이므로 이번 범위에서 제외했다.

| 그룹 | 파일 수 |
|---|---:|
| `hooks/queries/` (admin · commerce · customer) | 17 |
| `components/forum/` (ai · notifications · recommendations) | 12 |
| `design/components/` | 10 |
| `components/yaksa/` | 7 |
| `pages/yaksa/` | 7 |
| `design/tokens/` | 6 |
| `design/utils/` | 3 |
| 기타 단독 파일 (`lib/api` · `lib/yaksa` · `hooks/useForumAI` 등) | 13 |

→ **제안**: `WO-O4O-MAIN-SITE-RESIDUAL-ORPHAN-AXIS-CENSUS-V1` (yaksa · design system · forum AI · query hooks 축)

추가 잔여:

- `apps/main-site/package.json` 의 `tsx` devDependency 는 방금 제거한 4개 CLI 스크립트 전용이었다.
  dependency · lockfile 변경은 CLAUDE.md 중지 조건이므로 **손대지 않았다.** 별도 승인 대상.

---

## 12. 후속 작업 (사용자 지정)

NextGen 축까지 제거된 지금 `apps/main-site` 는 배포 대상이 아니면서
`ci-pipeline.yml` 의 `matrix.app: [main-site, admin-dashboard]` 와
루트 `build:main-site` · `build:apps` · `build:apps:all` · `build:web` 에는 남아 있다.
**CI build matrix · root build script 유지 여부 판단**이 다음 작업이다.

---

## 13. 보호 범위 (이번 WO 에서 변경 0)

- `apps/api-server/src/app-manifests/appsCatalog.ts` 의 `APPS_CATALOG`
- `packages/**/manifest.ts`
- `app_registry` 테이블
- `/api/v1/admin/apps` · `/api/v1/apps/availability`
- `AppManager`
- `apps/main-site/src/router/index.tsx` 및 그 7개 라우트, `layouts/MainLayout.tsx`
- `apps/admin-dashboard/src/pages/preview/ViewPreview.tsx`
- api-server CMS 의 `isCompatibleWithViewRenderer()`
