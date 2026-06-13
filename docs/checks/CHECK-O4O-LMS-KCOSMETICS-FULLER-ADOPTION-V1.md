# CHECK-O4O-LMS-KCOSMETICS-FULLER-ADOPTION-V1

> **작업명:** WO-O4O-LMS-KCOSMETICS-FULLER-ADOPTION-V1
> **유형:** K-Cosmetics 사용자 LMS 화면의 `@o4o/lms-ui` 소비 확대 (frontend-only)
> **결과: PASS** — KCos `LmsLessonPage` 사이드바 + `LmsCourseDetailPage` 레슨 목록(둘 다 KPA 구조 기준)을 공통 `LessonList`(rowClickMode='row', accent `#db2777`)로 수렴. 기존 full-row navigation UX·CourseProgressBar·정책 유지. web-k-cosmetics typecheck 0. KPA/GP/Neture/backend/package.json/lock 무변경.
> **선행:** `WO-O4O-LMS-KCOSMETICS-ADOPTION-V1`(`5b85c9ffd`) · `WO-O4O-LMS-LESSONLIST-ROWCLICK-OPTION-V1`(`e042b4eb2`) · `WO-O4O-LMS-KPA-FULLER-ADOPTION-V1`(`0d15a38e3`) · `WO-O4O-LMS-GLYCOPHARM-FULLER-ADOPTION-V1`(`5f910fd34`)
> **작성일:** 2026-06-13 · 기준 HEAD `677a9e61c`

---

## 1. 작업 목적

KCos LMS 사용자 화면에서 `@o4o/lms-ui` 활용을 확대한다. 핵심은 KCos 레슨 사이드바(및 상세 레슨 목록)의 기존 full-row `<Link>` 목록을 KPA reference pattern(`LessonList rowClickMode='row'` + hrefFor + locked/current/completed + accent)으로 수렴. KPA(`0d15a38e3`)·GP(`5f910fd34`)에서 검증된 패턴 적용.

## 2. 선행 상태

KCos 는 이미: `CourseProgressBar` 2곳, accent `#db2777`, Dockerfile lms-ui COPY, MyCredits 고정 reward 문구 제거, YouTube/LIVE 없음. 본 WO 는 `LessonList` 추가 소비.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-k-cosmetics/src/pages/lms/LmsLessonPage.tsx` | 사이드바 레슨 목록(full-row `<Link>`) → `LessonList rowClickMode='row'` + hrefFor. (기존 CourseProgressBar 사이드바 진도 유지) |
| `services/web-k-cosmetics/src/pages/lms/LmsCourseDetailPage.tsx` | "레슨 목록"(KPA 구조 기준, 보기 링크형) → `LessonList rowClickMode='row'`(isPreview/locked 매핑). (기존 CourseProgressBar 유지) |
| `docs/checks/CHECK-O4O-LMS-KCOSMETICS-FULLER-ADOPTION-V1.md` | 본 문서 |

**무변경:** `@o4o/lms-ui`(패키지 수정 0), package.json/pnpm-lock(KCos 이미 lms-ui dep 보유), backend, DB, KPA, GP, Neture.

## 4. 추가 적용한 `@o4o/lms-ui` 컴포넌트

- **`LessonList` (rowClickMode='row')** — KCos `LmsLessonPage` 사이드바 + `LmsCourseDetailPage` 레슨 목록. accent `#db2777`(`C.primary`).
- (기존 유지) `CourseProgressBar` ×2.
→ KCos 가 `@o4o/lms-ui` 2 컴포넌트 소비(ProgressBar + LessonList), LessonList 는 2화면.

## 5. K-Cosmetics LessonList view model mapping

서비스 내부 inline mapper(`lessons.map(...)` → `LessonItemView`):
- **LmsLessonPage:** `{ id, title, kind: lesson.type, completed, current: id===lessonId }`, hrefFor=`/lms/course/${courseId}/lesson/${l.id}`.
- **LmsCourseDetailPage:** `{ id, title, kind: lesson.type, durationMinutes: lesson.duration, completed, isPreview, locked: !(enrollment||isPreview) }`, hrefFor=`/lms/course/${course.id}/lesson/${l.id}`.
- **kind 캐스트:** KCos `LmsLesson.type` 은 plain union(`'video'|'article'|'quiz'|'assignment'`) → KPA 처럼 직접 `kind: lesson.type`(GP 의 enum 캐스트 불필요). 차이 확인 완료.
- route 는 hrefFor 주입, accent prop 주입, `@o4o/lms-ui` 에 KCos 타입/client 미주입. progress/completion 계산 변경 0.

