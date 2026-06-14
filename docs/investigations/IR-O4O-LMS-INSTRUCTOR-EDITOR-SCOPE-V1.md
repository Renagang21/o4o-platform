# IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** 강사 editor 계열(강의 생성/편집·레슨 관리·퀴즈 builder·과제 채점)을 **어디부터 작게** 공통화할지 결정한다. KPA-only 기능이 많아 한 번에 추출하면 위험.
> **작성일:** 2026-06-13 · 기준 HEAD `40e664929`
> **선행:** 사용자-facing + 운영자 승인 + 강사 목록(`InstructorCoursesManager`, 3서비스) 공통화 완료.

---

## 1. 목적

강사 목록 축까지 공통화된 현재, 남은 큰 축 = editor 계열. KPA(풀) / GP(부분) / KCos(없음) 비대칭이 커서 "3개 수렴" 불가. **가장 작고 정렬된 슬라이스부터** 시작하는 순서를 정한다. read-only.

## 2. 결론 요약

| editor surface | KPA | GP | KCos | 판정 |
|------|:---:|:---:|:---:|:---:|
| **강의 기본정보 form** (title/desc/visibility/approval/reusablePolicy/tags) | ✅(props-driven CourseNewPage) | ✅(동일 필드) | ❌ | **B → 1순위 form shell 추출** |
| 레슨 목록 + drag-reorder | ✅ | ✅ | ❌ | **B → 2순위 lesson-list manager(모달 슬롯)** |
| LessonModal(video/article: RichText+Ai+videoUrl) | ✅ | ✅ | ❌ | B(모달 slot) — RichText/Ai 는 이미 공유 |
| 퀴즈 빌더(QuizBuilder) | ✅ | ❌(placeholder) | ❌ | **C (KPA-only — 별도 설계)** |
| 과제 에디터(AssignmentEditor) | ✅ | ❌ | ❌ | C |
| 과제 채점(LessonSubmissions+GradingModal) | ✅ | ❌(AI는 learner측) | ❌ | C |
| 코스 AI 구조생성(CourseStructureAiModal) | ✅ | ❌ | ❌ | C(KPA-only) |
| RichTextEditor / AiContentModal | 공유(@o4o/content-editor) | 공유 | — | 이미 공통 |
| 참여자 credit/reward | ✅ | — | — | **D (reward 작업선)** |

**핵심:** **강의 기본정보 form 이 가장 정렬**(KPA·GP 동일 필드, KPA 는 이미 `pageTitle?` props 기반 컴포넌트) → **1순위 작은 추출**. 레슨 목록 shell 은 2순위(모달은 slot 주입). **퀴즈/과제/채점/코스-AI 는 KPA-only → C, 추출 금지(별도 설계 IR)**. RichText/Ai 는 이미 `@o4o/content-editor` 공유라 신규 작업 아님.

## 3. 현재 공통화 완료 상태

사용자-facing(hub/accent/visibility·LessonList·CourseProgressBar) + 운영자 승인(`OperatorLmsCoursesManager`) + 강사 목록(`InstructorCoursesManager`, 3서비스) 완료. 본 IR = editor 축.

## 4. KPA editor 현황 (reference, inline styles)

`pages/instructor/courses/**`:
- `CourseNewPage`(272줄) — 강의 기본정보 form(title/description/visibility(members default)/requiresApproval/reusablePolicy/tags). **이미 props(`pageTitle?`) 기반** — 컴포넌트화 진척.
- `CourseEditPage`(999줄) — 기본정보 form + 레슨 drag-reorder + `LessonModal` + 상태/제출/아카이브 flow + GuideBlock + `CourseStructureAiModal`(코스 AI 구조생성).
- `LessonModal` — RichTextEditor + AiContentModal + videoUrl, **type=quiz → `QuizBuilder` / type=assignment → `AssignmentEditor`** 임베드.
- `QuizBuilder`, `AssignmentEditor`, `LessonSubmissionsPage`(GradingModal — 과제 채점/피드백/재요청).

## 5. GlycoPharm editor 현황 (부분, inline styles)

`pages/instructor/InstructorCourseEditPage`(670줄):
- 강의 기본정보 form(KPA 동일 필드: visibility/requiresApproval/reusablePolicy/tags).
- 레슨 drag-reorder + `LessonModal`(RichTextEditor + AiContentModal + videoUrl).
- **quiz/assignment 타입: LessonModal 에서 "전용 편집기 별도 구현 예정" placeholder — 빌더 없음.**
- 과제 채점 화면 없음(AI 채점은 learner측 `LmsLessonPage`). 코스 AI 구조생성 없음.

## 6. K-Cosmetics editor 현황

- **editor 전무**(강의 생성/편집/레슨/퀴즈/과제 화면 없음). Phase 1-B 미구축. (강사 목록만 공통 manager 위에 build-on 완료.)

## 7. API / client 공통성

