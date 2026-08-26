# O4O B2B Supplier → Store Order Contract V1

> **Status**: Active · **Type**: Canonical Order Contract
> **Effective**: 2026-08-26
> **WO**: `WO-O4O-CROSSSERVICE-B2B-SUPPLIER-TO-STORE-ORDER-CANONICAL-CONTRACT-V1`
> **위상**: 조사 보고서가 아니라 **공급자→매장 B2B 주문 축을 고정하는 canonical 계약 문서**다.
> **선행 문서**: [`O4O-STORE-COMMERCE-BOUNDARY-V1`](O4O-STORE-COMMERCE-BOUNDARY-V1.md) · [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) · [`O4O-3-ROLE-FLOW-BASELINE-V1`](O4O-3-ROLE-FLOW-BASELINE-V1.md)
> **회귀 가드**: `apps/api-server/src/__tests__/b2b-supplier-to-store-order-canonical-contract.spec.ts`

---

## 0. 이 문서가 존재하는 이유

`O4O-STORE-COMMERCE-BOUNDARY-V1` 은 **소비자→매장 commerce 를 금지**한다. 그 금지선이 반복적으로
**공급자→매장 B2B 주문**까지 함께 지워버리는 오해를 낳았다. 저장소에 `cart` · `checkout` · `orders` ·
`payments` 라는 이름이 붙은 코드가 있으면 "legacy 소비자 commerce" 로 오판되고, 실제로 살아 있는
B2B 발주 축이 제거 후보로 올라온다.

본 문서는 **반대 방향의 고정**을 담당한다.

> **공급자 → 매장 B2B 주문은 O4O 의 공식 주문 축이다.**
> `O4O-STORE-COMMERCE-BOUNDARY-V1 §12` 의 "B2B vs 소비자 order" 구분에서 **B2B 쪽 정본**이 본 문서다.
> 여기에 등재된 라우트 · 테이블 · 화면은 **소비자 commerce residue 가 아니다. 제거 대상이 아니다.**

동시에 본 문서는 **새 주문 시스템을 설계하지 않는다.** 이미 존재하는 3개 축을 계약으로 확정하고,
서비스별 구현을 그 계약에 맞출 뿐이다.

---

## 1. 범위 밖 (명시적 OUT_OF_SCOPE)

### 1-1. POS — 현재 비개발 영역

**POS 는 본 계약의 어떤 부분에도 선행 조건이 아니다.**

| 항목 | 상태 |
|---|---|
| POS API 연동 | OUT_OF_SCOPE / FUTURE |
| POS 상품 동기화 · 판매 데이터 수집 | OUT_OF_SCOPE / FUTURE |
| POS 재고 연동 · 결제 연동 | OUT_OF_SCOPE / FUTURE |
| POS vendor 선정 · adapter 설계 · schema 설계 · prototype | OUT_OF_SCOPE / FUTURE |

> **B2B 주문 구조를 POS 를 전제로 설계하지 않는다.**
> 앞으로 B2B 주문 관련 작업에서 POS 는 기본적으로 **현재 비개발 영역**으로 둔다.
> `O4O-STORE-COMMERCE-BOUNDARY-V1` 이 "판매 실행 = 외부 POS" 라고 말하는 것은
> **매장의 소비자 판매를 O4O 밖에 둔다**는 경계 선언이지, POS 연동 개발 지시가 아니다.

### 1-2. 그 밖의 범위 밖

- 소비자 cart · checkout · storefront · PG 결제 · 매장 경영자 PG 환불 **복구**
- 네이버 · 쿠팡 등 외부 판매채널 주문 API (외부 채널은 `EXTERNAL_CHANNEL` 로 분류만 하고 손대지 않는다)
- 새 ERP · 재고 시스템 · pricing engine · 금융/여신 기능
- B2B 전체 재설계 · 대규모 schema migration · 대규모 rename

---

## 2. Actor 계약

