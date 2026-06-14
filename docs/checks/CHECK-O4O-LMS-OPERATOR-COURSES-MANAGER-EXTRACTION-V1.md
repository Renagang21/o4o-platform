# CHECK-O4O-LMS-OPERATOR-COURSES-MANAGER-EXTRACTION-V1

> **작업명:** WO-O4O-LMS-OPERATOR-COURSES-MANAGER-EXTRACTION-V1
> **유형:** 운영자 강의 승인 화면 중복 → 공통 `OperatorLmsCoursesManager` 추출 (frontend-only)
> **결과: PASS** — KPA/GP/KCos 의 near-identical `OperatorLmsCoursesPage`(728/649/649줄)를 `@o4o/operator-core-ui` 의 config-driven `OperatorLmsCoursesManager` 로 수렴. 3 wrapper 각 **27줄**로 축소. 승인/반려/비공개/종료/완전삭제·bulk·reject modal·detail drawer·검색/상태필터 전부 유지. operator-core-ui(신규 모듈) + KPA + GP + KCos typecheck 0(본 변경). backend/package.json/Dockerfile/Neture 무변경.
> **선행:** `IR-O4O-LMS-COMMON-INSTRUCTOR-OPERATOR-UI-BOUNDARY-V1`(판정 B)
> **작성일:** 2026-06-13 · 기준 HEAD `71f280860`

---

## 1. 목적

