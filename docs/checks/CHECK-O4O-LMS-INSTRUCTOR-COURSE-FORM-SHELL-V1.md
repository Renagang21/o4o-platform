# CHECK-O4O-LMS-INSTRUCTOR-COURSE-FORM-SHELL-V1

> **작업명:** WO-O4O-LMS-INSTRUCTOR-COURSE-FORM-SHELL-V1
> **유형:** 강사 강의 **기본정보 form** 공통 `InstructorCourseFormShell` 추출 (frontend-only)
> **결과: PASS** — KPA `CourseNewPage`(이미 props-driven)를 canonical 로 순수 form UI shell `InstructorCourseFormShell`(@o4o/operator-core-ui) 추출. **KPA(create) + GlycoPharm(edit 기본정보) 적용**, **K-Cosmetics 미적용**(editor 미구축, Phase 1-B). shell 은 API client 미import — 저장(create/update)·라우팅·재조회는 wrapper 책임. operator-core-ui 신규 모듈 + KPA + GP typecheck 0. backend/package.json/Dockerfile/Neture/KCos 무변경.
> **선행:** `IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1`(§12 1순위 권장) · `WO-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1`(목록 축)
> **작성일:** 2026-06-14 · 기준 HEAD `1b5cd3d72`

---

## 1. 목적

강사 editor 축의 **가장 작고 정렬된 슬라이스**(IR-EDITOR-SCOPE §2 "B → 1순위") = 강의 기본정보 form(title/desc/visibility/approval/reusablePolicy/tags + save)을 config-driven **순수 form shell** 로 추출. KPA·GP 동일 필드. 레슨/퀴즈/과제/AI/발행·검수 flow/reward 는 범위 밖.

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/operator-core-ui/src/modules/instructor-course-form/InstructorCourseFormShell.tsx` | **신규** — 순수 form UI shell(config 토글 + onSubmit 주입, API client 미import) |
| `packages/operator-core-ui/src/modules/instructor-course-form/index.ts` | **신규** — re-export |
| `packages/operator-core-ui/src/index.ts` | shell + 타입 export |
| `services/web-kpa-society/src/pages/instructor/courses/CourseNewPage.tsx` | 272줄 → **95줄**(page chrome + onSubmit 만 유지, form 은 shell 위임) |
| `services/web-glycopharm/src/pages/instructor/InstructorCourseEditPage.tsx` | edit 기본정보 card 의 필드·저장 행 → shell 로 교체(상태 flow 버튼은 `extraActions` 슬롯). 기본정보 state/addTag/saveMsg 제거 |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** backend, DB/migration, K-Cosmetics(editor 미구축), Neture, package.json/pnpm-lock(operator-core-ui 이미 dep+source-direct), Dockerfile(이미 COPY), `@o4o/lms-ui`, 레슨/퀴즈/과제 editor·드래그·LessonModal·발행·검수 flow·reward.

## 3. 추출한 shell 구조 (경계 엄수)

`InstructorCourseFormShell`(@o4o/operator-core-ui `modules/instructor-course-form`):
- **순수 form UI** — 제목/설명/공개범위/강사승인(members 시)/매장자료함/태그 + 제출 버튼. inline 스타일(KPA canonical).
- **API client 직접 import 0** — 저장은 wrapper 가 주입한 `onSubmit(values)` 가 담당. shell 은 submitting/성공·실패 표시만 소유.
- **페이지 chrome 미렌더** — page padding/back link/제목 없음(임베드 가능). 헤더는 wrapper 책임.
- **review flow 무지** — 발행/검수/아카이브 등 부가 액션은 `extraActions` 슬롯으로 wrapper 가 주입.

```ts
interface InstructorCourseFormValues { title; description; visibility:'public'|'members'; requiresApproval; reusablePolicy:'restricted'|'platform'|'organization'; tags: string[] }
interface InstructorCourseFormConfig {
  accent?; submitLabel?; submittingLabel?; successMessage?;   // 표시
  requireDescription?; requireTags?;                          // 검증(KPA create: 둘 다 true)
  fields?: { visibility?; requiresApproval?; reusablePolicy?; tags? };  // 토글(기본 전부 노출)
}
props: { config?; initialValues?; onSubmit(values)=>Promise|void; onCancel?; extraActions?: ReactNode; disabled? }
```

## 4. KPA / GP 적용 결과

| | KPA `CourseNewPage` (create) | GlycoPharm `InstructorCourseEditPage` (edit 기본정보) |
|---|---|---|
| onSubmit | `lmsInstructorApi.createCourse` + 라우팅(`redirectAfterCreate`/state) | `lmsApi.instructorUpdateCourse`(실패 시 throw → shell 에러) |
| accent | `#4f46e5` | `#16a34a`(C.primary) |
| submitLabel | 강의 생성 | 저장 |
| requireDescription / requireTags | **true / true** | false / false |
| successMessage | —(라우팅 이탈) | **저장되었습니다.**(shell 이 2초 표시) |
| onCancel | 강의 목록 복귀 | — |
| extraActions | — | **승인 요청 / 검토 중 / 강의 종료**(상태 flow — shell 밖, wrapper 주입) |
| 헤더 | wrapper(page+backLink+title) | wrapper(section title+상태 배지+반려/검토/공개 배너) |

