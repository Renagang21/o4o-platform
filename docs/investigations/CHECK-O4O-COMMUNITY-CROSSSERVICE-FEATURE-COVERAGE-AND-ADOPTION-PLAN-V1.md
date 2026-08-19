# CHECK-O4O-COMMUNITY-CROSSSERVICE-FEATURE-COVERAGE-AND-ADOPTION-PLAN-V1

- **WO**: `WO-O4O-COMMUNITY-CROSSSERVICE-FEATURE-COVERAGE-AND-ADOPTION-PLAN-V1`
- **성격**: 조사·계획 전용 (코드 구현 없음 — route/UI/backend/DB 변경 0)
- **기준 commit**: `ba7d9557f` (main)
- **작성일**: 2026-08-19
- **선행**: [CHECK-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1](CHECK-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1.md) (code census 6종 판정)

> 본 문서는 **code census(있다/없다)** 가 아니라 **제품 판정(있어야 한다/없어도 된다)** 이다.
> 선행 census 의 `NOT_IMPLEMENTED` 를 정상으로 인정하지 않고 서비스 사용자·업무 기준으로 다시 판정했다.

---

## 1. 현재 공통 자산 inventory

### 1-1. Forum

| 자산 | path | 역할 | 채택 서비스 | 추가 adoption 가능 | config 필요 |
|---|---|---|---|---|---|
| `ForumHubTemplate` | `packages/shared-space-ui/src/ForumHubTemplate.tsx` | 포럼 허브(카테고리+최신글) | KPA·KCos·GP·PH·NET (5/5) | — | `ForumHubConfig` |
| `ForumListTemplate` | `packages/shared-space-ui/src/ForumListTemplate.tsx` | 글 목록 | KCos·GP·PH·NET (4/5, KPA 는 자체 목록) | KPA | theme |
| `ForumWriteForm` | `packages/shared-space-ui/src/ForumWriteForm.tsx` | 작성/수정 폼 | 5/5 | — | `renderExtra` |
| `ForumPostContent` / `ForumPostHeader` | `packages/shared-space-ui/src/` | 상세 본문·헤더 | 5/5 | — | — |
| `ForumCommentList` / `ForumCommentForm` | `packages/shared-space-ui/src/` | 댓글 | 5/5 | — | — |
| `ForumLikeButton` | `packages/shared-space-ui/src/` | 좋아요 | 5/5 | — | — |
| `ForumListToolbar` / `ForumListInfoBar` | `packages/shared-space-ui/src/` | 목록 검색·정렬 툴바 | KPA·NET | **PH**(검색 UI 없음) | — |
| `ForumRequestForm` | `packages/shared-space-ui/src/` | 게시판 개설 요청 | KPA·KCos·GP·NET | PH | theme |
| `forum-owner/*` | `packages/shared-space-ui/src/forum-owner/` | 소유자 콘솔·멤버 관리 | KPA·KCos·GP | NET·PH | — |
| backend `createServiceForumRouter` | `apps/api-server/src/routes/forum/service-forum.routes.ts` | 서비스 스코프 forum API 일괄 mount | KCos·NET·PH (KPA·GP 는 동일 계약 자체 remount) | — | `ForumContext` + `writeGuards` |

### 1-2. LMS / 교육

