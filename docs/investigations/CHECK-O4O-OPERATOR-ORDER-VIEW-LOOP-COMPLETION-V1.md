# CHECK-O4O-OPERATOR-ORDER-VIEW-LOOP-COMPLETION-V1

> GlycoPharm / K-Cosmetics 운영자 주문 화면의 **1차 view-only 루프** 완료 검증 및 고정.
> **read-only CHECK** — 코드/UI/API/DB/migration/route/menu 변경 없음.

- **작성일**: 2026-06-08
- **작업 유형**: CHECK (정적 + 배포 기준 검증)
- **대상**: GlycoPharm / K-Cosmetics operator OrdersPage + view-only orders API
- **제외**: Neture supplier unified view / Neture 주문 구조 / KPA / Store Hub·My Store / 상태변경 API / 정산·환불·인보이스

---

## 1. CHECK 개요

운영자 주문 화면 정비(mock 제거 → canonical 정렬 → view-only API → frontend wire)가 안전하게 1차 루프로 닫혔는지 정적·배포 기준으로 검증한다.

## 2. 사전 git 상태

```text
HEAD: 98d7e70cb (origin/main 동기화, working tree clean — untracked PNG 외 변경 없음)
이 방 구현 커밋(모두 main 반영):
  f10a5af33 feat(operator): view-only order list API for GlycoPharm/K-Cosmetics
  b132b6b5b feat(operator): wire GP/K-Cos OrdersPage to view-only orders API
```

## 3. 선행 작업 목록 (완료)

```text
IR-O4O-OPERATOR-ORDER-SETTLEMENT-SURFACE-AUDIT-V1   (위험 surface 식별)
WO-O4O-OPERATOR-ORDER-MOCK-SURFACE-GUARD-V1         (K-Cos mock 제거 / GP dead action 제거)
IR-O4O-OPERATOR-ORDER-API-CONTRACT-V1               (view-only 우선, checkout_orders+serviceKey)
IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1             (canonical = checkout_orders)
WO-O4O-ORDER-CANONICAL-TABLE-DIAGNOSTIC-ENDPOINT-V1 (H1 실측: checkout_orders.exists=true, rowCount=0)
WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1         (create/payment/list/get → checkout_orders)
WO-O4O-OPERATOR-ORDER-VIEW-API-V1                   (GP/K-Cos view-only API)
WO-O4O-OPERATOR-ORDER-VIEW-FRONTEND-WIRE-V1         (OrdersPage 연결)
```

## 4. 위험 surface 제거 확인

```text
grep(ORD-2024|뷰티랩|mock|sample|TODO: wire|MoreVertical|ActionBar|BulkResultModal|
     selectable|useBatchAction|배송 시작|주문 취소|송장) on 두 OrdersPage
→ 실제 mock 데이터 / dead action 0건.
  매치는 전부 (a) doc 주석 (b) "조회 전용 — row action/selectable/ActionBar 없음" 주석
  (c) 안내문("…상태 변경 기능은 후속 매장/판매자 기능에서 제공 예정") 뿐.
```
- K-Cos OrdersPage: 하드코딩 mock 주문/통계 **없음** (준비중 placeholder → 실 API 목록 전환됨)
- GP OrdersPage: TODO/no-op/dead row action **없음**
- 두 화면 모두 상태변경 버튼 **없음** ✅

## 5. canonical 주문 원장 확인

```text
operatorOrderQuery.ts: FROM checkout_orders (목록/stats 2곳) — checkout_orders 단독.
ecommerce_orders 참조: doc 주석 "ecommerce_orders 미사용" 뿐, 실 쿼리 0.
serviceKey 서버 고정:
  glycopharm operator.controller.ts:85   queryOperatorOrders(dataSource, 'glycopharm', …)
  cosmetics operator-dashboard.controller.ts:170  queryOperatorOrders(dataSource, 'cosmetics', …)
diagnostic: WO-...-DIAGNOSTIC-ENDPOINT-V1 에서 H1(checkout_orders.exists=true / ecommerce_orders=false / rowCount=0) 기록됨.
```
✅ create/payment/list/get + operator view 모두 checkout_orders 기준.

## 6. backend view API 확인

| 항목 | 결과 |
|---|---|
| `GET /api/v1/glycopharm/operator/orders` | ✅ checkout_orders + serviceKey='glycopharm'(서버 고정) |
| `GET /api/v1/cosmetics/operator/orders` | ✅ checkout_orders + serviceKey='cosmetics'(서버 고정) |
| client serviceKey 신뢰 | ❌ 안 받음 (helper가 query param 미수신) |
| raw SQL parameter binding | ✅ `$1..` 전용, `${whereSql}`는 상수절+바인딩 |
| PII 상세 반환 | ❌ shippingAddress/recipient/phone/email/buyerId/items 상세 미select (`buyerLabel:null`) |
| empty result 200 | ✅ row 0 / 테이블 부재에서도 `.catch` → 빈 목록 |
| stats/pagination shape | ✅ `{total,paid,pending,cancelled,totalAmount}` + `{page,limit,total,totalPages}` |

## 7. frontend wire 확인

