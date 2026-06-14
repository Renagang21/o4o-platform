# IR-O4O-LMS-INSTRUCTOR-COMMON-MODULE-SCOPE-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** KPA/GP/KCos LMS **강사(instructor)** 화면을 어디까지 공통 모듈화할지 결정한다. KPA reference 를 어디까지 추출하고 KCos(미구축)를 그 위에 어떻게 올릴지 판단.
> **작성일:** 2026-06-13 · 기준 HEAD `c02fa33bb`
> **선행:** `IR-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1` · `WO-O4O-LMS-OPERATOR-COURSES-MANAGER-EXTRACTION-V1`(운영자 승인 공통화 완료)

---

## 1. 목적

사용자-facing + 운영자 강의 승인 공통화 완료 후, 남은 강사 화면의 공통화 경계를 정한다. 강사 축은 성숙도 비대칭이 커서 "3개 단순 병합"이 아니라 **KPA reference 모듈 정의 → KCos build-on** 흐름이 안전한지 검증. read-only.

## 2. 결론 요약

| 강사 surface | 3서비스 상태 | 판정 |
|------|------|:---:|
| **강의 목록** | KPA(BaseTable+RowActionMenu+bulk) / GP(raw table+inline action) / KCos(read-only Tailwind) — **존재하나 구현 분기** | **A/B → 1순위 manager 추출**(KPA reference, 운영자 패턴 재사용) |
| 강사 대시보드 | KPA(KPI+pending+profile) / GP(KPI+pending) / KCos(최소) | B (config shell) |
| 강의 생성/편집·레슨 | KPA ✅ / GP ✅ / KCos ❌ | C (editor — 별도 scope IR) |
| 퀴즈 빌더 | KPA ✅ / GP ❌ / KCos ❌ | C |
| 과제 에디터·채점 | KPA ✅(LessonSubmissions+GradingModal) / GP ❌(AI는 learner측) / KCos ❌ | C |
| 참여자 관리 | KPA ✅(+CSV+credit) / GP ⚠️(bulk 없음) / KCos ❌ | B(+credit은 D) |
| AI(구조생성/콘텐츠) | KPA(구조생성+content modal) / GP(content modal) / KCos ❌ | C |
| credit/reward 표시·지급 | KPA participants 에 존재 | **D (reward 작업선)** |

**핵심:** 강사 화면은 **KPA(풀) ≫ GP(부분, 퀴즈/채점 없음) ≫ KCos(~15%, read-only)**. "3개 수렴" 불가(KCos 미구축). → **(1) 강의 목록부터 KPA reference manager 추출(운영자 패턴 동일, 가장 정렬·저위험), (2) editor(생성/편집/레슨/퀴즈/과제)는 분기·고결합이라 별도 scope IR, (3) KCos Phase 1-B 는 추출된 공통 모듈 위에 build, (4) credit/reward 는 D.**

## 3. 선행 LMS 공통화 상태

사용자-facing(LmsHubTemplate hub·accent·visibility·LessonList·CourseProgressBar) + 운영자 강의 승인(`OperatorLmsCoursesManager` @ operator-core-ui) 완료. Neture 제외. 강사 축이 마지막 남은 큰 영역.

## 4. KPA 강사 화면 현황 (reference)

`services/web-kpa-society/src/pages/instructor/**` (11 파일, **inline styles**):
- `courses/CourseListPage` — `@o4o/ui BaseTable` + RowActionMenu(edit/delete) + ActionBar(bulk delete).
- `courses/CourseNewPage` / `CourseEditPage` — 폼(title/desc/visibility/approval/reusablePolicy/tags) + 레슨 drag-reorder + `LessonModal` + `QuizBuilder` + `AssignmentEditor` + AI 구조생성(`CourseStructureAiModal`) + GuideBlock + RichTextEditor + AiContentModal.
- `courses/QuizBuilder`, `courses/AssignmentEditor`, `courses/LessonSubmissionsPage`(GradingModal).
- `ContentParticipantsPage` — 참여자(요약/필터/진도/**credit 지급**/CSV).
- `InstructorDashboardPage` — KPI + pending enroll + instructor profile.
- `operations/OperationsCourseListPage`/`OperationsCourseDetailPage` — 운영 통계(KPA 고유).

## 5. GlycoPharm 강사 화면 현황

`services/web-glycopharm/src/pages/instructor/**` (4 파일, **inline styles**):
- `InstructorCoursesPage`(raw `<table>` + inline edit/enrollments/delete), `InstructorCourseEditPage`(RichTextEditor + LessonModal), `InstructorEnrollmentsPage`(참여자, bulk 없음), `InstructorDashboardPage`(KPI+pending).
- **없음:** 퀴즈 빌더, 과제 채점(AI 채점은 learner-side `LmsLessonPage`), 운영 통계, CSV/credit.

## 6. K-Cosmetics 강사 화면 현황

`services/web-k-cosmetics/src/pages/instructor/**` (2 파일, **Tailwind**):
- `InstructorCoursesPage`(**read-only 목록, row action 없음** — grep 확인), `InstructorDashboardPage`(최소 카드).
- **없음:** 생성/편집/레슨/퀴즈/과제/참여자. 주석상 "KPA instructor 구조 도입 전 Phase 1-B 보류".

