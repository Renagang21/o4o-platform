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

**불변식 L0** (WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 §13).
주문 취소는 **write** 다 — `checkout_orders` 상태를 바꾸고 이벤트오퍼는 예약 재고까지 되돌린다.
따라서 cart write · 두 confirm 경로와 **동일하게 active service membership 을 요구**한다
(`requireActiveServiceMembership`, 403 `SERVICE_MEMBERSHIP_REQUIRED`).
정지(suspended)·탈퇴 회원은 주문 원장을 바꿀 수 없다.
반대로 **조회(목록·상세)에는 membership 게이트를 걸지 않는다** — 자기 주문 열람은 write 가 아니고,
경계는 이미 `buyerId + serviceKeys` 로 닫혀 있다.

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
| DF-1 | 매장 주문 조회 경로가 서비스마다 다르다 — KPA/GP 는 `/checkout/orders`, K-Cosmetics 는 `/orders` | 경로 변경은 frontend API contract 변경이다. CLAUDE.md 중지 조건 — 별도 WO 필요 
| ↳ **DF-1 종결** | `WO-O4O-CROSSSERVICE-B2B-BUYER-ORDER-READ-CONTRACT-AND-COMMONIZATION-V1` | 경로는 그대로 두고(`KEEP_COMPATIBLE_ALIASES`) **의미·ownership·응답 계약**을 §12 로 통일했다. 불일치의 실체는 경로 이름이 아니라 응답 계약이었다 |
| DF-2 | GlycoPharm `/store/b2b-order` 의 "주문하기" 는 `toast.info('주문 기능은 준비 중입니다.')` 만 호출한다 | canonical 장바구니로 연결할지 여부는 **제품/UX 결정**이다. 임의로 배선하지 않는다 |
| DF-3 | KPA `관심상품 주문 작업대` → canonical 장바구니 담기 이관 | 동일. 현재는 안내만 한다 |
| DF-4 | 매장 buyer 주문 조회 컨트롤러가 KPA / GlycoPharm / K-Cosmetics 3벌로 중복 | `B2B_COMMONIZABLE` 로 분류. 공통화는 3서비스 동시 회귀가 필요해 별도 WO |
| ↳ **DF-4 종결** | 동일 WO | 3벌 조회 SQL 을 `services/checkout/buyer-order-read.service.ts` 하나로 모았다. controller 3개는 thin wrapper |
| DF-5 | GlycoPharm 에 **`sourceType: 'b2b'` 를 만드는 frontend 생산자가 없다.** 서버(`checkout-confirm-b2b`)와 공통 client(`useStoreCart`)는 준비됐지만 승인 공급 상품을 장바구니에 담는 화면이 없다. `/store/commerce/products` 는 "공급 상품 **신청**"(ProductApproval PENDING) 이며 신청 ≠ 주문 | 담기 버튼을 붙이는 것은 그 화면의 **의미를 바꾸는 제품/UX 결정**이다 (DF-2 와 같은 이유). 임의 배선 금지 |
| ↳ **DF-5 종결** | `WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1` | 새 주문 UI 를 만들지 않고, `/store/commerce/products` 카탈로그를 **opt-in** cart producer 로 연결했다(§13-6). "신청"(ProductApproval) 액션은 그대로 남고 "담기"가 별개 액션으로 추가된다 — 담기 ≠ 신청 ≠ 주문 |
| DF-7 | GlycoPharm 다중 매장(조직) 사용자를 위한 **조직 선택 UI 가 없다.** 서버는 `AMBIGUOUS_STORE_ORGANIZATION` 으로 fail closed 하고 화면은 그 사유를 그대로 보여준다 | 임의로 첫 조직을 고르지 않는 것이 계약(§13-3)이다. 선택 UI 는 조직 목록 조회 표면이 새로 필요하므로 별도 WO |
| DF-8 | 승인축 `gate` 의 PRIVATE 판정은 `allowed_seller_ids` 를 **buyerId(사용자)** 와 비교하는데, 카탈로그 노출 판정은 **organizationId(매장)** 와 비교한다 — 카탈로그에 보이는 PRIVATE offer 가 confirm 에서 거부될 수 있다 | 공급 승인 정책의 축을 바꾸는 변경이고 glycopharm · kpa-society · k-cosmetics 3서비스에 동시 영향이다. 완화가 아니라 축 정렬이므로 별도 WO |
| DF-6 | `neture` 노출 strategy 는 `spo.deleted_at IS NULL` 을 걸지 않는다 — soft-delete 된 offer 가 Neture confirm 에서 여전히 보인다 | 현행 main 과 **정확히 동일한 동작**이다. confirm 공통화 WO 에서 Neture 노출 범위를 바꾸면 §22 회귀 위험. 별도 WO 로 축소 |
| ↳ **DF-6 종결** | `WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1` | soft delete 는 서비스별 공급 노출 정책이 아니라 **3축 공통 불변식**이라고 판정하고, strategy 조각이 아니라 `b2b-checkout-confirm.core.ts` 의 base 쿼리가 소유하게 옮겼다(`approval`/`optin` 조각에서 제거 · `neture` 축이 자동 상속). 같은 게이트를 catalog SSOT 4개 쿼리(`/catalog` 목록·건수 · `findApplicableOffer` · `/orderable`)에도 맞췄다 — `삭제된 offer → catalog 미노출 → cart 담기 불가 → confirm 불가` |

