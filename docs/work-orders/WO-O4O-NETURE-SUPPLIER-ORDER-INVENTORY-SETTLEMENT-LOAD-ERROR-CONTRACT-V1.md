# WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1

## 1. 목적

Neture 공급자의 **주문 · 재고 · 정산 조회 API**가 실패를 `[]` · `0` · `null` · 빈 pagination 으로 삼켜 화면에서 **"정상 0건"과 구분되지 않는** 문제를 제거한다.

현재 상태의 위험:

```text
API 장애 → 대시보드 "처리 필요" 카드가 전부 0
        → "현재 바로 처리해야 할 주요 업무가 없습니다." 표시
        → 실제로는 미처리 주문·품절·정산이 쌓여 있음
```

즉 **운영 판단을 정반대로 오도**한다. 대시보드 "처리 필요" 카드 4종(처리 대기 주문 / 배송 준비 주문 / 품절·재고 부족 / 정산 대기)이 전부 이 그룹에서 나온다.

선행 `WO-O4O-NETURE-SUPPLIER-PRODUCTS-LOAD-ERROR-CONTRACT-V1` 과 **동일한 계약 패턴**을 주문·재고·정산으로 확장한다.

---

## 2. 선행 기준 문서

```text
docs/investigations/IR-O4O-NETURE-SUPPLIER-API-LOAD-ERROR-CONTRACT-AUDIT-V1.md
```

본 WO 는 위 IR 의 **우선순위 1 그룹**이다. 등급·대상·소비처는 IR §3-1 / §4 / §6 을 그대로 따른다.

참조 선행 구현 (동일 패턴의 정답지):

```text
bc441b48d  getProducts / getProductsPaginated throw 전환 + 소비처 정비
3d4a5a81d  CHECK-O4O-NETURE-SUPPLIER-PRODUCTS-LOAD-ERROR-CONTRACT-V1
```

---

## 3. 작업 전 확인

```text
VS Code/Claude Code의 ide_selection 공유 해제
긴 CHECK·JSON·문서 선택 내용 자동 첨부 해제
현재 작업과 무관한 IDE 문맥 제거
```

저장소 상태:

```powershell
git status --short
git branch --show-current
git fetch origin
git status -sb
```

다른 세션의 dirty·untracked 파일은 수정·복구·삭제·stage하지 않는다.
특히 현재 다른 세션이 작업 중인 `AGENTS.md`, `.codex/`, Codex·OTC 관련 파일은 건드리지 않는다.

작업 시작 전 대상 파일이 다른 세션에서 수정 중인지 확인한다. 수정 중이면 중지한다.

---

## 4. 대상 API (IR C 등급)

`services/web-neture/src/lib/api/supplier.ts`

### 주문

```text
getOrderKpi()        실패 시 {today_orders:0, pending_processing:0, pending_shipping:0, total_orders:0}
getOrders()          실패 시 빈 pagination
getUnifiedOrders()   실패 시 빈 pagination
getOrdersSummary()   실패 시 {services:[], totalApprovedSellers:0, totalPendingRequests:0}
getOrderById()       실패 시 null
```

### 재고

```text
getInventory()       실패 시 []
getInventoryItem()   실패 시 null
```

### 정산

```text
getSettlements()     실패 시 빈 pagination
getSettlementDetail() 실패 시 null
getSettlementKpi()   실패 시 {pending_amount:0, paid_amount:0, total_amount:0, pending_count:0, paid_count:0}
```

### 이번 범위에서 제외

```text
getShipment()          IR E 등급 — 미존재 null 과 실패 null 구분 불가
getOrderCondition()    IR E 등급 — 동일
updateOrderStatus()    mutation, {success:false,error} 계약 유지 (IR D)
updateInventory()      동일
createShipment() / updateShipmentStatus()  동일
```

E 등급은 backend 응답 계약(404 vs 5xx) 확인이 선행되어야 하므로 본 WO 에서 다루지 않는다.

---

## 5. 실패 계약

선행 WO 와 동일하게 **고정 코드만 전파**하고 서버 원문은 console 로만 남긴다.

권장 상수 (`supplier.ts` export):

```text
SUPPLIER_ORDERS_LOAD_FAILED
SUPPLIER_INVENTORY_LOAD_FAILED
SUPPLIER_SETTLEMENTS_LOAD_FAILED
```

상수 분리 단위는 조사 후 확정한다. 화면이 영역별로 다른 안내를 낼 필요가 없다면 통합해도 되지만, **주문·재고·정산 3영역은 각각 다른 화면에서 소비되므로 분리를 권장**한다.

