# CHECK-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1

> **작업명:** WO-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1
> **유형:** KPA `/lms` 강의 목록을 자체 raw `<table>` → 공통 `LmsHubTemplate`(shared-space-ui)로 수렴 (frontend-only)
> **결과: PASS** — KPA `LmsCoursesPage`(512줄 bespoke table) → `LmsHubTemplate` thin wrapper(~230줄). 3서비스(KPA/GP/KCos) `/lms` 목록 hub 가 단일 테이블 템플릿으로 정렬. KPA 고유(강사 CTA/동적 수강 CTA/강사 본인 수정·종료/공개·회원제 배지)는 config 로 주입. LmsHubTemplate 은 **backward-compatible optional 확장**(visibility 필드+렌더, renderCta)만 추가 → GP/KCos 무영향. kpa/KCos typecheck 0, GP 는 본 변경 무관 2건(타 세션 forum)만. shared-space-ui→lms-ui import 0(Neture guard 유지).
> **선행:** `IR-O4O-LMS-COURSE-HUB-CARD-ALIGNMENT-V1` · `WO-O4O-LMS-KPA-STORE-LIBRARY-TAKEAWAY-REMOVAL-V1`(`fda5c7030`) · KPA/GP/KCos fuller adoption
> **작성일:** 2026-06-13 · 기준 HEAD `798e01f19`

---

## 1. 작업 목적