**DEFERRED 는 "모른다" 가 아니다.** 판정은 끝났고 실행만 미룬 것이다. `UNKNOWN = 0`.

---

## 11. 변경 규칙

1. 본 문서에 등재된 라우트 · 테이블 · 화면을 "legacy commerce" 로 판정해 제거하지 않는다.
2. 새 주문 상태 · 새 주문 테이블 · 새 pricing/금융 기능을 추가하지 않는다.
3. 공급자 화면을 Neture 밖에 복제하지 않는다.
4. POS 를 B2B 주문 설계의 전제로 넣지 않는다.
5. 본 문서와 충돌하는 코드는 **코드를 고친다** (역추론 금지 — CLAUDE.md).
6. 본 문서 자체의 구조 변경은 별도 WO 가 필요하다.

---

## 12. 매장 buyer 주문 **조회** canonical 계약

> 등재: `WO-O4O-CROSSSERVICE-B2B-BUYER-ORDER-READ-CONTRACT-AND-COMMONIZATION-V1` (DF-1 · DF-4 종결).
> 본 절은 **조회(read)** 만 규정한다. 생성 · 결제 · 공급자 처리 · 배송 · 취소는 §3–§9 가 그대로 소유한다.

### 12-1. 의미

| 축 | 값 |
|---|---|
| 행위자 | 매장 구매자(store buyer) 본인 |
| 저장소 | `checkout_orders` |
| 서비스 범위 | `getBuyerOrderServiceKeys(platformServiceKey)` — **유일한 SSOT** |
| 소유권 | `checkout_orders."buyerId"` |
| 조회 연산 | 목록(list) + 상세(detail) |

소비자 주문 축과 **섞지 않는다**. `checkout_orders` 라는 이름 때문에 과거 consumer commerce 를 복구하지 않는다.

### 12-2. 단일 Core

`apps/api-server/src/services/checkout/buyer-order-read.service.ts` 가 아래를 **혼자** 소유한다.

- 합성 조건 `co."buyerId" = $1::uuid AND co.metadata->>'serviceKey' = ANY($2::text[])` — 두 조건은 분리 불가
- 오류 계약: 없는 주문 / 타 organization 주문 / 타 serviceKey 주문 → **모두 동일한 404** (존재 여부 누설 금지)
- 금액 정규화: `decimal` 문자열 → `number`
- paging 정규화: `page >= 1`, `1 <= limit <= 100`
- 호출자 값은 **오직 bind parameter** 로만 들어간다. SQL 문자열은 Core 만 만든다.

controller 는 thin wrapper 다 — 경로 · 서비스 scope · 서비스별 표기(`organization` / `pharmacy` / `store`) adaptation 만 한다.

### 12-3. 경로 (변경하지 않는다)