적용 규칙 (선행 WO 패턴):

```text
1. 4xx / 5xx / 네트워크 오류 → console.warn(extractApiError(error)) 후 고정 코드 throw
2. 200 이지만 payload 계약 위반(success=false, data 비배열/비객체)도 실패로 간주해 throw
3. 서버 원문 메시지·stack trace 를 화면에 전파하지 않는다
4. 정상 0건은 오류가 아니다 — 빈 배열·0 카운트는 그대로 성공 응답으로 반환
```

`getOrderById()` / `getInventoryItem()` / `getSettlementDetail()` 는 상세 조회다.
**"미존재(404)"와 "조회 실패"를 구분**해야 한다. 구분이 backend 계약상 불가능하면 해당 함수는 이번 범위에서 빼고 CHECK 에 사유를 기록한다.

### 5-1. 상세 조회 원자성

상세 조회 3종은 **함수 단위로 전부 반영 또는 전부 미반영**만 허용한다.

```text
throw 계약으로 변경하는 경우
→ 해당 상세 소비처도 같은 커밋에서 4상태를 함께 정비한다
   loading / error / not-found / success

404 와 5xx 를 구분할 수 없는 함수
→ API 와 소비처 모두 미변경으로 남긴다
```

금지:

```text
API 만 변경하고 소비처를 두는 부분 반영
소비처만 변경하고 API 를 두는 부분 반영
```

상세 화면의 `not-found` 는 `error` 와 **다른 상태**다. 하나로 합치지 않는다.

```text
not-found  "주문을 찾을 수 없습니다" 등 정상 안내 (다시 시도 불필요)
error      조회 실패 안내 + 다시 시도 제공
```

함수별 반영 여부와 근거는 CHECK 에 개별 기록한다. 3종을 묶어 "일부 반영" 으로 기록하지 않는다.

---

## 6. 소비처 (반드시 같은 작업에서 함께 수정)

> **핵심 원칙: API 만 throw 로 바꾸면 IR B 등급(무한 로딩 · unhandled rejection · 조용한 0건)을 새로 만든다.**

| # | 화면 | 파일 | 현재 상태 | 라우트 |
|---|------|------|-----------|--------|
| 1 | 공급자 홈 | `pages/supplier/SupplierDashboardPage.tsx` | `Promise.allSettled` + `opsFailed` 배너(주문·재고·정산만) | `/supplier/dashboard` |
| 2 | 공급자 운영 허브 | `pages/supplier/SupplierOrdersPage.tsx` | 삼킨 fallback 을 그대로 렌더 | `/supplier/orders` |
| 3 | 재고 관리 | `pages/account/SupplierInventoryPage.tsx` | **try/catch 없음** | `/supplier/inventory` · `/account/supplier/inventory` |
| 4 | 정산 관리 | `pages/account/SupplierSettlementsPage.tsx` | try/catch 는 있으나 **API 가 먼저 삼켜 catch 미실행** | `/supplier/settlements` · `/account/supplier/settlements` |
| 5 | 주문 목록(account) | `pages/account/SupplierOrdersListPage.tsx` | `try/catch` 존재 — throw 전환 후 동작 재확인 필요 | `/account/supplier/orders` |

### 공유 컴포넌트 주의

```text
SupplierInventoryPage    /supplier/inventory  = /account/supplier/inventory   (동일 컴포넌트)
SupplierSettlementsPage  /supplier/settlements = /account/supplier/settlements (동일 컴포넌트)
SupplierOrderDetailPage  /supplier/orders/:id  = /account/supplier/orders/:id  (동일 컴포넌트)
```

```text
SupplierOrdersPage       /supplier/orders          (전용)
SupplierOrdersListPage   /account/supplier/orders  (전용, 다른 컴포넌트)
```

→ **한쪽 라우트만 보고 완료 판단 금지.** 두 경로 모두 검증한다.

### 화면 상태 계약

각 소비처는 다음 4상태를 분리한다 (선행 WO 와 동일).

```text
loading
error            (다시 시도 제공)
success + 0건    (정상 빈 상태)
success + 데이터
```

추가 요구:

```text
로딩이 영구 유지되지 않을 것 (finally 로 loading 해제)
API 원문 오류·stack trace 화면 노출 금지
빈 배열을 오류로 표시하지 않을 것
```

### 대시보드 부분 실패

현재 `opsFailed` 는 주문·재고·정산 3개를 묶어 하나의 문구로만 안내한다.
이번 작업에서 **주문 · 재고 · 정산을 영역별로 독립 처리**하도록 정비한다.

원칙:

```text
한 영역의 실패가 정상인 다른 영역을 숨기지 않는다
한 영역의 실패로 대시보드 전체를 오류 화면으로 바꾸지 않는다
실패한 영역의 값을 0 으로 대체하지 않는다
```

표시 규칙:

```text
성공 영역  기존대로 수치 표시
실패 영역  수치 대신 불러오지 못했음을 표시하거나 카드에서 제외
          + 해당 영역 단위의 다시 시도 제공
```

적용 범위:

```text
처리 필요 카드
핵심 운영 KPI 카드
```

두 블록 모두 동일 기준을 적용한다. KPI 카드만 0 으로 남기는 것도 금지다.

`Promise.allSettled` 구조는 유지하되, `rejected` 를 **영역 식별이 가능한 형태**로 상태에 반영한다
(현재처럼 단일 `opsFailed` boolean 으로 뭉개지 않는다).

> **"처리할 업무 없음" 정상 문구가 장애 상황에서 뜨지 않는 것이 본 WO 의 핵심 수용 기준이다.**
> 주문·재고·정산 중 **하나라도** 실패했다면 이 문구를 표시하지 않는다.

---

## 7. 하지 않을 것

```text
backend 변경
DB 변경
migration
신규 API
주문 상태 머신 변경
재고 계산 로직 변경
정산 계산 로직 변경
mutation 의 {success:false,error} 계약 변경
분석·프로필 fail-open(D 등급) 변경
getShipment / getOrderCondition (E 등급) 변경
사이드바·대시보드 정보구조 변경
/account/supplier/* 라우트 추가·삭제·redirect
공통 UI Core 변경
테스트 데이터 생성
운영 데이터 write
```

---

## 8. 검증

### 8-1. 빌드

```powershell
pnpm --filter @o4o/web-neture exec tsc --noEmit -p tsconfig.json
pnpm --filter @o4o/web-neture build
```

### 8-2. 오류 주입 시나리오

운영 데이터를 건드리지 않고 검증한다. 선행 WO 와 동일하게 **브라우저에서 네트워크 응답을 가로채는 방식**을 사용한다.

각 API 에 대해 다음을 확인한다.

```text
5xx 주입      → error 상태 + 다시 시도 노출, 0건 문구 미노출
네트워크 실패 → 동일
payload 깨짐  → 동일
정상 0건      → 정상 빈 상태 (오류 아님)
복구 후 재시도 → success 로 전환
```

대시보드는 **부분 실패 조합**을 별도로 검증한다 (§6 대시보드 부분 실패).

```text
주문만 실패     → 재고·정산 수치 정상 표시 유지, 주문 영역만 실패 표시
재고만 실패     → 동일 패턴
정산만 실패     → 동일 패턴
3영역 전부 실패 → 대시보드 전체 오류 화면으로 바뀌지 않을 것
어느 조합에서든 "처리할 업무 없음" 문구 미노출
실패 영역 수치가 0 으로 표시되지 않을 것
```

상세 조회를 반영한 경우 `not-found` 와 `error` 를 분리 검증한다.

```text
존재하지 않는 id → not-found 안내 (다시 시도 미노출)
5xx 주입         → error 안내 + 다시 시도 노출
```

### 8-3. 라우트 회귀

```text
/supplier/dashboard
/supplier/orders
/supplier/orders/:id
/supplier/inventory
/supplier/settlements
/account/supplier/orders
/account/supplier/orders/:id
/account/supplier/inventory
/account/supplier/settlements
```

각 경로에서 확인한다.

```text
정상 렌더
로딩 영구 유지 없음
콘솔 치명 오류 0
unhandled promise rejection 0
```

### 8-4. 반응형

```text
Desktop 1440×900
Mobile 390×844
Tablet 768px 전후
```

오류 배너·다시 시도 버튼이 각 폭에서 가독·터치 가능한지 확인한다.

### 8-5. 배포 후 프로덕션 smoke

```text
Deploy Web Services (Cloud Run) 성공 확인
deploy-neture 가 skipped 면 workflow_dispatch service=neture 로 명시 재배포
neture-web revision 갱신 확인
프로덕션에서 위 9개 라우트 정상 렌더 확인
```

> `detect-changes` 가 tip 커밋만 비교해 `deploy-neture` 를 skip 하는 사례가 반복 확인되었다. push 후 job 결과를 반드시 확인한다.

브라우저 자동화가 사용 불가한 경우, 배포된 번들에서 신규 오류 문구 문자열 존재를 확인하는 방식으로 대체하고 제한을 CHECK 에 기록한다.

---

## 9. CHECK 문서

