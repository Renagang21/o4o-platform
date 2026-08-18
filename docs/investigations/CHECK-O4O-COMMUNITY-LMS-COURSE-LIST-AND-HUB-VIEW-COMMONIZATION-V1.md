# CHECK — LMS Course List / Hub View 공통화

- **WO**: `WO-O4O-COMMUNITY-LMS-COURSE-LIST-AND-HUB-VIEW-COMMONIZATION-V1`
- **일자**: 2026-08-18
- **시작 commit**: `408fe8e0c` (origin/main)
- **범위**: LMS 사용자 대면 **목록 / hub View** 축의 중복 제거 + 계약 정합
- **제외**: Course Detail · Lesson Player 재공통화, certificate/enrollment/backend, operator·instructor LMS, 신규 기능, DB migration

---

## 1. View census (미조사 0)

판정값은 `FULLY_COMMON / CORE_ONLY / VIEW_DUPLICATED / SERVICE_SPECIFIC / NOT_IMPLEMENTED / OUT_OF_SCOPE` 6종만 사용한다.

검색축: `/lms`, `/education`, `/courses`, `CourseList`, `CourseCard`, `CourseHub`, `EducationHub`, `LectureCard/Grid`, 검색·필터·정렬, featured/recent, category, enrollment/certificate badge, pagination/load more, empty/loading/error, App.tsx route table (7개 web 서비스 전수).

| # | 서비스 | route | page / component | 주요 자식 | API client·hook | shared View | 판정(작업 전) | 중복 상대 |
|---|--------|-------|------------------|-----------|-----------------|-------------|---------------|-----------|
| 1 | KPA-Society | `/lms` | `pages/lms/LmsCoursesPage.tsx` | `LmsHubTemplate` | `lmsApi.getCourses` | ✅ `@o4o/shared-space-ui` | FULLY_COMMON | — |
| 2 | K-Cosmetics | `/lms` | `pages/lms/EducationPage.tsx` | `LmsHubTemplate` | `lmsApi.getCourses` | ✅ | FULLY_COMMON | — |
| 3 | GlycoPharm | `/lms` | `pages/education/EducationPage.tsx` | `LmsHubTemplate` | `lmsApi.getCourses` | ✅ | FULLY_COMMON | — |
| 4 | 공통 | — | `packages/shared-space-ui/src/LmsHubTemplate.tsx` | 검색·필터·표·페이지네이션 | 주입(`fetchCourses`) | canonical | FULLY_COMMON | — |
| 5 | KPA-Society | `/courses` | `pages/courses/CourseHubPage.tsx` | 자체 카드 grid·검색 form·가격 chip·빈 상태·로그인 게이트 | `lmsApi.getCourses` | ❌ | **VIEW_DUPLICATED** | #4 / #8 |
| 6 | KPA-Society | `/instructors/:id` | `pages/instructors/InstructorProfilePage.tsx` 내 지역 `CourseCard` | 썸네일·무료/유료 배지·메타·footer | `instructorApi` | ❌ | **VIEW_DUPLICATED** | #8 |
| 7 | KPA-Society | — (dead) | `components/education/{LectureCard,LectureGrid,EducationTabs,EducationSidebar}.tsx` | 카드·grid·탭·사이드바 | 없음 | ❌ | **VIEW_DUPLICATED** (소비처 0) | #5 / #8 |
| 8 | 공통 | — | `packages/lms-ui/src/components/{CourseCard,CourseList}.tsx` | 카드 primitive | — | primitive만 존재, 소비 0 | **CORE_ONLY** | — |
| 9 | KPA-Society | `/services/lms` | `pages/services/LmsServicePage.tsx` | `InfoPageLayout` 정적 소개 | 없음 | — | SERVICE_SPECIFIC | — |
| 10 | KPA-Society | `/courses/:courseId` | `CourseIntroPage.tsx` | 상세 | `lmsApi` | — | OUT_OF_SCOPE (Detail 축) | — |
| 11 | KPA-Society | `/lms/certificate` | `LmsCertificatesPage.tsx` | 수료증 목록 | certificate API | — | OUT_OF_SCOPE (certificate) | — |
| 12 | GlycoPharm | `/lms` 하위 | `education/CourseCertificateCard.tsx` | 수료증 카드 | certificate API | — | OUT_OF_SCOPE (certificate) | — |
| 13 | KPA-Society | `/operator/lms` | `operator/OperatorLmsCoursesPage.tsx` | 운영자 목록 | operator API | — | OUT_OF_SCOPE (§16) | — |
| 14 | K-Cosmetics | `/operator/lms` | `operator/OperatorLmsCoursesPage.tsx` | 운영자 목록 | operator API | — | OUT_OF_SCOPE (§16) | — |
| 15 | GlycoPharm | `/operator/lms` | `operator/OperatorLmsCoursesPage.tsx` | 운영자 목록 | operator API | — | OUT_OF_SCOPE (§16) | — |
| 16 | Neture | — | LMS 사용자 대면 View 없음 (operator 메뉴 config 문자열만) | — | — | — | NOT_IMPLEMENTED | — |
| 17 | Pharmacy-Hub | — | LMS 사용자 대면 View 없음 (admin/operator 메뉴 config 문자열만) | — | — | — | NOT_IMPLEMENTED | — |
| 18 | KPA-Branch | — | LMS 참조 0건 | — | — | — | NOT_IMPLEMENTED | — |

