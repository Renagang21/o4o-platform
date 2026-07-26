# CHECK-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1

WO: `WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1`
선행 IR: `IR-O4O-NETURE-SUPPLIER-API-LOAD-ERROR-CONTRACT-AUDIT-V1` (우선순위 1 그룹)
작성일: 2026-07-26 (KST)

---

## 1. 변경 전 각 API 의 실패 반환값

| 영역 | 함수 | 변경 전 실패 반환값 |
|------|------|---------------------|
| 주문 | `getOrdersSummary()` | `{services:[], totalApprovedSellers:0, totalPendingRequests:0}` |
| 주문 | `getOrders()` | `{data:[], meta:{page:1,limit:20,total:0,totalPages:0}}` |
| 주문 | `getUnifiedOrders()` | 동일한 빈 pagination |
| 주문 | `getOrderKpi()` | `{today_orders:0, pending_processing:0, pending_shipping:0, total_orders:0}` |
| 주문 | `getOrderById()` | `null` (실패·미존재 동일) |
| 재고 | `getInventory()` | `[]` |
| 재고 | `getInventoryItem()` | `null` (실패·미존재 동일) |
| 정산 | `getSettlements()` | 빈 pagination |
| 정산 | `getSettlementDetail()` | `null` (실패·미존재 동일) |
| 정산 | `getSettlementKpi()` | `{pending_amount:0, paid_amount:0, total_amount:0, pending_count:0, paid_count:0}` |

## 2. 변경 후 실패 계약과 상수

`services/web-neture/src/lib/api/supplier.ts` 에 영역별 상수를 export 한다.

```text
SUPPLIER_ORDERS_LOAD_FAILED
SUPPLIER_INVENTORY_LOAD_FAILED
SUPPLIER_SETTLEMENTS_LOAD_FAILED
```

3영역이 서로 다른 화면에서 소비되므로 WO §5 권장대로 **분리**했다.

적용 규칙 (선행 `SUPPLIER_PRODUCTS_LOAD_FAILED` 패턴 동일):

```text
1. 4xx / 5xx / 네트워크 오류 → console.warn(extractApiError(error)) 후 고정 코드 throw
2. 200 이지만 payload 계약 위반(data 비배열/비객체)도 실패로 간주해 throw
3. 서버 원문·stack trace 화면 전파 없음 (console 만)
4. 정상 0건은 성공 — 빈 배열·0 카운트는 그대로 반환
5. meta/pagination 누락은 실패가 아님 — 목록이 유효하면 기본값 유지
```

## 3. 상세 조회 처리 방침 — 3종 전부 반영

WO §5-1 원자성 규칙에 따라 **함수별 전부 반영 / 전부 미반영**만 허용된다. 조사 결과 3종 모두 backend 가 미존재를 404 로 **명시 반환**하므로 전부 반영했다.

| 함수 | backend 404 근거 | 반영 |
|------|------------------|:---:|
| `getOrderById()` | `supplier-order.controller.ts` — `ORDER_NOT_FOUND` 404 (소유권 불일치·미존재 모두) | 반영 |
| `getInventoryItem()` | `inventory.controller.ts:41` — `NOT_FOUND` 404 | 반영 |
| `getSettlementDetail()` | `supplier-settlement.controller.ts:84` — `NOT_FOUND` 404 | 반영 |

계약:

```text
404      → null 반환 (미존재)  — 기존 의미 보존
그 외 실패 → 고정 코드 throw     — "없음" 과 "실패" 분리
```

판별은 `isNotFound(error)` 헬퍼(응답 status === 404) 하나로 통일했다.
**API 만 변경하거나 소비처만 변경한 부분 반영 0건** — 3종 모두 소비처(주문 상세 / 정산 상세)를 같은 커밋에서 함께 정비했다. (`getInventoryItem()` 은 현재 소비처가 없어 API 계약만 정렬.)

## 4. 소비처별 4상태 분리 결과