```text
docs/checks/CHECK-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1.md
```

포함 내용:

```text
변경 전 각 API 의 실패 반환값
변경 후 실패 계약과 상수명
상세 조회 3종의 **함수별** 반영 여부와 근거 (전부 반영 / 전부 미반영, 부분 반영 없음)
상세 조회 반영 시 not-found 와 error 분리 결과
각 소비처의 4상태 분리 결과
대시보드 영역별 독립 처리 방식 (주문·재고·정산)
대시보드 부분 실패 조합 검증 결과
공유 컴포넌트 2경로 검증 결과
오류 주입·복구 시나리오 결과 (PASS 수/총 수)
라우트 회귀 9종 결과
반응형 결과
typecheck / build 결과
배포 결과와 revision
프로덕션 smoke 결과
계산·저장 계약 무변경 확인
backend·DB·migration 변경 여부
실데이터 제한
후속 항목 (IR 우선순위 2·3 그룹, E 등급 2건)
```

---

## 10. 중지 조건

```text
상세 조회에서 미존재와 실패를 backend 계약상 구분할 수 없음
오류 주입 검증 수단이 없어 회귀를 확인할 수 없음
소비처 수정이 대시보드 정보구조 변경으로 번짐
공통 UI Core 변경이 필요함
backend 응답 형태 변경이 필요함
DB·migration 이 필요함
다른 세션이 supplier.ts 또는 대상 페이지를 수정 중임
```

해당 시 **안전하게 가능한 범위만 반영**하고 나머지는 CHECK 에 후속 항목으로 기록한다.

단, 부분 반영의 단위는 **함수 + 그 소비처 묶음**이다.

```text
허용   특정 함수를 API·소비처 함께 반영하고, 다른 함수는 둘 다 미반영
금지   API 만 바꾸고 소비처를 두는 상태
금지   소비처만 바꾸고 API 를 두는 상태
```

404 와 5xx 를 구분할 수 없는 상세 조회 함수는 **API 와 소비처 모두 미변경**으로 남긴다 (§5-1).

---

## 11. Git 처리

이번 WO 는 구현·CHECK·commit·main push·배포 smoke 까지 허용한다.

```text
git add . 금지
git commit -am 금지
path-specific stage
git diff --cached --name-only 확인
다른 세션 dirty 파일 제외
ahead/behind 확인
commit
main push
배포 확인 (deploy-neture 결과 확인, skip 시 재배포)
프로덕션 smoke
```

커밋 메시지 예:

```text
fix(neture): surface supplier order/inventory/settlement load errors
```

API 와 소비처는 **같은 커밋**에 담는다. 불필요하게 나누지 않는다.

---

## 12. 완료 보고 형식

완료 보고는 반드시 한글로 작성한다.
파일명·route·함수명·commit hash 등 기술 식별자는 원문을 유지한다.

```text
1. 조사·확정한 대상 API 와 변경 전 실패 반환값
2. 적용한 실패 계약과 상수
3. 상세 조회 처리 방침
4. 소비처별 4상태 분리 결과
5. 대시보드 실패 영역 구분 방식
6. 공유 컴포넌트 2경로 검증 결과
7. 오류 주입·복구 시나리오 결과
8. 라우트 회귀 결과
9. 반응형 결과
10. typecheck·build·배포·프로덕션 smoke
11. backend·DB·migration 변경 여부
12. 범위에서 제외한 항목과 사유
13. CHECK 문서
14. commit hash
15. main push 결과
```

---

## 13. 완료 기준

```text
주문·재고·정산 목록/KPI 조회의 오류 삼킴 제거
실패 시 고정 코드 throw, 서버 원문 화면 노출 0
정상 0건과 오류가 화면에서 구분됨
대시보드 장애 시 "처리할 업무 없음" 오표시 0
대시보드 주문·재고·정산 영역별 독립 처리 (한 영역 실패가 타 영역 은폐 0)
실패 영역 수치를 0 으로 대체 0
한 영역 실패로 대시보드 전체 오류 화면 전환 0
상세 조회 3종 부분 반영(API 만 또는 소비처만) 0
소비처 5개 화면 4상태 분리 완료
로딩 영구 유지 0
unhandled promise rejection 0
/supplier/* 와 /account/supplier/* 양쪽 회귀 확인
오류 주입·복구 시나리오 전건 PASS
backend 변경 0
DB 변경 0
migration 0
운영 데이터 write 0
web-neture typecheck PASS
web-neture build PASS
프로덕션 배포 반영 확인 (revision 갱신)
프로덕션 smoke 완료
CHECK 작성
commit / main push 완료
```