3서비스 `OperatorLmsCoursesPage` 가 이미 같은 shared 컴포넌트(`@o4o/operator-ux-core DataTable` + `@o4o/ui RowActionMenu/ActionBar/BaseDetailDrawer/BulkResultModal` + `defineActionPolicy`/`buildRowActions`/`useBatchAction`)·동일 `/lms/operator/*` backend·near-identical page 로직 → page-level 중복을 config-driven 공통 모듈로 수렴.

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/operator-core-ui/src/modules/lms-courses/OperatorLmsCoursesManager.tsx` | **신규** — 공통 manager(KPA reference 기반, config-driven). KPA source 의 mojibake `종��된`→`종료된` 수정 |
| `packages/operator-core-ui/src/modules/lms-courses/index.ts` | **신규** — 모듈 re-export |
| `packages/operator-core-ui/src/index.ts` | manager + 타입 export 추가 |
| `services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx` | 728줄 → **27줄 thin wrapper** |
| `services/web-glycopharm/src/pages/operator/OperatorLmsCoursesPage.tsx` | 649줄 → **27줄** |
| `services/web-k-cosmetics/src/pages/operator/OperatorLmsCoursesPage.tsx` | 649줄 → **27줄** |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

**무변경:** backend, DB/migration, package.json/pnpm-lock(operator-core-ui 이미 3서비스 dep + source-direct), Dockerfile(operator-core-ui 이미 COPY), Neture, `@o4o/lms-ui`, 강사 화면.

## 3. 공통 manager 구조 (`OperatorLmsCoursesManager`)

- 위치: `@o4o/operator-core-ui` 의 `modules/lms-courses` (기존 `CmsContentManager`/`GuideContentsManager` 와 동형 페이지 모듈 컬렉션).
- 내부: 헤더+검색+상태필터, DataTable(모든 상태), RowActionMenu(상세/승인/반려/비공개/종료/완전삭제), bulk(비공개/종료/완전삭제) ActionBar, BulkResultModal, BaseDetailDrawer(상세), 반려 사유 modal. archived 만 완전 삭제. `defineActionPolicy<OperatorLmsCourse>('lms:operator:courses', ...)` 단일 정책(3서비스 동일 rule 통합).
- **serviceKey hardcode 없음.** API client 직접 import 없음 — config.api adapter 로만 호출.

## 4. config / API adapter 구조

```ts
interface OperatorLmsCoursesConfig {
  api: {
    list(params: {search?; status?; page; limit}): Promise<unknown>;
    approve(id), reject(id, reason), unpublish(id), archive(id), hardDelete(id);
  };
  detailPath?: (id) => string;     // 기본 `/lms/course/${id}`
  detailLinkLabel?: string;        // 기본 '강의 페이지 이동'
}
```
- view action route·drawer 링크는 `detailPath`(기본 `/lms/course/${id}` — 3서비스 동일) 사용.
- `OperatorLmsCourse` view type(id/title/instructor(Name)/category/lessonCount/status/createdAt/updatedAt) — 서비스 Course/LmsCourse 와 구조 호환.

## 5. 3서비스 wrapper 결과

각 wrapper = `export default function OperatorLmsCoursesPage()` → `<OperatorLmsCoursesManager config={{ api, detailLinkLabel }} />`.

| 서비스 | list adapter | detailLinkLabel |
|---|---|---|
| KPA | `lmsApi.getCourses` | '편집 페이지 이동' |
| GlycoPharm | `lmsApi.operatorGetCourses` | '강의 페이지 이동' |
| K-Cosmetics | `lmsApi.getCourses` | '편집 페이지 이동' |

approve/reject/unpublish/archive/hardDelete = 각 `lmsApi.operator*Course`(3서비스 동일 명칭). route/menu 권한(App.tsx OperatorRoute guard) 유지.

## 6. 유지한 action 목록

승인(approve) / 반려(reject + 사유 modal) / 비공개(unpublish) / 강의 종료(archive) / 완전 삭제(hard-delete, archived 한정) — row + bulk 동일. 검색·상태필터·detail drawer·BulkResultModal·정책 안내·pagination 전부 유지. action policy(visible 조건) 동일.

## 7. 보류한 영역

- 강사(instructor) 화면 공통화(성숙도 비대칭 — IR 판정 C, 별도 IR).
- 강사자격 심사(QualificationRequests) 공통화(KPA/GP 동형, KCos 미보유 — 후속).
- 강의 생성/편집·레슨·퀴즈·과제 editor / reward·credit(D).

## 8. Neture / 의존 경계

- `operator-core-ui` 는 `@o4o/lms-ui` 를 import 하지 않음 — Neture transitive LMS UI 소비 위험 없음. operator-core-ui 는 Neture 도 소비하나, Neture 가 **LMS 운영자 메뉴/route 를 참조하지 않으므로** `OperatorLmsCoursesManager` 를 소비하지 않음(트리쉐이킹/미참조). Neture 미수정.
- serviceKey hardcode 0, API client 주입식.

## 9. 검증 결과

- **TypeScript:** `@o4o/operator-core-ui` 신규 모듈 **0 errors**(패키지 잔존 1건은 `@o4o/error-handling` dep 의 사전 존재 에러, 본 변경 무관). `web-kpa-society` **0**, `web-k-cosmetics` **0**, `web-glycopharm` **0**(본 변경 관련; forum 타 세션 무관).
- **정적:** 3 wrapper 가 `OperatorLmsCoursesManager` 소비(각 27줄). manager 에 serviceKey hardcode 0, lms client 직접 import 0(config.api 경유). operator-core-ui→lms-ui import 0.
- **무변경:** backend, package.json/pnpm-lock(미접촉 — 타 세션 lock 변경은 미스테이징), Dockerfile, Neture, 강사 화면.
- **browser smoke:** 미수행 — 배포 후 KPA/GP/KCos `/operator/lms`(또는 해당 route) 목록·필터·row action 메뉴·reject modal·drawer 렌더 확인 권장(write action 은 production 미실행).

## 10. 후속 작업

1. **`IR-O4O-LMS-INSTRUCTOR-COMMON-MODULE-SCOPE-V1`** — KPA 강사 화면 reference 공통 모듈 추출 범위(성숙도 비대칭 C).
2. *(선택)* `WO-O4O-LMS-OPERATOR-QUALIFICATION-MANAGER-EXTRACTION-V1` — 강사자격 심사 공통화(KPA/GP 동형).
3. *(선택)* `WO-O4O-LMS-OPERATOR-COURSES-MANAGER-POLISH-V1` — 컬럼/상태/empty copy 정리.
4. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선.

## 11. 완료 판정

**PASS.** 3서비스 운영자 강의 승인 화면(728/649/649줄)을 공통 `OperatorLmsCoursesManager`(@o4o/operator-core-ui, config-driven)로 수렴 — wrapper 각 27줄. 모든 action(승인/반려/비공개/종료/완전삭제·bulk·modal·drawer·필터) 유지, serviceKey hardcode·lms-ui 의존·Neture 소비 없음, KPA mojibake 정정. backend/package/Dockerfile 무변경, typecheck 0. 사용자-facing 공통화와 같은 "이미 비슷한 3개 → config-driven 수렴" 패턴.