| 자산 | path | 역할 | 채택 서비스 | 추가 adoption 가능 | config |
|---|---|---|---|---|---|
| `LmsHubTemplate` | `packages/shared-space-ui/src/LmsHubTemplate.tsx` | 교육 허브 | KPA·KCos·GP | **PH·NET** | `LmsHubConfig` (fetch 주입) |
| `CourseListView` | `packages/lms-ui/src/views/CourseListView.tsx` | 강의 목록 | KPA | KCos·GP·**PH·NET** | filter option |
| `CourseDetailView` | `packages/lms-ui/src/views/CourseDetailView.tsx` | 강의 상세 | KPA·KCos·GP | **PH·NET** | slot |
| `LessonPlayerView` | `packages/lms-ui/src/views/LessonPlayerView.tsx` | 레슨 재생 | KPA·KCos·GP | **PH·NET** | — |
| `CourseCard` / `CourseList` / `LessonList` | `packages/lms-ui/src/components/` | 부품 | KPA | 전 서비스 | — |
| `EnrollmentButton` / `CourseProgressBar` / `CourseVisibilityBadge` | `packages/lms-ui/src/components/` | 수강·진도 부품 | **소비 0** | 전 서비스 | — |
| `createLmsLearnerClient` | `packages/lms-client/src/index.ts` | 학습자 API 클라이언트 | KPA·KCos·GP | PH·NET | `LmsClientOptions` |
| backend LMS 모듈 | `apps/api-server/src/modules/lms/` | Course·Lesson·Enrollment·Progress·Certificate·Completion·Instructor·Quiz·Assignment 전 계층 | 전 서비스 공용 | — | — |
| **LMS service scope** | `apps/api-server/src/modules/lms/utils/lms-service-scope.ts` | `serviceKey` 경계 (SSOT=`resolveCanonicalServiceKey`) | KPA(prefix) · KCos·GP(query) | **PH·NET 이미 허용 목록에 포함** | `serviceKey` 파라미터만 |

> **핵심**: `courses.serviceKey` 컬럼과 `LMS_SCOPED_SERVICE_KEYS` 에 `pharmacy-hub` · `neture` 가 **이미 들어 있다.**
> PH/NET 교육 도입은 **schema 변경 없이** 프론트 배선 + `serviceKey` 전달만으로 가능하다.

### 1-3. Content / Resources

| 자산 | path | 역할 | 채택 서비스 | 추가 adoption 가능 | config |
|---|---|---|---|---|---|
| `CommunityContentListTemplate` / `CommunityContentListView` | `packages/shared-space-ui/src/community/CommunityContentListView.tsx` | 콘텐츠 목록 | KCos·GP | KPA·**PH**·NET | adapter |
| `CommunityContentDetailTemplate` | `packages/shared-space-ui/src/community/` | 콘텐츠 상세 | KCos·GP | KPA·**PH**·NET | adapter |
| `CommunityContentWriteShell` | `packages/shared-space-ui/src/community/` | 콘텐츠 작성 | KPA·KCos·GP | **PH**·NET | adapter |
| `CommunityContentSearchBar` | `packages/shared-space-ui/src/community/` | 콘텐츠 검색 | KPA | KCos·GP·PH·NET | — |
| `standardContentAdapters` | `packages/shared-space-ui/src/community/` | 서비스별 API 어댑터 | KPA·KCos·GP | PH·NET | 서비스별 1개 |
| `ContentHubTemplate` | `packages/shared-space-ui/src/ContentHubTemplate.tsx` | 콘텐츠 허브 | KPA·KCos·GP·NET | **PH** | config |
| `ResourcesHubTemplate` | `packages/shared-space-ui/src/ResourcesHubTemplate.tsx` | 자료실 허브 | KPA·KCos·GP·NET | **PH** | `ResourcesHubConfig` |
| backend **content-resource Core** | `apps/api-server/src/routes/common/content-resource/content-resource-core.ts` | 콘텐츠·자료실 CRUD 공통 Core (config 주입) | KPA(`kpa_contents`) · KCos(`cosmetics_contents`) · GP(`glycopharm_contents`) | **PH·NET (원장 테이블 신설 필요)** | `ContentResourceConfig` |

> **경계 주의**: 이 Core 의 서비스 격리는 **물리 테이블 분리 그 자체**다 (`service_key`/`organization_id` 컬럼 없음).
> 따라서 PH/NET 도입은 config 만으로 끝나지 않고 **원장 테이블 1개 신설**이 전제다 (→ §10 `PRODUCT_BUILD`).

### 1-4. Community Home / 활동

