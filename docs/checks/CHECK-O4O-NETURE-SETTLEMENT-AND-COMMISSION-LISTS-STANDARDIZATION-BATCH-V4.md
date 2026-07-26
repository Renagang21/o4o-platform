# CHECK-O4O-NETURE-SETTLEMENT-AND-COMMISSION-LISTS-STANDARDIZATION-BATCH-V4

WO: `WO-O4O-NETURE-SETTLEMENT-AND-COMMISSION-LISTS-STANDARDIZATION-BATCH-V4`
일시: 2026-07-26 (KST) · commit `31cbedc32`

## 0. 결론 — **정산 3종 전량 보류 · 잔여에서 1건 전환**

WO 지시대로 표면 지표가 아니라 **행 렌더·액션·집계 계약까지 확인**한 결과,
정산·수수료 3종은 **전부 중지 조건에 해당**했다. 대신 잔여에서 동형 1건을 전환했다.

`backend 0 · DB 0 · migration 0 · 계산식 변경 0 · 상태 전이 변경 0`

---

## 1. 정산 3종 구조 대조 결과

### 1-A. 표면상으로는 동형이 맞았다

| 항목 | `AdminSettlementsPage` | `AdminPartnerSettlementsPage` | `AdminCommissionsPage` |
|------|---|---|---|
| 줄 수 | 695 | 600 | 667 |
| 표 개수 | 2 | 2 | 2 |
| 전용 Row 컴포넌트 | 없음 | 없음 | 없음 |
| `expandedId` 사용 | 6회 | 6회 | 6회 |
| API | `adminSettlementApi.*` (7종) | `adminPartnerSettlementApi.*` (4종) + 모니터링 | `adminCommissionApi.*` (7종) |
| 액션 | calculate/approve/pay/cancel | create/pay | calculate/approve/pay/cancel |

### 1-B. 실제 구조 — **표 2개는 목록 2개가 아니라 "목록 + 확장행 내부 상세"**

세 화면 모두 동일한 구조다.

```
표1 = 메인 목록 (공급자/파트너/커미션 행)
  └ <tr>{행}</tr>
  └ {isExpanded && (
       <tr><td colSpan={9}>          ← 확장행
         표2 = 상세 명세 (주문번호·주문자·매출 / 상품명·수량·단가)
       </td></tr>
    )}
```

