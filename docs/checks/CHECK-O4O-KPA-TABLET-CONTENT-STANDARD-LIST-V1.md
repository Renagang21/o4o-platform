# CHECK-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1

> 목적: `태블릿 콘텐츠` 화면(TabletScreenSetManager library 모드)을 O4O 표준 테이블 리스트로 정비.
> 선행 조사: [`IR-O4O-KPA-TABLET-CONTENT-CREATION-CURRENT-STATE-AUDIT-V1`](../investigations/IR-O4O-KPA-TABLET-CONTENT-CREATION-CURRENT-STATE-AUDIT-V1.md) (WO-1)
> Work Order: `WO-O4O-KPA-TABLET-CONTENT-STANDARD-LIST-V1`
> 원칙: API/DB/runtime/kiosk-core/template/운영샘플 **무변경**. 리스트 UI 정비 중심.

---

## 1. 실제 원인 / 현재 구조

- `태블릿 콘텐츠` 탭 = [`TabletScreenSetManager.tsx`](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx) `mode='library'` — 화면 세트를 **수제 카드 그리드**로 렌더(검색·필터·페이지네이션·체크 일괄·kebab 없음).
- 표준 리스트 스택은 이미 완비: `@o4o/operator-ux-core`(DataTable/Pagination/defineActionPolicy/buildRowActions/useBatchAction) + `@o4o/ui`(RowActionMenu/ActionBar/BulkResultModal). KPA canonical 선례 = [`OperatorQrListPage.tsx`](../../services/web-kpa-society/src/pages/operator/qr/OperatorQrListPage.tsx).
- Screen Set 관리 API(`/store/screen-sets`)는 **전체 목록을 반환**(서버 페이지네이션·검색 파라미터 없음). soft-delete(보관)만 존재하고 **hard-delete 엔드포인트는 없음**([`api/tabletDisplays.ts:273`](../../services/web-kpa-society/src/api/tabletDisplays.ts#L273)).

---

## 2. 변경 파일 (2개, KPA 한정)

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/TabletContentLibraryList.tsx` (**신규**) | O4O 표준 테이블 컴포넌트. DataTable(selectable)+검색+상태필터+Pagination+kebab(RowActionMenu)+ActionBar 일괄보관+BulkResultModal. client-side 검색/필터/페이지. |
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` (**수정**) | library 리스트를 신규 컴포넌트로 교체. reload 가 library 는 `includeArchived:true`(상태필터 '보관' 노출용). 헤더 '새 세트' 버튼 제거(진입점을 테이블 도구막대 '태블릿 화면 만들기'로 이전). **corner 모드 렌더는 `!isLibrary` 게이팅으로 로직 동일 유지(무접촉).** |

> `pnpm-lock.yaml` 의 무관한 변경(직전 `pnpm install` 잔재)은 본 커밋에서 제외(pathspec 스코프).

---

## 3. 변경 내용

### 3.1 표준 테이블 (신규 컴포넌트)

- **컬럼**: 선택(체크박스 자동) / 콘텐츠명(+재사용 배지) / 템플릿 / 상태(배지) / 사용 중인 코너 / 블록 수 / 수정일 / 작업(⋮).
- **검색**: 콘텐츠명 client-side 필터. **상태 필터**: 전체(비보관)/초안/활성/보관 pill. **페이지네이션**: `Pagination`(20/page, client-side slice).
- **개별 작업(점 3개 kebab)**: `defineActionPolicy` + `buildRowActions` + `RowActionMenu`(inlineMax:0).
  - **수정** → 부모 인라인 편집 패널(`openEdit`).
  - **보관** → 부모 `handleArchive`(window.confirm + 적용중 가드 + reload). RowActionMenu confirm 미설정(중복 방지).
  - **미리보기 / 복제 / 삭제(hard) → 미노출**(후속 WO). §4 참조.
- **일괄 작업(체크 후)**: `ActionBar` → **선택한 콘텐츠 보관**(`useBatchAction` + `Promise.allSettled(archiveScreenSet)` + `BulkResultModal`). 적용 중(`SCREEN_SET_IN_USE`) 항목은 실패로 표기.
- 행 클릭 = 수정 진입. 검색/필터/페이지 변경 시 선택 해제.

### 3.2 만들기 진입점

- 테이블 도구막대 우측 **`[+ 태블릿 화면 만들기]`** → 기존 생성 폼(`creating`) 오픈. **스텝형 제작기 전체는 구현하지 않음**(후속 WO). 생성 후 기존 인라인 편집 패널로 진입(기존 동작 유지).

---

## 4. 정책 결정 (WO 금지선과의 정합 — 확인 필요)

### 4.1 '삭제(hard delete)' 미노출 — API 부재로 '보관'에 일원화

- WO 는 kebab/일괄에 '삭제'를 열거하나, **hard-delete 엔드포인트가 존재하지 않는다**(`DELETE /screen-sets/:id` = soft delete = 보관). 별도 '삭제'를 만들려면 **API 신설이 필요**하며 이는 WO 금지사항(`API 변경 금지`)에 정면 위배된다.
- 따라서 **제거 동작을 '보관'(soft delete)으로 일원화**하고 별도 '삭제'는 미노출했다(미리보기·복제와 동일 처리). 보관 세트는 상태 필터 '보관'에서 조회 가능(데이터 유실 없음).
- ➡️ hard-delete 가 실제로 필요하면 **후속 API WO**(엔드포인트 신설)로 분리 권고.

### 4.2 `useStandardListQuery` 미채택 — canonical 선례(local state) 준용

- WO 구현 원칙은 `useStandardListQuery` 를 명시하나, 이 훅은 **서버 페이지네이션 fetcher(query)→paginated 응답** 모델이다. Screen Set API 는 전체를 반환(서버 param 없음)하고, 매니저는 이미 `sets` 를 `reload()` 단일 소스로 보유(편집·생성·dirty-guard 공유)한다.
- KPA canonical 표준-테이블 선례 `OperatorQrListPage` **자체도 `useStandardListQuery` 대신 local state**를 사용한다. 이를 준용해 **local state + client-side 검색/필터/페이지**로 구현하고, 나머지 표준 스택 4종(DataTable·selectable·Pagination·kebab/action-policy)은 그대로 채택했다.
- 즉 표준 리스트 UX(검색/필터/페이지/체크 일괄/kebab)는 100% 충족하되, 상태 훅만 선례와 동일하게 대체. API 변경 없이 정합.

---

## 5. 보존 사항 / 금지선 준수

| 항목 | 상태 |
|---|---|
| corner(코너별 운영) 모드 렌더·적용/해제 | ✅ `!isLibrary` 게이팅으로 로직 동일(무접촉) |
| 코너 적용·해제 기능이 library 에 노출 | ✅ 미노출(신규 테이블에 apply 없음) |
| `mode='library'` 유지 | ✅ |
| 기존 Screen Set CRUD 재사용 | ✅ create/update/archive/blocks 무변경 |
| 적용·제작 분리 | ✅ 유지(제작=library, 적용=corner) |
| API / DB migration / runtime / kiosk-core / template / 운영 샘플 / QR 생성 | ✅ **무변경** |
| 스텝형 제작기 / draft 미리보기 / 복제 API / 코너×콘텐츠 배정 | ✅ 미구현(후속 WO) |

---

## 6. 정적 검증

| 항목 | 결과 |
|---|---|
| `pnpm --filter @o4o/web-kpa-society run build` (`tsc && vite build`) | ✅ **✓ built in 20.83s** (타입체크 통과) |

- `@o4o/ui`/`@o4o/operator-ux-core` 표준 스택 import·타입 정합 확인(OperatorQrListPage 동일 계약).

---

## 7. 배포 / Browser Smoke

| 항목 | 값 |
|---|---|
| commit | (본 커밋) |
| 배포 | Deploy Web Services (Cloud Run) — kpa-society-web |
| Browser smoke | **Deferred** — 인증 세션 미보유 시 자동 로그인 금지(WO). 배포 후 약국 계정(`renagang21@gmail.com`, SSOT 참조) 로그인으로 `/store` → 태블릿 콘텐츠 탭 육안 검증 필요. |

> Browser smoke 검증 항목(후속): 표준 테이블 렌더 / 검색 / 상태 필터 / 페이지네이션 / 체크 선택 → 일괄 보관(+실패 모달) / kebab(수정·보관) / '태블릿 화면 만들기' 진입 / 코너 적용 기능 미노출 / 성공·실패 toast.

---

## 8. 완료 기준 대조

| 완료 기준 | 결과 |
|---|---|
| 태블릿 콘텐츠가 O4O 표준 리스트로 표시 | ✅ DataTable + 검색 + 상태필터 + Pagination |
| 개별 작업 = 점 3개 메뉴 | ✅ RowActionMenu(수정/보관; 미리보기·복제·삭제 미노출) |
| 일괄 작업 = 체크 후 작업 선택 | ✅ ActionBar 일괄 보관 + BulkResultModal |
| 태블릿 화면 만들기 진입점 | ✅ 도구막대 버튼(→ 생성 폼) |
| 기존 Screen Set CRUD 재사용 | ✅ |
| 적용·제작 기능 분리 유지 | ✅ |
| API·DB·runtime 변경 없음 | ✅ |
| commit/push | 본 커밋 |
| build | ✅ |
| Browser smoke | Deferred(인증 세션 없음) |

---

*작성: 2026-07-14 · Status: 구현 완료(빌드 통과) · Browser smoke Deferred*