| 자산 | path | 역할 | 채택 서비스 | 추가 adoption 가능 |
|---|---|---|---|---|
| `StandardHomeTemplate` | `packages/shared-space-ui/src/StandardHomeTemplate.tsx` | 커뮤니티 홈 골격 | KPA(`CommunityHomePage`) · KCos(`HomePage`) · GP(`CommunityMainPage`) · NET(`CommunityPage`) | **PH** (자체 HomePage, 공통 부품 0) |
| `LatestActivitySection` | `packages/shared-space-ui/src/` | 최신 활동 피드 | KPA·KCos·GP | **NET**(동등 기능 자체 구현) · **PH** |
| `AppEntrySection` / `CtaGuidanceSection` / `O4OHelpSection` / `NewsNoticesSection` | `packages/shared-space-ui/src/` | 홈 섹션 부품 | KPA·KCos·GP·NET | PH |
| `HubPagination` / `GuideBlock` / `AppreciationPanel` | `packages/shared-space-ui/src/` | 공통 보조 | 4~5 서비스 | — |

### 1-5. My / Membership / Access

| 자산 | path | 역할 | 채택 서비스 | 비고 |
|---|---|---|---|---|
| mypage 골격(`navItems.ts` + `MyPageHub`) | 각 서비스 `src/pages/mypage/` | 마이페이지 허브 | KPA·KCos·GP·NET | 동일 패턴, 공통 package 아님 |
| forum membership API | `service-forum.routes.ts` (`join-requests`·`members`) | 폐쇄형 포럼 가입·승인 | 5/5 (backend) | 프론트는 KPA·KCos·GP 만 |
| service membership gate | `requireActiveServiceMembership` 등 | 서비스 접근 게이트 | 5/5 | PH `membershipGate.ts` |
| **내 글 / 내 댓글** | — | — | **0/5** | backend `listPosts` 에 author 필터 파라미터 없음 |

---

## 2. 기능 coverage matrix (24 축 × 5 서비스 = 120 cell)

표기: `●` 있음 / `◐` 부분(자체 구현·공통 부품 미채택) / `○` 없음

| # | 기능축 | KPA | KCos | GP | PH | NET |
|---|---|:--:|:--:|:--:|:--:|:--:|
| A | Forum (허브·목록·상세) | ● | ● | ● | ● | ● |
| B | Forum Interaction (댓글·좋아요·고정) | ● | ● | ● | ● | ● |
| C | 게시판 개설 요청 | ● | ● | ● | ○ | ● |
| D | Closed Community (가입·멤버 관리) | ● | ● | ● | ○ | ○ |
| E | Community Home | ● | ● | ● | ○ | ● |
| F | Latest Activity | ● | ● | ● | ○ | ◐ |
| G | Content (전문·회원 콘텐츠) | ● | ● | ● | ○ | ◐(CMS 읽기전용) |
| H | Resources / 자료실 | ● | ● | ● | ○ | ● |
| I | Education Hub | ● | ● | ● | ○ | ○ |
| J | Course List | ● | ● | ● | ○ | ○ |
| K | Course Detail | ● | ● | ● | ○ | ○ |
| L | Lesson | ● | ● | ● | ○ | ○ |
| M | Enrollment | ● | ● | ● | ○ | ○ |
| N | Progress | ● | ● | ● | ○ | ○ |
| O | Certificate | ● | ● | ● | ○ | ○ |
| P | Instructor | ● | ◐ | ◐ | ○ | ○ |
| Q | Quiz / Assignment | ◐(backend only) | ◐ | ◐ | ○ | ○ |
| R | My Posts | ○ | ○ | ○ | ○ | ○ |
| S | My Comments | ○ | ○ | ○ | ○ | ○ |
| T | My Activity 대시보드 | ● | ◐ | ◐ | ○ | ◐ |
| U | Membership / Access | ● | ● | ● | ● | ● |
| V | Community Search | ● | ● | ● | ○ | ● |
| W | Operator/Owner 인접 커뮤니티 기능 | ● | ● | ● | ◐ | ◐ |
| X | 서비스 고유 커뮤니티 확장 | ● | ● | ● | ● | ● |

