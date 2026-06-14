# CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V1

> **유형:** Read-only 종료 고정 CHECK (코드/package/lock/Dockerfile/backend/Neture 변경 없음, 문서 1개만 생성)
> **목적:** LMS UI 공통화 **1차 사이클**의 완료 상태를 한 장으로 고정한다. 사용자-facing + 운영자 + 강사 기본 축까지 공통화 완료, 퀴즈/과제/AI 는 "공통화하지 않음" 판정, reward 는 별도 작업선임을 명시.
> **작성일:** 2026-06-14 · 기준 HEAD `51a3ca274`
> **결과: 사이클 1 종료(CLOSED).** 다음 진전은 AI 정책 / reward budget / KCos editor Phase 1-B 중 하나를 **별도 작업선**으로 연다.

---

## 1. 목적

3 서비스(KPA-Society / GlycoPharm / K-Cosmetics) LMS 강사·운영자·사용자 화면을 **공통 구조 위로 정렬**하는 1차 사이클이 강사 editor 의 공통 shell 축까지 닫혔다. 추가 구현으로 바로 넘어가기 전에 **완료 범위·경계·보류 판정**을 고정해, 이후 작업이 이미 내린 결정을 재논의하지 않도록 한다. **Neture 는 전 구간 LMS 제외.**

## 2. 완료 범위 요약

| 축 | 공통 산출물 | 적용 | 경계 |
|----|------------|------|------|
| 사용자-facing hub | `LmsHubTemplate`(@o4o/shared-space-ui) + accent + visibility 배지 | KPA/GP/KCos | `@o4o/lms-ui` 미의존(Neture transitive 0) |
| 사용자-facing 부품 | `LessonList(row)` · `CourseProgressBar` · `CourseVisibilityBadge`(@o4o/lms-ui) | KPA/GP/KCos | inline presentational |
| 카드 primitive | `CourseCard/CourseList` | dormant(역할 명시) | hub 는 table 기반 — 카드 미사용 |
| 운영자 | `OperatorLmsCoursesManager`(@o4o/operator-core-ui) | KPA/GP/KCos | DataTable + 승인/반려/detail |
| 강사 목록 | `InstructorCoursesManager` | KPA/GP/KCos | config-driven |
| 강사 기본정보 form | `InstructorCourseFormShell` | KPA(create)/GP(edit) | 순수 UI, onSubmit 주입 |
| 강사 레슨 목록/순서 | `InstructorLessonListManager` | KPA/GP | API 주입, **LessonModal=renderEditor slot** |

## 3. 사용자-facing 공통화 결과

- `/lms` 목록 hub 는 3 서비스 모두 `LmsHubTemplate` 소비(table 기반 container). 서비스 색은 `accent` config, 공개/회원제는 visibility 배지(유형 컬럼 fallback 포함).
- 레슨 목록 = `LessonList(row)`, 진도 = `CourseProgressBar`, 공개범위 = `CourseVisibilityBadge` — 전부 `@o4o/lms-ui`(inline presentational, API client 0).
- `CourseCard/CourseList` 는 **dormant card primitive** 로 역할 명시(hub 가 table 기반이라 현재 미사용, 재도입 시 진입점).
- 근거: `CHECK-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1`, `CHECK-O4O-LMS-HUBTEMPLATE-SERVICE-ACCENT-V1`, `CHECK-O4O-LMS-GPKCOS-HUB-VISIBILITY-MAPPING-V1`, `CHECK-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1`, `IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1`.

## 4. 운영자 공통화 결과

- 강의 승인 화면 = `OperatorLmsCoursesManager`(@o4o/operator-core-ui) — DataTable + 승인/반려(사유 모달)/unpublish/archive/hardDelete + detail drawer, config 주입.
- 근거: `CHECK-O4O-LMS-OPERATOR-COURSES-MANAGER-EXTRACTION-V1`, `IR-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`.

## 5. 강사 공통화 결과