- KPA: props(pageTitle/returnTo/redirectAfterCreate/contentKind) 보존, 페이지 chrome 유지, 내부 form 만 shell.
- GP: 기본정보 state(form/tags/tagInput/visibility/requiresApproval/reusablePolicy/saving/saveMsg)·addTag 제거 → shell 이 소유. `loadData` 는 course/lessons 만 set, 기본정보는 `initialValues`(course)로 주입. 상태 banner·badge·레슨·드래그·LessonModal·발행/검수/종료 버튼 **불변**.

## 5. K-Cosmetics 미적용 (사유)

KCos 는 강사 editor(강의 생성/편집 화면) **자체가 없음**(IR-EDITOR-SCOPE §6, Phase 1-B 미구축). 적용 대상 화면 부재 → 본 WO 미적용. KCos editor 신규 구축 시(`WO-O4O-LMS-KCOS-INSTRUCTOR-EDITOR-PHASE1B-V1`) 본 shell 위에 올린다.

## 6. GP create-bootstrap 미적용 (스코프 명확화)

GP `isNew` 분기의 **생성 부트스트랩 폼**(제목+설명만, 생성 후 edit 에서 나머지 입력)은 공통 필드셋과 다른 최소 surface → 이번 추출 대상 아님(불변). GP 의 **공통 필드셋(visibility/approval/reusablePolicy/tags)을 가진 기본정보 form 은 edit 뷰** 이며 그곳에 shell 적용.

## 7. 범위 밖 유지(미혼입) 확인

- **레슨/퀴즈/과제 editor·채점·드래그·LessonModal·CourseStructureAiModal:** 미변경(GP 레슨 섹션 그대로).
- **발행/검수/아카이브 flow:** shell 에 미포함 — `extraActions` 슬롯으로 wrapper 가 주입(shell 은 status 모름).
- **reward/credit:** shell 에 필드·액션 0.
- **RichTextEditor/AiContentModal:** 이미 `@o4o/content-editor` 공유 — 재작업 0.

## 8. Neture / 의존 경계

- shell 은 `@o4o/lms-ui` 미import — Neture transitive LMS UI 소비 없음. operator-core-ui 는 Neture 도 소비하나 Neture 가 강사 editor route/메뉴 미참조 → `InstructorCourseFormShell` 미소비. Neture 미수정. serviceKey hardcode 0, 저장 로직 주입식.

## 9. 검증 결과

- **TypeScript:** `@o4o/operator-core-ui` 신규 모듈 **0**(패키지 잔존 1건은 `@o4o/error-handling` dep 의 `import.meta.env` 사전 에러, 무관). `web-kpa-society` **0**, `web-glycopharm` **0**.
- **정적:** KPA(95줄)·GP(기본정보 card)가 `InstructorCourseFormShell` 소비, shell API client/serviceKey 직접 import 0. operator-core-ui→lms-ui import 0. KCos 미수정.
- **무변경:** backend, package.json/pnpm-lock, Dockerfile(operator-core-ui 이미 COPY·dep — 신규 의존 0), Neture.
- **browser smoke:** 미수행 — 배포 후 KPA `/instructor/courses/new`(생성: 제목/설명/공개범위/승인/자료함/태그·필수검증) · GP `/instructor/courses/:id`(기본정보 저장 + 승인요청/종료 버튼 공존) 렌더 확인 권장.

## 10. 후속 작업

1. **`WO-O4O-LMS-INSTRUCTOR-LESSON-LIST-MANAGER-V1`**(IR-EDITOR-SCOPE §12 2순위) — 레슨 목록+drag-reorder+add shell, LessonModal/editor 는 slot/render-prop 주입.
2. **`IR-O4O-LMS-INSTRUCTOR-QUIZ-ASSIGNMENT-DESIGN-V1`** — QuizBuilder·AssignmentEditor·과제 채점(KPA-only) 별도 설계.
3. **`WO-O4O-LMS-KCOS-INSTRUCTOR-EDITOR-PHASE1B-V1`** — KCos editor 를 본 shell + (후속)lesson manager 위에 신규 구축.
4. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — credit/reward 별도 작업선.

## 11. 완료 판정

**PASS.** 강사 강의 기본정보 form 을 KPA canonical 로 순수 `InstructorCourseFormShell`(API client 미import, config/props-driven) 추출, KPA(create)+GP(edit 기본정보) 적용. 저장 로직은 wrapper, 발행·검수 등 부가 액션은 `extraActions` 슬롯 → shell 경계 유지. KCos 미적용(editor 부재). serviceKey hardcode·lms-ui 의존·Neture 소비 없음, backend/package/Dockerfile 무변경, typecheck 0. editor 축 "기본정보 form" 단추 완료 — 레슨/퀴즈/과제 는 후속 분리.
