# CHECK-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1

- **WO**: `WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1`
- **작성일**: 2026-08-14
- **브랜치**: `work/commonization-community` (기준 commit `625638d61`)
- **대상 서비스**: KPA-Society / K-Cosmetics / GlycoPharm
- **대상 축**: LMS **강의 상세 + 레슨 플레이어** (View 까지 공통화)
- **판정**: **PASS** — VD 6셀 전부 `VIEW_DUPLICATED → FULLY_COMMON`

---

## 1. 재실측 (census 수치 재사용 금지)

census 수치를 근거로 쓰지 않고 3서비스 코드를 직접 정독해 아래를 재측정했다.

| 항목 | KPA-Society | K-Cosmetics | GlycoPharm |
|---|---|---|---|
| 강의 상세 route | `/lms/course/:id` | `/lms/course/:id` | `/lms/course/:id` (+ `/lms/:id` legacy redirect) |
| 강의 상세 page | `pages/lms/LmsCourseDetailPage.tsx` (622L) | `pages/lms/LmsCourseDetailPage.tsx` (314L) | `pages/education/CourseDetailPage.tsx` (731L) |
| 레슨 플레이어 route | `/lms/course/:courseId/lesson/:lessonId` | 동일 | 동일 |
| 레슨 플레이어 page | `pages/lms/LmsLessonPage.tsx` (1,219L) | `pages/lms/LmsLessonPage.tsx` (841L) | `pages/education/LmsLessonPage.tsx` (761L) |
| course/lesson API client | `api/lms.ts` → `@o4o/lms-client` `createLmsLearnerClient` | 동일 | 동일 |
| loading / error / empty | 자체 구현 | 자체 구현 | 자체 구현(스켈레톤) |
| 진도 표시 | `CourseProgressBar`(공통 presentational) | 동일 | 동일 |
| 이전/다음 레슨 | 자체 구현 | 자체 구현 | 자체 구현 |
| 콘텐츠 타입 렌더 | video/article/quiz/assignment + AI | 동일 | video/article + quiz (assignment/AI 는 플레이어에만) |
| 수강 권한 | members-only + 로그인 리다이렉트(state.from) | members-only | 비로그인 → LoginModal |
| 완료 처리 | `updateProgress(+metrics)` | `updateProgress` (metrics 없음) | `updateProgress` (metrics 없음) |
| 서비스별 CTA/문구/theme | "안내 흐름/단계" 어휘 · KPA blue | 기본 어휘 · pink `#db2777` | 기본 어휘 · green `#16a34a` |
| shared package 소비 | `CourseProgressBar` / `LessonList` 만 (= CORE_ONLY) | 동일 | `CourseProgressBar` 만 |

### 실제 업무 차이 vs 순수 View 중복

- **순수 View 중복(제거 대상)**: 레이아웃·카드·배지·커리큘럼 목록·진도 카드·퀴즈 패널·과제 패널·AI 패널·이전/다음 내비·완료 모달·loading/error/empty. 3서비스가 문구/색만 다른 동일 JSX.
- **실제 차이(보존 대상)**: 어휘(KPA), accent, 수료증 표면(KPA=별도 화면 `/mypage/certificates` · GP=상세 사이드바 PDF 다운로드 · KCos=미제공), 비로그인 처리(KPA=로그인 페이지 + `state.from` · GP=LoginModal · KCos=로그인 페이지), 감사 포인트 패널 theme/에러 파싱 패턴(KPA `err.message` vs GP/KCos `err.response.data.error`), GP 만 인라인 플레이어를 상세에 갖고 있던 IA 차이.
- **결함으로 판정한 차이**: KCos·GP `updateProgress` 가 완료 메트릭을 보내지 않아 백엔드 완료 규칙(`WO-O4O-LMS-LESSON-TYPE-COMPLETION-RULES-V1`)에 거부될 수 있었다 → 공통화 과정에서 인자 추가로 정합.

## 2. Backend 공통 여부 재검증 (WO §1 전제 검증)