---

## 3. 제품 판정 (4종)

MUST = `MUST_ADOPT` · N/A = `NOT_APPLICABLE` · SS = `SERVICE_SPECIFIC`

| # | 기능축 | KPA | KCos | GP | PH | NET |
|---|---|:--:|:--:|:--:|:--:|:--:|
| A | Forum | MUST | MUST | MUST | MUST | MUST |
| B | Forum Interaction | MUST | MUST | MUST | MUST | MUST |
| C | 게시판 개설 요청 | MUST | MUST | MUST | OPTIONAL | MUST |
| D | Closed Community | MUST | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL |
| E | Community Home | MUST | MUST | MUST | **MUST** | MUST |
| F | Latest Activity | MUST | MUST | MUST | **MUST** | MUST |
| G | Content | MUST | MUST | MUST | **MUST** | MUST |
| H | Resources | MUST | MUST | MUST | **MUST** | MUST |
| I | Education Hub | MUST | MUST | MUST | **MUST** | OPTIONAL |
| J | Course List | MUST | MUST | MUST | **MUST** | OPTIONAL |
| K | Course Detail | MUST | MUST | MUST | **MUST** | OPTIONAL |
| L | Lesson | MUST | MUST | MUST | **MUST** | OPTIONAL |
| M | Enrollment | MUST | MUST | MUST | OPTIONAL | OPTIONAL |
| N | Progress | MUST | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL |
| O | Certificate | MUST | OPTIONAL | OPTIONAL | N/A | N/A |
| P | Instructor | MUST | OPTIONAL | OPTIONAL | N/A | N/A |
| Q | Quiz / Assignment | OPTIONAL | OPTIONAL | OPTIONAL | N/A | N/A |
| R | My Posts | **MUST** | **MUST** | **MUST** | **MUST** | **MUST** |
| S | My Comments | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL |
| T | My Activity | MUST | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL |
| U | Membership / Access | MUST | MUST | MUST | MUST | MUST |
| V | Community Search | MUST | MUST | MUST | **MUST** | MUST |
| W | Operator/Owner 인접 | SS | SS | SS | SS | SS |
| X | 서비스 고유 확장 | SS | SS | SS | SS | SS |

(굵게 = 현재 없음 · 실제 기능 공백)

집계

```
MUST_ADOPT      : 73
OPTIONAL        : 31
NOT_APPLICABLE  :  6
SERVICE_SPECIFIC: 10
미판정          :  0   (합계 120)
```

서비스별

| 서비스 | MUST_ADOPT | OPTIONAL | NOT_APPLICABLE | SERVICE_SPECIFIC |
|---|--:|--:|--:|--:|
| KPA-Society | 20 | 2 | 0 | 2 |
| K-Cosmetics | 15 | 7 | 0 | 2 |
| GlycoPharm | 15 | 7 | 0 | 2 |
| PharmacyHub | 13 | 6 | 3 | 2 |
| Neture | 10 | 9 | 3 | 2 |

**MUST_ADOPT 중 미충족 = 14건** (§12).

---

## 4. 콘텐츠 상세 판정

질문: ① 읽을 전문 콘텐츠가 필요한가 ② 운영자/전문가 게시 콘텐츠가 필요한가 ③ forum 과 별도 영역이 필요한가

| 서비스 | ① | ② | ③ | 판정 | 근거 |
|---|:--:|:--:|:--:|---|---|
| KPA | Y | Y | Y | MUST (충족) | 약사 대상 전문 콘텐츠·공지가 forum 토론과 분리돼야 함 |
| KCos | Y | Y | Y | MUST (충족) | `cosmetics_contents` 회원 작성형 + 운영자 발행 |
| GP | Y | Y | Y | MUST (충족) | `glycopharm_contents` 동일 |
| **PH** | Y | Y | Y | **MUST (미충족)** | 약국 대상 운영 공지·제품/업무 전문 콘텐츠는 B2B 허브의 기본 소통 수단. 현재 `/store-owner/content` 는 **매장 실행 자산**(Store Menu Canonical Tree 축)이며 커뮤니티 콘텐츠가 아니다 |
| NET | Y | Y | Y | MUST (충족, 읽기전용) | `/content` = CMS 발행 콘텐츠 읽기. 공급자·파트너 작성형까지는 OPTIONAL |