| 서비스 | 목록 | 상세 |
|---|---|---|
| KPA Society | `GET /api/v1/kpa/checkout/orders` | `.../orders/:orderId` |
| GlycoPharm | `GET /api/v1/glycopharm/checkout/orders` | `.../orders/:orderId` |
| K-Cosmetics | `GET /api/v1/cosmetics/orders` | `/orders/:id` |

경로 접두어 차이는 **의도적으로 남긴다** (`KEEP_COMPATIBLE_ALIASES`). 통일 대상은 경로 이름이 아니라 의미·소유권·응답 계약이다.

### 12-4. 금지

1. wrapper 가 `checkout_orders` 조회 SQL 을 직접 작성하는 것
2. `buyerId` 를 `req.body` / `req.query` 에서 읽는 것 (인증 주체에서만 온다)
3. serviceKey 집합을 controller 에 literal 로 다시 쓰는 것
4. 조회 실패를 404 가 아닌 방식으로 구분해 응답하는 것

---

## 13. B2B checkout **confirm** canonical 계약

> 등재: `WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1`.
> 본 절은 **`store_cart_items` → `checkout_orders` 승격(confirm)** 만 규정한다.
> 결제·공급자 fulfillment·배송·취소는 §3–§9 가 그대로 소유한다.

### 13-1. 단일 Core

`apps/api-server/src/services/cart/b2b-checkout-confirm.core.ts` — `B2BCheckoutConfirmCore`.

confirm 의 **공통부는 서비스 무관(service-agnostic)** 이다.

1. buyer 인증 주체 확인
2. `store_cart_items` 를 `{ buyerId, serviceKey }` 로만 조회
3. `sourceType ∈ { b2b, regular }` 만 승격 대상 (`B2B_ORDERABLE_SOURCE_TYPES`)
4. 매장 조직 **서버 확정** (13-3)
5. `supplier_product_offers` **재조회** — cart snapshot 을 신뢰하지 않는다
6. `OfferExposureStrategy` 노출 판정 (13-2)
7. canonical 단가 재확정 — `offer_service_prices[offerId, serviceKey]` → 없으면 `spo.price_general`
   (frontend `priceSnapshot` 은 **판정 근거가 아니다**)
8. `supplier_id` 기준 grouping · 그룹 내 1건이라도 실패하면 **그룹 전체 보류**
9. `checkoutService.createOrder()` (CLAUDE.md §4 단일 진입)
10. cart 정리 — `{ id: In(...), buyerId, serviceKey }` **경계 포함 삭제**

**불변식 C1.** confirm 로직을 서비스별로 복제하지 않는다. 새 서비스는 adapter 만 추가한다.

**불변식 C2.** confirm 은 `paymentStatus` 를 지정하지 않는다 (payment-first, 기본 `pending`).
`CheckoutFulfillmentBridge` 는 **결제 완료 이후**에만 동작하며 confirm 밖에 있다.
현재 위치가 `services/neture/checkout-fulfillment-bridge.service.ts` 인 것은 이름일 뿐이다 — 재배치하지 않는다.

### 13-2. `OfferExposureStrategy` — 유일한 서비스 분기점

`apps/api-server/src/services/cart/offer-exposure-strategy.ts`.
§8 불변식 S2 의 공급 축을 confirm 에서 집행하는 지점이다.

| strategy | 서비스 | 노출 근거 (SQL) | gate |
|---|---|---|---|
| `approval` | glycopharm · kpa-society · k-cosmetics | `EXISTS offer_service_approvals(offer_id, service_key, approval_status = 'approved')` | `MASTER_INACTIVE` · `DISTRIBUTION_DENIED` |
| `optin` | pharmacy-hub | `$key = ANY(spo.service_keys)` | `DISTRIBUTION_DENIED` · `MASTER_INACTIVE` |
| `neture` | neture | 없음 (junction 미사용) | `PRODUCT_NOT_APPROVED` · `DISTRIBUTION_DENIED` |

**불변식 C3.** 승인축 서비스는 `service_keys` opt-in 만으로 주문할 수 없다.
승인 행이 없으면 **주문 불가**다 — 승인 데이터가 0건이면 그것은 온보딩 부족이지 게이트 완화 사유가 아니다.

