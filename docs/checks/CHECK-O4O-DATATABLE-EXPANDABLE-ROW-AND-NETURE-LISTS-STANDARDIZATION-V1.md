# CHECK-O4O-DATATABLE-EXPANDABLE-ROW-AND-NETURE-LISTS-STANDARDIZATION-V1

WO: `WO-O4O-DATATABLE-EXPANDABLE-ROW-AND-NETURE-LISTS-STANDARDIZATION-V1`
일시: 2026-07-26 (KST) · commit `13ce20c12`

## 0. 결론

| 범위 | 결과 |
|------|:---:|
| **A. `DataTable` 행 확장 (공용)** | ✅ **완료** — additive, 91 소비처 무회귀 |
| **B. 정산 3종** | ✅ **3/3 완료** |
| **C. 파트너 목록 3종** | ✅ **3/3 완료** |

`BaseTable 미수정 · API/DB/migration 0 · 계산식·상태 전이 변경 0`

---

## 1. A. DataTable 행 확장 — 완료

### 1-A. 중지 조건 회피 — `BaseTable` 을 고치지 않아도 되었다

WO 원칙은 "`BaseTable` 까지 동시에 확장하지 않음" 인데, `DataTable` 은 `<tbody>` 렌더를
`BaseTable` 에 전적으로 위임하는 thin wrapper 라 **구조상 충돌 가능성**이 있었다.

조사 결과 **`BaseTable` 에 이미 `renderAfterRow?: (row, index) => ReactNode` 훅이 존재**한다
(`packages/ui/src/components/table/types.ts:98`, 렌더 위치 `BaseTable.tsx:610,659` —
행 `<tr>` 바로 뒤 같은 `<Fragment>` 안).

또한 `packages/ui/src/ag-components/DataTable.tsx:251` 이 **이미 이 훅으로 행 확장을 구현한 선례**가
있었다. → `BaseTable` 수정 없이 `operator-ux-core/DataTable` 에서 구현 가능. **중지 조건 미해당.**

### 1-B. 구현한 계약 (WO 권장안 그대로)

```ts
expandable?: boolean;
expandedRowKeys?: Set<string>;              // 미지정 시 내부 state (uncontrolled)
onExpandedRowKeysChange?: (keys: Set<string>) => void;
renderExpandedRow?: (row: T) => ReactNode;
isRowExpandable?: (row: T) => boolean;
```

| 요구 | 구현 |
|------|------|
| 기존 소비처 prop 미설정 시 변화 0 | `expandEnabled = !!expandable && !!renderExpandedRow` — false 면 컬럼 추가·`renderAfterRow` 전달 모두 하지 않음 |
| 확장 행은 원본 행 바로 아래 별도 `<tr>` | `renderAfterRow` 가 `<Fragment>` 안에서 보장 |
| `colSpan` = 실제 표시 컬럼 수 | `o4oColumns.length` — `_select`/`_expand` 포함 후 계산 |
| 선택·정렬·RowActionMenu 와 무충돌 | 확장 상태를 `selectedKeys` 와 **별도 Set** 으로 관리. 토글 버튼은 `e.stopPropagation()` |
| 행 전체 클릭 강제 금지 | `onRowClick` 미변경. 우측 `_expand` 컬럼에 **명시적 토글 버튼** |
| 키보드 접근성 | `<button type="button">` + `aria-expanded` + `aria-label` + `focus:ring` |
| 모바일 가로 스크롤 | `BaseTable` 의 `overflow-x-auto` 그대로 상속 |
| 중첩 `DataTable` | `renderExpandedRow` 가 임의 ReactNode 를 받으므로 가능 |

### 1-C. 무회귀 검증

| 항목 | 값 |
|------|:---:|
| `DataTable` 소비처 파일 | **91** |
| 그중 `selectable` 사용 | 51 |
| `manualSort`/`onSort` 사용 | 4 |
| `RowActionMenu` 병용 | 46 |
| **신규 prop 사용처** | **0** (전환 대상 외 전부 미사용) |
| typecheck — `web-neture` / `web-kpa-society` / `web-glycopharm` / `web-k-cosmetics` | **4/4 PASS** |