## 6. rowClickMode='row' 적용 결과

- 두 화면 모두 레슨 행 전체가 `<a href>` — 기존 full-row navigation UX 유지/수렴(KPA·GP 와 동일).
- **상세:** `locked = !(enrollment || isPreview)` → 미수강·비미리보기 비클릭(기존 "보기 링크 미노출"과 동일 의미). `isPreview` → 미리보기 배지. current 없음(상세는 진입 전).
- **레슨페이지:** `current = id===lessonId` → 현재 레슨 강조(aria-current). completed → ✓.
- 접근성: 행 = `<a>`(네이티브), 중첩 interactive 없음, 모바일 tap 가능.

## 7. CourseDetailPage 적용 결과

- **적용함.** KCos `LmsCourseDetailPage` 는 헤더 주석대로 "KPA-Society 구조 기준" — 레슨 목록이 KPA 와 동일한 nav-list(번호/✓ · 제목 · 미리보기 배지 · 길이 · 보기 Link)였다. GP 의 inline-player 선택형과 달라 **`LessonList rowClickMode='row'` 로 안전 수렴**(KPA 와 동일 처리).

## 8. 기능 / 정책 보존

- article/video/quiz/assignment renderer, course/lesson API, progress/completion, route, CourseProgressBar — 보존.
- YouTube/LIVE 재도입 0, 고정 reward schedule 재도입 0, reward UI 0, 결제/checkout 0. MyCredits 미변경.
- LessonPlayerShell 미적용(WO 준수).

## 9. Neture / KPA / GP 미수정 확인

- `services/web-neture` 파일 0, package.json 0, route/menu/import 0 — 제외 경계 불변.
- KPA / GlycoPharm 소스 미변경. 본 WO 변경 = KCos lms 2페이지 + CHECK.

## 10. 검증 결과

- **TypeScript:** `web-k-cosmetics` `tsc --noEmit` **0 errors**(편집 2파일·lms-ui 해상 포함 전체 clean).
- **grep:** KCos lms 페이지 `LessonList`(rowClickMode='row') 2화면 소비 확인. youtube/iframe/checkout/payment/`+10/+20/+50`/rewardPolicy reintro 0.
- **무변경:** `@o4o/lms-ui`, package.json/pnpm-lock, backend, KPA/GP/Neture.
- **browser smoke:** 미수행 — 렌더/네비게이션 변경 중심. 배포 후 KCos 강의 상세·레슨 화면 행 전체 클릭 네비게이션·현재 레슨 강조·완료/미리보기 표시·YouTube 미노출 확인 권장.

## 11. 3서비스 LessonList 수렴 완료

| 서비스 | LessonList(row) 적용 위치 | accent |
|---|---|---|
| KPA | LmsLessonPage 사이드바 + LmsCourseDetailPage 순서목록 | `#2563EB` |
| GlycoPharm | LmsLessonPage 사이드바 (CourseDetail inline-player 보류) | `#16a34a` |
| K-Cosmetics | LmsLessonPage 사이드바 + LmsCourseDetailPage 레슨목록 | `#db2777` |

→ `LessonList rowClickMode='row'` 패턴이 **3서비스 실제 적용 완료**.

## 12. 남은 후속 작업

1. **`WO-O4O-LMS-COMMON-COURSE-HUB-CARD-ALIGNMENT-V1`** — CourseCard/List ↔ `LmsHubTemplate` 관계 정리(목록 공통화 — 3서비스 EducationPage 가 LmsHubTemplate 위임).
2. **`WO-O4O-LMS-GLYCOPHARM-FULLER-DETAIL-ADOPTION-V1`** — GP CourseDetail inline-player 목록 공통화 가능성 검토(현 보류).
3. **`WO-O4O-LMS-KPA-FULLER-COURSE-CARD-ADOPTION-V1`** — KPA CourseCard/List adoption.
4. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선(강사 reward 지갑/충전/배정/ledger).
5. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계.

## 13. 완료 판정

**PASS.** KCos `LmsLessonPage` 사이드바 + `LmsCourseDetailPage` 레슨 목록이 공통 `LessonList`(rowClickMode='row', accent `#db2777`)를 소비 — KPA reference pattern 적용. full-row navigation UX·CourseProgressBar·정책(결제없음/reward 게이팅/YouTube 없음) 보존. web-k-cosmetics typecheck 0, KPA/GP/Neture/backend/package 무변경. **3서비스 LessonList row 수렴 완료** — 다음은 CourseCard/List ↔ LmsHubTemplate 정리.
