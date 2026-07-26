# IR-O4O-NETURE-SUPPLIER-API-LOAD-ERROR-CONTRACT-AUDIT-V1

조사일: 2026-07-25 (KST) · 기준 HEAD: `origin/main` (`37585a49c` 시점)
선행: `WO-O4O-NETURE-SUPPLIER-PRODUCTS-LOAD-ERROR-CONTRACT-V1` (완료, `bc441b48d` / `3d4a5a81d`)

**성격: read-only 조사.** 코드 변경 0 / 배포 0 / 운영 데이터 접근 0.

---

## 1. 조사 목적

공급자 조회 API가 실패를 `[]` · `0` · 빈 pagination 으로 삼켜 화면에서 **"정상 0건"과 구분되지 않는** 패턴이 얼마나 남아 있는지 전수 확정한다. 수정은 본 IR 범위 밖이며, 영향도 순으로 후속 WO 를 분리한다.

## 2. 분류 기준

| 등급 | 정의 |
|:---:|------|
| **A** | 오류를 throw 하고 **소비처가 처리**함 (계약 정상) |
| **B** | 오류를 throw 하지만 **소비처가 처리하지 않음** (실패가 조용히 0건이 됨) |
| **C** | API client 가 오류를 `[]` · `0` · `null` · 빈 pagination 으로 **삼킴** |
| **D** | 의도적 optional fallback (실패해도 화면을 막지 않는 것이 설계) |
| **E** | 현재 계약만으로 판단 불가 |

## 3. 전수 결과 — API client

### 3-1. `supplierApi` (`lib/api/supplier.ts`)

| 함수 | 실패 시 반환 | 등급 | 비고 |
|------|--------------|:---:|------|
| `getProducts()` | `throw SUPPLIER_PRODUCTS_LOAD_FAILED` | **A** | 선행 WO 완료 |
| `getProductsPaginated()` | `throw SUPPLIER_PRODUCTS_LOAD_FAILED` | **A** | 선행 WO 완료 |
| `getApprovalCounts()` | `{total:0, unrequested:0, pending:0, approved:0, rejected:0}` | **C** | 대시보드 "상품 승인 대기" 직결 |
| `getOrdersSummary()` | `{services:[], totalApprovedSellers:0, totalPendingRequests:0}` | **C** | `/supplier/orders` 허브 본문 |
| `getOrders()` | 빈 pagination fallback | **C** | |
| `getUnifiedOrders()` | 빈 pagination fallback | **C** | |
| `getOrderById()` | `null` | **C** | 실패가 "주문을 찾을 수 없습니다"로 표시됨(스모크 확인) |
| `getOrderKpi()` | `{today_orders:0, pending_processing:0, pending_shipping:0, total_orders:0}` | **C** | **대시보드 처리 필요·KPI 직결** |
| `getInventory()` | `[]` | **C** | **대시보드 재고 주의·품절 직결** |
| `getInventoryItem()` | `null` | **C** | |
| `getShipment()` | `null` | **E** | 배송건 미존재도 정상 `null` — 오류와 구분 불가. 계약 확인 필요 |
| `getSettlements()` | 빈 pagination fallback | **C** | |
| `getSettlementDetail()` | `null` | **C** | |
| `getSettlementKpi()` | `{pending_amount:0, paid_amount:0, total_amount:0, pending_count:0, paid_count:0}` | **C** | **대시보드 정산 대기 직결** |
| `getLibraryItems()` | `[]` | **C** | |
| `listSpotPolicies()` | `[]` | **C** | |
| `getOrderCondition()` | `null` | **E** | 미설정도 정상 `null` 가능 |
| mutation 계열 (`create*`/`update*`/`delete*`/`submit*`/`batch*`/`bulkDelete`) | `{success:false, error}` | **D** | 호출부가 `success` 를 검사하는 명시 계약 — 조회와 성격이 다름 |

### 3-2. `supplierCopilotApi`

