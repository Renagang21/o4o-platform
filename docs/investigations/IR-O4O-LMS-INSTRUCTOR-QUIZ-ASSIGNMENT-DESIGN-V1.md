# IR-O4O-LMS-INSTRUCTOR-QUIZ-ASSIGNMENT-DESIGN-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API/package/Dockerfile/backend 변경 없음, 문서 1개만 생성)
> **목적:** KPA 에만 존재하는 강사 editor 고급 기능(QuizBuilder · 과제 editor/채점 · CourseStructureAiModal/AI)을 **공통화할지 / reference 로 둘지 / 별도 제품 설계가 필요한지** 판단한다. 무리한 manager 묶음 방지.
> **작성일:** 2026-06-14 · 기준 HEAD `ae14f9e43`
> **선행:** `IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1`(§12 3순위 권장) · form shell · lesson list manager 완료

---

## 1. 목적

강사 editor 의 공통 shell 축(목록·기본정보 form·레슨 목록)은 닫혔다. 남은 것은 **KPA-only 고급 기능** = 퀴즈/과제/채점/AI 구조 생성. 이들은 기능 자체보다 **정책·비용·수료·credit/reward 와 얽힐 가능성**이 커서, "바로 공통화"가 아니라 **공통화 가부 판단**이 이번 IR 의 목표다. read-only.

## 2. 결론 요약 (먼저)

| 기능 | 구현 서비스 수 | 수렴 대상 | 결합 위험 | 판정 |
|------|:---:|:---:|:---:|:---:|
| QuizBuilder | **KPA 1개** | 없음(GP placeholder, KCos 무) | 채점/통과기준 | **C — KEEP(reference)** |
| 과제 editor | **KPA 1개** | 없음 | 채점/완료 | **C — KEEP(reference)** |
| 과제 제출/채점/피드백 | **KPA 1개** | 없음(learner AI 피드백 별개) | 완료/credit | **C — KEEP(reference)** |
| CourseStructureAiModal / AI 구조 생성 | **KPA 1개** | 없음(GP 명시 제외) | **AI 비용/권한/노출 정책** | **D — 정책 IR 선행** |
| credit/reward 결합 | 강사 UI=**view-only** | — | 지급조건/budget | **D — 별도 작업선** |

**핵심 판단:** 퀴즈/과제/채점/AI 는 **각각 KPA 단일 구현**이다. 공통화(form·lesson manager)가 성립했던 이유는 **KPA·GP 2개 구현을 수렴**할 수 있었기 때문인데, 이 영역은 **수렴할 두 번째 구현이 없다.** 단일 샘플 위에 manager 를 만드는 것은 **조기 추상화**다. 게다가 이미 `renderEditor` slot 으로 LessonModal 이 분리되어 있어 **추가 결합이 없다.** → **퀴즈/과제/채점은 KPA reference 로 유지**, GP/KCos 에 실제 제품 요구가 생기면 그때 slot 안에서 shell 추출(저비용). **AI 구조 생성은 비용/권한/노출 정책 IR 선행**, **credit/reward 는 별도 작업선**.

## 3. 현재 editor 공통화 완료 상태

| 축 | 결과 | 경계 |
|----|------|------|
| 강사 목록 | `InstructorCoursesManager` (KPA/GP/KCos) | config-driven |
| 강의 기본정보 form | `InstructorCourseFormShell` (KPA create / GP edit) | 순수 UI, onSubmit 주입 |
| 레슨 목록/순서 | `InstructorLessonListManager` (KPA/GP) | API 주입, **LessonModal=renderEditor slot** |
| **LessonModal/editor** | **서비스 wrapper 소유(slot)** | quiz/assignment/AI 는 이 slot **내부** |

→ 본 IR 대상(퀴즈/과제/AI)은 전부 **slot 내부**에 있어 공통 shell 과 이미 분리됨.

## 4. KPA QuizBuilder 구조

- 파일: `pages/instructor/courses/QuizBuilder.tsx`(334줄), 타입: `api/lms-instructor.ts`.
- **데이터(`QuizQuestionDraft`, lms-instructor.ts:132-140):** `{ id, question, type: 'single'|'multi'|'text', options: string[], answer: string|string[], points, order }`.
- **퀴즈 단위(`InstructorQuiz`, :142-155):** `lessonId` + `courseId` 보유 → **레슨 종속**(quiz 1 : lesson 1). 퀴즈 레벨: `passingScore`(통과 %), `timeLimit?`, `maxAttempts?`, `showCorrectAnswers`.
- **API(:309-323):** `getQuizForLesson(lessonId)` `GET /lms/lessons/:lessonId/quiz` · `createQuiz` `POST /lms/quizzes` · `updateQuiz(quizId)` `PATCH /lms/quizzes/:quizId`.
- **임베드:** `CourseEditPage` LessonModal 내부, `form.type === 'quiz' && showEditor` 일 때만(:445-451). 레슨 저장 후 표시.
- **AI:** 없음(퀴즈 문항 AI 생성 없음).
- **reward 직접 필드:** 없음. `passingScore` 는 통과 게이트지만 credit 은 course 레벨(아래 §8).

