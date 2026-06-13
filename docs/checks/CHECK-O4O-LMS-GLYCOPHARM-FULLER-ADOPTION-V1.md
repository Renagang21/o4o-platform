# CHECK-O4O-LMS-GLYCOPHARM-FULLER-ADOPTION-V1

> **작업명:** WO-O4O-LMS-GLYCOPHARM-FULLER-ADOPTION-V1
> **유형:** GlycoPharm 사용자 LMS 화면의 `@o4o/lms-ui` 소비 확대 (frontend-only)
> **결과: PASS** — GP `LmsLessonPage` 사이드바 레슨 목록(full-row `<Link>`)을 공통 `LessonList`(rowClickMode='row', accent `#16a34a`)로 수렴. 기존 full-row navigation UX·AI 과제 채점·CourseProgressBar 유지. CourseDetailPage inline-player 목록은 보류(사유 기록). web-glycopharm typecheck: 내 편집 파일 0(잔존 2건은 타 세션 forum WIP). KPA/KCos/Neture/backend/package.json/lock 무변경.
> **선행:** `WO-O4O-LMS-COMMON-UI-EXTRACTION-V1` · `WO-O4O-LMS-GLYCOPHARM-ADOPTION-V1`(`2f2122559`) · `WO-O4O-LMS-LESSONLIST-ROWCLICK-OPTION-V1`(`e042b4eb2`) · `WO-O4O-LMS-KPA-FULLER-ADOPTION-V1`(`0d15a38e3`)
> **작성일:** 2026-06-13 · 기준 HEAD `f6c35c3a5`

---

## 1. 작업 목적

GP LMS 사용자 화면에서 `@o4o/lms-ui` 활용을 한 단계 확대한다. 핵심은 GP `LmsLessonPage` 사이드바의 기존 full-row `<Link>` 레슨 목록을 KPA reference pattern(`LessonList rowClickMode='row'` + hrefFor + locked/current/completed 매핑 + accent)으로 수렴하는 것. KPA(`0d15a38e3`)에서 확정된 패턴을 GP 에 그대로 적용.

## 2. 선행 상태

GP 는 이미: `CourseProgressBar` 2곳, accent `#16a34a`, Dockerfile lms-ui COPY, MyCredits 고정 reward 문구 제거, YouTube iframe 자동 임베드 제거 완료. 본 WO 는 `LessonList` 추가 소비.

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/pages/education/LmsLessonPage.tsx` | 사이드바 레슨 목록(full-row `<Link>`) → `LessonList rowClickMode='row'` + hrefFor. (기존 `CourseProgressBar` 사이드바 진도 유지) |
| `docs/checks/CHECK-O4O-LMS-GLYCOPHARM-FULLER-ADOPTION-V1.md` | 본 문서 |

> GP LMS 페이지는 `services/web-glycopharm/src/pages/education/` 에 위치(WO 의 `pages/lms/` 는 실제 경로 `pages/education/`).

**무변경:** `@o4o/lms-ui`(패키지 수정 0), package.json/pnpm-lock(GP 이미 lms-ui dep 보유), backend, DB, KPA, KCos, Neture, GP `CourseDetailPage`.

## 4. 추가 적용한 `@o4o/lms-ui` 컴포넌트

- **`LessonList` (rowClickMode='row')** — GP `LmsLessonPage` 사이드바. accent `#16a34a`(`C.primary`).
- (기존 유지) `CourseProgressBar` ×2.
→ GP 가 `@o4o/lms-ui` 2 컴포넌트 소비(ProgressBar + LessonList).

## 5. GlycoPharm LessonList view model mapping

서비스 내부 inline mapper(`lessons.map(...)` → `LessonItemView`):
```
{ id, title, kind: lesson.type, completed: completedLessonIds.includes(id), current: id===lessonId }
hrefFor=(l) => `/lms/course/${courseId}/lesson/${l.id}`
```
- `kind`: GP `LmsLesson.type` 은 lms-core `LessonType`(KPA 의 string union 과 달리 enum 계열) → `as unknown as LessonItemView['kind']` 로 안전 캐스트(아이콘 매핑용, 값 동일: video/article/quiz/assignment).
- route 는 hrefFor 주입(기존 GP route 동일), accent prop 주입. `@o4o/lms-ui` 에 GP 타입/client 미주입.
- progress/completion 계산 로직 변경 0.

## 6. rowClickMode='row' 적용 결과