> PH 판정 시 "약국 서비스니까 콘텐츠 불필요" 로 자동 판정하지 않았다. PH 사용자는 매장 경영자·공급자·운영자이며,
> 현재 공지·안내가 **forum 글로만** 전달된다 — 상시 참조 콘텐츠 축이 비어 있다.

---

## 5. 자료실 상세 판정

| 필요 자료 | KPA | KCos | GP | PH | NET |
|---|:--:|:--:|:--:|:--:|:--:|
| 문서 / PDF | Y | Y | Y | **Y** | Y |
| 교육자료 | Y | Y | Y | **Y** | 조건부 |
| 상품자료 | 조건부 | Y | Y | **Y** | Y |
| 업무자료 | Y | Y | Y | **Y** | Y |
| 다운로드 파일 | Y | Y | Y | **Y** | Y |
| **판정** | MUST(충족) | MUST(충족) | MUST(충족) | **MUST(미충족)** | MUST(충족) |

PH 는 공급자가 제공하는 제품 자료·약국 업무 자료를 매장이 내려받는 흐름이 사업 구조상 필수다.
현재 `/store-owner/library` 는 **매장 제작물(production material)** 축이며 커뮤니티 자료실과 목적이 다르다.

---

## 6. LMS / 교육 단계별 판정

| 단계 | KPA | KCos | GP | PH | NET |
|---|:--:|:--:|:--:|:--:|:--:|
| Education Hub | MUST | MUST | MUST | **MUST** | OPTIONAL |
| Course List | MUST | MUST | MUST | **MUST** | OPTIONAL |
| Course Detail | MUST | MUST | MUST | **MUST** | OPTIONAL |
| Lesson | MUST | MUST | MUST | **MUST** | OPTIONAL |
| Enrollment | MUST | MUST | MUST | OPTIONAL | OPTIONAL |
| Progress | MUST | OPTIONAL | OPTIONAL | OPTIONAL | OPTIONAL |
| Certificate | MUST | OPTIONAL | OPTIONAL | **N/A** | **N/A** |
| Instructor | MUST | OPTIONAL | OPTIONAL | N/A | N/A |
| Quiz / Assignment | OPTIONAL | OPTIONAL | OPTIONAL | N/A | N/A |

근거

- **KPA**: 연수교육 성격 — 학점·수료증·강사까지 전 단계 필수.
- **KCos / GP**: 제품·질환 교육. 시청 자체가 가치이며 수료증은 마케팅 옵션.
- **PH**: 약국 대상 **제품·업무 교육은 필요**하지만 자격 발급 주체가 아니므로 **수료증·강사·퀴즈는 N/A**. 시청 이력(enrollment/progress)은 공급자 리포팅이 필요할 때만 OPTIONAL.
- **NET**: 공급자/파트너 온보딩 교육은 현재 `/guide` 문서 체계로 대체 중 → **도입 여부는 제품 결정**(§15 D-3).

---

## 7. PharmacyHub 상세 adoption plan