**불변식 C4.** `APPROVAL_ELIGIBLE_SERVICE_KEYS ∩ SUPPLIER_OPTIN_SERVICE_KEYS = ∅`.
모듈 로드 시점에 assert 하며, 위반하면 서버가 기동하지 않는다.

**불변식 C5.** strategy 에 등록되지 않은 serviceKey 는 B2B confirm 대상이 아니다
(`UNSUPPORTED_CART_SERVICE`).

**불변식 C6** (WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1).
`offer_service_approvals.approval_status` 는 **소문자** 도메인이다(`pending` / `approved` / …).
대문자 `'APPROVED'` 는 `supplier_product_offers.approval_status` 의 축이며 서로 다른 축이다.
confirm 의 노출 SQL 은 카탈로그 SSOT(`buildServiceApprovalGateSql`)와 **같은 표기**로 비교해야 한다 —
섞이면 `EXISTS` 가 항상 거짓이 되어 승인축 서비스 전체의 B2B confirm 이 조용히 0건이 된다.
이는 게이트 완화가 아니라 정합 문제이며, 회귀 테스트로 고정한다
(`offer-exposure-strategy.test.ts` · `store-b2b-cart-checkout.test.ts`).

**불변식 C7** (WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1, DF-6 종결).
`spo.deleted_at IS NULL` 은 **strategy 조각이 아니라 Core 의 base 쿼리**가 소유한다.
삭제된 offer 가 주문 가능한지는 서비스별 공급 노출 정책이 아니라 offer 자체의 존재 여부이므로
3축 공통 불변식이다. 축마다 복사하면 축이 늘어날 때 누락되며 실제로 `neture` 축에 누락돼 있었다.
`offerWhereSql` 에 soft-delete 조건을 다시 넣지 않는다 — 회귀 테스트가 그 부재를 단언한다.

### 13-3. buyer 매장 조직 — **서버가 권위다**

`apps/api-server/src/utils/buyer-organization.resolver.ts` — `resolveBuyerOrganization(ds, userId, serviceKey, requested?)`.

| 상황 | 결과 |
|---|---|
| 접근 가능 조직 1개 | 서버가 자동 확정 |
| 여러 개 + 올바른 선택 | 허용 |
| 여러 개 + 선택 없음 | `400 AMBIGUOUS_STORE_ORGANIZATION` |
| 타인 조직 선택 | `403 FOREIGN_STORE_ORGANIZATION` |
| 접근 가능 조직 없음 | `403 STORE_ORGANIZATION_NOT_FOUND` |

**불변식 C6.** 클라이언트가 보낸 `organizationId` 는 **선택값(hint)** 이다.
`store_cart_items.organizationId` 는 **소유 증명이 아니다** — cart 에 박혀 있다는 이유로 주문 소유 축이 되지 않는다.
검증은 **담는 시점(`POST /store/cart/:serviceKey/items`)과 확정 시점 양쪽**에서 이뤄진다.

**불변식 C7.** 다중 조직 사용자를 단순 차단하지 않는다. 모호하면 400 으로 **선택을 요구**한다.

| 서비스 | `organizationPolicy` | 이유 |
|---|---|---|
| 승인축 (glycopharm 등) | `required` | 매장이 주문 주체다 |
| Neture | `validate-only` | 현행 client 가 조직을 보내지 않는다. 자동 확정하면 seller 축과 SERVICE 유통 판정이 바뀐다 (회귀) |
| PharmacyHub | `unused` | 현행 계약에 조직 축이 없다 |

### 13-4. route 표면 (통일하지 않는다)

| 서비스 | 경로 | 구현 |
|---|---|---|
| KPA · GlycoPharm · K-Cosmetics (event_offer) | `POST /store/cart/:serviceKey/checkout-confirm` | `EventOfferCartCheckoutService` — **변경 없음** |
| 승인축 B2B | `POST /store/cart/:serviceKey/checkout-confirm-b2b` | `StoreB2BCartCheckoutService` (wrapper) |
| Neture B2B | 동일 경로 | `NetureB2BCartCheckoutService` (wrapper) |
| PharmacyHub | 자체 `PharmacyHubOrderController` | `PharmacyHubCartCheckoutService` (wrapper) |

