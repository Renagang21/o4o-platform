# CHECK-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1

> **작업명:** WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1
> **유형:** `@o4o/lms-ui` `CourseCard`/`CourseList` 역할 정리 (docs-only, 컴포넌트 주석)
> **결과: PASS — 결정: SPECIALIZE/DORMANT (삭제 안 함)** — CourseCard/List 를 향후 featured/추천/관련 강의 **카드형 노출면**용 primitive 로 역할 명시. `/lms` 목록 hub 의 canonical 표현이 아님(canonical = `LmsHubTemplate` 테이블). 실서비스 소비처 0(dormant). 코드 로직 변경 없음(주석만). lms-ui typecheck 0.
> **선행:** `IR-O4O-LMS-COURSE-HUB-CARD-ALIGNMENT-V1`(판정 B) · `/lms` hub 3서비스 LmsHubTemplate 수렴(구조·accent·visibility) 완료.
> **작성일:** 2026-06-13 · 기준 HEAD `53a1e91fa`

---

## 1. 목적

`@o4o/lms-ui` 에 존재하나 미사용인 `CourseCard`/`CourseList`(카드 그리드)의 역할을 정리. `/lms` 목록 hub 가 `LmsHubTemplate`(테이블)로 수렴 완료된 현재, 두 카드 primitive 를 삭제할지·유지할지·specialize 할지 결정.

## 2. 선행 결론 요약

- IR(판정 B): LmsHubTemplate(테이블 container) ≠ CourseCard/List(카드 presentational) — 표현 상이, 직접 흡수 대상 아님.
- Neture 가 `shared-space-ui` 소비 → LmsHubTemplate 이 lms-ui 를 import 하면 Neture 가 lms-ui 를 transitive 소비(제외 위반) → option A 차단. CourseCard 는 hub 와 결합하지 않음.
- `/lms` hub: KPA/GP/KCos 모두 LmsHubTemplate(구조·accent·visibility 정렬 완료).

## 3. CourseCard/List 현재 상태

- **CourseCard:** 썸네일/제목/요약/강사/메타 + 공개·회원제 배지 + (수강 중) 진도. `href`/`onClick`·`accent`·`badgeSlot` 주입. API import 0.
- **CourseList:** 카드 grid shell + loading/error/empty + header/filter slot. `hrefFor`/`onCourseClick`·`accent` 주입. API import 0.
- view model `CourseCardView`(API 원본 비결합). 표현 = 카드 그리드(반응형).

## 4. 실소비처 확인 결과

- 서비스에서 `from '@o4o/lms-ui'` 로 `CourseCard`/`CourseList` import **0건**(grep) → **dormant**. (`CourseListPage`/`OperationsCourseListPage` 등은 KPA 강사 페이지 로컬 이름, lms-ui 무관.)
- `shared-space-ui` → `@o4o/lms-ui` import **0**, `lms-ui` → `shared-space-ui` import **0**(순환 의존 없음).

## 5. retire vs specialize 판단 / 최종 결정

| 옵션 | 판단 |
|---|---|
| retire(삭제) | 비채택 — 이미 존재·typecheck 통과·view model 정의됨. 향후 카드형 강의 노출(추천/관련/featured) 필요 시 재작성 비용. 삭제 실익 낮음 |
| **specialize/dormant** | **채택** — 삭제하지 않고 **카드형 노출면 primitive 로 역할 명시**. `/lms` hub(테이블)에는 미사용. LmsHubTemplate 미결합 |

**최종 결정: SPECIALIZE/DORMANT.** CourseCard/CourseList 파일 헤더에 역할 주석 추가:
> *featured/추천/관련 강의 등 카드형 노출면용 primitive. `/lms` 목록 hub 의 canonical 표현이 아니다(canonical = LmsHubTemplate 테이블). 현재 실서비스 소비처 없음(dormant). LmsHubTemplate 과 결합하지 않는다.*

## 6. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/lms-ui/src/components/CourseCard.tsx` | 파일 헤더에 역할(specialize/dormant) 주석 추가 — 코드 로직 무변경 |
| `packages/lms-ui/src/components/CourseList.tsx` | 동일 |
| `docs/checks/CHECK-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1.md` | 본 문서 |

**무변경:** export/type(유지), `index.ts`, `types.ts`, LmsHubTemplate, KPA/GP/KCos hub, Neture, backend, package.json/pnpm-lock, Dockerfile.

## 7. Neture / 의존 경계 확인

- `shared-space-ui` → `@o4o/lms-ui` import 0 유지 → Neture transitive LMS 소비 없음(제외 guard 불변). Neture 미수정.
- CourseCard/List 는 `@o4o/lms-ui` 내부 dormant primitive — 어떤 서비스/패키지도 신규 소비 안 함.

## 8. 검증 결과

- **TypeScript:** `@o4o/lms-ui` `tsc --noEmit` **0 errors**(주석만 변경, export/type 유지).
- **grep:** 서비스 `@o4o/lms-ui` CourseCard/List import 0. `shared-space-ui`↔`lms-ui` 상호 import 0.
- **무변경:** KPA/GP/KCos `/lms` hub, Neture, backend, package/lock/Dockerfile.
- **browser smoke:** 불요 — 렌더되는 화면 변경 없음(dormant primitive 주석만).

## 9. 후속 작업

1. **`IR-O4O-LMS-FEATURED-RELATED-COURSE-CARD-SURFACE-V1`** — 추천/관련/featured 강의 카드 노출면이 실제 필요한지 조사(필요 시 CourseCard/List specialize 활성화).
2. **`WO-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`** — 강사/운영자 LMS 관리 화면 공통화 경계.
3. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선(강사 reward 지갑/예산).

## 10. 완료 판정

**PASS.** CourseCard/CourseList 를 **삭제하지 않고 카드형 노출면용 dormant primitive 로 역할 명시**(주석). `/lms` hub(LmsHubTemplate 테이블)와 결합하지 않으며 shared-space-ui→lms-ui 의존도 만들지 않음(Neture guard 유지). export/type·hub·backend 무변경, lms-ui typecheck 0. 향후 featured/related 카드 노출면 필요 시 활성화 후보로 보존.