`apps/api-server` 라우트/컨트롤러를 직접 확인했다. **census 판정(백엔드 이미 공통)은 대체로 맞다.**

- 학습자 course/lesson/enrollment/progress/quiz/assignment 는 동일 컨트롤러가 `/api/v1/lms` 에 마운트되고, KPA 는 같은 라우터를 `/api/v1/kpa/lms` 로 remount 한다. 서비스별 별도 LMS 백엔드는 없다.
- **차이 2건 (이번 WO 에서 수정하지 않음 — §6 backend 변경 금지)**
  1. `GET /courses/:courseId/lessons` 가 공통 마운트에서는 `requireAuth + requireEnrollment()`, KPA remount 에서는 `optionalAuth` 다.
  2. **KPA remount 에는 quiz/assignment 라우트가 없다.** KPA 에서 퀴즈/과제/AI 호출은 404 가 된다(기존부터 존재하던 갭, 이번 변경으로 생긴 것이 아니다).
- 위 2건은 §11 중지 조건(데이터 모델 재설계/권한 모델 변경)에 해당하지 않아 **잔존 위험으로 기록**한다.

## 3. 추출한 공통 View (`@o4o/lms-ui`)

| 파일 | 라인 | 역할 |
|---|---:|---|
| `src/views/contracts.ts` | 287 | `LmsLearnerPort`(주입 IO) · 도메인 view model · `LmsViewLabels`/`createLmsLabels` · `LmsViewConfig` · 에러 판별 헬퍼 |
| `src/views/primitives.tsx` | 139 | `LmsCard` / `LmsLoading` / `LmsEmptyState` / `NavLink`(좌클릭 → 주입 navigate) / 공통 style |
| `src/views/CourseDetailView.tsx` | 562 | 강의 상세 전체 (배지·커리큘럼·수강 상태 분기·수료증 CTA·slot 3종) |
| `src/views/LessonPlayerView.tsx` | 956 | 레슨 플레이어 전체 (본문·퀴즈·과제·AI·완료 메트릭·이전/다음·완료 모달) |
| `src/components/LessonList.tsx` | (수정) | `variant: light \| dark` 팔레트 + row 앵커 좌클릭을 SPA 이동으로 가로채기 |

불변식: **API client / fetch / axios 직접 사용 0 · react-router 의존 0 · `serviceKey`/route 하드코딩 0 · `serviceType` switch 0.** 모든 IO 는 주입된 `LmsLearnerPort`, 모든 이동은 주입된 `navigate` 로만 수행한다.

## 4. adapter / config / slot (서비스별 유지)

| 서비스 | adapter | accent | 어휘 | 수료증 | 비로그인 | slot |
|---|---|---|---|---|---|---|
| KPA | `pages/lms/lmsViewAdapter.ts` (226L) | `colors.primary` | 안내 흐름 / 단계 | `/mypage/certificates` | `/login` + `state.from` | AppreciationPanel(blue) |
| KCos | `pages/lms/lmsViewAdapter.ts` (197L) | `#db2777` | 기본(강의/레슨) | 미제공 → 안내 toast | `/login` | AppreciationPanel(pink) |
| GP | `pages/education/lmsViewAdapter.ts` (199L) | `#16a34a` | 기본 + "수강신청" | 사이드바 PDF 다운로드 카드 `CourseCertificateCard.tsx` (89L) | LoginModal | AppreciationPanel(emerald) + `renderSidebarExtra` |

기능 유무는 **주입된 optional port 메서드 존재 여부**로 표현한다(`getQuizForLesson`/`submitQuiz` 없으면 퀴즈 UI 미렌더). 서비스 분기문 없음.

## 5. 중복 LOC 변경 전/후