| # | 화면 | 파일 | 정비 내용 |
|---|------|------|-----------|
| 1 | 공급자 홈 | `pages/supplier/SupplierDashboardPage.tsx` | 영역별 실패 상태 도입 (§5) |
| 2 | 공급자 운영 허브 | `pages/supplier/SupplierOrdersPage.tsx` | 요약/통합주문 **각각 독립** 오류 + 다시 시도. 실패 시 상단 통계 숨김, 통합주문 총건수 표기 숨김 |
| 3 | 재고 관리 | `pages/account/SupplierInventoryPage.tsx` | try/catch 신설(기존 없음) + `loadError` + 다시 시도. 실패 시 통계 카드 4종 숨김 |
| 4 | 정산 관리 | `pages/account/SupplierSettlementsPage.tsx` | 기존 catch 가 실제 동작하게 됨. `loadError`/`detailError` 분리, 실패 시 KPI 카드 숨김, 상세는 not-found/error 분리 |
| 5 | 주문 목록(account) | `pages/account/SupplierOrdersListPage.tsx` | `loadError` 신설 — 실패를 "현재 주문이 없습니다" 로 표시하지 않음 |
| 6 | 주문 상세(공유) | `pages/account/SupplierOrderDetailPage.tsx` | `error` 화면을 `not-found` 와 **별도 분기**로 신설(다시 시도 제공) |

전 화면 공통:

```text
loading   기존 유지
error     전용 문구 + 다시 시도
0건       기존 정상 빈 상태 유지
데이터     기존 유지
finally 로 loading 해제 → 로딩 영구 유지 없음
API 원문·stack trace 노출 없음
```

## 5. 대시보드 영역별 독립 처리 방식

기존 단일 `opsFailed: boolean` → **영역 단위 구조**로 교체.

```ts
type OpsArea = 'orders' | 'inventory' | 'settlements';
type OpsFailures = Record<OpsArea, boolean>;
```

- `Promise.allSettled` 구조는 유지하되 `rejected` 를 영역별로 식별한다.
- 실패 영역은 **`null` 로 두고 0 으로 대체하지 않는다** (`setOrderKpi(null)` / `setInventory(null)` / `setSettlementKpi(null)`).
- **처리 필요 카드**: 실패 영역 항목은 후보에서 제외 (0 으로 표시하지 않음).
- **핵심 운영 KPI 카드**: 실패 영역은 `—`(UNAVAILABLE) 표시.
- 실패 영역명을 배너에 명시: `주문 · 재고 · 정산 현황을 불러오지 못했습니다. 나머지 현황은 정상입니다.`
- **하나라도 실패 시 "현재 바로 처리해야 할 주요 업무가 없습니다." 미노출** — 대신 `… 현황을 불러오지 못해 처리 필요 업무를 확인할 수 없습니다.`

## 6. 오류 주입·복구 시나리오 결과 — 21/21 PASS

검증 방식: 프로덕션에서 XHR `open()` URL 재작성으로 대상 요청만 실패시킴.
`__failNet` → 도달 불가 주소(네트워크 실패), 미존재 id → backend 실제 404. **운영 데이터 write 0.**

### 6-1. 대시보드 부분 실패 조합 (WO §8-2)

| # | 시나리오 | 결과 | 근거 |
|---|----------|:---:|------|
| 1 | 주문만 실패 | PASS | 배너 `주문 현황을…` / KPI 처리대기·배송준비 `—` / **재고 `0`·정산 `0원` 정상 유지** |
| 2 | 재고만 실패 | PASS | 배너 `재고 현황을…` / 재고 주의 `—` / 주문 `0`·정산 `0원` 유지 |
| 3 | 정산만 실패 | PASS | 배너 `정산 현황을…` / 정산 대기 `—` / 주문 `0`·재고 `0` 유지 |
| 4 | 3영역 전부 실패 | PASS | 배너 `주문 · 재고 · 정산 현황을…` / 4개 KPI 전부 `—` / **8개 섹션 전부 유지(전체 오류 화면 전환 없음)** / 등록 상품은 정상 표시 |
| 5 | 어느 조합에서든 "처리할 업무 없음" 미노출 | PASS | 1~4 전부 `noTasksMsg=false` |
| 6 | 실패 영역 수치 0 표시 없음 | PASS | 전 조합에서 `—` |
| 7 | 복구 후 재시도 | PASS | 주입 해제 + 새로고침 → 오류 문구 0, 수치 `0`/`0원` 복원 |

