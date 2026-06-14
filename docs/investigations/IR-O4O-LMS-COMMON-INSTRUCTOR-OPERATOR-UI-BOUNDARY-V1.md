# IR-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** KPA/GP/KCos 의 LMS **강사(instructor)** · **운영자(operator)** 관리 화면 공통화 경계를 조사하고 다음 WO 범위를 정한다. (사용자-facing 축은 이미 공통화 완료)
> **작성일:** 2026-06-13 · 기준 HEAD `53dddc842`
> **선행:** 사용자-facing LMS 공통화 1차 사이클 완료(LmsHubTemplate hub · LessonList · CourseProgressBar · accent · visibility · CourseCard dormant · Neture 제외)

---

## 1. 목적

사용자 화면 공통화 후, 강사/운영자 관리 화면의 공통화 가능 영역·보류 영역을 분리한다. read-only.

## 2. 결론 요약

| 영역 | 3서비스 현황 | 판정 |
|------|------|:---:|
| **운영자 강의 승인/관리**(OperatorLmsCoursesPage) | **3서비스 이미 near-identical** — 전부 `@o4o/operator-ux-core DataTable` + `@o4o/ui RowActionMenu/ActionBar/BaseDetailDrawer/BulkResultModal` + `defineActionPolicy`/`buildRowActions`/`useBatchAction`, 동일 `/lms/operator/*` backend. KCos/GP 가 KPA 에서 ported | **B (config-driven 공통 모듈 추출 가능)** |
| **운영자 강사자격 심사**(QualificationRequests) | KPA ✅ / GP ✅(glycopharm-scoped API) / **KCos ❌ 없음** | **B/C** |
| **강사 강의 목록/생성/편집/레슨** | KPA 풀 / GP 부분 / **KCos 거의 없음(read-only list만, Phase 1-B 보류)** — 성숙도 비대칭 | **C (KPA reference, KCos 미구축)** |
| **퀴즈 빌더 / 과제 채점 / AI 채점** | KPA 풀(QuizBuilder/AssignmentEditor/LessonSubmissions) / GP 부분(quiz·assignment 빌더 미구현) / KCos 없음 | **C/D (에디터 고결합)** |
| **강사 참여자/크레딧 관리** | KPA 풀(participants+CSV+credit) / GP 부분 / KCos 없음 | **D (reward/credit — 별도 작업선)** |
| **스타일 비대칭** | 운영자=전부 Tailwind(operator-ux-core) / 강사=KPA·GP inline, KCos Tailwind | 공통화 시 정렬 필요 |

**핵심:** 운영자 강의 승인 화면은 **이미 같은 shared 컴포넌트·backend 로 near-identical** → page-level 중복(상태 config·action policy·reject modal)만 3× 존재. **config-driven 공통 모듈 추출이 가장 깔끔한 다음 단계(B).** 반면 **강사 화면은 성숙도가 KPA≫GP≫KCos 로 비대칭**이라 "3개 수렴"이 아니라 "KPA 기준 모듈 + KCos 구축 시 채택" 흐름이 맞다(C, 더 큰 작업선).

## 3. 사용자-facing 공통화 완료 상태 (참고)

`/lms` hub→LmsHubTemplate(구조·accent·visibility 3서비스 정렬), LessonList(row)·CourseProgressBar 3서비스 적용, CourseCard/List dormant, Neture 제외. (본 IR 범위 아님.)

## 4. 강사(instructor) 화면 현황

