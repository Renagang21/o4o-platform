# IR-O4O-LMS-COURSE-HUB-CARD-ALIGNMENT-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** 3서비스 LMS 강의 목록·허브 화면이 쓰는 `LmsHubTemplate`(shared-space-ui)과 `@o4o/lms-ui`의 `CourseCard`/`CourseList` **역할 경계**를 확정하고, 목록 축 공통화의 다음 WO 범위를 정한다.
> **작성일:** 2026-06-13 · 기준 HEAD `b728a07f4`
> **선행:** `WO-O4O-LMS-COMMON-UI-EXTRACTION-V1` ~ `WO-O4O-LMS-KCOSMETICS-FULLER-ADOPTION-V1`(LessonList row 3서비스 수렴 완료) · `CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`

---

## 1. 목적

`@o4o/lms-ui` 에 `CourseCard`/`CourseList`(카드 그리드)가 있으나 미사용 상태다. 3서비스 `/lms` 허브가 이미 `LmsHubTemplate`(또는 KPA 자체 구현)에 위임되어 있어, CourseCard/List 를 적용하기 전 두 컴포넌트의 역할 경계·중복 여부·바람직한 위치·다음 WO 범위를 확정한다. read-only.

## 2. 결론 요약 (Executive Summary)

| 질문 | 답 |
|------|-----|
| `LmsHubTemplate` 은 무엇인가? | **shared-space-ui 의 LMS 전용 container 템플릿** — 상태/검색/페이지네이션/bulk-select 관리 + `config.fetchCourses` 주입 호출. **`@o4o/ui BaseTable` 기반 "테이블" 렌더**(카드 아님). |
| 3서비스가 같은 `LmsHubTemplate` 을 쓰는가? | **GP=YES, KCos=YES, KPA=NO.** KPA `/lms` 는 자체 **raw `<table>`** `LmsCoursesPage`(768줄, store_owner 자료함 가져가기 포함). LmsHubTemplate 은 "KPA EducationPage 에서 추출"됐으나 KPA 본인은 미채택(분기). |
| CourseCard/List 와 역할이 겹치는가? | **부분 중복(개념만)·presentational 중복 아님.** LmsHubTemplate=container+**테이블**, CourseCard/List=presentational+**카드 그리드**. 둘 다 "강의 목록"이나 **표현(table vs card)이 다르다.** |
| CourseCard/List 의 바람직한 위치? | **`@o4o/lms-ui` 에 유지하되 hub 흡수 안 함(판정 B).** 현재 3서비스 hub 가 전부 테이블이라 card grid 소비처가 없음 → **미래 card 맥락(featured/related/추천 강의)용 dormant primitive 로 유지·필요 시 specialize.** LmsHubTemplate(테이블)에 CourseCard(카드) 주입은 표현 불일치 + **Neture 경계 위반 위험**(아래). |
| 다음 WO 1순위? | **목록 축 핵심 lever = `WO-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1`**(KPA 자체 table → LmsHubTemplate 수렴, store_owner 기능은 renderRowActions/config 로). CourseCard/List 는 **`WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1`(판정 B)**. |
| 가장 중요한 발견 | **① LmsHubTemplate 은 카드가 아니라 테이블이다** — CourseCard/List 와 동일 표현 아님(직접 흡수 대상 아님). **② Neture 가 shared-space-ui 를 소비** → LmsHubTemplate 이 `@o4o/lms-ui` 를 import 하면 **Neture 가 lms-ui 를 transitive 소비 → LMS 제외 위반 + Neture Dockerfile COPY 필요**. 따라서 option A(HubTemplate-uses-CourseCard) 비권장. |

**핵심:** LmsHubTemplate(테이블 container)과 CourseCard/List(카드 presentational)는 **표현이 다른 별개 컴포넌트**다. 목록 hub 단일화의 실질 lever 는 CourseCard 주입이 아니라 **KPA 자체 table → LmsHubTemplate 수렴**이다. CourseCard/List 는 카드 맥락이 생길 때 쓰는 primitive 로 보존(specialize)하고, shared-space-ui→lms-ui 의존(option A)은 Neture 경계 때문에 만들지 않는다.