**집계 (작업 전 판정 기준)**

```
조사 LMS list/hub View cell: 18
FULLY_COMMON: 4
CORE_ONLY: 1
VIEW_DUPLICATED: 3
SERVICE_SPECIFIC: 1
NOT_IMPLEMENTED: 3
OUT_OF_SCOPE: 6
미조사: 0
```

---

## 2. 구조 판정

세 서비스의 `/lms` 는 이미 `LmsHubTemplate` 단일 소비였다. WO 가 경고한 "알고 있던 3개 화면"은 **이미 공통**이었고, 실제 중복 모집단은 KPA 의 **카드형** 목록 3곳(#5·#6·#7)이었다.

- **표(table)형 hub** = `LmsHubTemplate` (`@o4o/shared-space-ui`) — canonical 유지. `@o4o/lms-ui` 로 이관하지 않는다(3서비스 동시 churn 대비 기능 이득 0).
- **카드(card)형 목록** = 신규 `CourseListView` (`@o4o/lms-ui`) — 기존 dormant `CourseCard` 를 재사용해 구성. §4 "기존 `@o4o/lms-ui` 를 먼저 재사용" 충족.
- 두 축의 경계를 `CourseListView` 헤더 주석에 명문화했다.

---

## 3. 전 / 후

| 항목 | 전 | 후 |
|---|---|---|
| 카드형 목록 구현 위치 | KPA 3곳(page 내 지역 JSX) | 공통 `CourseListView` + `CourseCard` 1곳 |
| `CourseHubPage.tsx` | 436 lines | **267 lines** (−169) |
| `InstructorProfilePage.tsx` | 377 lines | **297 lines** (−80) |
| dead `components/education/*` | 438 lines (4 파일) | **삭제** |
| 공통 View | `CourseDetailView`, `LessonPlayerView` | + **`CourseListView`** (279 lines) |
| `CourseCard` | dormant 120 lines | 활성 169 lines (`priceLabel` / `freeBadge` / `footerSlot` / 재생시간) |
| 목록 조회 실패 | `LmsHubTemplate` 이 빈 목록으로 삼킴 | 오류 상태 + `다시 시도` (O4O Load-Error 계약) |

**제거된 중복 lines**: 169 + 80 + 438 = **687** (신규 공통 View 279 lines 로 대체)

---

## 4. shared View 계약

`CourseListView` (presentational 전용 — fetch/axios/router/serviceKey 분기 0, 테스트로 고정)

- 데이터: `courses: CourseCardView[]`, `loading`, `error`, `onRetry`, `errorSlot`
- 이동: `hrefFor(course)`, `onCourseClick(course)` — router 를 import 하지 않고 서비스가 주입
- config/slot: `accent`, `headerSlot`, `search`, `filters`, `countSlot`, `emptyState`, `gateSlot`, `paginationSlot`, `renderCardBadge`, `renderCardFooter`, `priceLabelFor`, `freeBadge`
- 기존 공통 View(`CourseDetailView` / `LessonPlayerView`)와 동일한 `CourseCardView` 타입을 쓰며 **parallel contract 를 신설하지 않았다**.

서비스별 차이는 전부 config/slot 으로 흡수: KPA 가격 필터·비로그인 게이트·학점 배지·"수강중 / 자세히 보기" 문구·`/courses/:id` 상세 경로.

---

## 5. 검증

### 테스트 — `apps/api-server/src/__tests__/lms-course-list-hub-view-commonization.spec.ts` (23 tests, PASS)

- 공통 View 동작(`react-dom/server` 정적 렌더): loading / error(+재시도) / errorSlot / empty / populated(+href) / 검색 유무 / 필터 chip·선택상태 / accent config / priceLabel·freeBadge·footerSlot / **optional 미지정 시 정상** / gateSlot / paginationSlot
- 정적 계약: View 순수성(axios·fetch·react-router·serviceKey·서비스 분기 0), lms-ui export 계약, KPA wrapper 가 공통 View 만 소비·중복 JSX 0, 지역 `CourseCard` 제거, dead education 디렉터리 부재, 3서비스 `/lms` 의 `LmsHubTemplate` + serviceKey(`kpa-society` / `k-cosmetics` / `glycopharm`) + `/lms/course/` 상세경로 유지, `LmsHubTemplate` 실패 삼킴 0

> web 서비스·UI 패키지에 DOM test runner 가 없다. jsdom / @testing-library 도입은 dependency 변경(CLAUDE.md 중지 조건)이므로, 저장소 관례대로 api-server jest 에서 고정했다. ts-jest transform 에 `jsx: 'react-jsx'` 만 추가했다(의존성 변경 없음).

### typecheck / build

| 대상 | 결과 |
|---|---|
| `@o4o/lms-ui` type-check | PASS |
| `@o4o/web-kpa-society` build | PASS |
| `glycopharm-web` build | PASS |
| `@o4o/web-k-cosmetics` build | PASS |
| `@o4o/api-server` jest (해당 spec) | PASS 23/23 |

> `@o4o/shared-space-ui` 는 자체 type-check script 가 없어 3개 서비스 build 로 전이 검증했다.

---

## 6. 잔존

- `CORE_ONLY` 잔존: `packages/lms-ui/src/components/CourseList.tsx` (최소 shell, 소비 0 — 선행 WO 결정으로 삭제하지 않음)
- `VIEW_DUPLICATED` 잔존: **0**
- backend / DTO / migration 변경: **없음**

**변경한 census cell 수: 3** (#5 · #6 · #7 → 공통 View 수렴, #8 CORE_ONLY → 활성화)

---

## 7. Browser smoke (production, commit `c42f1d0dc` 배포 후)

| 대상 | 결과 |
|---|---|
| KPA `/lms` (desktop) | PASS — 표형 hub, 총 5개 강의, 실패응답 0 / JS 오류 0 / 가로 스크롤 0 |
| KPA `/lms` (mobile 390px) | PASS — 총 3개 강의(공개), 오류 0 / 가로 스크롤 0 |
| KPA `/courses` (desktop) | PASS — 공통 `CourseListView` 카드 목록, 무료 배지·"자세히 보기 →" footer 정상 |
| KPA `/courses` 검색 `약` | PASS — `?search=약&page=1`, 결과 0 → emptyState("검색 결과가 없습니다") |
| KPA `/courses` 필터 `무료` | PASS — `&price=free` URL 계약 유지 |
| KPA 카드 → 상세 → back | PASS — `/courses/{uuid}` 진입, back 시 목록·쿼리 복원 |
| KPA `/courses` (mobile 390px) | PASS — 비로그인 컨텍스트에서 `gateSlot`(로그인 안내) 정상, 가로 스크롤 0 |
| K-Cosmetics `/lms` (desktop / mobile) | PASS — 0-course empty("등록된 강의가 없습니다"), KPA 강의 혼입 0, 오류 0 |
| GlycoPharm `/lms` (desktop) | PASS — 총 0개 empty, cross-service 혼입 0, 오류 0 |
| KPA `/instructors/{userId}` | 렌더 PASS(예외 0) — 단, 프로덕션에 공개 강사 프로필이 없어(`/lms/instructors/:id/public-profile` 404) **카드 grid 실데이터 미검증**. 공통 `CourseCard` 렌더는 단위 테스트로 고정 |

**공통**: white screen 0 / JS exception 0 / **이번 변경으로 생긴 404·500 0** / 가로 스크롤 0.

### 범위 밖 선행 결함 (수정하지 않음 — 보고만)

1. `k-cosmetics.co.kr` **커스텀 도메인의 deep link 전부 404** (`/lms`, `/forum`, 임의 경로 동일 / `/` 만 200). SPA fallback 미설정으로 보이며 본 WO 변경과 무관하다(동일 빌드가 Cloud Run URL `k-cosmetics-web-…run.app/lms` 에서는 200 + 정상 empty). 별도 WO 권장.
2. KPA `/courses/{id}`(CourseIntroPage, Detail 축 = 본 WO 제외)에서 `⏱ NaN분` 표기와 `/kpa/lms/enrollments/me/course/:id` 404. 선행 상태이며 목록 축과 무관.

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§7 범위 밖 선행 결함)