| 구분 | 변경 전 | 변경 후 |
|---|---:|---:|
| 서비스 페이지 6개 합계 | **4,488 L** | **387 L** (81+51+79+51+79+46) |
| 서비스 adapter/전용 컴포넌트 | 0 | 711 L (226+197+199+89) |
| 공통 View (`@o4o/lms-ui/src/views`) | 0 | 1,944 L |
| **서비스별 중복 화면 코드** | 4,488 L × (3서비스 중복) | **0 L** — 동일 JSX 복제 제거 |
| 남은 duplicated page/component | 6 | **0** |
| 공통 View 소비 서비스 수 | 0 | **3** |

## 6. census 6셀 전/후 판정

| # | 셀 | 전 | 후 |
|---|---|---|---|
| 1 | KPA 강의 상세 | VIEW_DUPLICATED (CORE_ONLY 소비) | **FULLY_COMMON** |
| 2 | KPA 레슨 플레이어 | VIEW_DUPLICATED | **FULLY_COMMON** |
| 3 | KCos 강의 상세 | VIEW_DUPLICATED | **FULLY_COMMON** |
| 4 | KCos 레슨 플레이어 | VIEW_DUPLICATED | **FULLY_COMMON** |
| 5 | GP 강의 상세 | VIEW_DUPLICATED | **FULLY_COMMON** |
| 6 | GP 레슨 플레이어 | VIEW_DUPLICATED | **FULLY_COMMON** |

`CORE_ONLY` 로 종료한 셀은 없다.

## 7. 검증

| 항목 | 결과 |
|---|---|
| `@o4o/lms-ui` typecheck (`tsc --noEmit`) | PASS |
| KPA typecheck | PASS |
| K-Cosmetics typecheck | PASS |
| GlycoPharm typecheck | PASS |
| KPA build (`vite build`) | PASS |
| K-Cosmetics build | PASS |
| GlycoPharm build | PASS |
| api-server jest (`npx jest`) | PASS — 118 suites / 1,937 tests, 실패 0 |
| LMS 전용 자동화 테스트 | **저장소에 존재하지 않음** (LMS 대상 `*.test.ts` 0건) — 미실측 항목으로 기록 |

`@o4o/lms-ui` 는 source-only 패키지(빌드 산출 없음)로 소비 서비스 build 가 곧 패키지 build 검증이다.

### 미실측 항목 (정직 기록)

- 3서비스 **실브라우저 smoke** 는 이번 WO 에서 수행하지 않았다(정적 검증 + build 까지). 배포 후 육안 검증 필요.
- LMS 회귀 테스트 스위트가 저장소에 없어 "LMS regression tests PASS" 는 **테스트 부재**로 대체 기록한다.

## 8. 잔존 duplication / 잔존 위험

1. **KPA remount 에 quiz/assignment 라우트 없음** → KPA 퀴즈·과제·AI 는 404. 공통 View 는 port 메서드가 있으면 UI 를 렌더하므로, KPA 에서 퀴즈 레슨이 있으면 조회 실패 경로를 탄다. (기존 동작과 동일. backend WO 필요.)
2. **lessons 라우트 가드 불일치** (`requireEnrollment` vs `optionalAuth`) — 미수강 상태의 커리큘럼 노출 범위가 서비스마다 다르다. backend WO 필요.
3. GP 상세의 **인라인 레슨 재생**을 제거하고 canonical 레슨 route 이동으로 정렬했다 — GP 사용자 동선이 KPA/KCos 와 같아지는 의도된 변화이나, GP 기존 사용자에게는 UX 변화다.
4. 강의 **목록/허브** 화면은 이번 축 범위 밖이며 여전히 서비스별 구현이다.

## 9. Backend 변경 여부

**없음.** `apps/api-server` 무수정 · DB migration 0 · enrollment/progress/권한 모델 변경 0.
프론트 `api/lms.ts` 의 `updateProgress` 시그니처에 기존 백엔드가 이미 받는 `metrics` 인자를 전달하도록 넓힌 것이 유일한 계약 정합(추가 인자, 하위 호환).

---

> 본 WO 완료는 **LMS 강의 상세·레슨 플레이어 축** 완료일 뿐, 커뮤니티 전체 공통화 완료를 의미하지 않는다.
