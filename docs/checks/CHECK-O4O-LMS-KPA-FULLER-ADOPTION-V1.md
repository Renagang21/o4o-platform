# CHECK-O4O-LMS-KPA-FULLER-ADOPTION-V1

> **작업명:** WO-O4O-LMS-KPA-FULLER-ADOPTION-V1
> **유형:** KPA-Society 사용자 LMS 화면의 `@o4o/lms-ui` 소비 확대 (reference impl, frontend-only)
> **결과: PASS** — KPA 가 `LessonList`(rowClickMode='row') + `CourseProgressBar` 추가 소비 시작. 레슨 사이드바(`LmsLessonPage`)와 강의 상세(`LmsCourseDetailPage`) 의 레슨 목록·진도 블록을 공통 컴포넌트로 수렴. accent `#2563EB`(KPA blue). 기존 기능·route·API·결제없음·reward 정책 유지. web-kpa-society typecheck 0. GP/KCos/Neture/backend/package.json/lock 무변경.
> **선행:** `WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`(`7020e2c4c`) · GP/KCos adoption · `CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1` · `WO-O4O-LMS-LESSONLIST-ROWCLICK-OPTION-V1`(`e042b4eb2`)
> **작성일:** 2026-06-13 · 기준 HEAD `ea1dbaa53`

---

## 1. 작업 목적

KPA(LMS 공통화 reference impl)에서 아직 미소비하던 `@o4o/lms-ui` 컴포넌트 활용을 확대한다. `WO-O4O-LMS-LESSONLIST-ROWCLICK-OPTION-V1` 로 `LessonList` row-click 차단점이 해소되어, KPA 레슨 사이드바부터 공통 `LessonList` 로 수렴할 수 있게 됨. KPA 에서 reference pattern(특히 `LessonList rowClickMode='row'`)을 먼저 확정해 GP/KCos fuller adoption 의 기준을 만든다.

## 2. 선행 작업 요약

- `@o4o/lms-ui` 9 컴포넌트 추출, 3서비스 소비 시작(KPA=VisibilityBadge/NoPaymentNotice, GP/KCos=ProgressBar).
- `LessonList` 에 `rowClickMode='row'`(href→`<a>`, onLessonClick→`<button>`, locked 비클릭, current 강조) 추가됨 → 본 WO 가 KPA 에 적용.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/lms/LmsLessonPage.tsx` | 사이드바 레슨 목록(full-row `<Link>`) → `LessonList rowClickMode='row'` + hrefFor. 사이드바 진도 블록 → `CourseProgressBar`(compact) |
| `services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx` | "순서 목록" 레슨 목록 → `LessonList rowClickMode='row'`(isPreview/locked 매핑). 수강 중 진도 블록 → `CourseProgressBar`. (기존 `CourseVisibilityBadge`/`NoPaymentNotice` 소비 유지) |
| `docs/checks/CHECK-O4O-LMS-KPA-FULLER-ADOPTION-V1.md` | 본 문서 |

**무변경:** `@o4o/lms-ui`(이번 WO 패키지 수정 0), package.json/pnpm-lock(KPA 가 이미 lms-ui dep 보유), backend, DB, GP/KCos, Neture.

## 4. 추가 적용한 `@o4o/lms-ui` 컴포넌트

| 컴포넌트 | 위치 | accent |
|---|---|---|
| `LessonList` (rowClickMode='row') | LmsLessonPage 사이드바 / LmsCourseDetailPage 순서 목록 | `#2563EB` |
| `CourseProgressBar` | LmsLessonPage 사이드바 진도(compact) / LmsCourseDetailPage 수강 중 진도 | `#2563EB` |
| `CourseVisibilityBadge`, `NoPaymentNotice` | (기존 소비 유지) | — |

→ KPA 가 `@o4o/lms-ui` 4개 컴포넌트 소비(이전 2 → 현재 4).

## 5. KPA view model mapping

서비스 내부 inline mapper(`lessons.map(...)` → `LessonItemView`)로 주입, `@o4o/lms-ui` 에 KPA 타입 미주입:

- **LmsLessonPage:** `{ id, title, kind: lesson.type, completed: completedLessonIds.includes(id), current: id===lessonId }`, hrefFor=`/lms/course/${courseId}/lesson/${l.id}`.
- **LmsCourseDetailPage:** `{ id, title, kind: lesson.type, durationMinutes: lesson.duration, completed, isPreview, locked: !(enrollment || isPreview) }`, hrefFor=`/lms/course/${course.id}/lesson/${l.id}`.
- route 는 hrefFor 로 주입(컴포넌트 route 미인지), accent prop 으로 테마 주입. API client import 없음.

## 6. LessonList rowClickMode 적용 결과

