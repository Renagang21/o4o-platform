# CHECK-O4O-LMS-KCOS-INSTRUCTOR-PHASE1B-ON-COMMON-MODULE-V1

> **작업명:** WO-O4O-LMS-KCOS-INSTRUCTOR-PHASE1B-ON-COMMON-MODULE-V1
> **유형:** K-Cosmetics 강사 강의 목록을 공통 `InstructorCoursesManager` 위에 build-on (frontend-only)
> **결과: PASS** — KCos bespoke read-only 테이블(105줄)을 공통 `InstructorCoursesManager`(@o4o/operator-core-ui) 소비로 전환(wrapper **38줄**). **3서비스(KPA/GP/KCos) 강사 목록이 모두 동일 manager** 위에 정렬. manager 에 backward-compatible 옵션(read-only: create/edit/manage/delete 선택화, category/lessonCount/thumbnail 컬럼 토글) 추가 → KPA/GP 무영향. operator-core-ui 모듈 + 3서비스 typecheck 0. KPA/GP wrapper·backend·package.json/Dockerfile·Neture 무변경.
> **선행:** `WO-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1`(manager 추출, KPA+GP 적용 / KCos 보류)
> **작성일:** 2026-06-13 · 기준 HEAD `2e851e1b0`

---

## 1. 목적

직전 WO 에서 추출된 공통 `InstructorCoursesManager`(KPA+GP 적용, KCos 보류) 위에 KCos 강사 목록을 올린다. bespoke 신규 구축이 아니라 공통 모듈 build-on. 강사 목록 화면만 대상.

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/operator-core-ui/src/modules/instructor-courses/InstructorCoursesManager.tsx` | **backward-compatible 옵션 추가**(read-only 지원): `routes.create/edit/manage` + `api.delete` 선택화, `columns.thumbnail/category/lessonCount` 토글, rowActions 빈 배열 시 action 컬럼 미노출 |
| `services/web-k-cosmetics/src/pages/instructor/InstructorCoursesPage.tsx` | bespoke read-only `<table>`(105줄) → `<InstructorCoursesManager config={...} />` **38줄** |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** KPA/GP 강사 목록 wrapper(manager 옵션 추가가 backward-compatible), backend, DB/migration, Neture, package.json/pnpm-lock/Dockerfile, `@o4o/lms-ui`, 강사 editor/lesson/quiz/assignment.

## 3. KCos 적용 결과 / 사용한 config

```ts
{
  accent: '#db2777',
  rowActions: [],                                  // 아직 edit/delete route·API 없음 → action 없음
  columns: { thumbnail: false, category: true, lessonCount: true },
  routes: { dashboard: '/instructor' },            // create/edit/manage 미보유 → 생성 CTA·row click 없음
  api: { list: getInstructorCourses → map },       // delete 미주입(read-only)
}
```
- `api.list`: `lmsApi.getInstructorCourses()` → `InstructorCourse[]`(id/title/status/category/lessonCount/enrollmentCount) 매핑.
- 결과: 공통 BaseTable shell + 상태 배지 + 카테고리/수강생/레슨 컬럼. 헤더(대시보드 back + 제목), 생성 CTA·row action·row click·검색·bulk **없음**(read-only, KCos 현행 동등).

## 4. 활성화한 기능 / 보류한 기능

- **활성화(공통 shell 획득):** 공통 BaseTable, 상태 배지(이전 binary 공개/비공개 → 정식 5-상태 라벨), 카테고리/수강생/레슨 컬럼, empty state, 대시보드 back.
- **보류(KCos 미보유 — 억지 생성 안 함):** 새 강의 생성 CTA, 수정/삭제 row action, 선택/bulk, 검색, row click 관리 이동 → **Phase 1-B 에서 route·API 추가 시 config 확장만으로 활성화**(manager 이미 지원).
- **범위 외:** 강의 생성/편집 form, 레슨/퀴즈/과제 editor·채점, 참여자/credit/reward.

## 5. manager 옵션 추가 (backward-compatible)

read-only 서비스 지원 위해 `InstructorCoursesManager` 에 추가(전부 optional → 기존 KPA/GP 동작 불변):
- `routes.create?` 없으면 생성 버튼·empty CTA 미노출. `routes.manage?` 없으면 row click 미활성. `routes.edit?` 없으면 수정 action 미노출.
- `api.delete?` 없으면 삭제 action·bulk 미노출.
- `rowActions: []` → action 컬럼 미노출.
- `columns.thumbnail?`(기본 true) / `columns.category?` / `columns.lessonCount?` 토글. `InstructorCourse` 에 `category?`·`lessonCount?` 추가.
- **KPA/GP wrapper 미변경**(create/edit/manage/delete 주입 그대로 → 기존 렌더 동일). typecheck 0 으로 무회귀 확인.

## 6. KPA / GP / Neture 미수정 확인

- KPA `CourseListPage`·GP `InstructorCoursesPage` wrapper **미변경**(git status — manager + KCos 만). manager 옵션 추가는 backward-compatible(KPA/GP typecheck 0).
- Neture 미수정, `operator-core-ui`→`@o4o/lms-ui` import 0(Neture transitive 없음). serviceKey hardcode 0.

## 7. 검증 결과

- **TypeScript:** `@o4o/operator-core-ui` instructor-courses 모듈 **0**(패키지 잔존 1건은 `@o4o/error-handling` dep 사전 에러, 무관). `web-k-cosmetics` **0**, `web-kpa-society` **0**, `web-glycopharm` **0**.
- **정적:** KCos wrapper(38줄)가 `InstructorCoursesManager` 소비, bespoke `<table>` 제거. KPA/GP wrapper 미변경. manager serviceKey/lms client import 0. operator-core-ui→lms-ui 0.
- **무변경:** backend, package.json/pnpm-lock, Dockerfile, Neture.
- **browser smoke:** 미수행 — 배포 후 KCos `/instructor/courses` 목록(카테고리/수강생/레슨 컬럼·상태 배지) 렌더 확인 권장.

## 8. 후속 작업

1. **`IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1`** — 강의 생성/편집·레슨·퀴즈 builder·과제 채점 공통화 범위 조사.
2. **`WO-O4O-LMS-INSTRUCTOR-COURSES-MANAGER-POLISH-V1`** — 3서비스 강사 목록 copy/action/empty/컬럼 정리(선택).
3. **(KCos Phase 1-B 후속)** KCos create/edit/delete route·API 추가 시 config 에 routes/api.delete/rowActions 확장 → manager 그대로 활성화.
4. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — credit/reward 별도 작업선.

## 9. 완료 판정

**PASS.** KCos 강사 강의 목록을 공통 `InstructorCoursesManager` 위에 build-on(read-only config, 38줄). **3서비스 강사 목록 축이 단일 manager 로 정렬 완료.** manager 옵션은 backward-compatible(KPA/GP 무영향, typecheck 0). serviceKey hardcode·lms-ui 의존·Neture 소비 없음, backend/package/Dockerfile 무변경. KCos Phase 1-B(생성/편집/삭제)는 route·API 추가 시 config 확장만으로 manager 활성화.
