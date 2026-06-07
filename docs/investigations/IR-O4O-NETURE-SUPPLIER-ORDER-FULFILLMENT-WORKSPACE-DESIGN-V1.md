# IR-O4O-NETURE-SUPPLIER-ORDER-FULFILLMENT-WORKSPACE-DESIGN-V1

> **유형:** Read-only Investigation Report (조사 전용 — 코드/DB/API/UI/route 무수정)
> **상태:** 조사 완료
> **작성:** 2026-06-07
> **선행:** `IR-..-SHIPPING-SETTING-FOUNDATION-DESIGN-V1` · `IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1`
> **목적:** 공급자 주문 확인·배송 처리 workspace 구현 전, 현재 주문 구조·조회 가능성·이벤트 오퍼 포함·상태 전이를 read-only 조사하고 V1 범위/순서를 결정

---

## 1. 요약 판정 (TL;DR)

- **반전 발견: 공급자 주문 fulfillment workspace는 이미 상당 부분 구현되어 있다.** 단 **Neture 자체 주문 원장 `neture_orders` 기반**이며, supplier **계정 센터(`/account/supplier/orders`)** 에 있고 supplier **공간 메뉴(`/supplier/orders`)와 분리**되어 있다.
  - 백엔드 `supplier-order.controller` + `supplier-order.service`: `GET /orders`(목록·페이지·상태필터), `GET /orders/:id`(상세·소유권검증), `GET /orders/kpi`, `PATCH /orders/:id/status`(상태전이), `POST /orders/:orderId/shipment`(택배사/송장 → `neture_shipments`).
  - 프론트 `account/SupplierOrdersListPage`(목록+상태변경) + `SupplierOrderDetailPage`(상세).
  - 상태 전이 맵 존재: `created/paid → preparing → shipped → delivered`. 송장/택배사: `neture_shipments`(carrier_code/name/tracking_number/shipped_at).
- **그러나 `/supplier/orders`(supplier 공간 메뉴 = SupplierOrdersPage)는 집계 허브**다(`getOrdersSummary`, "주문은 각 서비스에서 발생"). 즉 **실제 처리 workspace는 만들어져 있으나 공급자 공간에서 진입 동선이 끊겨 있다(IA GAP).**
- **테이블 분리(핵심 RISK):** 공급자 workspace는 `neture_orders`를 읽지만, **이벤트 오퍼 주문·KPA/GP/K-Cos 주문은 `checkout_orders`** 에 적재된다(선행 canonical IR). → **이벤트 오퍼 주문은 현재 공급자 workspace(neture_orders)에 포함되지 않는다.**
- **유통참여형 펀딩**은 참여/오프라인 수령 — 주문/배송 대상 아님 → **구조적 제외**.
- **권장 V1 = 판정 A′(이미 있는 workspace를 supplier 공간 메뉴에서 진입하도록 IA 연결 + 점검)**, 신규 구축이 아님. 상태변경/송장은 이미 있으므로 V1은 surfacing + 검증 중심.
- **순서 판정: WORKSPACE(IA 연결) → SHIPPING-CALCULATION-V2.** 단 계산 V2는 **어느 주문 테이블(neture_orders vs checkout_orders)에 배송비를 계산할지** 선결 필요(테이블 분리 때문). → 계산 전 **주문 테이블 통일/경계 결정**이 더 큰 선행 이슈로 부상.

---

## 2. 현재 `/supplier/orders` 화면 구조

- 라우트 `/supplier/orders` → **`SupplierOrdersPage`** (supplier 공간 메뉴 "주문·배송 → 주문 현황" 대상).
- 성격: **집계 허브.** `supplierApi.getOrdersSummary()` → 서비스별 주문 현황 카드. 본문 안내: *"주문은 각 서비스에서 발생하며… 각 서비스: 주문 처리, 배송, 반품 관리."*
- **개별 주문 목록/상세/상태처리 없음** (집계만). → **PASS(집계 허브 확인)** / fulfillment 진입 **GAP**.