| Actor | 정의 | B2B 주문에서의 역할 |
|---|---|---|
| **Supplier** | 공급자 조직(`supplier organization`) 및 그 소속 사용자 | **seller**. offer 등록 · 주문 접수 · 상태 전이 · 출고 |
| **Store** | 매장 조직(`organization`) 및 매장 경영자 | **buyer**. 장바구니 · 주문 생성 · 수령 확인 |
| **Service Operator** | 서비스 운영 사업자 | **거래 당사자가 아니다.** 공급 승인 · 큐레이션 · 매장 지원 · fulfillment 복구 |
| **Platform Admin** | 플랫폼 관리자 | 구조 · 정책 · 거버넌스 · 금융. 거래 당사자가 아니다 |

**불변식 A1.** 서비스 운영자는 매장을 대신해 판매자나 구매자로 동작하지 않는다.
운영자에게 허용된 유일한 주문 write 는 **복구(recovery)** 다
(`POST /api/v1/pharmacy-hub/operator/fulfillment/:orderId/recover` — 결제됐으나 공급자에게 전달되지
않은 주문의 유일한 공식 복구 경로). 주문 생성 · 대리 발주는 허용하지 않는다.

**불변식 A2.** 매장은 이 축에서 **언제나 buyer 다.** 매장이 seller 인 주문은 O4O 에 없다
(`O4O-STORE-COMMERCE-BOUNDARY-V1` §2).

---

## 3. Ownership 계약