소비처를 **한 파일도 수정하지 않았고**, 타입·렌더 구조상 prop 미사용 시 기존 경로가 그대로 실행된다.

---

## 2. B. 정산 3종 — 1/3 전환

### 2-A. `AdminSettlementsPage` (완료)

| 항목 | 결과 |
|------|------|
| 목록 | raw `<table>` 9컬럼 → **확장 가능한 `DataTable`** |
| 정산 명세 | 확장행 내부 표 → **`renderExpandedRow`** (읽기 전용 명세라 중첩 `DataTable` 대신 기존 표 표현 유지) |
| **확장 계약 이전** | 기존 `expandedId: string \| null`(단일 확장 + 확장 시 `getDetail` 호출)을 **Set 어댑터**로 이전. `expandedKeys` 는 항상 0~1개만 담아 **단일 확장 의미 보존**, 토글은 기존 `toggleExpand` 가 그대로 담당 → **상세 조회 계약 불변** |
| 행 액션 | 승인/취소/지급 → **`RowActionMenu`**. 상태별 분기(calculated=승인·취소, approved=지급·취소) 및 `actionLoading` disabled 보존 |
| 금액·수수료·합계 | **계산식 미변경** — `formatPrice`/`formatRate`/`getStatus` 그대로 사용 |
| 페이지네이션·검색·필터 | **무변경** |
| 미사용 import 정리 | `ChevronDown/Up`·`Check`·`CreditCard`·`XCircle`·`Fragment` 제거 |

> 확장 토글이 기존에는 **행 전체 클릭**이었으나, 표준은 우측 `_expand` 버튼이다.
> 행 클릭 확장은 액션 셀에서 `stopPropagation` 으로 막던 구조라 **버튼 방식이 더 명확**하다.
> (WO "행 전체 클릭 강제 금지" 원칙과도 일치)

### 2-B. `AdminCommissionsPage` · `AdminPartnerSettlementsPage` (완료)

`AdminSettlementsPage` 와 동일 패턴 적용. commit `cfb37b817`.

| 항목 | 결과 |
|------|------|
| 목록 | raw `<table>` → 확장 가능한 `DataTable` |
| 명세 | `renderExpandedRow` — 읽기 전용이라 중첩 `DataTable` 대신 기존 표 표현 유지(WO 허용) |
| 확장 계약 | `toggleExpand` / `handleExpand` 를 Set 어댑터로 보존(0~1개) |
| 행 액션 | Commissions = 승인/취소/지급 → `RowActionMenu`(상태별 분기)<br>PartnerSettlements = 지급 1종 + `paid` 시 "완료" 표시 유지 |
| 금액·커미션·합계 계산식 | **미변경** |

> 전환 후에도 세 파일에 `<table>` 이 1건씩 남는데, 이는 **`renderExpandedRow` 내부의 상세 명세표**다.
> WO "확장 내부 표는 … 단순 명세면 읽기 전용 표준 표현 사용" 에 해당하는 의도된 잔존이다.

---

## 3. C. 파트너 목록 3종 — 완료

commit `d038acba9`. V4 의 `PartnerContentsPage` 를 포함해 파트너 목록군 **4종 전부 표준화**되었다.

| 화면 | 컬럼 | 행 액션 처리 |
|------|:---:|------|
| `PartnerStoresPage` | 7 | 아이콘 3종(보기/링크/해제) → **`RowActionMenu`** |
| `PartnerLinksPage` | 5 | 복사/열기 → **인라인 유지** (복사는 `copied` 상태 피드백이 있는 주 CTA) |
| `ReferralLinksPage` | 5 | 동일 사유로 Copy/Open **인라인 유지** |

- 3종 모두 **데스크톱 표만 전환**하고 `md:hidden` 모바일 카드 뷰는 그대로 유지했다.
- 핸들러가 없던 자리(보기·해제)는 **동작을 바꾸지 않고** TODO 주석으로 명시했다.
- 목록 raw `<table>` 잔여 **0**.