## 3. 선행 LMS 공통화 상태

- `@o4o/lms-ui` 생성, 3서비스 소비 시작. `LessonList(row)` · `CourseProgressBar` 3서비스 적용 완료. `CourseVisibilityBadge`/`NoPaymentNotice` KPA 적용.
- **`CourseCard`/`CourseList` 실서비스 소비 0**(grep: 서비스에서 `from '@o4o/lms-ui'` 로 CourseCard/List import 0건 — dormant primitive). *(`CourseListPage`/`OperationsCourseListPage` 등은 KPA 강사 페이지의 로컬 이름으로, lms-ui CourseList 와 무관.)*
- Neture LMS 제외 공식 고정(`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`).

## 4. LmsHubTemplate 위치와 역할 (Q1)

- **위치:** `packages/shared-space-ui/src/LmsHubTemplate.tsx`(export + index.ts).
- **성격:** **container** — `useState`/`useSearchParams` 로 courses/검색/페이지/선택 상태 관리, `useEffect` 로 `config.fetchCourses()` 호출(데이터 로드), debounce 검색, bulk URL 복사.
- **렌더:** `@o4o/ui` 의 **`BaseTable`(테이블)** — 컬럼: 체크박스/제목(Link)/강사/유형/강의수/상태/`수강하기` 버튼 + `renderRowActions` 슬롯. 카드 그리드 아님.
- **API:** 직접 import 안 함 — 서비스가 `config.fetchCourses` 어댑터로 주입(container지만 API 는 주입식). serviceKey/hero/courseDetailPath/renderRowActions 도 config.
- **LMS 전용:** `LmsHubCourse`/`LmsHubConfig` 타입, /lms hub 목적. 범용 콘텐츠 허브 아님.
- **의존:** `@o4o/ui`(BaseTable/ActionBar/PageContainer), react-router, lucide. **`@o4o/lms-ui` 미import.**

## 5. KPA Course list / EducationPage 구조 (Q2-KPA)

- KPA `/lms` → **`LmsCoursesPage`**(`pages/lms/LmsCoursesPage.tsx`, 768줄). **LmsHubTemplate 미사용.**
- 자체 **raw `<table>`** 구현(`<table>`/`<thead>`/직접 styles). store_owner 전용 **자료함 가져가기(library import) 선택/체크박스** 로직 포함(`selectableIds`, `isStoreOwner`).
- 즉 KPA 는 GP/KCos 와 **다른 별도 table 구현** — LmsHubTemplate 이 "KPA EducationPage 에서 추출"됐다는 주석과 달리 현재 KPA 본인은 미채택.

## 6. GlycoPharm EducationPage 구조 (Q2-GP)

- `services/web-glycopharm/src/pages/education/EducationPage.tsx` → `<LmsHubTemplate config={glycoConfig} />`.
- config: serviceKey `glycopharm`, hero, `courseDetailPath: id => /lms/course/${id}`, `fetchCourses`(lmsApi.getCourses → mapCourse → LmsHubCourse). renderRowActions 미사용.
- 완전 위임(페이지 = wrapper + config). accent 는 LmsHubTemplate 내부 고정 색(파랑 계열) — service accent 주입 경로 없음(테이블 링크/버튼 `#2563eb` 하드코딩).

## 7. K-Cosmetics EducationPage 구조 (Q2-KCos)

- `services/web-k-cosmetics/src/pages/lms/EducationPage.tsx` → `<LmsHubTemplate config={config} />`.
- config: serviceKey `k-cosmetics`, hero, courseDetailPath, fetchCourses(status:'published'). renderRowActions 미구현(주석: 향후 KPA instructor 패턴 도입 시).
- GP 와 동일 구조(완전 위임). KCos visibility 노출 약함은 LmsHubTemplate 컬럼(유형/상태)에 visibility 미표시인 것과 연결 — 별도 후속.

## 8. @o4o/lms-ui CourseCard/List 현황 (Q3 자료)