- **rowClickMode='row'** 사용 — 두 화면 모두 레슨 행 전체가 클릭/링크(`<a href>`). reference pattern 확정.
- **locked:** 상세 페이지에서 `locked = !(enrollment || isPreview)` → 미수강·비미리보기 레슨은 비클릭(기존 "보기 링크 미노출"과 동일 의미, aria-disabled).
- **current:** 레슨 페이지 사이드바에서 `current = (id===lessonId)` → 현재 레슨 강조 + `aria-current`.
- **completed:** completedLessonIds 기반 ✓ 표시 유지.
- 접근성: 행 = `<a>`(네이티브 링크/키보드), 중첩 interactive 없음. 모바일 행 전체 tap 가능.

## 7. 적용 보류한 컴포넌트와 이유

| 컴포넌트 | 보류 사유 |
|---|---|
| `EnrollmentButton` | KPA 상세의 수강 영역이 archived/pending/rejected/completed/in-progress + 진도·인증서 링크로 깊게 분기 — shell 로 단순화 시 상태/링크 손실 위험. 기존 분기 로직 보존 우선(후속에서 부분 적용 검토) |
| `CourseCard`/`CourseList` | `/lms` 목록(`LmsCoursesPage`)이 테이블/배지 기반 안정 레이아웃 — 카드 grid 전환은 UX 대변경. `LmsHubTemplate` 정렬과 함께 별도 WO |
| `LessonPlayerShell` | KPA 플레이어가 video/article/quiz/assignment 렌더 + 수료 모달 + 진도 메트릭과 강결합 — shell 교체 위험. 후속 |

## 8. KPA 정책 유지 확인

- 플랫폼 내 강의 결제 없음 — `NoPaymentNotice` 유지(변경 0).
- reward = rewardPolicy 설정 기반, 고정 reward schedule 문구 0, reward UI 추가 0.
- YouTube/LIVE 0(self video 정책 유지 — 본 WO 는 플레이어 video 렌더 미변경).
- completion/progress 계산 로직 변경 0(CourseProgressBar 는 기존 percent/count 를 표시만).
- API 호출 로직 변경 0(route 는 hrefFor 주입, 기존 경로 동일).

## 9. Neture / GP / KCos 미수정 확인

- `services/web-neture` 파일 0, package.json 0, route/menu/import 0 — Neture 제외 경계 불변.
- GlycoPharm / K-Cosmetics 소스 미변경(각 직전 adoption 에서 처리).
- 본 WO 변경 = KPA lms 페이지 2개 + CHECK 문서. 타 세션 forum WIP 미접촉.

## 10. 검증 결과

- **TypeScript:** `web-kpa-society` `tsc --noEmit` **0 errors**(편집 2파일·lms-ui 해상 포함 전체 clean). 미사용 심볼 경고 0(Link·LESSON_TYPE_ICON 등 잔여 사용처 유지).
- **grep:** KPA lms 페이지 `@o4o/lms-ui` 소비 — LessonList(rowClickMode='row') 2곳, CourseProgressBar 2곳. youtube/iframe/checkout/payment(=NoPaymentNotice 외)/`+10/+20/+50`/rewardPolicy reintro 0.
- **무변경:** `@o4o/lms-ui` 패키지, package.json/pnpm-lock, backend, GP/KCos, Neture.
- **browser smoke:** 미수행 — 렌더/네비게이션 변경 중심. 배포 후 KPA `/lms/course/:id`·`/lms/course/:courseId/lesson/:lessonId` 에서 레슨 행 전체 클릭 네비게이션·현재 레슨 강조·완료 표시·진도 렌더·결제없음 안내 확인 권장.

## 11. 남은 후속 작업

1. **`WO-O4O-LMS-GLYCOPHARM-FULLER-ADOPTION-V1`** — GP 레슨 사이드바(`LmsLessonPage`)에 본 WO 의 KPA reference pattern(`LessonList rowClickMode='row'` + hrefFor) 적용.
2. **`WO-O4O-LMS-KCOSMETICS-FULLER-ADOPTION-V1`** — KCos 동일 적용.
3. **`WO-O4O-LMS-COMMON-COURSE-HUB-CARD-ALIGNMENT-V1`** — CourseCard/List ↔ `LmsHubTemplate` 관계 정리(목록 공통화).
4. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선(강사 reward 지갑/충전/배정/ledger).
5. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계.

## 12. 완료 판정

**PASS.** KPA 가 `LessonList`(rowClickMode='row') + `CourseProgressBar` 를 레슨 사이드바·상세에서 소비 시작 — `@o4o/lms-ui` 소비 2 → 4 컴포넌트로 확대, **레슨 사이드바 row-click reference pattern 확정**. 기존 기능·route·API·결제없음·reward 정책 보존, EnrollmentButton/CourseCard/LessonPlayerShell 은 사유와 함께 보류(§7). web-kpa-society typecheck 0, GP/KCos/Neture/backend/package 무변경. GP/KCos fuller adoption 이 본 패턴을 그대로 따를 수 있다.