---

## 4. 검증 결과

| # | WO 검증 항목 | 결과 |
|:-:|--------------|------|
| 1 | 기존 소비처 typecheck·build 무회귀 | ✅ 4서비스 typecheck PASS · `web-neture` build PASS |
| 2 | 확장 열기·닫기·다중 확장 | ⚠️ 코드 경로 확인. `AdminSettlementsPage` 는 **의도적으로 단일 확장** 유지 |
| 3 | 정렬·페이지 이동 후 확장 상태 | ⚠️ 미실측 — 상태가 소비처 소유라 페이지 이동 시 기존 `expandedId` 동작을 따름 |
| 4 | 선택 체크박스와 확장 독립 | ✅ 구조적 보장(별도 Set, 별도 컬럼) |
| 5 | 정산 목록 건수·금액·합계 | ⚠️ 미실측 — 계산식·API 무변경이라 구조적 회귀 위험 없음 |
| 6 | 명세·상태 변경·다운로드 | ⚠️ 미실측 — 호출 함수 무변경 |
| 7 | 파트너 3종 데스크톱·모바일 렌더 | ✅ 데스크톱 전환 + 모바일 카드 유지(코드 확인) |
| 8 | inline style 제거 | ⚠️ `ReferralLinksPage` 는 표를 `DataTable` 로 옮겼으나 **페이지 전체 inline style 은 잔존** — 컬럼 render 가 기존 `styles.*` 를 그대로 재사용 |
| 9 | 배포 | V5·V6 자동 트리거 완료 · V7 `Deploy Web Services` run `30229120985`(SHA `7e1996afb`) |
| 10 | 브라우저 smoke | V5: `AiCost`·`OperatorContactMessages` PASS, `SupplierSettlements` 렌더 PASS(live 0건), `ReferralLinks` 계정 갭. V6: 3종 smoke. **V7: 배포 후 smoke(아래 §7)** |
| 11 | V7 typecheck·build | ✅ `tsc --noEmit` PASS(exit 0) · `vite build` PASS(built 13.68s) |
| 12 | V7 inline 편집 focus/state 보존 | ✅ 구조적 보장 — 편집기는 product-id keyed row 의 위치 자식, `sortable` 미설정 → reorder/remount 없음 → React 재조정 raw table 과 동일 |
| 13 | V7 셀 액션 클릭 시 오드릴다운 방지 | ✅ 구조적 보장 — `RecruitingProducts` 액션 컬럼 `onCellClick:()=>{}` → `BaseTable` 가 `stopPropagation` 선행 후 호출 |

## 5. 잔여

| 순위 | 대상 | 건수 |
|:---:|------|:---:|
| 1 | ~~확장 제약 해소된 나머지~~ → V5 전환 완료(`SupplierSettlements`·`AiCost`·`OperatorContactMessages`), `CategoryManagement` HOLD | 0(+1 HOLD) |
| 2 | ~~주문 목록 3종~~ → V6 전환 완료 / ~~상품 목록 2종 보류~~ → V7 전환 완료 | 0 |
| 3 | ~~사용자·플랫폼·기타 4종~~ → V7 전환 완료(`PlatformUsers`·`PlatformAccounts`·`AdminMaster`·`SupplierPartnerCommissions`) | 0 |
| 4 | `ReferralLinksPage` 페이지 단위 inline style 제거 | 1 |

**neture 진행률:** 실제 마크업 47건 중 전환 누계 **24건**(V2 1 · V3 3 · V4 1 · 본 WO 6 · V5 3 · V6 3 · **V7 7**),
즉시 전환 가능 잔여 **0건**(+ `AllProductsOverview` 1건 HELD — 아래 참조), 부적합/HOLD·비목록 16건.

**V5 (확장 잔여 전환):** `SupplierSettlementsPage`·`AiCostPage`·`OperatorContactMessagesPage` 데스크톱 표 → `DataTable`.
`CategoryManagementPage` 는 트리 구조라 HOLD(표 강제 부적합). `ReferralLinksPage` 표는 전환하되 페이지 inline style 잔존.