| 화면 | 위치 | 성격 |
|---|---|---|
| SupplierOrdersPage | `/supplier/orders` (공간 메뉴) | 집계 허브 (요약만) |
| **SupplierOrdersListPage** | `/account/supplier/orders` (계정센터) | **실제 주문 목록 + 상태변경** |
| **SupplierOrderDetailPage** | `/account/supplier/orders/:id` | **주문 상세** |

> 핵심: **fulfillment workspace는 계정센터에 이미 있고**, 공간 메뉴에서 끊겨 있다.

---

## 3. checkout / neture order 구조

플랫폼에 주문 원장이 **셋** 공존 (선행 canonical IR + 본 조사):

| 테이블 | 상태 | 사용처 |
|---|---|---|
| `ecommerce_orders` | **프로덕션 미존재**(CREATE 없음) | 설계 SSOT(미실현) |
| **`checkout_orders`** | 존재(canonical) | 이벤트 오퍼(checkoutService), KPA/GP/K-Cos. order-레벨 `supplierId`+`shippingFee`, items jsonb |
| **`neture_orders`** | 존재(migration `20260902500000`) | **Neture 자체 주문 + 공급자 fulfillment workspace 소스** |

**`neture_orders` 필드:** order_number, `status`(NetureOrderStatus enum), total_amount, discount_amount, **shipping_fee**, final_amount, payment_*, shipping(jsonb), orderer_*, order_type(STORE_RESTOCK 등), customer_info(jsonb), cancelled_at/cancel_reason.
**`neture_order_items`:** `product_id` = **SupplierProductOffer.id**(uuid) → `spo.supplier_id`로 공급자 역추적.
**`neture_shipments`:** order_id, supplier_id, carrier_code/name, tracking_number, status, shipped_at.

> 즉 `neture_orders` 흐름은 **공급자 역추적·배송상태·송장까지 완비**. checkout_orders는 items에 per-item supplierId 없음(order-레벨만).

---

## 4. 주문 생성 및 supplierId 결정 흐름

| 흐름 | 생성 테이블 | supplier 역추적 |
|---|---|---|
| Neture seller/store 주문 (`seller.controller` → `legacyNetureService.createOrder`) | **neture_orders** | order_item.product_id=SPO.id → spo.supplier_id |
| 이벤트 오퍼 참여 (KPA `event-offer.service` → `checkoutService`) | **checkout_orders** | order-레벨 supplierId(OPL→SPO 해석) |
| GP/K-Cos checkout | checkout_orders (canonical IR: create는 일부 ecommerce_orders 혼재) | order-레벨 supplierId |

- **공급자 workspace(supplier-order.service)는 `neture_orders`만 조회.** `WHERE spo.supplier_id = $1` (item join). → Neture seller 주문은 PASS, **checkout_orders 주문(이벤트 오퍼 등)은 미포함**.
- `shippingFee`: neture_orders는 `shipping_fee` 컬럼 보유(생성 시 값). checkout_orders는 `checkout.service`에서 `shippingFee=0` 하드코딩.

---

## 5. 이벤트 오퍼 주문 포함 가능성

- 이벤트 오퍼 주문 = **checkout_orders** 적재 (supplierId는 order-레벨, OPL→SPO 해석, 단가 `event_price ?? price_general`).
- 공급자 workspace는 **neture_orders**만 읽음 → **이벤트 오퍼 주문은 현재 workspace에 나타나지 않음**.
- 포함하려면: (a) workspace에 checkout_orders read 경로 추가(서비스별 supplierId 필터), 또는 (b) 주문 테이블 통일.

**판정: GAP / RISK** — 이벤트 오퍼 주문 포함은 **테이블 분리 해소가 선행**. V1에서 무리하게 합치지 말고 **neture_orders workspace surfacing을 먼저**, 이벤트 오퍼(checkout_orders) 포함은 별도 설계로 분리.

---

## 6. 유통참여형 펀딩 제외 근거

- MarketTrial = 참여 기록(MarketTrialParticipant) + 운영자 오프라인 수령. `checkout_orders`/`neture_orders` 생성 없음.
- 온라인 배송 주문 전환 구조 없음(productId는 soft 참조, trialUnitPrice/targetAmount는 참여 계산용).