- **목록:** `InstructorCoursesManager` — KPA canonical, GP(검색/완료율/수강자) + KCos(read-only) config 흡수. 3 서비스 단일 manager.
- **기본정보 form:** `InstructorCourseFormShell` — 순수 form UI(title/desc/visibility/approval/reusablePolicy/tags), 저장은 wrapper onSubmit, review flow 는 extraActions slot. KPA create / GP edit 적용.
- **레슨 목록/순서:** `InstructorLessonListManager` — 목록·순번·drag-reorder·추가/편집/삭제 trigger·empty. 삭제/순서 API 주입, **LessonModal 은 `renderEditor` render-prop slot** 으로 wrapper 소유. KPA/GP 적용.
- **LessonModal/editor:** 공통 shell 이 소유하지 않음 — 각 서비스 wrapper 가 slot 으로 주입(KPA quiz/assignment/AI 포함, GP video/article).
- 근거: `CHECK-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1`, `CHECK-O4O-LMS-KCOS-INSTRUCTOR-PHASE1B-ON-COMMON-MODULE-V1`, `CHECK-O4O-LMS-INSTRUCTOR-COURSE-FORM-SHELL-V1`, `CHECK-O4O-LMS-INSTRUCTOR-LESSON-LIST-MANAGER-V1`, `IR-O4O-LMS-INSTRUCTOR-COMMON-MODULE-SCOPE-V1`, `IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1`.

## 6. KEEP / reference 영역 (공통화하지 않음)

`IR-O4O-LMS-INSTRUCTOR-QUIZ-ASSIGNMENT-DESIGN-V1` 판정 — **단일 구현(KPA)·수렴 대상 없음·slot 으로 이미 분리** → 조기 추상화하지 않는다.

| 기능 | 판정 | 사유 |
|------|------|------|
| QuizBuilder(lesson 종속) | **KEEP reference(C)** | KPA 1개 구현, GP placeholder, KCos 무 |
| 과제 editor + 제출/채점(GradingModal, 수동) | **KEEP reference(C)** | 동일 — 수렴 대상 부재 |
| CourseStructureAiModal / AI 구조 생성 | **정책 IR 선행(D)** | `/api/ai/*` client 비용/quota/권한 게이팅 0 |

→ GP 가 quiz/assignment 를 **실제 구축(placeholder 해소)** 할 때, `renderEditor` slot **내부**에서 shell 추출(form/lesson 패턴 동일, 저비용). 그 전까지는 KPA reference 유지.

## 7. 별도 작업선 (LMS UI 공통화와 분리)

- **reward / credit / budget / wallet / ledger:** 강사 UI 는 **view-only**(보상·포인트 지급 *현황* 조회뿐, 지급 액션 없음 — 지급은 backend/자동). rewardPolicy/budget 은 instructor 측 미구현. → `IR-O4O-REWARD-BUDGET-FLOW-...` 작업선. LMS shell 에 credit 필드·액션 **미포함**(frontend 결합 0).
- **AI 비용/권한/노출 정책:** AI 구조 생성 공통화 전 선결. → `IR-O4O-LMS-AI-COURSE-STRUCTURE-POLICY-V1`.
- 근거: `CHECK-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1`, `CHECK-O4O-LMS-REWARD-POLICY-CONTRACT-STABILIZE-V1`, `IR-O4O-LMS-INSTRUCTOR-QUIZ-ASSIGNMENT-DESIGN-V1` §8/§12.

## 8. Neture exclusion 확인

- Neture 는 LMS 대상 아님(공급자/파트너/운영 기반). LMS route/메뉴/import 0 — 전 사이클 미수정.
- 공통 모듈 의존 경계: `@o4o/operator-core-ui` 및 `@o4o/shared-space-ui` 는 **`@o4o/lms-ui` 미import** → Neture 가 operator-core-ui/shared-space-ui 를 소비해도 LMS UI transitive 유입 0. 퀴즈/과제/AI 는 KPA `pages/instructor/courses/**` 국한(공통 모듈 미반영).
- 근거: `CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`.