라우팅 분기는 `isApprovalEligibleServiceKey(scope.serviceKey)` 하나다.
**공통 Core + route 별 wrapper** 가 원칙이며, URL 을 하나로 합치지 않는다 (API compatibility 우선).

**불변식 C8.** `checkout-confirm` (event_offer 축) 을 `checkout-confirm-b2b` 로 흡수하지 않는다.
두 축은 §5-1 과 §5-2/§5-3 로 서로 다른 계약이다.

### 13-5. bridge source tag

`CheckoutFulfillmentBridge` 가 인식하는 `metadata.source`:

| tag | sourceService |
|---|---|
| `neture_b2b_checkout` | `neture-b2b` |
| `pharmacy_hub_cart` | `pharmacy-hub` |
| `store_b2b_cart` (신규) | `store-b2b` |

서비스별로 tag 를 쪼개지 않는다 — 공급자 workspace 의 실제 스코프 축은
`metadata.serviceKey` → `neture_orders.service_key` 이고 `source` 는 bridge 진입 자격 판정용이다.
**등록하지 않으면 주문은 생성·결제되고도 공급자에게 영원히 보이지 않는다.**

### 13-6. cart producer — 승인 카탈로그가 유일한 B2B 담기 출처다

WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1.

`store_cart_items(sourceType='b2b')` 를 만드는 화면은 **승인된 공급 카탈로그**
(`supplier_product_offers` 기반 catalog SSOT) 뿐이다. 카탈로그 행의 `id` 가 곧
`supplier_product_offers.id` 이며, 이 값이 `supplierProductOfferId` 로 그대로 간다.

| 축 | 권위 | 클라이언트가 보내는 값 |
|---|---|---|
| offer | `supplier_product_offers.id` (= 카탈로그 행 id) | 그대로 전달 |
| supplier | `neture_suppliers.id` | 힌트(`requireCartSupplierId=false`) |
| 가격 | 서버 `offer_service_prices[serviceKey]` → `price_general` | 표시용 snapshot 만 |
| 매장 조직 | 서버 `resolveBuyerOrganization` | **보내지 않는다** |

금지:

- legacy 서비스 자체 상품(예: `glycopharm_products`)을 B2B 주문 source 로 쓰는 것
- 표시명(`supplierName`) · manufacturer 문자열을 공급자 식별자로 쓰는 것
- sku · barcode heuristic 으로 offer 를 매칭하는 것
- frontend 가 승인·유통·조직 자격을 선판단해 담기를 막거나 허용하는 것
  (자격 판정은 confirm 시 서버가 한다 — 담기 ≠ 주문)

공통 컴포넌트(`SupplyCatalogHub`)에서 담기 UI 는 **opt-in** 이다. `cart` prop 을 주지 않은
서비스는 렌더 트리·액션·문구가 종전과 동일해야 한다(신청 ≠ 주문 경계 유지).

### 13-7. 금지

1. wrapper 가 offer 재조회 SQL · 단가 확정 · order 생성을 직접 하는 것
2. `req.body.organizationId` 를 검증 없이 소유 축으로 쓰는 것
3. cart 삭제를 `id` 만으로 수행하는 것 (`buyerId` · `serviceKey` 경계 필수)
4. 승인축에서 `service_keys` opt-in 을 노출 근거로 쓰는 것
5. confirm 안에서 fulfillment · 결제를 수행하는 것

### 13-8. cart producer — KPA 관심상품 작업대 (2026-09-03)

WO-O4O-KPA-INTEREST-PRODUCT-WORKTABLE-TO-CANONICAL-CART-ADOPTION-V1.

§13-6 의 GlycoPharm 채택과 **같은 계약**을 KPA-Society 의 관심상품 작업대
(`/pharmacy/store-order-worktable`)에 적용한 것이다. 새 주문 축이 아니다.

