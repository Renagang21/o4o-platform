# CHECK-O4O-LMS-KPA-STORE-LIBRARY-TAKEAWAY-REMOVAL-V1

> **작업명:** WO-O4O-LMS-KPA-STORE-LIBRARY-TAKEAWAY-REMOVAL-V1
> **유형:** KPA-Society LMS 강의 목록에서 "강의 자료를 내 매장에 가져가기"(store library takeaway) 기능 완전 삭제 (frontend-only)
> **결과: PASS** — KPA `LmsCoursesPage` 의 자료함 가져가기(개별/bulk)·선택 체크박스·ActionBar·BulkResultModal·관련 state/handler/style 전부 제거. 강의 목록/검색/수강 CTA/visibility/강사 RowActionMenu/페이지네이션 유지. web-kpa-society typecheck 0. backend/`api/assetSnapshot.ts`/GP/KCos/Neture/package 무변경.
> **선행:** `IR-O4O-LMS-COURSE-HUB-CARD-ALIGNMENT-V1`(`7f0b3abb5`) — KPA bespoke table 의 store_owner 가져가기가 LmsHubTemplate 수렴의 장애물로 식별됨.
> **작성일:** 2026-06-13 · 기준 HEAD `19845fee3`

---

## 1. 작업 목적 / 정책 결정

> **강의 자료를 내 매장에 가져가기 기능은 완전 삭제한다. LMS 는 수강/진도/퀴즈/수료 중심으로 단순화한다. 매장 실행 자료는 별도 "내 매장 제작 자료" 흐름에서 관리한다.**