| 항목 | 현재 상태 | 제품 판정 | 기존 공통 자산 | 도입 방식 | 난이도 |
|---|---|:--:|---|---|:--:|
| Forum | 있음(canonical write 패턴) | MUST | `ForumHubTemplate`·`createServiceForumRouter` | — | — |
| Forum Interaction | 있음 | MUST | `ForumCommentList`·`ForumLikeButton` | — | — |
| Community Home | **없음** (자체 HomePage) | MUST | `StandardHomeTemplate`+`AppEntrySection` | SIMPLE_ADOPTION | LOW |
| Latest Activity | **없음** | MUST | `LatestActivitySection` | SIMPLE_ADOPTION | LOW |
| Content | **없음** | MUST | content-resource Core + `CommunityContentListTemplate` | **PRODUCT_BUILD**(원장 신설) | MEDIUM |
| Resources | **없음** | MUST | `ResourcesHubTemplate` + 동일 원장 | **PRODUCT_BUILD**(Content 와 동일 테이블) | MEDIUM |
| Education Hub | **없음** | MUST | `LmsHubTemplate` | BACKEND_ADOPTION | MEDIUM |
| Course List | **없음** | MUST | `CourseListView` | BACKEND_ADOPTION | MEDIUM |
| Course Detail | **없음** | MUST | `CourseDetailView` | BACKEND_ADOPTION | MEDIUM |
| Lesson | **없음** | MUST | `LessonPlayerView` | BACKEND_ADOPTION | MEDIUM |
| Enrollment | 없음 | OPTIONAL | `EnrollmentButton`(소비 0) | BACKEND_ADOPTION | LOW |
| Progress | 없음 | OPTIONAL | `CourseProgressBar`(소비 0) | BACKEND_ADOPTION | LOW |
| Certificate | 없음 | **N/A** | — | — | — |
| My Activity | 없음 | OPTIONAL | mypage 패턴 | SIMPLE_ADOPTION | LOW |
| My Posts | **없음** | MUST | `ForumListTemplate` 재사용 | BACKEND_ADOPTION | LOW |
| Membership / Access | 있음 | MUST | `membershipGate` | — | — |
| Community Search | **없음** | MUST | `ForumListToolbar` + backend `search` 파라미터(이미 존재) | SIMPLE_ADOPTION | LOW |

**PH MUST_ADOPT 미충족 = 10건**: Community Home · Latest Activity · Content · Resources · Education Hub · Course List · Course Detail · Lesson · My Posts · Community Search

> PH 커뮤니티 축은 **forum 하나뿐**이다. 나머지 `/store-owner/*` 는 매장 실행 축이며 커뮤니티가 아니다.
> 즉 PH 의 공백은 "구현이 어려운 것" 이 아니라 "**공통 자산을 아직 배선하지 않은 것**" 이 대부분이다.

---

## 8. Neture 상세 adoption plan

| 항목 | 현재 상태 | 제품 판정 | 공통 자산 | 도입 방식 | 난이도 |
|---|---|:--:|---|---|:--:|
| Forum | 있음 | MUST | 공통 5부품 | — | — |
| Community Content | 있음(CMS 읽기전용 `/content`) | MUST | `ContentHubTemplate` | — | — |
| 회원/파트너 작성형 콘텐츠 | 없음 | OPTIONAL | `CommunityContentWriteShell` | PRODUCT_BUILD(원장 신설) | MEDIUM |
| Resources | 있음(`/resources`, `ResourcesHubTemplate`) | MUST | — | — | — |
| Partner Content | `/supplier/*`·`/partner/*` forum 분기 | SS | — | 유지 | — |
| Education / Supplier training | 없음 | OPTIONAL | LMS 전 부품 + `serviceKey='neture'` | BACKEND_ADOPTION | MEDIUM |
| My Activity | `/workspace/my-content`(자산 축) | OPTIONAL | — | 유지 | — |
| My Posts | **없음** | MUST | `ForumListTemplate` | BACKEND_ADOPTION | LOW |
| Latest Activity | 자체 구현 | MUST(충족) | `LatestActivitySection` 미채택 | SIMPLE_ADOPTION(권고) | LOW |
| Community Search | 있음 | MUST | — | — | — |

**NET MUST_ADOPT 미충족 = 1건**: My Posts (+권고 1건: `LatestActivitySection` 채택)

> community 축과 operator CMS / partner asset 축을 섞지 않았다.
> `/workspace/*`·`/supplier/*`·`/partner/*` 는 커뮤니티가 아니라 **업무 워크스페이스**이며 SERVICE_SPECIFIC 로 유지한다.