## 7. API / client 공통성

- **backend 공통:** `/api/v1/lms/instructor/*` + `/lms/courses`·`/lms/lessons`·`/lms/quizzes`·`/lms/assignments`·submissions·enrollments — 3서비스 동일(service-neutral). KCos backend 도 존재(frontend 미구축일 뿐).
- 각 서비스 api/lms(-instructor).ts 가 동일 endpoint 래핑. KCos 는 `getInstructorCourses` 만 사용 중(나머지 미소비).
- → **공통화는 frontend-only 가능**(backend 변경 불요). KCos 는 동일 endpoint 위에 UI 만 build 하면 됨.

## 8. 공통화 후보 A~E

- **A/B (강의 목록·대시보드 shell):** 강사 강의 목록 → KPA reference 로 `InstructorCoursesManager`(config-driven: api adapter·row actions·detail route) 추출. 운영자 추출과 동일 패턴. KCos 는 read-only → 채택 시 action 획득, GP raw table → 채택. 대시보드 shell 은 B(KPI 카드 config).
- **C (editor):** 생성/편집/레슨/퀴즈빌더/과제에디터·채점/AI. RichTextEditor·drag-reorder·quiz·assignment·AI 고결합 + GP/KCos 미구현 → **별도 scope IR 후 단계적**.
- **D (보류):** participants 의 credit 지급·reward 표시, rewardPolicy UI, 강사 지갑/budget/ledger → reward 작업선.
- **E (제외):** Neture 강사(LMS 대상 아님), YouTube/LIVE, 결제.

## 9. credit/reward 보류 기준

KPA `ContentParticipantsPage` 의 credit 지급/reward 상태/CSV 는 강사 reward budget 흐름과 직접 연결 → 본 강사 모듈 공통화에서 **분리**. 참여자 **목록/진도/상태** shell 은 B 로 공통화 가능하되, **credit/reward 컬럼·액션은 D 슬롯**으로 분리(`IR-O4O-REWARD-BUDGET-FLOW-...`).

## 10. Neture 제외 확인

- Neture 강사 LMS 화면 없음(LMS 대상 아님). 본 IR 미조사·미수정. 강사 공통 모듈을 어디에 두든(operator-core-ui 등) Neture 가 강사 LMS route/메뉴를 참조하지 않으므로 소비 안 함. `@o4o/lms-ui` 와 무관(Neture transitive 위험 없음).

## 11. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | 강사 화면을 "3개 수렴"으로 접근 → KCos 미구축이라 억지 통합 | KPA reference 모듈 → KCos build-on(순서 고정) |
| R2 | 강의 목록조차 구현 분기(KPA BaseTable / GP raw / KCos read-only) — 운영자만큼 깨끗하지 않음 | KPA(BaseTable+RowActionMenu) 를 canonical 로, GP/KCos 가 채택(LmsHubTemplate 정렬 방식) |
| R3 | editor 공통화를 너무 일찍 → RichText/AI/quiz/assignment 고결합 회귀 | C 분리, 별도 scope IR |
| R4 | credit/reward 혼입 | D 분리 |
| R5 | 스타일 비대칭(KPA·GP inline / KCos Tailwind) | manager 추출 시 inline 기준(운영자 manager 와 동일 패키지 패턴) |

## 12. 권장 다음 WO

**1순위(가장 정렬·저위험, 운영자 패턴 재사용):** `WO-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1`
- KPA `CourseListPage`(BaseTable+RowActionMenu+bulk) 를 config-driven `InstructorCoursesManager`(@o4o/operator-core-ui 또는 적절 위치)로 추출. api adapter·row actions(edit/delete)·detail route·생성 CTA 주입. KCos read-only → 채택(action 획득), GP → 채택. `OperatorLmsCoursesManager` 추출과 동형.

**2순위(분리 조사):** `IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1`
- 생성/편집/레슨/퀴즈/과제/AI editor 공통화 가능 범위·단계 조사(고결합 — 신중).

**3순위:** `WO-O4O-LMS-KCOS-INSTRUCTOR-PHASE1B-ON-COMMON-MODULE-V1`
- 위 공통 모듈 안정화 후 KCos Phase 1-B(생성/편집/레슨…)를 **공통 모듈 위에 신규 구축**(bespoke 후 재수렴 회피).

**별도 작업선:** `IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`(credit/reward).

## 13. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-LMS-INSTRUCTOR-COMMON-MODULE-SCOPE-V1.md`)
- [x] 코드/package/lock/Dockerfile/backend 변경 없음 (read-only)
- [x] KPA(§4)/GP(§5)/KCos(§6) 강사 화면 현황 + 성숙도 표(§2)
- [x] API 공통성(§7) / 분류 A~E(§8) / credit·reward 보류(§9) / Neture 제외(§10) / 위험(§11) / 권장 WO(§12)

---

*End of IR-O4O-LMS-INSTRUCTOR-COMMON-MODULE-SCOPE-V1*