KPA `/lms`(자체 raw `<table>` `LmsCoursesPage`)를 GP/KCos 처럼 `LmsHubTemplate` 기반으로 수렴해 3서비스 목록 hub 축을 단일 shared template 로 통일. store library takeaway 제거(`fda5c7030`)로 KPA 전용 복잡도가 사라져 수렴이 가능해짐.

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/shared-space-ui/src/LmsHubTemplate.tsx` | **backward-compatible 확장**: `LmsHubCourse` 에 optional `visibility`/`requiresApproval`/`isPaid`; `LmsHubConfig` 에 optional `renderCta`; 유형 컬럼 visibility-aware(미지정 시 category fallback); actions 컬럼 renderCta-aware; visibility 배지 스타일 |
| `services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx` | 자체 raw `<table>` 전체 제거 → `<LmsHubTemplate config={config} />` wrapper. config(useMemo)에 fetch adapter·headerAction·renderCta·renderRowActions·visibility 매핑 |
| `docs/checks/CHECK-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1.md` | 본 문서 |

**무변경:** backend, DB/migration, GP/KCos 서비스 파일, Neture, `@o4o/lms-ui`, package.json/pnpm-lock, Dockerfile. *(tree 의 footerLegal/pharmacyProducts/neture Footer/shared-space-ui index.ts 변경은 타 세션 작업 — 미접촉·미스테이징.)*

## 3. KPA 기존 raw table 구조 (제거 전)

PageHeader(breadcrumb) + InstructorHeaderAction + 검색 form + raw `<table>`(강의명/강사/유형/강의수/상태/액션 컬럼, 직접 styles) + Pagination. 유형=공개/회원제+승인필요+유료 배지, 액션=동적 수강 CTA + 강사 본인 RowActionMenu. (takeaway 는 직전 WO 에서 제거됨.)

## 4. LmsHubTemplate 적용 결과 / shared-space-ui 확장

LmsHubTemplate(BaseTable container) 에 **optional·backward-compatible** 확장만 추가(GP/KCos 미설정 → 기존 동작 유지):
- `LmsHubCourse.visibility?/requiresApproval?/isPaid?` — **지정 시** 유형 컬럼이 공개/회원제(+승인필요/유료) 배지 렌더. **미지정 시 category 배지**(GP/KCos 현행 유지).
- `LmsHubConfig.renderCta?(course)` — **지정 시** 기본 "수강하기" 대신 사용. **미지정 시 기본 수강하기**(GP/KCos 현행 유지).
- 기존 `headerAction`·`renderRowActions` config 활용(템플릿 변경 없음).

## 5. KPA wrapper / config 구조

`useMemo<LmsHubConfig>([isAuthenticated, isInstructor, qualStatus, userId, navigate])`:
- `serviceKey: 'kpa-society'`, hero, `courseDetailPath: id => /lms/course/${id}`.
- `headerAction`: 로그인 시 `<InstructorHeaderAction>`(강사 등록/신청 CTA, qualStatus 기반).
- `fetchCourses`: `lmsApi.getCourses({status:'published',...})` → `mapCourse` → `LmsHubCourse`(visibility/requiresApproval/isPaid/lessonCount/instructor/tags 포함).
- `renderCta`: 공개=바로 보기 / 로그인=수강하기 / 비로그인 회원제=로그인 후 수강(+state).
- `renderRowActions(course, reload)`: `isOwnCourse`(isInstructor && course.instructorId===userId)면 RowActionMenu(수정→edit route / 강의 종료→`lmsInstructorApi.deleteCourse` + reload).

> **무한 리로드 가드:** `LmsHubTemplate.loadCourses` 는 `useCallback([config,...])` → config 가 매 렌더 새 객체면 effect 가 매 렌더 재실행되어 무한 fetch. 따라서 KPA config 를 **useMemo 로 안정화**(deps 변경 시에만 재생성).

## 6. 강사 본인 RowActionMenu 유지 결과

수정/강의 종료 action 의미·API(`lmsInstructorApi.deleteCourse`)·소유 판정(`isInstructor && course.instructorId===userId`) 그대로 — `renderRowActions` 로 이전. wrapper closure 로 user/navigate 캡처. (store library takeaway 아님 — 유지 대상.)

## 7. visibility / status 표시 결과

- visibility(공개/회원제)+승인필요+유료 배지: `LmsHubCourse.visibility` 매핑 + 템플릿 유형 컬럼 visibility-aware 렌더로 **유지**(KPA 회귀 없음).
- status: 템플릿 상태 컬럼(published→공개 등) 사용.
- KCos visibility 노출 약함은 별도(`IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1`) — KCos 는 visibility 미매핑이라 category fallback(현행).

## 8. 부분 수렴/트레이드오프 (정직 기록)

- **목록 description preview**: KPA 기존 table 은 제목 아래 description 미리보기 표시. LmsHubTemplate 제목 컬럼은 title+tags 만(description 미표시) → KPA 목록에서 description preview **미표시**(상세 페이지엔 영향 없음). GP/KCos 동작 보존 위해 템플릿에 description 렌더 추가 안 함. 경미한 표시 축소.
- **breadcrumb**: 기존 PageHeader breadcrumb([홈,강의]) → LmsHubTemplate hero 헤더(breadcrumb 없음, GP/KCos 동일). 경미.
- **신규 획득(템플릿 표준)**: 선택 체크박스 + bulk "복사"(course 상세 **URL 클립보드 복사**). 이는 GP/KCos 가 이미 가진 템플릿 표준 기능이며, 삭제된 **asset-snapshot 자료함 가져가기와 무관**(URL 복사일 뿐). 3서비스 일관성으로 수용.

## 9. 삭제된 takeaway 재도입 없음 / CourseCard 미적용

- grep: KPA LmsCoursesPage 에 `가져가기`/`자료함`/`assetSnapshot`/`selectedCourseIds`/`BulkResult`/`handleAddToLibrary` **0건**.
- `@o4o/lms-ui CourseCard/List` 미적용(본 WO 범위 외 — IR 판정 B). `shared-space-ui` 가 `@o4o/lms-ui` 를 import 하지 않음(grep 0) → **Neture transitive LMS 소비 위험 없음**.

## 10. GP/KCos 영향 / Neture 경계

- GP `EducationPage`·KCos `EducationPage` 미수정. LmsHubTemplate 확장은 전부 optional → GP/KCos 기존 config 로 동일 렌더. **KCos typecheck 0, GP 는 본 변경 무관(forum 타 세션 2건만)**.
- Neture 미수정, shared-space-ui→lms-ui 의존 미생성 → Neture LMS 제외 불변.

## 11. 검증 결과

- **TypeScript:** `web-kpa-society` **0**, `web-k-cosmetics` **0**, `web-glycopharm` 본 변경 관련 **0**(잔존 2건 = `src/pages/forum/ForumPage.tsx`, 타 세션 forum WIP — 미접촉). shared-space-ui 는 source-direct(소비처 컴파일로 검증).
- **grep:** KPA `LmsHubTemplate` 소비 확인. takeaway/`assetSnapshot`/select state 재도입 0. `shared-space-ui`→`@o4o/lms-ui` import 0.
- **무변경:** backend, GP/KCos 서비스, Neture, package.json/pnpm-lock/Dockerfile, `@o4o/lms-ui`.
- **정책:** 결제없음/rewardPolicy 게이팅/YouTube 없음/completion·progress·API 계약 불변. visibility·enrollment·강사 action 유지.
- **browser smoke:** 미수행 — 배포 후 KPA `/lms` 목록·검색·페이지네이션·visibility 배지·동적 CTA·강사 RowActionMenu·강의 상세 이동, GP/KCos `/lms` 무영향 확인 권장.

## 12. 남은 후속 작업

1. **`WO-O4O-LMS-HUBTEMPLATE-SERVICE-ACCENT-V1`** — LmsHubTemplate 하드코딩 색(`#2563eb` 등)을 service accent config 로(GP green/KCos pink/KPA blue 정렬).
2. **`IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1`** — KCos visibility 매핑/노출 보강(현재 category fallback).
3. **`WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1`** — `@o4o/lms-ui CourseCard/List` dormant 유지 vs card 맥락 specialize 결정.
4. *(선택)* LmsHubTemplate 제목 컬럼 description preview·breadcrumb 옵션화(§8 경미 축소 복원 필요 시).
5. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선.

## 13. 완료 판정

**PASS.** KPA `/lms` 가 자체 raw table → 공통 `LmsHubTemplate` wrapper 로 수렴 — **3서비스 목록 hub 단일 템플릿 정렬 완료**. LmsHubTemplate 은 optional·backward-compatible 확장(visibility·renderCta)만 받아 GP/KCos 무영향. KPA 고유 기능(강사 CTA·동적 수강 CTA·강사 본인 수정/종료·공개/회원제 배지) config 주입으로 보존, takeaway 재도입·CourseCard 혼입·shared-space-ui→lms-ui 의존 없음(Neture guard 유지). typecheck(kpa/KCos 0, GP 무관 2건). 경미 축소(목록 description preview/breadcrumd)는 §8 기록.