## 9. 고정 결론 (재논의 금지)

1. LMS 공통화 1차 = **사용자-facing + 운영자 + 강사 기본 축(목록/form/레슨)까지 완료.**
2. **Neture 는 LMS 대상이 아니며 계속 제외.**
3. **KPA-only quiz/assignment/grading/AI 는 조기 추상화하지 않는다**(단일 구현 + slot 분리 — reference 유지).
4. **reward budget 은 LMS UI 공통화와 분리된 별도 작업선**(강사 UI view-only, 지급 backend/자동).
5. **KCos editor Phase 1-B 는 이미 추출된 `InstructorCourseFormShell` + `InstructorLessonListManager` 위에 build** 한다(bespoke 신규 금지).
6. **GP 가 quiz/assignment 실제 요구를 낼 때** KPA reference 에서 **slot 내부 공통화**를 검토(그 전 추측 추출 금지).

## 10. 남은 리스크

| # | 리스크 | 비고 |
|---|--------|------|
| R1 | 카드 primitive(`CourseCard/List`) dormant — 재도입 시 hub(table) 와 정합 필요 | 현재 미사용, 진입점만 보존 |
| R2 | KPA `CourseEditPage` 의 **기본정보 form 은 아직 form shell 미적용**(create 만 적용) | 필요 시 후속 WO(편집 form shell adoption) — 1차 범위 밖 |
| R3 | GP quiz/assignment placeholder 가 장기 방치되면 사용자 혼란 | GP 제품 요구 시 Phase 2 |
| R4 | AI `/api/ai/*` client 비용/권한 게이팅 부재 | 정책 IR 전 GP/KCos 노출 금지 |
| R5 | reward 지급 주체/정책 미정(backend 자동 추정) | reward 작업선에서 확정 |

## 11. 권장 후속 작업 (택1 별도 작업선)

1. **`IR-O4O-LMS-AI-COURSE-STRUCTURE-POLICY-V1`** — AI 구조 생성 비용/quota/권한/서비스 노출 정책 조사(공통화 선결).
2. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 강사 reward 예산/충전/배정/처리중/ledger 및 지급 주체 조사.
3. **`WO-O4O-LMS-KCOS-INSTRUCTOR-EDITOR-PHASE1B-V1`** — KCos editor 를 `InstructorCourseFormShell` + `InstructorLessonListManager` 위에 신규 build(퀴즈/과제는 §9-3 KEEP 따름).
4. **(선택) KEEP 별도 문서:** quiz/assignment reference 유지 결정은 본 closure §6/§9-3 에 충분히 포함 → `KEEP-...-AS-REFERENCE-V1` **별도 생성 불필요**(필요 시에만).

## 12. 검증 (이 CHECK 자체)

- [x] 문서 1개만 생성(`docs/checks/CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V1.md`)
- [x] 코드/package.json/pnpm-lock/Dockerfile/backend/DB/migration 변경 없음(read-only)
- [x] Neture 미수정 · `@o4o/lms-ui` 의존 경계 재확인(§8)
- [x] 완료 범위(§2~§5) / KEEP(§6) / 별도 작업선(§7) / 고정 결론(§9) / 리스크(§10) / 후속(§11)
- [x] 참조 문서는 repository 실제 파일명 기준 정렬

## 13. 완료 판정

**CLOSED.** LMS UI 공통화 1차 사이클(사용자-facing + 운영자 + 강사 목록/form/레슨 shell)을 종료 고정. 퀴즈/과제/채점/AI 는 단일 구현·slot 분리로 **공통화하지 않음(reference)**, reward/credit·AI 정책은 **별도 작업선**, Neture 는 **계속 제외**. 다음 진전은 AI 정책 IR / reward budget IR / KCos editor Phase 1-B 중 하나를 별도로 연다 — 본 사이클의 결정(§9)은 그 작업들에서 재논의하지 않는다.

---

*End of CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V1*