**판정: 구조적 제외(DEFER 아님).** 펀딩은 주문·배송 workspace 대상이 아니며, 이후에도 주문 배송으로 연결하지 않는다(선행 배송 IR과 동일 정책).

---

## 7. 공급자 주문 조회 API 가능성

**이미 존재 (PASS).** `supplier-order.controller` (mount `/api/v1/neture/supplier`):

| 엔드포인트 | guard | 기능 |
|---|---|---|
| `GET /orders` | requireLinkedSupplier | 본인 supplierId 주문 목록(page/limit/status) |
| `GET /orders/:id` | requireLinkedSupplier + validateOwnership | 상세 |
| `GET /orders/kpi` | requireLinkedSupplier | KPI(오늘/처리대기/배송대기/총) |
| `GET /orders/summary` | requireLinkedSupplier | 요약 |
| `PATCH /orders/:id/status` | requireActiveSupplier + ownership | 상태 전이 |
| `POST /orders/:orderId/shipment` | requireActiveSupplier | 택배사/송장(neture_shipments) |

- **권한:** 본인 supplierId 주문만(ownership 검증) — PASS.
- **PII:** orderer_name/phone/email + shipping 주소 노출(배송 처리에 필요). → 목록 요약/상세 노출 범위는 구현 시 점검 권장.
- 신규 API 불필요. **V1은 이 API를 supplier 공간에서 쓰도록 연결**.

---

## 8. 상태 전이 / 배송 처리 가능성

- **상태 전이 맵 존재(PASS):** `created/paid → preparing → shipped → delivered`. (`cancelled/refunded`는 별도 — 운영자/결제 영역.)
- **공급자 변경 가능 범위:** preparing/shipped/delivered (배송 처리). 취소·환불은 미포함(운영자/금융 경계와 비충돌).
- **송장/택배사:** `neture_shipments` + `POST /shipment` 이미 존재.
- **정산 연결:** 본 조사 범위에선 배송완료→정산 자동연결 미확인 → 구현 시 별도 점검(DEFER).

**판정: 상태/배송 처리 PASS** (neture_orders 한정). checkout_orders 주문은 이 전이 대상 아님.

---

## 9. 공급자 주문·배송 화면 IA 후보

| 후보 | 내용 | 평가 |
|---|---|---|
| **A′. 기존 workspace를 supplier 공간 메뉴에 연결** | `/supplier/orders`(집계) → 기존 `account/SupplierOrdersList/Detail` 진입 동선 추가(또는 공간 내 재노출) | ✅ **V1 권장** — 이미 구현된 자산 활용, 최소 변경 |
| B. 하위 메뉴 분리(주문 목록/배송 준비/배송 완료) | 단계별 메뉴 | 후속 — 초기 과다 |
| C. 단일 workspace + 필터(신규/배송준비/배송완료/이벤트오퍼) | 필터 통합 | "이벤트 오퍼" 필터는 checkout_orders 분리 해소 후 |

**권장: A′** — 신규 구축이 아니라 **진입 동선 연결 + 점검**. 집계 허브(`/supplier/orders`)는 유지하되 "주문 처리/배송" 진입 버튼을 기존 list 화면으로 연결, 혹은 list/detail을 supplier 공간 레이아웃에서 재사용.

---

## 10. 배송비 계산 V2와의 관계 / 순서 판정

- 배송 정책 foundation은 `neture_suppliers`에 저장됨(SHIPPING-SETTING-FOUNDATION-V1).
- 계산 적용 대상이 **둘로 갈림:** neture_orders(`shipping_fee` 보유, 생성 시 값) vs checkout_orders(`shippingFee=0` 하드코딩).
- 따라서 **SHIPPING-CALCULATION-V2는 "어느 주문 생성 경로에 공급자 정책을 적용할지" 선결**이 필요.