- 사이드바 레슨 행 전체가 `<a href>` — 기존 full-row `<Link>` UX **유지/수렴**(KPA 와 동일 패턴).
- `current = (id===lessonId)` → 현재 레슨 강조 + `aria-current`. `completed` → ✓. locked 없음(사이드바는 전체 접근 가능).
- 접근성: 행 = `<a>`(네이티브), 중첩 interactive 없음, 모바일 tap 가능.

## 7. CourseDetailPage inline-player 목록 적용/보류 결과

- **보류.** GP `CourseDetailPage`(`pages/education/CourseDetailPage.tsx`)의 레슨 목록은 **inline-player 선택형**(클릭→하단 재생, `handleSelectLesson`/`selectedLesson` state + play/file 아이콘 + chevron + 선택 하이라이트)으로 navigation 이 아니라 **selection** 이다.
- `LessonList rowClickMode='row'` + `onLessonClick` 으로 기능적 수렴은 가능하나, ① play/file 아이콘·chevron 등 custom affordance 손실, ② inline-player state 와 강결합, ③ 1차 공통화 부적합 → **보류**(WO §6 사유). 후속에서 player 일체 공통화와 함께 재검토.

## 8. AI 과제 채점 보존 확인

- GP `LmsLessonPage` 의 AI 과제 채점(`aiApi`, `AiAnalyzeResult`, `callAi`, `aiResult`) **미변경**(grep 확인). LessonPlayerShell 미적용 — 플레이어/렌더 로직 무변경.

## 9. 정책 / 특수 기능 보존

- YouTube iframe 자동 임베드 재도입 0(self video 정책 유지 — 플레이어 미변경).
- 고정 reward schedule 재도입 0, reward UI 추가 0(MyCredits 미변경).
- 결제/checkout 추가 0.
- article/video/quiz/assignment renderer, course/lesson API, progress/completion, route, CourseProgressBar — 전부 보존.

## 10. Neture / KPA / KCos 미수정 확인

- `services/web-neture` 파일 0, package.json 0, route/menu/import 0 — 제외 경계 불변.
- KPA / K-Cosmetics 소스 미변경. 본 WO 변경 = GP `LmsLessonPage` 1개 + CHECK. 타 세션 forum WIP 미접촉.

## 11. 검증 결과

- **TypeScript:** `web-glycopharm` `tsc -b --noEmit` — 편집 파일(`education/LmsLessonPage.tsx`)·lms-ui 해상 **0 errors**. 잔존 2건은 전부 `src/pages/forum/ForumPage.tsx`(타 세션 forum WIP) — 본 WO 무관·미접촉.
- **grep:** GP LmsLessonPage `LessonList`(rowClickMode='row') 소비 확인. youtube/iframe/checkout/payment/`+10/+20/+50`/rewardPolicy reintro 0. `aiApi`/`callAi` 보존.
- **무변경:** `@o4o/lms-ui`, package.json/pnpm-lock, backend, KPA/KCos/Neture.
- **browser smoke:** 미수행 — 렌더/네비게이션 변경 중심. 배포 후 GP 레슨 화면 사이드바 행 전체 클릭 네비게이션·현재 레슨 강조·완료 표시·AI 과제 채점 영향 없음·YouTube 미노출 확인 권장.

## 12. 남은 후속 작업

1. **`WO-O4O-LMS-KCOSMETICS-FULLER-ADOPTION-V1`** — KCos `LmsLessonPage` 사이드바에 동일 패턴(`LessonList rowClickMode='row'`) 적용.
2. **`WO-O4O-LMS-COMMON-COURSE-HUB-CARD-ALIGNMENT-V1`** — CourseCard/List ↔ `LmsHubTemplate` 관계 정리(목록 공통화).
3. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선(강사 reward 지갑/충전/배정/ledger).
4. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계.
5. *(후속)* GP `CourseDetailPage` inline-player 목록 + LessonPlayerShell 일체 공통화 재검토(§7).

## 13. 완료 판정

**PASS.** GP `LmsLessonPage` 사이드바가 공통 `LessonList`(rowClickMode='row', accent `#16a34a`)를 소비 시작 — KPA reference pattern 적용. full-row navigation UX·AI 과제 채점·CourseProgressBar·정책(결제없음/reward 게이팅/YouTube 없음) 보존. CourseDetailPage inline-player 목록은 사유와 함께 보류(§7). web-glycopharm 편집 파일 typecheck 0, KPA/KCos/Neture/backend/package 무변경.