---

## 9. KPA / KCos / GP baseline 분석

| 관찰 | 내용 |
|---|---|
| 3서비스 공통 채택 패턴 | Forum 5부품 · `StandardHomeTemplate`+`LatestActivitySection` · content-resource Core(원장만 다름) · `LmsHubTemplate`+`CourseDetailView`+`LessonPlayerView` · mypage(`navItems`+`MyPageHub`) |
| KCos ↔ GP 사실상 동형 | 라우트·페이지 구성이 거의 1:1 (`forum/*`, `content/*`, `library/*`, `lms/*`, `mypage/*`) → **이 둘의 교집합이 곧 실효 baseline** |
| KPA 고유(복제 금지) | 연수교육 학점(`/mypage/credits`)·자격(`/mypage/qualifications`)·연차보고·분회 축 — 약사회 법정 업무 |
| KPA 가 baseline 인 부분 | Forum 소유자 콘솔·폐쇄형 포럼·콘텐츠 검색(`CommunityContentSearchBar` 유일 소비) |
| 3서비스 공통 결손 | **My Posts / My Comments 가 3서비스 모두 없음** → 서비스 문제가 아니라 **플랫폼 공통 결손** |

→ PH·NET adoption 기준은 **KCos ∩ GP** 로 잡고, KPA 고유 축은 이식하지 않는다.

---

## 10. Community Baseline (5서비스 공통 최소선)

```
Community Baseline
- Community Home
- Latest Activity
- Forum (허브 · 목록 · 상세)
- Forum Interaction (댓글 · 좋아요)
- Content
- Resources
- My Posts
- Membership / Access
- Community Search
```

9개 축. 현재 충족: KPA 8/9 · KCos 8/9 · GP 8/9 · NET 8/9 · **PH 3/9**.

---

## 11. Optional Extensions

```
Education Extension            (Education Hub · Course List · Course Detail · Lesson)
  └ Learning Record Extension    (Enrollment · Progress)
  └ Professional Education Ext   (Certificate · Instructor · Quiz/Assignment)  ← KPA 필수, 그 외 옵션/불필요
Closed Community Extension     (게시판 개설 요청 · 가입 승인 · 멤버 관리)
Partner/Supplier Content Ext   (Neture 공급자·파트너 전용 콘텐츠 축)
My Activity Extension          (My Comments · 활동 대시보드)
```

---

## 12. MUST_ADOPT 미충족 전체 목록 (14건)

| # | 서비스 | 기능 | 도입 방식 | 난이도 | schema |
|---|---|---|---|:--:|:--:|
| 1 | PH | Community Home | SIMPLE_ADOPTION | LOW | 없음 |
| 2 | PH | Latest Activity | SIMPLE_ADOPTION | LOW | 없음 |
| 3 | PH | Community Search | SIMPLE_ADOPTION | LOW | 없음 |
| 4 | PH | Content | PRODUCT_BUILD | MEDIUM | **신규 원장 1** |
| 5 | PH | Resources | PRODUCT_BUILD | MEDIUM | (4와 동일 원장) |
| 6 | PH | Education Hub | BACKEND_ADOPTION | MEDIUM | 없음 |
| 7 | PH | Course List | BACKEND_ADOPTION | MEDIUM | 없음 |
| 8 | PH | Course Detail | BACKEND_ADOPTION | MEDIUM | 없음 |
| 9 | PH | Lesson | BACKEND_ADOPTION | MEDIUM | 없음 |
| 10 | PH | My Posts | BACKEND_ADOPTION | LOW | 없음 |
| 11 | NET | My Posts | BACKEND_ADOPTION | LOW | 없음 |
| 12 | KPA | My Posts | BACKEND_ADOPTION | LOW | 없음 |
| 13 | KCos | My Posts | BACKEND_ADOPTION | LOW | 없음 |
| 14 | GP | My Posts | BACKEND_ADOPTION | LOW | 없음 |