| 축 | 정본 | 금지 |
|---|---|---|
| **buyer** | 매장 조직 / 매장 경영자 사용자(인증 JWT 의 `user.id`) | body 의 buyerId 신뢰 금지 |
| **seller** | 공급자 조직(`supplier organization`) | 임의 supplierId 파라미터 신뢰 금지 |
| **serviceKey** | **URL 경로 파라미터에서만** 추출 (CLAUDE.md §7 Guard Rule #4) | body · query · JWT claim 에서 추출 금지 |
| **product / offer** | 공급자가 등록한 공급 offer (`event_offer` · Neture 공급 상품) | 아래 불변식 O3 참조 |

**불변식 O1.** 소비자 `buyerId` 와 B2B buyer organization 은 다른 개념이다. 같은 컬럼명을 쓰더라도
B2B 축에서 `buyerId` 는 **매장 측 주체**를 뜻한다. 소비자 주문 축의 잔재로 해석하지 않는다.

**불변식 O2.** `serviceKey` 격리는 **경로 파라미터 검증만으로 성립하지 않는다.**
canonical authorization 은 다음 4개의 논리곱이다.

```text
active service membership  ∧  service-scoped role/capability
                           ∧  organization ownership
                           ∧  serviceKey (경로 파라미터)
```

다음은 **결함**이다 (단독으로는 인가 근거가 되지 않는다).

- role 만 확인 · membership 만 확인
- JWT snapshot 의 membership/role 만 확인 (판정 정본은 DB `service_memberships`)
- organization id 를 **요청 파라미터로 받아** 그대로 신뢰

**불변식 O3.** `StoreLocalProduct`(매장 자체 상품) 는 **주문 가능한 공급 offer 가 아니다.**
`store_local_products` 는 매장이 스스로 관리하는 매장 실행 자산이며, B2B 주문의 상품 소스가 아니다
(`STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1`). PharmacyHub 라우트에서
`/store-owner/products`(B2B 구매 대상 공급 상품) 와 `/store-owner/local-products`(매장 자체 상품) ·
`/store-owner/handled-products`(매장 경영활용 제품) 는 **서로 다른 축**이다.

---

## 4. Canonical 저장 계약 (테이블)

| 테이블 | 역할 | 계약 |
|---|---|---|
| `store_cart_items` | **B2B 장바구니**. 매장(buyer) 이 공급자 offer 를 담는다 | 소비자 장바구니가 아니다. `O4O-STORE-COMMERCE-BOUNDARY-V1` 의 소비자 cart 금지선 대상 아님 |
| `checkout_orders` | **canonical 주문 원장**. 3개 축 전부가 여기로 수렴한다 | 신규 `*_orders` 테이블 생성 금지 (CLAUDE.md §4) |
| `neture_orders` | **공급자 fulfillment 원장**. 결제 확정 후 bridge 가 투영한다 | 주문의 정본이 아니라 공급자 처리 뷰다 |
| 결제 축 | live producer 3개 한정 — `pharmacy-hub` · `neture-b2b` · `store-service-subscription` | 그 외 producer 신규 추가 금지 |

**불변식 T1.** 주문 정본은 `checkout_orders` 다. `neture_orders` 는 파생이다.
공급자 처리 상태를 `checkout_orders` 없이 단독으로 만들지 않는다.

**불변식 T2.** 서비스별 독립 주문 테이블을 만들지 않는다 (CLAUDE.md §4 · §5).

---

## 5. Canonical Flow — 3개 축

WO 가 정한 canonical 흐름:

```text
공급자 상품 → 매장 구매/공급 신청 → 장바구니 또는 주문 생성
→ B2B 주문 → 공급자 확인/처리 → 배송/수령/완료
```

현재 main 에 **살아 있는 구현은 3개 축**이다. 셋 다 `store_cart_items` → `checkout_orders` 로 수렴한다.

### 5-1. Axis A — Event-Offer 축 (KPA Society · GlycoPharm · K-Cosmetics)

```text
event_offer (공급자 제안, 운영자 승인)
  → POST /api/v1/store/cart/:serviceKey/items          (B2B 장바구니 담기)
  → POST /api/v1/store/cart/:serviceKey/checkout-confirm
      → EventOfferCartCheckoutService  (공급자별로 주문 분리 생성)
      → checkout_orders
  → 매장 조회: /api/v1/kpa/checkout/orders
              /api/v1/glycopharm/checkout/orders
              /api/v1/cosmetics/orders
```

`serviceKey` → event-offer 도메인 매핑은 **단일 상수**가 정본이다
(`services/cart/event-offer-cart-checkout.service.ts` 의 `CART_TO_EVENT_OFFER_SERVICE_KEY`).

| cart serviceKey | event-offer serviceKey |
|---|---|
| `kpa-society` | `kpa-groupbuy` |
| `glycopharm` | `glycopharm-event-offer` |
| `k-cosmetics` | `k-cosmetics-event-offer` |

이 축은 **결제 축이 아니다.** 주문 생성까지가 O4O 의 책임이고, 정산은 공급자–매장 간 기존 거래 관계를 따른다.

### 5-2. Axis B — Neture B2B 축 (payment-first)

```text
Neture 공급 상품
  → POST /api/v1/store/cart/neture/items
  → POST /api/v1/store/cart/neture/checkout-confirm-b2b
      → NetureB2BCartCheckoutService   (serviceKey 를 'neture' 로 하드 게이트)
      → checkout_orders (paymentStatus='pending')
  → 결제 완료 이벤트
  → CheckoutFulfillmentBridgeService → neture_orders
  → 공급자: /api/v1/neture/supplier/orders*
```

**불변식 B1.** 결제 완료 이벤트만이 주문을 `paid` 로 전이시키고 공급자에게 노출한다.
라우트가 결제 상태를 직접 조작하지 않는다.

### 5-3. Axis C — PharmacyHub 축

```text
공급자 opt-in 공급 상품 (SUPPLIER_OPTIN_SERVICE_KEYS = ['pharmacy-hub'])
  → GET  /api/v1/pharmacy-hub/store-owner/products
  → POST /api/v1/pharmacy-hub/store-owner/cart/items
  → POST /api/v1/pharmacy-hub/store-owner/orders
      → PharmacyHubCartCheckoutService → checkout_orders
  → POST /api/v1/pharmacy-hub/store-owner/payments/prepare | confirm
        (공급자가 N 곳이어도 구매자는 1회 결제 — paymentGroupId)
  → CheckoutFulfillmentBridgeService → neture_orders (service_key='pharmacy-hub')
  → 공급자: /api/v1/neture/supplier/services/:serviceKey/orders*
```

**Axis C 는 자체 라우트 표면을 갖지만 저장은 canonical 을 재사용한다** — 신규 테이블 0.
자체 표면을 갖는 이유는 계약상 정당하다: 공용 `/api/v1/store/cart/:serviceKey/*` 만으로는
Pharmacy-Hub 의 역할/스코프 가드를 걸 수 없었다.

---

## 6. Canonical 주문 Lifecycle

> **현재 코드에 없는 상태를 새로 만들지 않는다.** 아래는 기존 구현에서 추출한 상태만 담는다.

```text
[cart]  장바구니 항목            store_cart_items
   |
   +- (Axis A) checkout-confirm ------------> checkout_orders : 주문 확정 (결제 축 없음)
   |
   +- (Axis B/C) 주문 생성 -----------------> checkout_orders : paymentStatus = pending
                                                    |
                                     결제 완료 이벤트 |  (유일한 전이 트리거)
                                                    v
                                              checkout_orders : paid
                                                    |
                                    fulfillment bridge |
                                                    v
                                              neture_orders   : 공급자 접수 대기
                                                    |
                       공급자 accept / status 전이 / ship |
                                                    v
                                              배송 -> 수령/완료
```

**취소 계약 (Axis C 기준 — 현재 코드에 있는 것만)**

| 시점 | 경로 | 범위 |
|---|---|---|
| 결제 전 | `POST /store-owner/orders/:orderId/cancel` | 단건 |
| 결제 후 · **공급자 접수 전 한정** | `POST /store-owner/payments/:paymentGroupId/cancel` | 결제 그룹 전체 |
| 공급자 접수 후 | **경로 없음** | 신설하지 않는다 |

**불변식 L1.** 배송비 · 가격 · 최소주문 조건은 공급자 offer 및 공급자 주문 조건
(`GET /api/v1/neture/suppliers/:id/order-condition`) 에서 온다. **새 pricing engine 을 만들지 않는다.**

**불변식 L2.** 여기 없는 상태(예: 부분 출고, 반품 RMA, 여신/외상)는 **현재 O4O 에 없다.**
문서에 미래형으로도 적지 않는다.

---

## 7. Cart 판정 — `store_cart_items` 는 B2B cart 다

| 질문 | 답 |
|---|---|
| 누가 담는가 | 매장 경영자(buyer) |
| 무엇을 담는가 | 공급자 offer / 공급 상품 |
| 소비자가 접근하는가 | 아니다 |
| `O4O-STORE-COMMERCE-BOUNDARY-V1` 의 소비자 cart 금지선 대상인가 | **아니다** |

**따라서 `store_cart_items` · `StoreCartService` · `/api/v1/store/cart/*` 는 보호 대상이다.**
소비자 commerce residue 정리 작업에서 제거 후보로 올리지 않는다.

**불변식 C1.** `checkout` 이라는 이름이 붙어 있다는 이유로 소비자 PG 결제 기능을 복구하지 않는다.
Axis A 의 `checkout-confirm` 은 **주문 확정**이지 소비자 결제가 아니다.

**불변식 C2.** 이름 정리는 **주석/문서 최소 정리**까지만 한다. 대규모 rename 을 하지 않는다.

---

## 8. 서비스별 계약 요약

| 서비스 | B2B 주문 축 | 매장(buyer) | 공급자(seller) 화면 | 비고 |
|---|---|---|---|---|
| **KPA Society** | Axis A (`kpa-groupbuy`) | 있음 — 장바구니 · `/kpa/checkout/orders` | 없음 (Neture 측이 정본) | 관심상품 주문 작업대는 **안내 전용**. 실행 leg 은 410 은퇴 |
| **GlycoPharm** | Axis A (`glycopharm-event-offer`) | 있음 — 장바구니 · `/glycopharm/checkout/orders` | 없음 — `RoleNotAvailablePage` 고정 | `/store/b2b-order` 는 **조회 화면**(주문 실행 미연결) |
| **K-Cosmetics** | Axis A (`k-cosmetics-event-offer`) | 있음 — 장바구니 · `/cosmetics/orders` | 없음 | 조회 경로만 `/checkout` 접두어가 없다 (§10 DF-1) |
| **PharmacyHub** | Axis C | 있음 — 자체 라우트 표면 | 없음 (서비스에 supplier 역할 없음) | `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1` |
| **Neture** | Axis B | 있음 | 있음 — `/api/v1/neture/supplier/orders*` = **공급자 화면 canonical** | 다른 서비스가 복제하지 않는다 |

**불변식 S1.** 공급자(seller) 의 B2B 주문 화면은 **Neture 측이 canonical** 이다.
KPA · GlycoPharm · K-Cosmetics · PharmacyHub 에 공급자 주문 화면을 다시 만들지 않는다.

**불변식 S2.** 두 개의 공급 진입 축이 있고 서로 다르다. 섞지 않는다.

| 축 | 상수 | 서비스 |
|---|---|---|
| 운영자 승인형 | `APPROVAL_ELIGIBLE_SERVICE_KEYS` | glycopharm · kpa-society · k-cosmetics |
| 공급자 opt-in 형 | `SUPPLIER_OPTIN_SERVICE_KEYS` | pharmacy-hub |

---

## 9. 은퇴한 축 (재유입 금지)

아래는 **의도적으로 제거·차단된 것**이다. "기능이 빠졌다" 는 이유로 되살리지 않는다.

| 은퇴 대상 | 상태 | 근거 |
|---|---|---|
| 소비자→매장 주문 (`POST /api/v1/cosmetics/orders`) | `410 STORE_CONSUMER_ORDER_RETIRED` | `O4O-STORE-COMMERCE-BOUNDARY-V1` |
| 매장 소비자 판매 결제 | `410 STORE_SALE_PAYMENT_DEPRECATED` | 동일 |
| 매장 B2C 채널 | `410 STORE_B2C_CHANNEL_RETIRED` | 동일 |
| `POST /api/v1/{kpa,glycopharm}/checkout/orders` (소비자 주문 생성) | 라우트 제거 (404) | 동일 |
| `/api/v1/ecommerce/*` (admin-dashboard 소비자 commerce client) | **서버에 없음 (404)** — client 도 제거 | 본 WO 결함 D2 |
| 공급자 취급 요청 (`POST /api/v1/neture/supplier/requests`, `createHandlingRequest`) | 엔드포인트·테이블 모두 제거됨 | `WO-NETURE-SUPPLIER-OFFERS-DEAD-CODE-REMOVAL-V1` (`9798e2d80`) · 본 WO 결함 D4 |
| GlycoPharm 공급자 역할 화면 | `/supplier`, `/supplier/*` → `RoleNotAvailablePage` | 본 WO 결함 D3 |

**불변식 R1.** 위 항목들은 회귀 가드 스펙이 감시한다.
소스에 다시 나타나면 `b2b-supplier-to-store-order-canonical-contract.spec.ts` 가 실패한다.

---

## 10. 알려진 불일치 (DEFERRED — 본 WO 에서 고치지 않는다)

| # | 내용 | 왜 미루는가 |
|---|---|---|
| DF-1 | 매장 주문 조회 경로가 서비스마다 다르다 — KPA/GP 는 `/checkout/orders`, K-Cosmetics 는 `/orders` | 경로 변경은 frontend API contract 변경이다. CLAUDE.md 중지 조건 — 별도 WO 필요 |
| DF-2 | GlycoPharm `/store/b2b-order` 의 "주문하기" 는 `toast.info('주문 기능은 준비 중입니다.')` 만 호출한다 | canonical 장바구니로 연결할지 여부는 **제품/UX 결정**이다. 임의로 배선하지 않는다 |
| DF-3 | KPA `관심상품 주문 작업대` → canonical 장바구니 담기 이관 | 동일. 현재는 안내만 한다 |
| DF-4 | 매장 buyer 주문 조회 컨트롤러가 KPA / GlycoPharm / K-Cosmetics 3벌로 중복 | `B2B_COMMONIZABLE` 로 분류. 공통화는 3서비스 동시 회귀가 필요해 별도 WO |

**DEFERRED 는 "모른다" 가 아니다.** 판정은 끝났고 실행만 미룬 것이다. `UNKNOWN = 0`.

---

## 11. 변경 규칙

1. 본 문서에 등재된 라우트 · 테이블 · 화면을 "legacy commerce" 로 판정해 제거하지 않는다.
2. 새 주문 상태 · 새 주문 테이블 · 새 pricing/금융 기능을 추가하지 않는다.
3. 공급자 화면을 Neture 밖에 복제하지 않는다.
4. POS 를 B2B 주문 설계의 전제로 넣지 않는다.
5. 본 문서와 충돌하는 코드는 **코드를 고친다** (역추론 금지 — CLAUDE.md).
6. 본 문서 자체의 구조 변경은 별도 WO 가 필요하다.