## 5. KPA 과제 editor / 채점 구조

- **AssignmentEditor**(`AssignmentEditor.tsx`, 169줄): `{ id, lessonId, instructions, submissionType: 'text'(하드코딩), dueDate }`. **rubric/maxScore 없음**(점수 0–100 정수만). UI=instructions textarea + dueDate datetime-local. **레슨 종속**.
- **API:** `getAssignmentForLesson(lessonId)` `GET /lms/lessons/:id/assignment` · `upsertAssignment` `POST /lms/assignments` · (learner) `submitAssignment` `POST /lms/assignments/:id/submit` · `getMyAssignmentSubmission` · (instructor) `listLessonSubmissions(lessonId)` `GET /lms/instructor/lessons/:id/submissions` · `gradeSubmission(submissionId)` `POST /lms/instructor/submissions/:id/grade`.
- **채점 화면(`LessonSubmissionsPage.tsx`, 289줄):** 강사 전용. 라우트 `/instructor/courses/:courseId/lessons/:lessonId/submissions`. 제출 목록(이름/제출일/상태 배지/점수) + **GradingModal**(동 파일 내) — 점수 0–100 + 피드백 + 반려(재요청), 상태 `ungraded|graded|returned`. **채점 수동**.
- **learner 측 분리:** `pages/lms/LmsLessonPage.tsx` — 제출 textarea + (learner 전용)**AI 피드백** 버튼(`aiApi.feedbackAssignment`). 강사 채점과 별개 화면.
- **AI 채점:** 없음(자동 채점 없음). AI 는 learner 피드백 보조뿐.

## 6. KPA CourseStructureAiModal 구조

- 파일: `CourseStructureAiModal.tsx`(423줄). **레슨 생성 보조**(강의 생성 아님) — 주제/URL 로 **레슨 후보 5–8개** 생성 후 일괄 생성.
- **2단계:** ① `POST /api/ai/course-structure` `{ input, type: 'topic'|'url' }` → `GeneratedLesson[]`(title, summary). ② 선택 항목별 순차 `POST /api/ai/lesson-body` → `GeneratedLessonWithBody`(html, bodyFallback). 실패 시 title+summary fallback HTML. 결과는 `handleAddCourseStructureLessons` 로 **article 타입 일괄 createLesson**.
- **인증/비용:** `getAccessToken()` Bearer 주입(:74,144), rate-limit 회피로 본문 생성 **순차** 호출(:178). **client-side 할당량/비용/권한 게이팅 없음**(429/quota 매핑 없이 generic error만 :224).
- **노출:** GP 는 `InstructorCourseEditPage` 헤더 주석에 **"KPA 전용 제외: CourseStructureAiModal"** 명시(:1-11). KCos 무.

## 7. GP / KCos 미구현 상태

- **GP:** LessonModal(video/article) 존재. quiz/assignment 타입은 **placeholder** — `InstructorCourseEditPage.tsx:273`/`:277` "전용 편집기는 별도 구현 예정 … 강의 편집 화면에서 계속 진행". **QuizBuilder/AssignmentEditor/제출·채점/CourseStructureAi 전무.**
- **KCos:** 강사 editor 자체 없음. `pages/instructor/` = Dashboard + read-only 목록 wrapper 뿐. **InstructorCourseEditPage/LessonModal/Quiz/Assignment/AI 전무**(Phase 1-B 미구축).

## 8. credit / reward 결합 지점

- **강사 UI 는 view-only.** `ContentParticipantsPage`(보상 지급 현황: `creditedCount`/`총 지급 Credit`/완료-미지급 탭 + 참여자 `credited`/`creditAmount` **표시만**), `operations/OperationsCourseDetailPage`(포인트 지급 현황 **조회**), `api/lms-instructor.ts` `participants`/`participantsSummary`/`coursePoints`.
- **지급 액션 없음:** `grantCredit/issueCredit/awardCredit` 등 **instructor client 에 없음**. 지급은 backend/자동(quiz 통과·과제·완료 규칙) 추정. `rewardPolicy`/`budget` **instructor 측 미구현**.
- **결합 판정:** 퀴즈 `passingScore`·과제 채점·레슨 완료 → (backend) credit 지급으로 이어질 수 있으나 **frontend 결합 0**. → 퀴즈/과제 shell 에 credit 필드·액션을 **넣지 않는다**(넣을 것도 없음). credit/reward 는 **D 작업선**.

## 9. API / client 사용 현황

- 백엔드 endpoint 는 service-neutral(`/lms/quizzes`·`/lms/assignments`·`/lms/instructor/.../submissions`·`/api/ai/*`) — KCos 백엔드도 존재하나 frontend 미소비. **퀴즈/과제 client 래핑은 KPA 만**(GP/KCos 미사용). → 공통화하더라도 frontend-only, 단 **소비처가 KPA 1곳**뿐.