```text
관심상품 작업대(카탈로그 행)
  → supplier_product_offers.id
  → POST /api/v1/store/cart/kpa/items   (sourceType='b2b')
  → store_cart_items
  → POST /api/v1/store/cart/kpa/checkout-confirm-b2b   (service-agnostic Core)
  → checkout_orders
  → 매장 buyer 주문 조회 Core (§12)
```

**관심상품 ≠ 주문상품.** 작업대 행의 `isAdded`(신청·진열 이력)는 "관심"이지
"주문 가능"이 아니다. 주문 가능 판정의 권위는 서버 `GET /pharmacy/products/orderable`
이며, 그 쿼리가 offer 활성 · 공급자 ACTIVE · `offer_service_approvals` 승인 ·
축 분리를 이미 수행한다. 프런트는 그 결과를 **읽기만** 하고 자체 자격 판정을 만들지 않는다.

| 축 | 권위 | 클라이언트가 보내는 값 |
|---|---|---|
| offer | `supplier_product_offers.id` (= catalog SSOT 의 `spo.id AS "id"`) | 그대로 전달 |
| 주문 가능 | 서버 `/pharmacy/products/orderable` (승인 게이트 포함) | 표시·안내용 |
| supplier | `neture_suppliers.id` | 힌트 |
| 가격 | 서버 `offer_service_prices['kpa-society']` → `price_general` | 표시용 snapshot |
| 매장 조직 | 서버 `resolveBuyerOrganization` (`organizationPolicy='required'`) | **보내지 않는다** |

축 분리 (§5-1 이벤트오퍼 축 보호):

- B2B 담기 대상 공급유형은 `b2b` · `operator` 뿐이다.
- `event_offer` 는 기존 `checkout-confirm` 축 그대로 두고 승격하지 않는다.
- `seller_recruitment` 는 주문 경로가 아니다.
- KPA cart 에는 이벤트오퍼 항목이 이미 존재할 수 있다. 서버는 항목별로 fail-closed 하지만,
  사용자에게 부분 실패로 보이지 않도록 **작업대에서 담기 전에 이벤트오퍼 혼재를 차단**한다. 이는 §13-6 의 "frontend 선판단 금지" 에 대한
  **명시적 예외**이며, 자격 판정이 아니라 **축 혼재 방지**다. 서버 판정을 완화하지 않는다.

계약 고정: `services/web-kpa-society/src/utils/worktableCart.ts` +
`src/utils/__tests__/worktableCart.test.ts` (CI `ci-pipeline.yml` 에서 실행).

### 13-9. 확정 경로는 **담긴 축**이 결정한다 (2026-09-03)

> 등재: `WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1` §7 · §8.

`packages/store-ui-core` 의 `useStoreCart.confirmCheckout` 계약:

| cart 내용 | 확정 경로 |
|---|---|
| `b2b` / `regular` 만 | `POST /cart/:serviceKey/checkout-confirm-b2b` |
| `event_offer` 만 | `POST /cart/:serviceKey/checkout-confirm` |
| 두 축 혼재 | **어느 경로도 호출하지 않는다** — 분리 주문 안내(`MIXED_CART_AXIS_MESSAGE`) |

이전에는 b2b 항목이 하나라도 있으면 cart 전체를 `checkout-confirm-b2b` 로 보냈다.
서버가 항목 단위로 fail-closed 하므로 **축 오염은 없었지만** 사용자에게는 "반쪽 주문"으로 보였다.
새 cart architecture 를 만들지 않고 경로 선택만 고쳤다(§8 — 새 cart 구조 금지).

적용 범위: `useStoreCart` 를 쓰는 KPA-Society · GlycoPharm · K-Cosmetics.
Neture 매장 장바구니(`services/web-neture/.../StoreCartPage.tsx`)는 이 hook 을 쓰지 않지만
`neture` 축에는 event-offer producer 자체가 없어(`getBuyerOrderServiceKeys` 의 event-offer 키는
KPA/GP/K-Cosmetics 전용) 혼재가 성립하지 않는다 — **억지로 hook 으로 이관하지 않는다**.
Pharmacy-Hub 는 자체 cart 표면을 유지한다(§13-4).

계약 고정: `packages/store-ui-core/src/components/store-cart/__tests__/useStoreCart.axis-separation.test.tsx`.
