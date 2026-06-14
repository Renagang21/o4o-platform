# CHECK-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1

> **작업명:** WO-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1
> **유형:** 강사 강의 목록 화면 공통 `InstructorCoursesManager` 추출 (frontend-only)
> **결과: PASS** — KPA `CourseListPage`(BaseTable+RowActionMenu+bulk)를 canonical 로 config-driven `InstructorCoursesManager`(@o4o/operator-core-ui) 추출. **KPA + GlycoPharm 적용**(wrapper 44/45줄, 기존 357/206줄), **K-Cosmetics 는 보류**(read-only 최소·Phase 1-B — §6). KPA/GP 기능 보존(검색·bulk·완료율·수강자 action 은 config 토글). operator-core-ui 신규 모듈 + KPA + GP typecheck 0. backend/package.json/Dockerfile/Neture/KCos 무변경.
> **선행:** `IR-O4O-LMS-INSTRUCTOR-COMMON-MODULE-SCOPE-V1`(1순위) · `WO-O4O-LMS-OPERATOR-COURSES-MANAGER-EXTRACTION-V1`(동형 패턴)
> **작성일:** 2026-06-13 · 기준 HEAD `a8b6ca227`

---

## 1. 목적

강사 축 첫 단계 — 강의 목록만 작게 공통화. 운영자와 달리 3서비스 구현이 분기(KPA BaseTable+bulk / GP raw table+검색+완료율+수강자 / KCos read-only)하므로 **KPA 를 canonical 로 config-driven manager 추출**, GP 가 자기 옵션으로 채택, KCos 는 미성숙이라 보류(Phase 1-B 에서 공통 모듈 위에 build).

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/operator-core-ui/src/modules/instructor-courses/InstructorCoursesManager.tsx` | **신규** — 공통 manager(KPA canonical, config-driven) |
| `packages/operator-core-ui/src/modules/instructor-courses/index.ts` | **신규** — re-export |
| `packages/operator-core-ui/src/index.ts` | manager + 타입 export |
| `services/web-kpa-society/src/pages/instructor/courses/CourseListPage.tsx` | 357줄 → **44줄 thin wrapper** |
| `services/web-glycopharm/src/pages/instructor/InstructorCoursesPage.tsx` | 206줄 → **45줄** |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** backend, DB/migration, K-Cosmetics(보류), Neture, package.json/pnpm-lock(operator-core-ui 이미 dep+source-direct), Dockerfile(이미 COPY), `@o4o/lms-ui`, 강사 editor/lesson/quiz/assignment/participants.

## 3. 추출한 manager 구조

`InstructorCoursesManager`(@o4o/operator-core-ui `modules/instructor-courses`): `@o4o/ui BaseTable` + RowActionMenu + (옵션)ActionBar bulk. 헤더(대시보드 back + 제목 + 새 강의 CTA), (옵션)검색, 상태 배지, 썸네일/강의명(+설명)/상태/수강생/(옵션)완료율/(옵션)생성일 컬럼, row action(edit/participants/delete), empty CTA, row click → 관리 페이지. serviceKey hardcode 0, API client 직접 import 0.

## 4. config / API adapter 구조

```ts
interface InstructorCoursesConfig {
  api: { list(): Promise<InstructorCourse[]>; delete(id): Promise<unknown>; };
  routes: { dashboard; create; edit(id); manage(id); participants?(id); };
  accent?;              // 새 강의 버튼/선택 색 (기본 #4f46e5)
  search?;              // 제목 검색 (기본 false)
  bulkDelete?;          // 선택+선택삭제 (기본 false)
  rowActions?;          // ['edit','participants','delete'] (기본 ['edit','delete'])
  columns?: { description?; createdAt?; completionRate?; };
}
```
- `InstructorCourse` view type(id/title/status/thumbnail/description/enrollmentCount/completionRate/createdAt). **envelope·필드 매핑은 wrapper 의 `api.list` 책임**(KPA `currentEnrollments`·`res.data.data` / GP `enrolledCount`·`res.data`).

## 5. KPA / GP 적용 결과

| | KPA | GlycoPharm |
|---|---|---|
| api.list | `lmsInstructorApi.myCourses` → map | `lmsApi.getInstructorCourses` → map |
| api.delete | `lmsInstructorApi.deleteCourse` | `lmsApi.instructorDeleteCourse` |
| accent | `#4f46e5` | `#16a34a` |
| search | off | **on** |
| bulkDelete | **on** | off |
| rowActions | edit, delete | edit, **participants**, delete |
| columns | description, createdAt | completionRate |
| edit route | `/instructor/courses/:id/edit` | `/instructor/courses/:id` |