| 함수 | 실패 시 | 등급 | 비고 |
|------|---------|:---:|------|
| `getKpi()` | `throw error` (원본 재throw) | **A** | 대시보드가 primary await + catch 로 처리 |
| `getProductPerformance()` | `[]` | **D** | 분석 블록 — 실패해도 운영 현황을 막지 않는 것이 설계 |
| `getDistribution()` | `[]` | **D** | 동일 |
| `getTrendingProducts()` | `[]` | **D** | 동일 |
| `getAiInsight()` | `null` | **D** | 동일 |

### 3-3. 기타 client

| 함수 | 실패 시 | 등급 | 비고 |
|------|---------|:---:|------|
| `supplierCommissionApi.getCommissions()` | `throw SUPPLIER_COMMISSION_LOAD_FAILED` | **A** | 별도 세션에서 정비 완료 |
| `supplierCommissionApi` mutation 3종 | `{success:false, error}` | **D** | |
| `supplierRecruitmentApi.listMine()` | `[]` | **C** | 대시보드 "판매자 모집 신청 대기" 직결 |
| `supplierRecruitmentApi.getApplications()` | `null` | **C** | |
| `supplierProfileApi.getProfile()` | `null` | **D** | `SupplierActivationGate` 가 fail-open 을 명시 설계로 문서화 |
| `supplierProfileApi.getCompleteness()` | `null` | **D** | 동일 |
| `supplierOnboardingApi.getOnboarding()` | `null` | **C** | 온보딩 미시작과 조회 실패가 구분 불가 |
| `supplierRegulatedCategoryApi.list()` | `[]` | **C** | |
| `supplierStoreDescriptionApi.listMine()` | try/catch 없음 → **propagate** | **A/B** | 소비처별 (§4) |
| `supplierScreenSetBuilderApi` (`call()` 래퍼) | rethrow | **A/B** | 소비처별 |
| `supplierKpaEventOfferApi.getStats()` | catch 없음 → **propagate** | **A/B** | 소비처별 |
| `api/trial.ts` `getMyTrials()` 등 | catch 없음 → **propagate** | **A/B** | 소비처별 |

## 4. 소비처 측 확정

| 화면 | 호출 | 오류 처리 | 등급 |
|------|------|-----------|:---:|
| `SupplierPartnerCommissionsPage` | `getCommissions()` | `Promise.allSettled` + `loadError` 상태 | **A** |
| `SupplierSignagePage` | signage 목록 | `.catch(e => setMessage({type:'error'}))` | **A** |
| `SupplierInventoryPage` | `getInventory()` | **try/catch 없음** — `[]` 를 그대로 렌더 | **C** |
| `SupplierSettlementsPage` | `getSettlements()` + `getSettlementKpi()` | `try/catch` 는 있으나 **두 API 가 먼저 삼켜서 catch 가 실행되지 않음** | **C** |
| `SupplierOrdersPage` | `getOrdersSummary()`, `getUnifiedOrders()` | 삼킨 fallback 을 그대로 렌더 | **C** |
| `SupplierDashboardPage` | ops 9종 `Promise.allSettled` | `ops[0..2]`(주문·재고·정산) 실패만 안내 배너. **`getApprovalCounts`·`recruitments`·`storeDescriptions`·`trials`·`eventOffer` 실패는 조용히 0건** | **B** |

> **B 등급 핵심**: `storeDescriptionApi.listMine()` · `getMyTrials()` · `eventOfferApi.getStats()` 는 이미 throw 하지만, 대시보드가 rejection 을 빈 배열로 흡수해 "설명서 0건 / 펀딩 0건 / 이벤트 0건"으로 표시한다. **API 는 이미 옳고 소비처만 미처리**이므로 수정 비용이 가장 낮다.

## 5. 등급 집계