| 화면 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|-------------|
| 강의 목록 | ✅ `CourseListPage` (`@o4o/ui BaseTable`+RowActionMenu+ActionBar, inline) | ✅ `InstructorCoursesPage` (raw `<table>`, inline) | ⚠️ `InstructorCoursesPage` (raw table, **read-only, 액션 없음**, Tailwind) |
| 생성/편집 폼 | ✅ `CourseNewPage`/`CourseEditPage` (RichTextEditor, visibility/approval/reusablePolicy, AI 구조생성, inline) | ✅ `InstructorCourseEditPage` (RichTextEditor + LessonModal, inline) | ❌ 미구현(Phase 1-B) |
| 레슨 관리 | ✅ CourseEditPage 내 drag-reorder + LessonModal | ✅ InstructorCourseEditPage 내 drag-reorder | ❌ |
| 퀴즈 빌더 | ✅ `QuizBuilder` | ❌ 미구현(deferred 주석) | ❌ |
| 과제 에디터/채점 | ✅ `AssignmentEditor` + `LessonSubmissionsPage`(GradingModal) | ❌ 채점 화면 없음(AI 채점은 **learner-side**) | ❌ |
| 참여자/크레딧 | ✅ `ContentParticipantsPage`(요약/필터/진도/credit/CSV) | ⚠️ `InstructorEnrollmentsPage`(목록/진도, bulk 없음) | ❌ |
| 대시보드 | ✅ `InstructorDashboardPage`(KPI+pending enroll+profile) | ✅ `InstructorDashboardPage`(KPI+pending, 부분) | ⚠️ 최소(요약 카드만) |
| 스타일 | inline | inline | Tailwind |
| 공통 UI 소비 | @o4o/ui BaseTable/RowActionMenu/ActionBar, content-editor | content-editor only(raw table) | 없음(raw+Tailwind) |

→ **성숙도 KPA(풀) ≫ GP(부분, 퀴즈/채점 없음) ≫ KCos(~15%, Phase 1-B 보류).** KCos·GP 주석이 "KPA instructor 구조 도입 전" 명시.

## 5. 운영자(operator) 화면 현황

| 화면 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|-------------|
| 강의 승인/반려/비공개/종료/삭제 | ✅ `OperatorLmsCoursesPage` | ✅ `OperatorLmsCoursesPage`(KCos 에서 ported) | ✅ `OperatorLmsCoursesPage`(canonical KPA) |
| 공통 컴포넌트 | `@o4o/operator-ux-core DataTable`+Pagination + `@o4o/ui RowActionMenu/ActionBar/BaseDetailDrawer/BulkResultModal` + `defineActionPolicy`/`buildRowActions`/`useBatchAction` | **동일** | **동일** |
| 동작 | search/status filter, bulk(unpublish/archive/hard-delete), row(approve/reject+reason modal/unpublish/archive/hard-delete), detail drawer | 동일 | 동일 |
| backend | `/lms/operator/*` (approve/reject/unpublish/archive/hard) | 동일 | 동일 |
| 스타일 | Tailwind(operator-ux-core) + inline modal | 동일 | 동일 |
| 강사자격 심사 | ✅ `QualificationRequestsPage`(DataTable, qualificationApi) | ✅ `QualificationRequestsPage`(glycopharm-scoped API) | ❌ 없음 |

→ **운영자 강의 승인은 3서비스가 이미 같은 shared 컴포넌트·동작·backend.** 차이는 serviceKey/accent/API client 어댑터 + page-level 중복(상태 config·action policy·reject modal·search). 강사자격 심사는 KPA/GP 만(KCos 미보유, API scope 차이).

## 6. API / client 공통성

- **backend 공통:** `/api/v1/lms/*` (instructor `/lms/instructor/*`, operator `/lms/operator/*`) — 3서비스 동일(service-neutral, `@o4o/lms-client` 팩토리). 운영자 5개 action endpoint 동일.
- **차이:** 강사자격은 service-scoped(KPA `qualificationApi` / GP `/glycopharm/qualifications/*`). 각 서비스 api/lms(-instructor).ts 가 동일 endpoint 를 얇게 래핑.

## 7. 공통화 후보 분류 A~E

### A. 즉시 공통화 가능
- (실질적으로 A 단독은 적음 — 운영자 화면은 이미 shared 컴포넌트를 쓰므로 "page-level 중복 제거"가 B 임.)