### 6-2. 목록·상세 화면

| # | 대상 | 시나리오 | 결과 |
|---|------|----------|:---:|
| 8 | `/supplier/inventory` | 실패 → 오류 문구 + 다시 시도, 통계 숨김, `등록된 상품이 없습니다` 미노출, 로딩 미고착 | PASS |
| 9 | `/supplier/inventory` | 복구 → 오류 0, 정상 빈 상태 + 통계 표시 | PASS |
| 10 | `/account/supplier/inventory` | 공유 컴포넌트 정상 회귀 | PASS |
| 11 | `/supplier/settlements` | 실패 → 오류 + KPI 숨김, `정산 내역이 없습니다` 미노출 | PASS |
| 12 | `/account/supplier/settlements` | 정상 → KPI 표시 + 정상 빈 상태 | PASS |
| 13 | `/account/supplier/orders` | 실패 → `주문 정보를 불러오지 못했습니다`, `현재 주문이 없습니다` 미노출 | PASS |
| 14 | `/supplier/orders` | 요약만 실패 → 요약 오류·통계 숨김, **통합주문은 정상(`표시할 주문이 없습니다`)** | PASS |
| 15 | `/supplier/orders` | 통합만 실패 → 통합 오류·총건수 숨김, **요약 통계 정상 표시** | PASS |
| 16 | `/supplier/orders/:id` | 존재하지 않는 id(실제 404) → `주문을 찾을 수 없습니다`, **다시 시도 미노출** | PASS |
| 17 | `/supplier/orders/:id` | 네트워크 실패 주입 → `주문 정보를 불러오지 못했습니다` + **다시 시도 노출**, not-found 문구 미노출 | PASS |

### 6-3. 정상 상태

| # | 항목 | 결과 |
|---|------|:---:|
| 18 | 주입 없는 baseline — 오류 문구 0, 수치 `0` 정상 표시 | PASS |
| 19 | 정상 상태 콘솔 오류 | **0** |
| 20 | 로딩 영구 유지 | 전 라우트 0 |
| 21 | 빈 배열을 오류로 표시 | 0 |

## 7. 라우트 회귀 9종 (정상 상태)

| route | 렌더 | 로딩 고착 | 오탐 오류 | 가로 overflow |
|-------|:---:|:---:|:---:|:---:|
| `/supplier/dashboard` | OK | 없음 | 없음 | 없음 |
| `/supplier/orders` | OK | 없음 | 없음 | 없음 |
| `/supplier/orders/:id` | OK | 없음 | 없음 | 없음 |
| `/supplier/inventory` | OK | 없음 | 없음 | 없음 |
| `/supplier/settlements` | OK | 없음 | 없음 | 없음 |
| `/account/supplier/orders` | OK | 없음 | 없음 | 없음 |
| `/account/supplier/orders/:id` | OK | 없음 | 없음 | 없음 |
| `/account/supplier/inventory` | OK | 없음 | 없음 | 없음 |
| `/account/supplier/settlements` | OK | 없음 | 없음 | 없음 |

공유 컴포넌트 2경로(재고·정산) 및 주문 상세 2경로 모두 확인. 주문 목록은 전용 컴포넌트 2종(`SupplierOrdersPage` / `SupplierOrdersListPage`) 각각 확인.

## 8. 반응형 (오류 상태 기준)

