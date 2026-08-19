# CHECK-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1

- **WO**: `WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1`
- **선행**: `WO-O4O-COMMUNITY-CROSSSERVICE-FEATURE-COVERAGE-AND-ADOPTION-PLAN-V1` (완료, `34ff7b05f`)
- **작업일**: 2026-08-19
- **범위**: (A) PharmacyHub Community Baseline adoption, (B) Cross-service My Posts adoption·정합
- **migration**: **0건** (schema 변경 없음)

---

## 1. 작업 전 재조사 (§3) — 과거 계획 숫자가 아니라 현재 코드 기준

### 1-1. PharmacyHub (작업 전)

| feature | current route | shared asset | backend support | required change |
|---|---|---|---|---|
| Community Home | 없음 | `StandardHomeTemplate` · `LatestActivitySection` 미사용 | forum 목록 O / `/home/latest` **없음** | 신규 wrapper + `/home/latest` 추가 |
| Latest Activity | 없음 | `LatestActivitySection` 미사용 | 없음 | backend 집계 route + Home 내 `latestSlot` |
| Community Search | 없음 | `ForumListTemplate` 미사용 | forum `search` 파라미터 **이미 있음** | frontend wrapper 만 |
| Education Hub | 없음 | `LmsHubTemplate` 미사용 | `lms_courses.service_key` 지원 O | wrapper + LMS client 배선 |
| Course List | 없음 (Hub 내 목록) | `LmsHubTemplate` 내장 목록 | O | Hub 와 동일 wrapper |
| Course Detail | 없음 | `CourseDetailView` 미사용 | O | wrapper + `LmsLearnerPort` adapter |
| Lesson | 없음 | `LessonPlayerView` 미사용 | O | wrapper + adapter |
| My Posts | 없음 | 없음 (공통 View 자체가 부재) | forum 목록에 author 필터 **없음** | 공통 View 신설 + `author=me` contract |

### 1-2. Cross-service My Posts (작업 전)

| service | 기존 My Posts 화면 | forum list 함수 | 상세 route | 필요 변경 |
|---|---|---|---|---|
| KPA-Society | **없음** (`WorkCommunityPage` 는 mock 데이터, My Posts 아님) | `forumApi.getPosts(params)` (`/kpa/forum`) | `/forum/post/:id` | `author` 파라미터 + wrapper |
| K-Cosmetics | **없음** (`MyForumDashboardPage` = "내 포럼" 소유 대시보드, 별개 축) | `fetchForumPosts` (`/cosmetics/forum`) | `/forum/post/:postId` | `fetchMyForumPosts` + wrapper |
| GlycoPharm | **없음** | `fetchForumPosts` (`/glycopharm/forum`) | `/forum/posts/:id` | `fetchMyForumPosts` + wrapper |
| Neture | **없음** | `fetchForumPosts` (`/neture/forum`, mock fallback 있음) | `/forum/post/:slug` (**slug 기반**) | `fetchMyForumPosts`(mock fallback 없음) + wrapper |
| PharmacyHub | **없음** | `fetchPharmacyHubForumPosts` | `/forum/posts/:postId` | `author` 파라미터 + wrapper |

> **census 결론**: 5서비스 어디에도 기존 My Posts 화면이 없다. 따라서 이번 작업은
> `VIEW_DUPLICATED` 제거가 아니라 **처음부터 공통 View 로 신설**하는 adoption 이다.

---

## 2. A축 — PharmacyHub Community Baseline