- **CourseCard:** presentational 카드(썸네일/제목/요약/메타/visibility 배지/진도). `href`/`onClick`·`accent`·`badgeSlot` 주입. API import 0.
- **CourseList:** 카드 **grid shell** + loading/error/empty + header/filter slot. `hrefFor`/`onCourseClick`·`accent` 주입. API import 0.
- view model: `CourseCardView`(API 원본 비결합). **실서비스 소비 0(dormant).**
- 표현: **카드 그리드**(반응형 `repeat(auto-fill,minmax(260px,1fr))`).

## 9. 역할 중복 / 경계 분석 (Q3·Q4)

| 축 | LmsHubTemplate | CourseCard/List |
|---|---|---|
| 패키지 | shared-space-ui | lms-ui |
| 성격 | container(상태·fetch·검색·페이지) | presentational(데이터·콜백 주입) |
| 표현 | **테이블**(BaseTable) | **카드 그리드** |
| API | config.fetchCourses 주입 | 없음 |
| 현재 소비 | GP·KCos `/lms` hub | 없음(dormant) |
| 의존 | @o4o/ui | react only |

- **중복 판정: 부분 중복(개념: 둘 다 강의 목록) · presentational 중복 아님(table vs card).** 직접 대체/흡수 관계 아님.
- **Q4 위치 판정: B** — LmsHubTemplate 을 /lms 목록-hub **표준(테이블)** 으로 유지. CourseCard/List 는 **카드 표현이 필요한 별개 맥락**(featured/추천/related 강의, 마케팅 쇼케이스, 강사 프로필의 강의 카드 등)을 위한 lms-ui primitive 로 **보존**하고 hub 에 강제 주입하지 않는다.
- option A(LmsHubTemplate 이 내부 primitive 로 CourseCard 사용)는 **표현 불일치(테이블에 카드 주입은 부적합) + §10 Neture 위험** 때문에 비권장.

## 10. dependency / Dockerfile 영향 (Q4 제약·위험)

- **Neture 가 `@o4o/shared-space-ui` 를 소비**(package.json 확인). LmsHubTemplate 은 shared-space-ui 소속.
- → 만약 LmsHubTemplate(또는 shared-space-ui 의 다른 모듈)이 **`@o4o/lms-ui` 를 import** 하면, **Neture 가 lms-ui 를 transitive 소비** → ① `CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1` 위반(Neture 가 LMS UI 패키지 간접 소비), ② Neture Dockerfile 에 `packages/lms-ui` COPY 누락 시 Cloud Build `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`.
- 역방향(`@o4o/lms-ui` → `shared-space-ui` import)은 순환 의존 위험 + lms-ui 의 react-only peer 원칙 훼손.
- **운영 교훈(반복):** source-direct workspace package 를 web service 가 소비하면 그 service Dockerfile 에 package.json + src COPY 2줄을 같은 커밋에 추가해야 한다(로컬 통과해도 Cloud Build 깨짐). LmsHubTemplate↔lms-ui 결합은 이 영향 범위를 shared-space-ui 소비처 전체(Neture 포함)로 확대 → **결합 회피가 안전.**

## 11. Neture 제외 확인

- Neture 는 `LmsHubTemplate`(shared-space-ui)을 **LMS 목적으로 소비하지 않음** — Neture 에 EducationPage/`/lms`/강의 목록 route 없음(이전 CHECK). shared-space-ui 는 forum/contact 등 비-LMS 용도로만 소비.
- Neture 는 `@o4o/lms-ui CourseCard/List` 미소비. 본 IR 도 Neture 미수정.
- §10 의 핵심: **shared-space-ui→lms-ui 결합을 만들지 않는 한** Neture 경계는 안전. 결합 시 Neture 가 의도치 않게 LMS UI 를 끌어오므로 **A 옵션 차단**이 곧 Neture 경계 보호.

## 12. 위험 요소