즉 **표2 는 표1 의 `<tbody>` 안에 형제 `<tr>` 로 렌더**된다
([AdminSettlementsPage.tsx:380-390](services/web-neture/src/pages/admin/AdminSettlementsPage.tsx#L380)).

### 1-C. 중지 사유 — `DataTable` 은 행 확장을 표현할 수 없다

`DataTableProps` 전체 prop 실측 (`packages/operator-ux-core/src/list/types.ts:67-111`):

```
columns · data · rowKey · loading · emptyMessage · onRowClick · className
tableId · reorderable · persistState · columnVisibility
selectable · selectedKeys · onSelectionChange
manualSort · sortBy · sortOrder · onSort
```

**`expandable` / `renderExpanded` / `subRow` 계열 prop 이 없다.** `BaseTable` 에도 없다
(grep 결과 0건).

→ 표1 을 `DataTable` 로 바꾸면 **정산 명세(주문·상품 내역) 확인 기능이 사라진다.**
이는 WO 중지 조건 두 가지에 동시 해당한다.

- "표가 편집 폼·정산 계산기와 강하게 결합된 경우" — 상세 명세가 목록 행에 구조 결합
- "공통화가 계산 결과나 액션 가시성을 바꾸는 경우" — 명세 열람 동선 소실

**따라서 3종 모두 전환하지 않았다.** 금액·합계·상태 전이 코드에 손대지 않았다.

### 1-D. 선결 과제

이 화면군을 표준화하려면 **`DataTable` 에 행 확장 지원을 먼저 추가**해야 한다
(`expandable?: boolean` + `renderExpandedRow?: (row) => ReactNode`).
공용 컴포넌트 확장이므로 소비처 전수 영향 검토가 필요하다 → 별도 WO 권고:
`WO-O4O-DATATABLE-EXPANDABLE-ROW-SUPPORT-V1`.

---

## 2. 부수 성과 — neture 전환 가능성 지도

정산 3종 분석에서 나온 **행 확장 여부**가 실제 전환 가능성의 결정 요인임을 확인하고,
neture 실제 마크업 47건 전체를 이 기준으로 재판정했다.

| 구분 | 건수 | 내용 |
|------|:---:|------|
| **확장행·전용 Row 컴포넌트 제약** | **11** | `AdminSettlements` · `AdminPartnerSettlements` · `AdminCommissions` · `SupplierSettlements` · `AiCostPage` · `CategoryManagement` · `OperatorContactMessages` · `MarketTrialApprovals`(ForumFailureRow) · `MarketTrialApprovalDetail`(InfoRow) · `SupplierCsvImport`(CsvBatchRow) · `AdminContactMessages`* |
| **전환 가능** | **36** | 나머지 |

> **\* `AdminContactMessages` 예외:** `expandedId` 를 쓰지만 확장 상세가 **표 바깥**에 렌더되어
> V3 에서 정상 전환되었다. → **이 판정 기준은 스크리닝 신호이지 확정이 아니다.**
> 확장 상세가 `<tbody>` 안인지 밖인지 **개별 확인이 필요**하다.

---

## 3. 추가 전환 (WO "잔여 중 확실한 동형" 조항)

### 3-A. 동형 판정

파트너 목록군 4종을 대조한 결과, 3종이 **동일 헤더 클래스·동일 액션 열 구조·확장행 없음**으로 동형이었다.

| 화면 | 헤더 스타일 | 마지막 열 | 확장행 |
|------|------|------|:---:|
| `PartnerContentsPage` (243줄) | Tailwind `text-xs font-semibold uppercase` | 관리 | 없음 |
| `PartnerStoresPage` (229줄) | 동일 | 관리 | 없음 |
| `PartnerLinksPage` (195줄) | 동일 | Actions | 없음 |
| `ReferralLinksPage` (331줄) | **inline style** (`styles.th`) | Actions | 없음 |

### 3-B. 전환한 화면 — `PartnerContentsPage`

| 항목 | 결과 |
|------|------|
| 데스크톱 표 5컬럼 | raw `<table>` → **`DataTable`** |
| 모바일 카드 뷰 | **유지** — `hidden md:block` 반응형 구조 보존 |
| 행 액션 3종(수정/링크/삭제) | **`RowActionMenu`** 로 이관 (다중 행 액션) |
| 이동 경로 | `Link` → `useNavigate` 치환, **목적지 동일** |
| 삭제 | 기존에도 핸들러가 없던 자리 — **동작 무변경**(TODO 주석 명시) |
| 검색·유형·상태 필터 | **무변경** |

> 나머지 3종은 동형이나 세션 작업량 한계로 이번에 처리하지 못했다.
> `ReferralLinksPage` 는 inline style 이라 스타일 제거까지 함께 필요하다.

---

## 4. 업무 보존 확인

| 항목 | 결과 |
|------|:---:|
| 금액·수수료·정산 합계 계산식 | **미변경** (정산 3종 코드 무수정) |
| 정산 상태 전이·승인 조건 | **미변경** |
| API·DB·migration | **0** |
| 엑셀·CSV·영수증·상세 이동 | **미변경** |
| 서버 페이지네이션·정렬 순서 | **미변경** |
| 핵심 CTA kebab 은닉 | **없음** — `PartnerContentsPage` 는 다중 액션이라 메뉴가 적합 |
| 읽기 전용 요약표 체크박스 추가 | **없음** |

## 5. 검증

| 항목 | 결과 |
|------|:---:|
| typecheck (`PartnerContentsPage`) | **오류 0** |
| `web-neture` build | **PASS** |
| 잔여 raw `<table>` 마크업 | **0** |

**미수행:** 브라우저 실측 — 자동화 프로필을 다른 세션이 점유 중. 목록 건수·금액 합계 전후 비교,
필터·페이지네이션, 모바일 overflow 는 **코드 경로·빌드로만 검증**했다.
정산 3종은 **코드를 수정하지 않았으므로 금액·합계 회귀 위험이 구조적으로 없다.**

## 6. 잔여 우선순위

| 순위 | 대상 | 건수 | 비고 |
|:---:|------|:---:|------|
| 1 | `DataTable` 행 확장 지원 (선결) | — | 이것 없이는 정산군 11건이 영구 보류 |
| 2 | 파트너 목록군 잔여 3종 | 3 | 동형 확인 완료 — 즉시 착수 가능 |
| 3 | 주문·상품 목록 5종 | 5 | 확장행 없음 |
| 4 | 사용자·플랫폼·기타 | 4 | 개별 |
| — | 확장행 제약군 | 11 | 1번 선결 후 |
| — | 읽기전용·상세·폼 내부 | 16 | 전환 부적합 후보 |

**neture 진행률:** 실제 마크업 47건 중 **전환 누계 5건**(V2 1 · V3 3 · V4 1), 제약 11건,
부적합 후보 16건, 즉시 전환 가능 잔여 15건.

## 7. 커밋

| 항목 | 값 |
|------|-----|
| commit | `31cbedc32` — `PartnerContentsPage` (+62 / -58) |
| 정산 3종 | **무수정** (보류) |
