# CHECK-O4O-LMS-INSTRUCTOR-LESSON-LIST-MANAGER-V1

> **작업명:** WO-O4O-LMS-INSTRUCTOR-LESSON-LIST-MANAGER-V1
> **유형:** 강사 강의 편집의 **레슨 목록·순서 관리** 공통 `InstructorLessonListManager` 추출 (frontend-only)
> **결과: PASS** — KPA `CourseEditPage` 레슨 섹션을 canonical 로 순수 목록/순서 shell `InstructorLessonListManager`(@o4o/operator-core-ui) 추출. **KPA + GlycoPharm 적용**, **K-Cosmetics 미적용**(editor 미구축, Phase 1-B). LessonModal/editor 는 shell 이 소유하지 않고 `renderEditor` render-prop 으로 wrapper 주입, 삭제/순서변경 API 는 `onDelete`/`onReorder` 주입. operator-core-ui 신규 모듈 + KPA + GP typecheck 0. backend/package.json/Dockerfile/Neture/KCos 무변경.
> **선행:** `IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1`(§12 2순위) · `WO-O4O-LMS-INSTRUCTOR-COURSE-FORM-SHELL-V1`(1순위 form shell)
> **작성일:** 2026-06-14 · 기준 HEAD `9e7640ed4`

---

## 1. 목적

editor 축 2순위(IR-EDITOR-SCOPE §2 "B → 2순위") = 강사 강의 편집의 **레슨 목록/순서 관리 영역**을 공통 shell 로 정리. 목록·순서·추가/편집/삭제 트리거·drag-reorder·empty 만 공통화하고, **LessonModal/editor(RichText·video·article·quiz·assignment·AI)는 slot/render-prop 주입**으로 고결합을 회피. KCos 는 editor 미구축이라 제외.

## 2. 선행 form shell 요약

직전 `WO-...-COURSE-FORM-SHELL-V1` 에서 강의 **기본정보 form**(title/desc/visibility/approval/reusablePolicy/tags)을 순수 `InstructorCourseFormShell` 로 추출(KPA create / GP edit). 본 WO 는 그 다음 축 = **레슨 목록**. (강사 목록 → `InstructorCoursesManager`, 기본정보 → form shell, **레슨 목록 → 본 manager** 순서로 editor 축이 작게 쌓임.)

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/operator-core-ui/src/modules/instructor-lesson-list/InstructorLessonListManager.tsx` | **신규** — 순수 목록/순서 shell(API client 미import, LessonModal 미소유) |
| `packages/operator-core-ui/src/modules/instructor-lesson-list/index.ts` | **신규** — re-export |
| `packages/operator-core-ui/src/index.ts` | manager + 타입 export |
| `services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx` | 레슨 섹션·드래그 핸들러·lessonModal state → manager. AI 버튼=headerExtra, LessonModal=renderEditor, CourseStructureAiModal(KPA 전용)은 wrapper 유지 |
| `services/web-glycopharm/src/pages/instructor/InstructorCourseEditPage.tsx` | 레슨 섹션·드래그 핸들러·lessonModal state → manager. LessonModal=renderEditor |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** backend, DB/migration, K-Cosmetics(editor 미구축), Neture, package.json/pnpm-lock(operator-core-ui 이미 dep+source-direct), Dockerfile(이미 COPY), `@o4o/lms-ui`, LessonModal 내부(RichText/video/article/quiz/assignment/AI)·기본정보 form·발행/검수 flow·reward.

## 4. 공통 manager 구조 (경계 엄수)

`InstructorLessonListManager`(@o4o/operator-core-ui `modules/instructor-lesson-list`), `forwardRef`:
- **렌더:** 섹션 헤더(제목+건수+`headerExtra` 슬롯) / empty 상태 / 레슨 카드(드래그 핸들 ⠿ · 순번 · 제목 · `타입 · N분/시간 미설정` 메타 · 편집/삭제) / 하단 추가 버튼.
- **drag-reorder:** `onReorder` 주입 시에만 활성(없으면 정적 목록). 재배열 목록을 wrapper 에 전달(낙관적 갱신·API·reload 는 wrapper).
- **추가/편집 modal open 상태만 소유** — 내용은 `renderEditor({ lesson, close })` render-prop 으로 wrapper 주입. `lesson` 은 목록 item(id 보유) → wrapper 가 자기 full lesson 을 `find(id)` 로 복원해 자체 LessonModal 에 주입.
- **외부 트리거:** `ref.openAdd()` (생성 배너 버튼이 호출).
- **API client/serviceKey/lms-ui import 0** — 삭제는 `onDelete(lesson)`, 순서는 `onReorder(list)`.

```ts
interface InstructorLessonListItem { id; title; type; duration?; order }
interface InstructorLessonListHandle { openAdd(): void }
props: {
  lessons; onReorder?(list); onDelete?(lesson);
  renderEditor({lesson|null, close}): ReactNode;        // LessonModal 주입
  lessonTypeLabel?; accent?; title?; headerExtra?;      // KPA AI 버튼 등
  emptyTitle?; emptyDesc?; addLabel?; emptyAddLabel?;
}
```

## 5. KPA 적용 결과 (canonical)

- 레슨 섹션 JSX·`handleDragStart/Over/Leave/Drop/End`·`dragIndexRef`/`dragOverIndex`·`lessonModal` state 제거 → manager.
- `onReorder=handleReorderLessons`(reorderLessons API + 낙관적 갱신), `onDelete=(l)=>handleDeleteLesson(l.id)`(confirm+API), `renderEditor=LessonModal`(courseId/nextOrder/onSaved keepOpen 유지 → quiz/assignment 신규 후 editor 유지 동작 보존).
- **KPA 전용 유지:** `headerExtra` = 🧱 AI로 강의 구조 만들기 버튼, `CourseStructureAiModal` 은 wrapper JSX 에 그대로(structureModalOpen). 생성 배너 버튼 → `lessonListRef.openAdd()`.
- **불변:** 기본정보 form(본 WO 범위 밖), QuizBuilder/AssignmentEditor(LessonModal 내부), 상태/발행/검수 flow.

## 6. GlycoPharm 적용 결과

- 레슨 섹션 JSX·드래그 핸들러·`lessonModal` state 제거 → manager. `onReorder/onDelete/renderEditor`(GP LessonModal: RichText+Ai+videoUrl) 주입. 생성 배너 → `openAdd()`. accent=`#16a34a`.
- **GP 미보유 기능 미노출:** AI 강의 구조 버튼 없음(headerExtra 미주입), quiz/assignment 빌더 없음(GP LessonModal 의 placeholder 그대로) → KPA-only 기능이 GP 로 새지 않음.