### B. config 주입 후 공통화 (권장 1순위)
- **운영자 강의 승인/관리 모듈** — 3서비스 OperatorLmsCoursesPage 의 page-level(상태 config, action policy, reject reason modal, search/filter, bulk)를 **`@o4o/operator-core-ui` 의 config-driven 모듈**(예 `OperatorLmsCoursesManager`)로 추출. 서비스 wrapper 가 `apiBase`/`serviceKey`/`getToken`/api adapter 주입(기존 `CmsContentManager` 패턴 동일). → 3× 중복 제거.
- **강사자격 심사 모듈** — KPA/GP 동형 → 동일 패턴 공통화(KCos 는 미보유라 도입 시 채택).

### C. KPA 기준 보존 후 후속 (강사 화면 — 큰 작업선)
- 강사 강의 목록/생성/편집/레슨/퀴즈빌더/과제에디터/참여자. **KPA 가 reference, GP 부분, KCos 미구축.** "3개 수렴"이 아니라 **KPA 에서 공통 instructor 모듈 추출 → KCos 구축 시 그 모듈로 build, GP 부분도 점진 채택**. RichTextEditor/AI/drag-reorder/quiz·assignment 에디터 고결합 → 별도 IR/WO 다단계.

### D. 보류 (reward/budget 작업선)
- 강사 참여자 **credit 지급/리워드 상태**(KPA ContentParticipantsPage), rewardPolicy UI. → `IR-O4O-REWARD-BUDGET-FLOW-...` 작업선.

### E. 제외
- Neture LMS instructor/operator(LMS 대상 아님), YouTube/LIVE, platform 결제.

## 8. Neture 제외 확인

- Neture 는 LMS instructor/operator 화면 없음(operator 메뉴에 lms group "미사용" 명시). 본 IR 미수정·미조사 대상. 운영자 모듈을 `operator-core-ui` 에 두더라도 Neture 가 LMS 모듈을 **참조(메뉴/route)하지 않는 한** 소비 안 함 — 공통화 시 Neture 가 LMS 운영자 메뉴를 갖지 않도록 유지(현행).

## 9. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | 강사 화면을 "3개 수렴"으로 접근 → KCos 미구축이라 억지 통합 | C 로 분리: KPA reference 모듈 → KCos build-on-shared |
| R2 | 운영자 모듈 추출 시 service API adapter/scope(qualification glycopharm-scoped) 차이 | config 주입(apiBase/serviceKey/adapter), KPA CmsContentManager 패턴 |
| R3 | 스타일 비대칭(강사 inline vs Tailwind) | 운영자는 이미 Tailwind 통일(영향 적음). 강사 공통화는 C 에서 스타일 기준 결정 |
| R4 | reward/credit(participants) 혼입 | D 보류 — 운영자/강사 공통화에서 credit 영역 분리 |
| R5 | operator-core-ui 에 LMS 모듈 → Neture 간접 소비 | Neture 가 LMS 운영자 메뉴 미참조 유지(현행). lms-ui 와 무관(operator-ux-core 기반) |

## 10. 권장 다음 WO

1순위(가장 깔끔): **`WO-O4O-LMS-OPERATOR-COURSES-MANAGER-EXTRACTION-V1`**
- 3서비스 OperatorLmsCoursesPage → `@o4o/operator-core-ui` config-driven 모듈로 추출(이미 shared 컴포넌트 사용 → 중복만 제거). serviceKey/apiBase/adapter 주입. 강사자격 심사는 후속/동반.

2순위(큰 작업선, 분리): **`IR-O4O-LMS-INSTRUCTOR-COMMON-MODULE-SCOPE-V1`**
- KPA 강사 화면을 reference 로 공통 instructor 모듈(목록/편집/레슨) 추출 범위 조사. KCos Phase 1-B 빌드를 그 모듈 위에서 하도록 설계. 퀴즈/과제/AI 채점은 추가 단계.

보류: 강사 credit/reward → **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`**(별도 작업선).

## 11. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1.md`)
- [x] 코드/package/lock/Dockerfile/backend 변경 없음 (read-only)
- [x] 3서비스 강사(§4)·운영자(§5) 화면 현황 + 공통 컴포넌트/스타일
- [x] API 공통성(§6) / 분류 A~E(§7) / Neture 제외(§8) / 위험(§9) / 권장 WO(§10)

---

*End of IR-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1*