학습 콘텐츠(강의)와 매장 실행 자산(자료함)의 연결은 권한·저작권·원본 동기화·수강 상태·매장 역할 정책을 복잡하게 만들고, KPA 에만 남은 store_owner 가져가기가 LMS 공통화(LmsHubTemplate 수렴)의 장애물이었다. 사용자 결정에 따라 KPA LMS frontend 에서 완전 삭제.

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx` | store library takeaway 전체 제거(아래 §3) |
| `docs/checks/CHECK-O4O-LMS-KPA-STORE-LIBRARY-TAKEAWAY-REMOVAL-V1.md` | 본 문서 |

**무변경:** `api/assetSnapshot.ts`(store-asset 공용 — §5), backend, DB/migration, GP/KCos/Neture, `@o4o/lms-ui`, `shared-space-ui`, package.json/pnpm-lock, Dockerfile.

## 3. 삭제한 항목 (LmsCoursesPage)

- **import:** `assetSnapshotApi`, `type MouseEvent`(handleAddToLibrary 전용).
- **타입:** `BulkResult` interface.
- **state:** `addingCourseId`, `selectedCourseIds`, `bulkResult`, `isBulkAdding`. + `useAuth` 에서 `isKpaContextLoaded` 미사용 → destructure 제거. `isStoreOwner`/`mightBeStoreOwner` 파생값 제거.
- **effect:** `selectedCourseIds` 리셋 effect 제거.
- **handler:** `handleAddToLibrary`, `toggleSelect`, `handleBulkAddToLibrary`.
- **render-scope:** `selectableIds`, `allSelectableSelected`, `toggleSelectAll`. 테이블 **선택 체크박스 헤더 열** + **per-row 체크박스 셀** + per-row `canAddToLibrary`/`isAdding`/`isSelectable`/`isSelected`. 액션 셀의 **"자료함 추가" 버튼**(+ hydration skeleton). 하단 **bulk ActionBar** + **BulkResultModal**.
- **style:** `libraryBtnStyle`, `skeletonCheckStyle`, `skeletonActionStyle`, `actionBarStyle`, `actionBarSecondaryBtnStyle`, `actionBarPrimaryBtnStyle`, `modalOverlayStyle`, `modalStyle`, `resultRowStyle`, `modalCloseBtnStyle`.

## 4. 유지한 LMS 기능

- 강의 목록 테이블(강의명/강사/유형/강의수/상태/액션), 검색, 페이지네이션, EmptyState.
- 공개/회원제 `visibilityBadge` + 승인필요/유료 배지.
- 수강 CTA(`수강하기`/`바로 보기`/`로그인 후 수강`) Link.
- **강사 본인 강의 수정/종료 `RowActionMenu`**(takeaway 아님 — instructor 기능, 유지). `lmsInstructorApi`·`qualificationApi`·InstructorHeaderAction·qualStatus 유지.
- 수강/진도/레슨/퀴즈/수료 흐름, rewardPolicy 게이팅, NoPaymentNotice/CourseProgressBar/LessonList(row)(상세·레슨 페이지 — 본 WO 미접촉) 그대로.

## 5. backend / api/assetSnapshot 잔존 여부

- takeaway 는 `assetSnapshotApi.copy({...assetType:'lesson'})`(asset snapshot 복사 backend endpoint)를 호출했다. `api/assetSnapshot.ts` 는 **store-asset/production-materials/signage 등 25+ 파일이 공용 소비** → **삭제하지 않음**(WO §4 "store asset 기능 자체 유지, LMS 연결만 제거" 준수). LMS 소비처(LmsCoursesPage)만 제거.
- 따라서 **backend asset-snapshot endpoint 는 dead 아님**(store-asset 흐름이 계속 사용) → 본 제거로 인한 backend deadcode 없음. 별도 backend deadcode audit **불요**(후속 후보로만 기록).
- `Course.reusablePolicy`(가져가기 가능 여부 필터에 쓰이던 필드)는 backend/type 필드로 frontend 가 임의 제거하지 않음 — KPA LMS frontend 에서 미사용 상태로 잔존(무해, 타 영역/정책 소유).

## 6. Neture / GP / KCos 경계

- `services/web-glycopharm` / `services/web-k-cosmetics` / `services/web-neture` **미수정**(git status — 변경 = LmsCoursesPage + CHECK 만).
- GP/KCos 에 동일 기능 추가 없음. Neture LMS 제외 유지. `@o4o/lms-ui`/`shared-space-ui` 미수정.

## 7. KPA HubTemplate alignment 단순화 효과

- store_owner 자료함 가져가기 제거로 KPA `LmsCoursesPage` 의 LmsHubTemplate 비호환 요소(전용 선택/bulk/asset-copy)가 사라짐. 남은 차이는 표준 테이블 컬럼·instructor RowActionMenu(→ `renderRowActions` 슬롯으로 매핑 가능) 수준 → 후속 `WO-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1` 가 한층 단순해짐.

## 8. 검증 결과

- **TypeScript:** `web-kpa-society` `tsc --noEmit` **0 errors**(LmsCoursesPage 포함 전체 clean — 미사용 import/state/style 잔존 0).
- **grep:** LmsCoursesPage 에서 `가져가기`/`자료함`/`assetSnapshot`/`selectedCourse`/`selectableIds`/`isStoreOwner`/`mightBeStoreOwner`/`handleAddToLibrary`/`bulkResult`/`libraryBtn`/`takeaway` **0건**. 유지 항목(`수강하기`/`바로 보기`/`visibilityBadge`/`RowActionMenu`/`Pagination`) 존재 확인.
- **무변경:** `api/assetSnapshot.ts`(git status 미표시), backend, GP/KCos/Neture, package.json/pnpm-lock/Dockerfile.
- **browser smoke:** 미수행 — 렌더/네비게이션 변경 중심. 배포 후 KPA `/lms` 목록 렌더·강의 상세 이동·수강 상태·"내 매장에 가져가기/자료함 추가" 미노출·체크박스/bulk 미노출 확인 권장.

## 9. 후속 작업

1. **`WO-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1`** — takeaway 제거 후 KPA raw `<table>` → `LmsHubTemplate` 수렴(instructor RowActionMenu 는 `renderRowActions` config 로).
2. *(불요 가능)* `IR-O4O-LMS-STORE-LIBRARY-TAKEAWAY-BACKEND-DEADCODE-AUDIT-V1` — asset-snapshot endpoint 는 store-asset 공용이라 dead 아님(§5). LMS 전용 backend 엔드포인트가 따로 있었는지만 확인하면 됨(현재 없음으로 보임).
3. **`WO-O4O-LMS-HUBTEMPLATE-SERVICE-ACCENT-V1`** — LmsHubTemplate service accent config.
4. **`IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1`** — visibility 컬럼(KCos 노출 약함).
5. **`WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1`** — CourseCard/List dormant primitive 처리.

## 10. 완료 판정

**PASS.** KPA LMS 강의 목록의 "내 매장에 가져가기"(store library takeaway) 기능 완전 삭제 — UI/state/handler/style/관련 import 제거, 강의 목록·수강·visibility·강사 관리·페이지네이션 유지. `api/assetSnapshot.ts`(store-asset 공용)·backend·GP/KCos/Neture 무변경. typecheck 0. LMS 가 수강/진도/퀴즈/수료 중심으로 단순화되어 KPA→LmsHubTemplate 수렴 기반 마련.