| 등급 | 건수 | 대표 |
|:---:|:---:|------|
| A | 6 | getProducts, getProductsPaginated, getKpi, getCommissions + 소비처 2 |
| B | 5 | 대시보드의 승인카운트·모집·설명서·펀딩·이벤트 흡수 |
| C | 17 | 주문 6 · 재고 2 · 정산 3 · 승인카운트 1 · 모집 2 · 기타 3 |
| D | 9+ | 분석·프로필 fail-open + mutation `{success:false}` 계약 |
| E | 2 | `getShipment()`, `getOrderCondition()` — 정상 `null` 과 오류 `null` 구분 불가 |

## 6. 영향도 순 후속 WO 제안

### 우선순위 1 — 주문 · 재고 · 정산

```text
WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1
```

대상: `getOrderKpi` · `getOrders` · `getUnifiedOrders` · `getOrdersSummary` · `getOrderById` · `getInventory` · `getInventoryItem` · `getSettlements` · `getSettlementDetail` · `getSettlementKpi`

소비처 동시 정비 필수: `SupplierOrdersPage` · `SupplierInventoryPage` · `SupplierSettlementsPage` · `SupplierDashboardPage`

이유: **대시보드 "처리 필요" 카드 4종(처리 대기 주문 / 배송 준비 / 품절·재고 부족 / 정산 대기)이 전부 이 그룹에서 나온다.** 현재는 API 장애 시 "처리할 업무 없음"으로 표시되어 **운영 판단을 정반대로 오도**한다. 선행 WO 와 동일하게 `SUPPLIER_*_LOAD_FAILED` 코드 throw + 화면 4상태(loading / error / 0건 / 데이터) 분리.

주의: `SupplierInventoryPage` · `SupplierSettlementsPage` 는 `/account/supplier/*` 와 **동일 컴포넌트를 공유**한다(App.tsx 라우트 2곳). 한쪽만 보고 완료 판단 금지.

### 우선순위 2 — 상품 승인 카운트

```text
WO-O4O-NETURE-SUPPLIER-APPROVAL-COUNTS-LOAD-ERROR-CONTRACT-V1
```

대상: `getApprovalCounts()` (C) + 대시보드 흡수(B). 상품 목록 탭 카운트와 대시보드 "상품 승인 대기" 동시 소비.

### 우선순위 3 — 콘텐츠 · 유통

```text
WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1
```

대상: `recruitmentApi.listMine/getApplications` (C) + 대시보드의 설명서·펀딩·이벤트 흡수(B). B 만 먼저 떼어 **소비처 수정만으로 처리하는 선행 소작업**도 가능하다(API 무변경 → 위험 최소).

### 별도 확인 — E 등급

```text
getShipment() / getOrderCondition()
```

"미존재 `null`" 과 "조회 실패 `null`" 이 같은 값이다. backend 응답 계약(404 vs 5xx)을 먼저 확인해야 하며, 프론트만으로는 판단 불가 → 조사 선행 후 판단.

## 7. 판단 원칙 (후속 WO 공통)

```text
D 등급(분석·프로필 fail-open, mutation success 계약)은 건드리지 않는다.
mutation 의 {success:false,error} 계약은 조회 계약과 분리 유지한다.
throw 로 바꿀 때는 반드시 같은 커밋에서 소비처를 함께 정비한다.
  — API 만 바꾸면 B 등급(무한 로딩·unhandled rejection)을 새로 만든다.
고정 코드만 전파하고 서버 원문은 console 로만 남긴다 (선행 WO 패턴 유지).
backend / DB / migration 변경 0 을 유지한다.
```

## 8. 조사 제한

| 항목 | 상태 |
|------|:---:|
| 정적 분석 (API client + 소비처) | 완료 |
| 실제 오류 주입 런타임 검증 | 미실시 — 본 IR 은 조사 전용, 후속 WO 에서 수행 |
| backend 응답 계약(404 vs 5xx) 확인 | 미실시 — E 등급 2건에 한해 필요 |
| 운영 데이터 write | **0** |