## 10. 공통화 후보 A~E (분류)

- **A (공통 shell 가능):** 퀴즈/과제 섹션 layout·empty·add/edit/delete trigger·list shell·status badge. → **단, 소비처 1개라 지금 추출 이득 < 조기 추상화 비용.** 보류.
- **B (slot 공통화 가능):** QuizBuilder/AssignmentEditor wrapper·grading panel shell·AI 결과 삽입 shell. → **이미 `renderEditor` slot 으로 분리됨.** 추가 wrapper 불필요(중복 경계).
- **C (KPA-only 유지):** **QuizBuilder · 과제 editor · 제출/채점(GradingModal)** — 단일 구현 + KPA 정책/copy 결합 + GP/KCos 제품 요구 부재. **KEEP reference.**
- **D (별도 product decision):** **AI 구조 생성**(비용/권한/quota/서비스 노출 — client 게이팅 0), **credit/reward 지급 조건·budget**, 수료증/이수 정책. → 정책 IR 선행.
- **E (제외):** Neture(LMS 대상 아님), 결제/checkout/payment, YouTube/LIVE 재도입.

## 11. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | 단일 구현(KPA) 위에 manager 추출 → 조기 추상화, GP/KCos 가 안 맞으면 재작업 | **KEEP reference**, 2번째 구현 생길 때 slot 안에서 추출 |
| R2 | AI 구조 생성을 기능으로만 보고 공통화 → **비용/권한/quota 정책 누락** | 정책 IR 선행(§12-2) |
| R3 | 퀴즈/과제 shell 에 credit/reward 혼입 | frontend 결합 0 확인(§8) — 넣지 않음, D 분리 |
| R4 | RichText/Ai 를 "신규 공통화"로 오인 | 이미 `@o4o/content-editor` 공유 — 재작업 0 |
| R5 | GP placeholder 를 "곧 동일 구현" 으로 가정 | GP 제품 요구 확정 전 추측 추출 금지 |
| R6 | KCos 에 editor 신규 구축을 본 IR 에 끌어옴 | 범위 밖(Phase 1-B 별도 WO) |

## 12. 권장 후속 (1순위 = KEEP)

1. **`KEEP-O4O-LMS-KPA-QUIZ-ASSIGNMENT-AS-REFERENCE-V1` (1순위)** — QuizBuilder · 과제 editor · 제출/채점을 **현재 KPA-only reference 로 유지**. 근거: 단일 구현(수렴 대상 없음) + `renderEditor` slot 으로 이미 분리 + GP/KCos 제품 요구 부재. **GP 가 quiz/assignment 를 실제 구축할 때(placeholder 해소) slot 안에서 shell 추출**(저비용, form/lesson 패턴 동일). 무리한 manager 묶음 금지.
2. **`IR-O4O-LMS-AI-COURSE-STRUCTURE-POLICY-V1` (2순위)** — AI 강의 구조 생성을 공통화하기 전에 **비용/quota/권한(role)/서비스 노출 정책**을 먼저 조사. 현재 client-side 게이팅 0(`/api/ai/*` Bearer 만) → GP/KCos 노출 시 비용·권한 정책 필수.
3. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1` (3순위)** — credit/reward 지급 조건·budget/wallet/ledger 는 별도 작업선. 강사 UI 가 view-only 인 현 구조의 지급 주체(backend/operator)·정책을 먼저 정의.
4. **(후속) `WO-O4O-LMS-KCOS-INSTRUCTOR-EDITOR-PHASE1B-V1`** — KCos editor 를 form shell + lesson manager 위에 신규 구축(퀴즈/과제는 KEEP 결정에 따름).

## 13. Neture 제외 확인

- Neture 는 LMS 강사 editor 대상 아님(route/메뉴/import 0). 본 IR 미조사·미수정. 퀴즈/과제/AI 는 KPA `pages/instructor/courses/**` 국한, operator-core-ui 미반영(공통 모듈에 넣지 않음). Neture transitive 위험 0.

## 14. 검증 (이 IR 자체)

- [x] 문서 1개만 생성(`docs/investigations/IR-O4O-LMS-INSTRUCTOR-QUIZ-ASSIGNMENT-DESIGN-V1.md`)
- [x] 코드/package.json/pnpm-lock/Dockerfile/backend/DB/migration 변경 없음(read-only)
- [x] KPA Quiz(§4)/과제·채점(§5)/AI(§6) 구조 + GP/KCos 미구현(§7) + credit 결합(§8) + API(§9)
- [x] 분류 A~E(§10) / 위험(§11) / 권장(§12, **1순위 KEEP**) / Neture 제외(§13)
- [x] "공통화하지 않는 것이 맞는 영역"(C/KEEP) 명시

---

*End of IR-O4O-LMS-INSTRUCTOR-QUIZ-ASSIGNMENT-DESIGN-V1*