→ KPA: bulk 선택삭제·생성일·설명 보존. GP: 검색·완료율·수강자 action 보존. **기능 손실 없이 config 로 차이 흡수.**

## 6. K-Cosmetics 보류 결과 (적용 보류 + 사유)

KCos `InstructorCoursesPage` 는 **read-only 최소 뷰**(Tailwind, 컬럼=제목/카테고리/레슨/수강, 상태=공개/비공개 binary, row action·생성·검색·bulk 없음, 주석 "Phase 1-B 에서 행 액션/신규/편집 추가"). manager(KPA canonical) 와 컬럼·상태·스타일·기능이 상이하고, 곧 Phase 1-B 로 재구축 예정 → **이번 WO 에서 보류**(WO §4 KCos "적용 보류 후 CHECK 기록" 경로). KCos 는 `WO-O4O-LMS-KCOS-INSTRUCTOR-PHASE1B-ON-COMMON-MODULE-V1` 에서 **공통 manager 위에 신규 구축**한다(IR 권장 #3).

## 7. 유지/보류한 기능

- **유지:** 강의 목록 조회·삭제(개별/bulk)·검색·수정/수강자/삭제 action·생성 CTA·empty CTA·row click 관리 이동.
- **경미 정규화:** 상태 라벨 통일(published '공개', archived '보관됨' — KPA 기존 '발행됨'/'보관됨', GP '공개'/'종료' → 통일). 셀렉트 체크박스 색 accent 화. 기능 영향 없음.
- **보류(별도 작업선):** 강의 생성/편집 form, 레슨/퀴즈/과제 editor, 채점, 참여자 상세, credit/reward(D).

## 8. Neture / 의존 경계

- `operator-core-ui` 는 `@o4o/lms-ui` 미import — Neture transitive LMS UI 소비 없음. operator-core-ui 는 Neture 도 소비하나 Neture 가 강사 LMS route/메뉴 미참조 → `InstructorCoursesManager` 미소비. Neture 미수정. serviceKey hardcode 0, API 주입식.

## 9. 검증 결과

- **TypeScript:** `@o4o/operator-core-ui` 신규 모듈 **0**(패키지 잔존 1건은 `@o4o/error-handling` dep 사전 에러, 무관). `web-kpa-society` **0**, `web-glycopharm` **0**(본 변경; forum 타 세션 무관).
- **정적:** KPA(44줄)·GP(45줄) wrapper 가 `InstructorCoursesManager` 소비. manager serviceKey/lms client 직접 import 0. operator-core-ui→lms-ui import 0. KCos 미수정.
- **무변경:** backend, package.json/pnpm-lock, Dockerfile, Neture.
- **browser smoke:** 미수행 — 배포 후 KPA/GP `/instructor/courses` 목록·검색·row action·bulk(KPA)·수강자(GP) 렌더 확인 권장(삭제는 production 미실행).

## 10. 후속 작업

1. **`IR-O4O-LMS-INSTRUCTOR-EDITOR-SCOPE-V1`** — 강의 생성/편집·레슨·퀴즈 builder·과제 채점 공통화 범위 조사(고결합).
2. **`WO-O4O-LMS-KCOS-INSTRUCTOR-PHASE1B-ON-COMMON-MODULE-V1`** — KCos 강사 기능을 본 공통 manager 위에 신규 구축(목록부터: read-only → manager 채택 + action).
3. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — credit/reward 별도 작업선.

## 11. 완료 판정

**PASS.** KPA 강사 강의 목록을 canonical 로 공통 `InstructorCoursesManager`(config-driven) 추출, KPA+GP 적용(wrapper 44/45줄, 기능 config 흡수로 무손실), KCos 보류(Phase 1-B build-on). serviceKey hardcode·lms-ui 의존·Neture 소비 없음, backend/package/Dockerfile 무변경, typecheck 0. 강사 축 "첫 단추" — editor/lesson/quiz/assignment 는 후속 IR 로 분리.