## 7. K-Cosmetics 미적용 (사유)

KCos 는 강사 editor(강의 편집/레슨 화면) 자체가 없음(IR-EDITOR-SCOPE §6, Phase 1-B 미구축). 적용 대상 부재 → 미적용. **`WO-O4O-LMS-KCOS-INSTRUCTOR-EDITOR-PHASE1B-V1` 에서 form shell + 본 lesson manager 위에 신규 build.**

## 8. slot / render-prop 경계

- **manager 소유:** 목록 렌더·순번·drag-reorder UI·추가/편집/삭제 트리거·modal open 상태·empty.
- **wrapper 소유(slot 주입):** LessonModal 전체(RichText/video/article/quiz/assignment/AI), 삭제·순서 API, 재조회, 생성 배너, KPA AI 구조 모달.
- LessonModal 은 `renderEditor` 로만 진입 → KPA(quiz/assignment 포함) / GP(video·article) 차이를 manager 가 알지 못함.

## 9. 포함 / 제외 기능

- **포함(공통화):** 레슨 목록·순번·drag-reorder·추가/편집/삭제 버튼·empty·헤더(건수+슬롯).
- **제외(미혼입):** LessonModal 내부, RichTextEditor/AiContentModal(이미 `@o4o/content-editor` 공유 — 재작업 0), QuizBuilder·AssignmentEditor·과제 채점(KPA-only), CourseStructureAiModal(KPA-only), 기본정보 form, 발행/검수 flow, reward/credit.

## 10. Neture / 의존 경계

- manager 는 `@o4o/lms-ui` 미import — Neture transitive LMS UI 소비 없음. operator-core-ui 는 Neture 도 소비하나 Neture 가 강사 editor route/메뉴 미참조 → manager 미소비. Neture 미수정. serviceKey hardcode 0, API 주입식.

## 11. backend 미수정 확인

- 레슨 CRUD/reorder API(`/lms/instructor/courses/:id/lessons`·`/lms/lessons`)는 기존 그대로 wrapper 가 호출. backend·DB·migration 변경 0.

## 12. 검증 결과

- **TypeScript:** `@o4o/operator-core-ui` 신규 모듈 **0**(패키지 잔존 1건은 `@o4o/error-handling` dep 의 `import.meta.env` 사전 에러, 무관). `web-kpa-society` **0**, `web-glycopharm` **0**.
- **정적:** KPA·GP 레슨 목록 기능(목록/순번/drag/추가/편집/삭제) 보존. manager API client/serviceKey/lms-ui import **0**(grep 확인). LessonModal 은 renderEditor 슬롯·wrapper 소유. quiz/assignment/AI/reward 미혼입.
- **무변경:** backend, package.json/pnpm-lock, Dockerfile(operator-core-ui 이미 COPY·dep — 신규 의존 0), Neture, K-Cosmetics.
- **browser smoke:** 미수행 — 배포 후 KPA `/instructor/courses/:id`(레슨 목록·drag·추가/편집 modal·AI 구조 버튼) · GP `/instructor/courses/:id`(레슨 목록·drag·video/article modal) 렌더 확인 권장(production write action 미실행).

## 13. 후속 작업

1. **`IR-O4O-LMS-INSTRUCTOR-QUIZ-ASSIGNMENT-DESIGN-V1`** — KPA-only 퀴즈/과제/채점/AI(QuizBuilder·AssignmentEditor·LessonSubmissions·CourseStructureAiModal) 공통화 범위·계약 별도 설계.
2. **`WO-O4O-LMS-KCOS-INSTRUCTOR-EDITOR-PHASE1B-V1`** — KCos editor 를 form shell + 본 lesson manager 위에 신규 구축.
3. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — credit/reward 별도 작업선.

## 14. 완료 판정

**PASS.** 강사 레슨 목록/순서 관리 영역을 KPA canonical 로 순수 `InstructorLessonListManager`(API client 미import, LessonModal 미소유 — renderEditor 슬롯) 추출, KPA+GP 적용. drag-reorder·삭제 API 는 wrapper 주입, KPA-only AI 구조 생성은 headerExtra+wrapper 모달로 분리(GP 미노출). KCos 미적용(editor 부재). serviceKey hardcode·lms-ui 의존·Neture 소비 없음, backend/package/Dockerfile 무변경, typecheck 0. editor 축 "기본정보 form + 레슨 목록 shell" 정리 완료 — 퀴즈/과제/AI 는 후속 별도 설계.