```text
GP: glycopharmApi.getOperatorOrders → '/glycopharm/operator/orders' (glycopharm.ts:538)
KCos: cosOperatorOrdersApi.list → '/cosmetics/operator/orders' (operatorOrders.ts:60)
두 OrdersPage: 응답 orders/stats/pagination 사용, "조회 전용" 안내, empty/loading/error 상태 보유.
route/menu 변경 없이 기존 /operator/orders 에 연결 (KCos 메뉴/route 기존 유지).
```
✅ legacy stub(recent-orders)·buyer-scope(/cosmetics/orders) 미호출.

## 8. view-only 정책 확인

```text
- confirm/ship/cancel/refund/invoice/settlement action: 없음
- checkbox bulk action / selectable / ActionBar / BulkResultModal / useBatchAction: 없음
- row action: 없음 (목록 표시만)
- 상태변경은 후속 store_owner/seller/admin scope 로 분리 보존
- Neture reference 동일 원칙(operator=조회, 상태변경=별도 역할) 유지
```

## 9. TypeScript / build 검증

```text
@o4o/api-server     tsc --noEmit → EXIT 0  ✅
glycopharm-web      tsc --noEmit → EXIT 0  ✅
@o4o/web-k-cosmetics tsc --noEmit → EXIT 0  ✅
```
- (참고) 이전 점검 시 존재하던 무관한 pre-existing 오류(`marketTrialController` CreateTrialDto)는 현재 HEAD 에서 해소되어 3개 패키지 모두 clean.
- Deploy API Server / Deploy Web Services: 선행 WO 커밋(f10a5af33 / b132b6b5b) 배포 completed/success.

## 10. live API smoke (현재 HEAD 배포본)

| 요청 | GlycoPharm | K-Cosmetics |
|---|---|---|
| 미인증 | **401** AUTH_REQUIRED | **401** |
| operator 인증 | **200** | **200** |

operator 200 응답(양쪽 동일):
```json
{"success":true,"data":{"orders":[],
 "stats":{"total":0,"paid":0,"pending":0,"cancelled":0,"totalAmount":0},
 "pagination":{"page":1,"limit":20,"total":0,"totalPages":0}}}
```
- checkout_orders rowCount=0 → empty 안전 처리, shape 정합 ✅
- non-operator 403: 전용 계정 부재로 미실측. 단 dashboard 와 동일 guard(requireGlycopharmScope/requireCosmeticsScope) 재사용으로 scope 강제 입증.

## 11. live browser smoke

`WO-O4O-OPERATOR-ORDER-VIEW-FRONTEND-WIRE-V1` 배포 후 실측(기록 인용):
```text
GP /operator/orders   : view-only 목록 렌더, 5 stat 카드, empty "표시할 주문이 없습니다", action/selectable 없음 — PASS
KCos /operator/orders : placeholder 대체, 동일 렌더, console error 0 — PASS
사이드바 "주문 관리"(매장 HUB) → /operator/orders 정상 진입.
```
(본 CHECK 세션에서 브라우저 재렌더는 재수행하지 않고 위 PASS 결과를 인용.)

## 12. 남은 후순위 후보

```text
- 실제 주문 row 발생 시 목록 row 렌더 재검증 (현재 rowCount=0)
- 상태변경 API 설계 (store_owner/seller/admin scope) — 이번 loop 범위 외, 별도 WO
- diagnostic endpoint 정리 필요 시 별도 cleanup
- LMS EcommerceOrder 참조 등 별도 cleanup 후보 (주문 view loop 무관)
- 운영자 UX P1: Bulk 흐름 일관화 복귀
```

## 13. 최종 판정

**CONDITIONAL PASS** ✅

- mock 제거 / canonical 정렬 / view-only API / frontend wire / view-only 정책 / tsc / live API·browser smoke — **모두 충족**.
- 유일한 조건: live checkout_orders **rowCount=0** 이라 실제 주문 row 렌더는 미확인(empty state·API 연결은 정상). 실제 주문 발생 시 row 표시 재검증을 후속으로 남긴다(§12).
- backend/API/DB/migration/route/menu 의도치 않은 변경 없음. Neture/KPA 영향 없음.

→ 운영자 주문 화면 = **1차 조회 루프 완료**로 고정.

## 14. Current Structure vs O4O Philosophy Conflict Check

| 확인 | 결과 |
|---|---|
| 운영자가 가짜 주문/죽은 버튼을 보지 않는가 | ✅ mock·dead action 제거 |
| operator 주문 화면이 조회·모니터링에 머무는가 | ✅ view-only |
| 상태변경 side effect를 operator 화면에 섞지 않았는가 | ✅ 상태변경 action 0 |
| store_owner/seller/admin 권한 경계 보존 | ✅ 상태변경은 별도 scope 로 분리 |
| 신규 테이블 없이 canonical 원장 재사용 | ✅ checkout_orders 단독, migration 0 |
| PII 불필요 노출 없음 | ✅ PII-safe 응답 |
| 운영자 UI 공통화 + 안전성 동시 충족 | ✅ 공통 helper + 두 화면 일관 구조 |

---

*코드/UI/API/DB 변경 없음. 본 CHECK 는 완료 기록으로 commit 한다.*
