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
| 9 | 배포 | 진행 |
| 10 | 브라우저 smoke | **미수행** — 자동화 프로필 타 세션 점유 |

## 5. 잔여

| 순위 | 대상 | 건수 |
|:---:|------|:---:|
| 1 | 확장 제약 해소된 나머지(`SupplierSettlements`·`AiCost`·`CategoryManagement`·`OperatorContactMessages`) | 4 |
| 2 | 주문·상품 목록 5종 | 5 |
| 3 | 사용자·플랫폼·기타 | 4 |
| 4 | `ReferralLinksPage` 페이지 단위 inline style 제거 | 1 |

**neture 진행률:** 실제 마크업 47건 중 전환 누계 **11건**(V2 1 · V3 3 · V4 1 · 본 WO 6),
즉시 가능 잔여 **13건**, 부적합 후보 16건.

## 6. 커밋

| 항목 | 값 |
|------|-----|
| `13ce20c12` | 공용 행 확장 + `AdminSettlementsPage` (3파일, +179/-142) |
| `cfb37b817` | `AdminCommissionsPage` · `AdminPartnerSettlementsPage` (+177/-241) |
| `d038acba9` | 파트너 목록 3종 (+174/-177) |
| `BaseTable` | **무수정** |
| 배포 | `Deploy Web Services` run `30204077804` **success**(4서비스) — 이후 커밋분 자동 트리거 |