| 축 | 결과 | route | 재사용 자산 | 신규 wrapper |
|---|---|---|---|---|
| Community Home | ADOPTED_THIS_WO | `/community` | `StandardHomeTemplate`, `LatestActivitySection` | `pages/community/CommunityHomePage.tsx` |
| Latest Activity | ADOPTED_THIS_WO | `/community` 내 `latestSlot` | `LatestActivitySection` (+`buildLatestActivityTabs` 축) | `api/home.ts` |
| Community Search | ADOPTED_THIS_WO | `/community/search` | `ForumListTemplate` + 기존 `search` 파라미터 | `pages/community/CommunitySearchPage.tsx` |
| Education Hub | ADOPTED_THIS_WO | `/education` | `LmsHubTemplate` | `pages/education/EducationPage.tsx` |
| Course List | ADOPTED_THIS_WO | `/education` (Hub 내장 목록) | `LmsHubTemplate` · `CourseCard` | 동일 |
| Course Detail | ADOPTED_THIS_WO | `/education/course/:id` | `CourseDetailView` | `LmsCourseDetailPage.tsx` |
| Lesson | ADOPTED_THIS_WO | `/education/course/:courseId/lesson/:lessonId` | `LessonPlayerView` | `LmsLessonPage.tsx` |
| My Posts | ADOPTED_THIS_WO | `/forum/my-posts` | `MyForumPostsTemplate`(신설 공통 View) | `pages/forum/MyPostsPage.tsx` |
| Forum(기존) | ALREADY_ADOPTED | `/forum`, `/forum/posts/:postId` | — | — |
| Content | **NOT_IN_SCOPE** (§19) | 없음 | — | — |
| Resources | **NOT_IN_SCOPE** (§19) | 없음 | — | — |
| Enrollment / Progress | **NOT_IN_SCOPE** (§8·§19) | — | `enrollmentEnabled: false` 로 CTA 비노출 | — |
| Certificate / Instructor / Quiz | **NOT_IN_SCOPE** (§8·§19) | — | `certificatesPath: null` | — |

- **serviceKey**: `pharmacy-hub` 로 통일. LMS client(`createLmsLearnerClient(..., { serviceKey: 'pharmacy-hub' })`), `/home/latest` 의 `f.service_code = $1` · `c.service_key = $1` 모두 동일 상수 사용.
- **Content·Resources 링크 0개** (§13): navigation·Home 진입 카드·검색 어디에도 만들지 않았다. "준비 중" dead route 없음.
- **§8 정책 무변경**: 공통 LMS 정책을 바꾸지 않고 `LmsViewConfig.enrollmentEnabled?: boolean` (additive, 기본 동작 불변) 만 추가해 PH 에서 `false` 로 주입했다. 다른 4서비스는 값을 주지 않으므로 기존 동작 그대로다.

---

## 3. B축 — Cross-service My Posts

### 3-1. backend 공통 query contract (§10)

`ForumPostController.listPosts` 단일 지점에 `author=me` 를 추가했다. 4개 서비스 forum mount 가
같은 controller 를 공유하므로 **서비스별 endpoint·query 이름을 새로 만들지 않았다.**

- `author=me` + 미인증 → `401 AUTH_REQUIRED` (빈 목록 위장 금지)
- `status` 미지정 + `author=me` → 본인 글은 `draft`/`pending` 등 비공개 상태도 노출
- 어떤 경우에도 `post.authorId = :myAuthorId` 를 `andWhere` 로 항상 적용
- 서비스 경계는 기존 `forumContextMiddleware` → `applyServiceScope` 가 그대로 담당(신규 로직 0)

### 3-2. 5서비스 matrix

| service | 결과 | route | fetch | 상세 이동 | nav 진입 |
|---|---|---|---|---|---|
| PharmacyHub | ADOPTED_THIS_WO | `/forum/my-posts` | `fetchPharmacyHubForumPosts({author:'me'})` | `/forum/posts/:id` | 커뮤니티 메뉴 + Home 카드 |
| K-Cosmetics | ADOPTED_THIS_WO | `/forum/my-posts` | `fetchMyForumPosts` | `/forum/post/:id` | 포럼 허브 infoLinks |
| GlycoPharm | ADOPTED_THIS_WO | `/forum/my-posts` | `fetchMyForumPosts` | `/forum/posts/:id` | 포럼 허브 infoLinks |
| KPA-Society | ADOPTED_THIS_WO | `/forum/my-posts` | `forumApi.getPosts({author:'me'})` | `/forum/post/:id` | 포럼 홈 infoLinks |
| Neture | ADOPTED_THIS_WO | `/forum/my-posts` | `fetchMyForumPosts` | `/forum/post/:slug` | 포럼 허브 infoLinks (`/forum` 허브에서만) |