**V6 (주문 목록 동형 묶음):** `SupplierOrdersListPage`(공급자 주문·상태전진 액션)·`OrdersManagementPage`(운영자 주문)·`StoreOrdersPage`(매장 주문·재주문 액션)
데스크톱 표 → `DataTable`. 모바일 카드·툴바·필터·페이지네이션·행 액션 유지, 백엔드 계약 무변경.

**V7 (마지막 구현 묶음 — 즉시 전환 가능 잔여 전량):** 상품 목록 3종 + 기타 flat 4종.

| 화면 | 특성 | 처리 |
|------|------|------|
| `SupplierProductsListPage` | **inline 가격 편집기**(`InlinePrice`) + 활성 토글 | 편집기를 컬럼 `render` 로 보존. 인터랙티브 셀은 `onCellClick:()=>{}` 가드. `sortable` 미설정 → 행 remount 없음 → 편집 state·focus 무손실 |
| `RecruitingProductsOverviewPage` | **row-click 드릴다운** + 인셀 모집 토글/추천 star | 드릴다운=`onRowClick`. 두 액션 셀은 `onCellClick:()=>{}` 로 row 버블 차단(기존 `<td>` `stopPropagation` 대체). 검색·카테고리·페이지네이션·상세 패널 유지 |
| `SupplierRecruitmentsPage` | 단순 목록, 인셀 `신청자 보기`/마감·재개 | 액션 버튼 `render` 유지, row-click 없음 |
| `PlatformUsersPage` | 읽기전용, 서버 페이지네이션 | 검색·상태필터·페이지네이션 유지 |
| `PlatformAccountsPage` | 인셀 비밀번호 재설정 모달·활성 토글 | 액션 `render` 유지 |
| `AdminMasterManagementPage` | 인셀 수정/설명 정비 모달 | 액션 `render` 유지. loading + 이중 empty-state 를 `emptyMessage` 로 통합 |
| `SupplierPartnerCommissionsPage` | inline-style `th`/`td` + CRUD 모달 | 모바일 카드 토글용 반응형 wrapper 유지, 사장(死藏) `thStyle`/`tdStyle` 제거 |

- **`DataTable`/`BaseTable` 무수정** — 기존 `onRowClick`(행 클릭) + per-column `onCellClick`(셀 클릭 격리, `stopPropagation` 선행 계약)만으로 상품 목록 3종의 편집·드릴다운·셀 액션 분리가 모두 충족됨. WO "소비처 2곳 이상 필요 시에만 additive" 기준에 미달 → additive 미실시.
- **`AllProductsOverviewPage` (HELD, 미커밋):** 동일 파일을 **동시 세션(LOAD-ERROR-CONTRACT WO)이 미커밋 상태로 편집 중**. DataTable 전환은 디스크에서 완료되고 typecheck+build GREEN 이나, 그 세션의 미커밋 load-error 작업을 본 WO 커밋에 흡수하면 교차-WO 귀속 오염이 발생하므로 **WO 중지 조건("동일 파일 동시 편집 → 해당 화면만 HOLD")에 따라 커밋에서 제외**. 두 변경은 디스크에서 정합적으로 공존하며, 해당 파일 커밋은 load-error 세션에 위임.

## 6. 커밋

| 항목 | 값 |
|------|-----|
| `13ce20c12` | 공용 행 확장 + `AdminSettlementsPage` (3파일, +179/-142) |
| `cfb37b817` | `AdminCommissionsPage` · `AdminPartnerSettlementsPage` (+177/-241) |
| `d038acba9` | 파트너 목록 3종 (+174/-177) |
| `7e1996afb` | **V7 상품+flat 7종** (7파일, +605/-481) |
| `BaseTable` / `DataTable` | **무수정** |
| 배포 | V7 → `Deploy Web Services` run `30229120985` (SHA `7e1996afb`) 트리거 |