```
SIMPLE_ADOPTION  : 3
BACKEND_ADOPTION : 9
PRODUCT_BUILD    : 2
```

> My Posts 5건은 backend `listPosts` 에 **author 필터 파라미터 1개 추가**(schema 무변경) + 서비스별 화면 1개씩으로 끝난다.
> 5서비스를 각각 다른 WO 로 쪼개면 같은 설계를 5번 반복하게 된다 → 하나의 묶음으로 처리한다.

---

## 13. 구현 난이도 요약

| 난이도 | 건수 | 내용 |
|---|--:|---|
| LOW | 8 | PH Home/Latest Activity/Search, My Posts ×5 |
| MEDIUM | 6 | PH Content·Resources(원장 신설), PH Education 4축 |
| HIGH | 0 | — |

신규 사업정책·신규 workflow 가 필요한 항목은 **없다**. PH 원장 신설도 기존 Core config 형태의 복제다.

---

## 14. 다음 대형 WO Bundle 제안 (3개)

### Bundle A — PharmacyHub Community Baseline adoption
- 범위: PH Community Home · Latest Activity · Community Search
- 자산: `StandardHomeTemplate`·`AppEntrySection`·`LatestActivitySection`·`ForumListToolbar`
- 성격: SIMPLE_ADOPTION 3건 · schema 0 · backend 0
- 선행: 없음 (즉시 착수 가능)

### Bundle B — PharmacyHub Content + Resources
- 범위: PH 커뮤니티 콘텐츠·자료실 (원장 1개 + content-resource Core config + 목록/상세/작성 View)
- 성격: PRODUCT_BUILD 2건 · **migration 1건**
- 선행: §15 D-1 (게시 주체·작성 권한) 결정 필요

### Bundle C — Education adoption (PH) + My Posts (5서비스)
- 범위: ① PH Education Hub / Course List / Course Detail / Lesson (`serviceKey='pharmacy-hub'`) ② `listPosts` author 필터 + 5서비스 "내 글" 화면
- 성격: BACKEND_ADOPTION 9건 · schema 0
- 선행: ①은 §15 D-2 결정 필요, ②는 즉시 착수 가능

> Bundle 을 3개로 묶은 이유는 재사용 축이 같기 때문이다(A=홈/목록 부품, B=content-resource Core, C=LMS scope + forum 쿼리).
> 이보다 잘게 쪼개면 같은 설계를 반복하게 된다.

---

## 15. 사용자 결정이 필요한 항목

| # | 항목 | 선택지 | 영향 |
|---|---|---|---|
| D-1 | PH 커뮤니티 콘텐츠·자료실의 **게시 주체** | (a) 운영자/공급자 발행 전용 (b) 매장 회원 작성 허용 | Bundle B 권한 설계·원장 컬럼 |
| D-2 | PH 교육 도입 **단계 범위** | (a) Hub~Lesson 까지만 (b) + Enrollment/Progress | Bundle C 범위. 수료증·강사·퀴즈는 N/A 로 판정 |
| D-3 | Neture 공급자/파트너 **교육 도입 여부** | (a) `/guide` 문서 체계 유지 (b) LMS 도입 | Bundle C 확장 여부 |
| D-4 | **폐쇄형 커뮤니티** 확대 | PH·NET 에 공급자/약국 전용 게시판이 필요한가 | Closed Community Extension |
| D-5 | KCos · GP · PH 의 **게시판 0건** 상태 | 초기 게시판 세트를 누가 언제 개설하는가 | 코드 아님. 운영 데이터 결정 (선행 CHECK 관측) |
| D-6 | My Comments / 활동 대시보드 | 도입 여부 | My Activity Extension |

---

## 16. 이번 WO 범위 준수

| 항목 | 결과 |
|---|---|
| route 추가 | 0 |
| UI 추가 | 0 |
| backend 기능 추가 | 0 |
| DB 변경 | 0 |
| 산출물 | 본 CHECK 문서 1건 |