| # | 위험 | 대응 |
|---|------|------|
| R1 | LmsHubTemplate(테이블) ↔ CourseCard(카드) 를 중복 abstraction 으로 오인해 억지 통합 | 표현이 다름(B). 통합 아님 |
| R2 | **shared-space-ui → lms-ui import 시 Neture transitive 소비**(LMS 제외 위반 + Dockerfile 깨짐) | option A 비권장(§10). 결합 회피 |
| R3 | lms-ui → shared-space-ui import 시 순환 의존 | 금지 |
| R4 | CourseCard 적용하며 기존 LmsHubTemplate(테이블) UX 깨짐 | hub 는 테이블 유지, 카드는 별도 맥락 |
| R5 | KPA/GP/KCos route/href 차이가 card primitive 에 새어듦 | hrefFor 주입 유지(현 설계 OK) |
| R6 | visibility/isPaid 없는 서비스(GP/KCos)에 KPA badge/notice 억지 주입 | 데이터 있는 서비스만(현 정책 유지) |
| R7 | KPA 자체 table 과 LmsHubTemplate 분기 지속 → 목록 hub 3중 유지보수 | **KPA→LmsHubTemplate 수렴 WO(권장 1순위)** |
| R8 | reward/결제/YouTube 정책이 목록 UI 에 재유입 | 목록 컴포넌트는 presentational, 정책 미포함 |

## 13. 권장 다음 WO (Q5)

**판정: B (LmsHubTemplate = 목록-hub 표준 유지) + 별도 lever = KPA 수렴.**

1순위(목록 축 실질 통합): **`WO-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1`**
- KPA `LmsCoursesPage`(자체 raw table) → `LmsHubTemplate` 수렴. store_owner 자료함 가져가기/선택은 `renderRowActions` + config 슬롯으로 흡수 가능성 조사 후 적용. 성공 시 3서비스 /lms hub 가 단일 LmsHubTemplate 로 통일.
- 주의: KPA store_owner import 선택 로직이 LmsHubTemplate 의 bulk-select 와 충돌/확장 필요한지 선검토(부분 보류 가능).

병행(카드 컴포넌트 정리): **`WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1`**
- CourseCard/List 를 (a) 카드 맥락(추천/관련/featured 강의, 강사 프로필 강의 카드) 용도로 **specialize**하거나, (b) 당장 소비처가 없으면 **dormant 유지**(retire 아님 — 잠재 가치 있음). LmsHubTemplate 주입은 하지 않음.

**비권장:** `WO-O4O-LMS-HUBTEMPLATE-USES-LMS-UI-COURSECARD-V1`(option A) — 표현 불일치 + Neture 경계 위반 위험(§10).

## 14. 후속 작업 후보

| 우선 | WO/IR | 내용 |
|:---:|------|------|
| **1** | `WO-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1` | KPA 자체 table → LmsHubTemplate 수렴(store_owner import 는 renderRowActions/config) |
| 2 | `WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1` | CourseCard/List 를 card 맥락 specialize 또는 dormant 유지(hub 미주입) |
| 3 | `WO-O4O-LMS-HUBTEMPLATE-SERVICE-ACCENT-V1` | LmsHubTemplate 의 하드코딩 색(`#2563eb`)을 service accent config 주입으로(테마 정렬) |
| 4 | `IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1` | LmsHubTemplate 컬럼에 공개/회원제 visibility 표시 추가 여부(KCos 노출 약함 연결) |
| 5 | `IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1` | 별도 작업선(강사 reward 지갑/충전/배정/ledger) |
| 6 | `WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1` | 강사/운영자 LMS 관리 화면 공통화 경계 |

---

## 15. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-LMS-COURSE-HUB-CARD-ALIGNMENT-V1.md`)
- [x] 코드/package.json/pnpm-lock/Dockerfile/backend/Neture 변경 없음 (read-only)
- [x] LmsHubTemplate 위치·역할(container·테이블·config·@o4o/ui 의존) 확인 (§4)
- [x] Q2 3서비스 사용 매트릭스 — GP/KCos=LmsHubTemplate, KPA=자체 table (§5-7)
- [x] CourseCard/List 현황(presentational 카드·dormant) (§8)
- [x] 역할 중복/경계(table vs card, 부분 중복·presentational 중복 아님) (§9)
- [x] dependency/Dockerfile + Neture transitive 위험(option A 차단 근거) (§10·§11)
- [x] 위험 (§12) + 권장 WO(B + KPA 수렴) (§13) + 후속 (§14)

---

*End of IR-O4O-LMS-COURSE-HUB-CARD-ALIGNMENT-V1*