**순서 판정:**
```
1) ORDER-FULFILLMENT-WORKSPACE-V1 (A′ — 기존 workspace 공간 메뉴 연결, 최소·안전)
2) (권장 선행) 주문 테이블 경계 결정 — neture_orders vs checkout_orders 통일/역할 확정
3) SHIPPING-CALCULATION-V2 (확정된 생성 경로에 정책 기반 배송비 계산)
```
> WORKSPACE(IA 연결)는 **즉시 안전**. 계산 V2는 **테이블 경계 결정에 의존**하므로 뒤. 이벤트 오퍼 주문 포함도 같은 경계 결정에 의존.

---

## 11. 후속 구현 권장안

- **WO 후보 1 (1차, 권장):** `WO-O4O-NETURE-SUPPLIER-ORDER-FULFILLMENT-WORKSPACE-V1` — 기존 `account/SupplierOrders(List/Detail)` workspace를 **supplier 공간 메뉴에서 진입**하도록 연결 + 목록/상세/상태/송장 동작 점검. 신규 API/테이블 없음. (판정 A′. 상태변경은 이미 존재하므로 별도 STATUS WO 불필요.)
- **WO 후보 2 (선행 결정 IR):** `IR-O4O-NETURE-ORDER-TABLE-BOUNDARY-DECISION-V1` — neture_orders vs checkout_orders 역할/통일 결정(이벤트 오퍼 주문 포함·배송비 계산의 공통 전제).
- **WO 후보 3 (2차):** `WO-O4O-NETURE-SUPPLIER-SHIPPING-CALCULATION-V2` — 경계 결정 후 정책 기반 배송비 계산.
- **분리:** 이벤트 오퍼 주문의 공급자 workspace 포함 = WO 후보 2 결과에 종속.

---

## 12. 이번 IR에서 수정하지 않은 것

```
코드/엔티티/DTO/API/UI/route 무수정 · DB migration 미작성
주문 목록/상세/상태/배송비/송장/정산/환불 로직 변경 없음
이벤트 오퍼·유통참여형 펀딩 변경 없음
다른 세션 WIP 미접촉 · DB write 없음 · 본 IR 1개 문서만 생성
```

---

## 13. 판정 요약 (PASS / CONDITIONAL / GAP / RISK / DEFER)

| 항목 | 판정 |
|---|---|
| `/supplier/orders` = 집계 허브 | **PASS**(확인) |
| 공급자 주문 목록/상세 API | **PASS**(이미 존재, neture_orders) |
| 상태 전이(preparing/shipped/delivered) | **PASS**(이미 존재) |
| 송장/택배사(neture_shipments) | **PASS**(이미 존재) |
| supplier 공간 메뉴 ↔ workspace 진입 동선 | **GAP**(계정센터에만, 끊김) → V1 |
| 이벤트 오퍼 주문 workspace 포함 | **GAP/RISK**(checkout_orders 분리) → 경계 결정 선행 |
| 유통참여형 펀딩 | **구조적 제외** |
| 배송비 계산 V2 순서 | WORKSPACE 후, **테이블 경계 결정 선행 후** 계산 |
| 정산 연결 | **DEFER**(미확인) |

---

## 산출물

- 본 문서: `docs/investigations/IR-O4O-NETURE-SUPPLIER-ORDER-FULFILLMENT-WORKSPACE-DESIGN-V1.md`
- 조사 기준 commit: `cb053e16b`

## 최종 판정

공급자 주문·배송 workspace는 **신규 구축 대상이 아니라 이미 `neture_orders` 기반으로 구현되어 계정센터에 존재**한다. V1의 핵심은 이를 **supplier 공간 메뉴에서 진입하도록 연결(A′)** 하는 최소·안전 작업이다. 다만 **이벤트 오퍼 주문(checkout_orders)과 배송비 계산(V2)** 은 `neture_orders ↔ checkout_orders` **테이블 경계 결정**이라는 더 큰 선행 이슈에 종속되므로, 워크스페이스 연결을 먼저 하고 경계 결정 IR을 거친 뒤 계산/이벤트 포함을 진행하는 것이 안전하다.

*상태: 조사 완료 — V1 권장 A′(workspace 진입 연결) + 테이블 경계 결정 선행. 실행은 후속 WO(승인 후).*