| 폭 | 결과 |
|----|:---:|
| Desktop 1440×900 | PASS — 오류 배너·다시 시도 가독 |
| Mobile 390×844 | PASS — 재고 오류 다시 시도 89×39px 터치 가능, 대시보드 부분 실패 배너 `주문 · 정산 현황을…` 정상 줄바꿈, scrollWidth 375/390 → overflow 없음 |
| Tablet 768×1024 | PASS — 정산 오류 다시 시도 39px, scrollWidth 768 = viewport |

## 9. 배포 및 프로덕션 smoke

| 항목 | 값 |
|------|-----|
| commit | `b978f05fb` |
| workflow | `Deploy Web Services (Cloud Run)` — **success** (run 30187267881) |
| jobs | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01314-hb4` → **`neture-web-01315-hhg`** |

§6~§8 의 모든 검증은 **프로덕션(`neture-web-01315-hhg`)에서 수행**했다.

## 10. 무변경 확인

| 항목 | 값 |
|------|-----|
| 수수료·재고·정산 계산 로직 | **무변경** |
| 주문 상태 머신 | **무변경** |
| API 요청 경로·파라미터·응답 형태 | **무변경** (실패 처리만 변경) |
| mutation `{success:false,error}` 계약 | **무변경** |
| `getShipment()` / `getOrderCondition()` (IR E 등급) | **무변경** |
| 분석·프로필 fail-open (IR D 등급) | **무변경** |
| 사이드바·대시보드 정보구조 | **무변경** |
| `/account/supplier/*` 라우트 | **무변경** |
| backend / DB / migration | 0 / 0 / 0 |
| 운영 데이터 write | **0** |
| typecheck (`tsc --noEmit`) | PASS |
| build | PASS (10.02s) |

## 11. 변경 파일

```text
services/web-neture/src/lib/api/supplier.ts                    (+173/-…)
services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx
services/web-neture/src/pages/supplier/SupplierOrdersPage.tsx
services/web-neture/src/pages/account/SupplierOrdersListPage.tsx
services/web-neture/src/pages/account/SupplierOrderDetailPage.tsx
services/web-neture/src/pages/account/SupplierInventoryPage.tsx
services/web-neture/src/pages/account/SupplierSettlementsPage.tsx
```

7 파일 · 406 insertions / 102 deletions — **API 와 소비처를 같은 커밋(`b978f05fb`)에 담았다.**

## 12. 실데이터 제한

검증 계정은 주문·재고·정산·상품이 **전부 0건**이다.

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 실패 ↔ 정상 0건 구분 | 확인 완료 | 0건 환경이 오히려 본 WO 의 핵심 회귀(실패가 0건처럼 보이는 문제) 검증에 적합 |
| 실데이터가 있을 때의 목록·페이지네이션 렌더 | **미확인** | 대상 데이터 없음. 테스트 데이터 생성은 WO 금지 |
| `getInventoryItem()` 소비처 동작 | **미확인** | 현재 프론트 소비처가 없음 (API 계약만 정렬) |
| 정산 상세 not-found/error | **부분 확인** | 정산 0건이라 상세 토글 자체를 띄울 수 없음. 코드 경로는 주문 상세와 동일 패턴으로 구현·정적 확인 |

## 13. 후속 항목

| # | 항목 |
|---|------|
| 1 | `WO-O4O-NETURE-SUPPLIER-APPROVAL-COUNTS-LOAD-ERROR-CONTRACT-V1` (IR 우선순위 2) — `getApprovalCounts()` C 등급 + 대시보드 흡수 B 등급 |
| 2 | `WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1` (IR 우선순위 3) — recruitments C + 설명서·펀딩·이벤트 B |
| 3 | IR E 등급 2건(`getShipment` / `getOrderCondition`) — backend 404 vs 5xx 계약 확인 후 판단 |
| 4 | 실데이터 보유 공급자 계정으로 목록·페이지네이션·정산 상세 재검증 |