- 화면은 5서비스 모두 **공통 `MyForumPostsTemplate`** 하나다. wrapper 는 fetch / route / config 만 담당한다 (§11).
- `VIEW_DUPLICATED` 없음 — 목록 table JSX 는 `ForumListTemplate` 재사용, 작성자 컬럼은 `showAuthor={false}`.
- KPA `/forum/my-posts` 는 `/forum/:slug` catch-all 보다 **앞에** 등록했다(라우트 가림 방지).
- Neture wrapper 는 기존 `fetchForumPosts` 의 mock fallback 경로를 쓰지 않는다 — 실패는 throw 하여 error 상태로 표시한다.

---

## 4. Neture Latest Activity 판정 (§18) — **NOT_ADOPTED**

| §18 조건 | 판정 |
|---|---|
| backend 변경 불필요 또는 아주 작음 | ❌ `/neture/home/latest` 집계 endpoint 자체가 없다 (cosmetics·glycopharm·kpa 에만 존재). 신규 route 신설이 필요하다. |
| service-specific 분기 대량 불필요 | △ |
| 기존 UX 손실 없음 | ❌ Neture 의 forum 최신글은 공지 그리드 **우측 컬럼 slot** 으로 들어가 있다. 공통 `LatestActivitySection` 은 탭형 전체폭 블록이라 홈 레이아웃 재구성이 필요하고 현재 배치가 사라진다. |

→ 두 조건이 불충족이므로 **억지로 채택하지 않고 근거만 기록**한다(§18 지시 그대로). 별도 WO 대상.

---

## 5. 변경 파일

### backend
- `apps/api-server/src/controllers/forum/ForumPostController.ts` — `author=me` 공통 contract
- `apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts` — `GET /pharmacy-hub/home/latest` (forum·course 2축, serviceKey 격리, 실패 시 500)

### 공통 패키지
- `packages/shared-space-ui/src/community/MyForumPostsTemplate.tsx` (신규 공통 View)
- `packages/shared-space-ui/src/index.ts` — export 추가
- `packages/shared-space-ui/src/ForumListTemplate.tsx` — additive `showAuthor?`
- `packages/shared-space-ui/src/forumListItem.ts` — additive `statusLabel?`
- `packages/lms-ui/src/views/contracts.ts` — additive `enrollmentEnabled?`
- `packages/lms-ui/src/views/{CourseDetailView,LessonPlayerView}.tsx` — `enrollmentEnabled` 게이트

### services
- PharmacyHub: `api/lms.ts`, `api/home.ts`, `pages/education/{lmsViewAdapter.ts,EducationPage.tsx,LmsCourseDetailPage.tsx,LmsLessonPage.tsx}`, `pages/community/{CommunityHomePage.tsx,CommunitySearchPage.tsx}`, `pages/forum/MyPostsPage.tsx`, `services/forumApi.ts`, `App.tsx`, `config/navigation.ts`, `package.json`, `Dockerfile`
- K-Cosmetics / GlycoPharm / Neture: `services/forumApi.ts`(+`fetchMyForumPosts`), `pages/forum/MyPostsPage.tsx`, `App.tsx`, `pages/forum/ForumHubPage.tsx`
- KPA-Society: `api/forum.ts`(+`author`), `pages/forum/MyPostsPage.tsx`, `App.tsx`, `pages/forum/ForumHomePage.tsx`
- `pnpm-lock.yaml` — PharmacyHub importer 에 `@o4o/lms-client`·`@o4o/lms-ui` 6줄

---

## 6. 검증 (§16)

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | PASS (0) |
| api-server jest 전체 | **161 suites / 2487 tests PASS** |
| 신규 spec `community-crossservice-my-posts-contract.spec.ts` | 6 tests PASS |
| 신규 spec `pharmacy-hub-community-baseline.spec.ts` | 5 tests PASS |
| `@o4o/shared-space-ui` typecheck | PASS (0) |
| `@o4o/lms-ui` typecheck | PASS (0) |
| 5서비스 build (`tsc && vite build`) | 전부 PASS (exit 0) |
| **migration** | **0건** |

---

## 7. Production browser smoke (§17)

> 배포 후 기록.

---

## 8. 남은 MUST_ADOPT (§25)

- **PharmacyHub Content** — 별도 Bundle B
- **PharmacyHub Resources** — 별도 Bundle B
- **Neture Latest Activity 공통화** — §18 조건 불충족으로 이번 WO 에서 제외(위 §4 근거)

→ **"커뮤니티 전체 완료" 가 아니다.**

---

## 9. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