- **backend 공통:** `/lms/courses`(create/update/delete)·`/lms/instructor/courses/:id/lessons`·`/lms/lessons`(CRUD/reorder)·`/lms/quizzes`·`/lms/assignments`·submissions — 3서비스 동일(service-neutral). KCos backend 도 존재(frontend 미구축).
- 각 서비스 api/lms(-instructor).ts 래핑. KPA/GP 가 course/lesson CRUD 소비, quiz/assignment 은 KPA 만.
- → 공통화 frontend-only 가능.

## 8. 공통화 후보 A~E

- **A (즉시):** page/section shell, submit/cancel action shell, 상태·공개범위 select, 기본 validation 표시.
- **B (config 주입):** **강의 기본정보 form**(1순위), **레슨 목록/순서 manager**(2순위 — LessonModal/editor 는 slot/render-prop 주입), service route builder, 자료 첨부 영역(videoUrl).
- **C (별도 설계):** RichTextEditor·AiContentModal(**이미 공유** — 재작업 아님), 영상/파일 업로드, **QuizBuilder·AssignmentEditor·과제 채점**(KPA-only), `CourseStructureAiModal`(KPA-only), draft/save/publish/submit-review flow.
- **D (보류):** rewardPolicy UI, 강사 reward 지갑/budget/ledger, credit/정산.
- **E (제외):** Neture LMS, YouTube/LIVE 재도입, platform 결제.

## 9. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | editor 전체를 한 번에 추출 → KPA-only(퀴즈/과제/채점/코스AI) 가 GP/KCos 에 과하게 섞임 | **form → lesson-list 순서로 작게**, 퀴즈/과제는 C 분리 |
| R2 | LessonModal 이 RichText+Ai+videoUrl+(KPA)quiz/assignment 고결합 | 모달 내용은 **slot/render-prop** 주입(KPA 가 quiz/assignment 채움, GP video/article만, KCos 빈) |
| R3 | form 의 save/publish/submit-review flow 차이(KPA status flow) | 1순위는 **기본정보 form(create 위주)**만, 상태 flow 는 후속 |
| R4 | RichText/Ai 를 "신규 공통화"로 오인 | 이미 `@o4o/content-editor` 공유 — 재작업 금지 |
| R5 | credit/reward(participants) 혼입 | D 분리 |
| R6 | 스타일 비대칭(KPA·GP inline) | manager 추출 시 inline 기준(목록 manager 동일 패턴) |

## 10. reward / credit 분리 기준

editor 공통화에서 **credit/reward 일절 제외**. 참여자 credit 지급·rewardPolicy·지갑/budget 은 `IR-O4O-REWARD-BUDGET-FLOW-...` 작업선. form/lesson shell 에 credit 필드·액션을 넣지 않는다.

## 11. Neture 제외 확인

- Neture editor LMS 화면 없음(LMS 대상 아님). 본 IR 미조사·미수정. 공통 shell 을 operator-core-ui 등에 두어도 Neture 가 강사 editor route/메뉴 미참조 → 미소비. `@o4o/lms-ui` 무관(Neture transitive 없음).

## 12. 권장 다음 WO

**1순위(가장 작고 정렬):** `WO-O4O-LMS-INSTRUCTOR-COURSE-FORM-SHELL-V1`
- 강의 기본정보 form(title/desc/visibility/approval/reusablePolicy/tags + save)을 config-driven shell 로 추출. KPA `CourseNewPage`(이미 props-driven)를 canonical, `reusablePolicy` 등 필드는 config 토글, api(create/update)·routes 주입. KPA+GP 적용. 상태 flow·레슨·퀴즈 제외.

**2순위:** `WO-O4O-LMS-INSTRUCTOR-LESSON-LIST-MANAGER-V1`
- 레슨 목록 + drag-reorder + add shell 공통화. **LessonModal/lesson editor 는 slot/render-prop 주입**(KPA quiz/assignment 채움, GP video/article, KCos 빈) → 고결합 회피.

**3순위(별도 설계):** `IR-O4O-LMS-INSTRUCTOR-QUIZ-ASSIGNMENT-DESIGN-V1`
- QuizBuilder·AssignmentEditor·과제 채점(LessonSubmissions)·CourseStructureAiModal(KPA-only) 공통화 가능 범위·계약 조사.

**후속:** `WO-O4O-LMS-KCOS-INSTRUCTOR-EDITOR-PHASE1B-V1`(KCos editor 를 공통 shell 위에 신규 구축) · `IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`(reward/credit).

## 13. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1.md`)
- [x] 코드/package/lock/Dockerfile/backend 변경 없음 (read-only)
- [x] KPA(§4)/GP(§5)/KCos(§6) editor 현황 + 성숙도 표(§2)
- [x] API 공통성(§7) / 분류 A~E(§8) / 위험(§9) / reward 분리(§10) / Neture 제외(§11) / 권장 WO(§12)

---

*End of IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1*
