# CHECK — GlycoPharm `/store/b2b-order` → canonical B2B cart 연결

> **WO**: WO-O4O-GLYCOPHARM-B2B-ORDER-TO-CANONICAL-CART-ADOPTION-V1
> **일자**: 2026-08-26
> **성격**: 조사 → **§37 중지 조건 발동 · 코드 변경 0**
> **최종 상태**: **BLOCKED — 주문 연결 미수행 (임의 연결 금지 조항 준수)**

---

## 0. 결론 먼저

`/store/b2b-order` 의 주문 leg 를 canonical cart 로 수렴시키지 **않았다.**
WO §37 의 중지 조건 3개가 동시에 성립하기 때문이다.

```text
① /store/b2b-order 상품에서 실제 supplier offer 를 resolve 할 수 없음   → 성립
② 가격의 canonical source 를 확정할 수 없음                              → 성립
③ canonical checkout 이 해당 항목을 수용하지 못함                        → 성립
```

핵심 사실 한 줄:

```text
/store/b2b-order 가 보여주는 상품은 공급자 offer 가 아니라
legacy 약국 자체 상품 테이블(glycopharm_products) 이며,
GlycoPharm 일반 B2B 주문을 확정할 수 있는 canonical checkout 경로는 현재 0 개다.
```

**단, 막힌 곳은 "연결 배선" 이 아니라 "무엇을 파는 화면인가" 라는 선행 결정이다.**
GlycoPharm 에는 이미 완전한 canonical 공급 축과 canonical cart 인프라가 **둘 다 존재**한다(§7-B·§9-B).
필요한 것은 코드가 아니라 §12 의 결정 2건이다.

---

## 1. 시작 기준

| 항목 | 값 |
|------|-----|
| 브랜치 | `main` |
| 시작 commit | `2184053ba` (`HEAD == origin/main`) |
| 작업트리 | **clean** (다른 세션 WIP 0건) |
| 다른 세션 파일 접촉 | 없음 (수정·restore·stash·stage 0) |
| 본 WO 코드 변경 | **0건** — 본 CHECK 1파일만 추가 |

---

## 2. `/store/b2b-order` 기존 흐름 census (§6) — UNKNOWN = 0

| 항목 | 실측값 |
|------|--------|
| route | `App.tsx:1080` `<Route path="b2b-order" element={<B2BOrderPage />} />` |
| page component | `services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderPage.tsx` (647줄) |
| 진입 UI | `StoreMainPage.tsx:54` — 'B2B 주문 / 공급사 상품 주문 확인' |
| 탭 구조 | `franchise`(프랜차이즈 전용) · `general`(일반 B2B) |
| API client | `apiClient.get` **2건뿐** (아래) |
| 호출 API | `GET /api/v1/glycopharm/b2b/products?type=franchise` · `?type=general` |
| 쓰기 API | **0건** |
| hook | 없음 (전부 로컬 `useState`) |
| 선택 데이터 | `cart` = `useState<CartItem[]>([])` — **로컬 React state** |
| 수량 입력 | `addToCart` / `updateCartQty` — 로컬 배열 조작 |
| 가격 표시 | `product.price` / `discountPrice`, 합계는 프런트 계산 |
| **주문하기 버튼** | **2곳** (`:505`, `:631`) → 둘 다 `toast.info('주문 기능은 준비 중입니다.')` |
| 현재 backend 호출 | **없음** |

### 2-1. "주문하기" 판정 (§6 요구)

WO §6 이 요구한 5지선다 판정:

```text
아무 동작 없음         ← ★ 확정 (stub toast)
dead API 호출          ✗
별도 order 생성        ✗
consumer checkout 계열 ✗
legacy route           ✗
```

**결과: 주문 leg 자체가 존재한 적이 없다.** 회귀시킬 기존 동작도, 제거할 dead API 도 없다.
cart 는 서버에 저장되지 않아 새로고침 시 소실된다.

### 2-2. §21 "주문하기" 의미

즉시 주문 UX 도, cart 담기 UX 도 아니다 — **로컬 담기 + stub 버튼**이다.

---

## 3. 상품 source 판정 (§7) — **canonical 공급 축 아님**

### 3-A. 현재 source = legacy `glycopharm_products`

```text
GET /api/v1/glycopharm/b2b/products
→ glycopharm.routes.ts:359  createB2BController
→ pharmacy.controller.ts:204 router.get('/products')
→ GlycopharmRepository.findAllProducts({ status:'active', is_featured: type==='franchise' ? true : undefined })
→ Entity GlycopharmProduct  @Entity({ name: 'glycopharm_products' })
```

탭 정의: `franchise` = `is_featured = true` / `general` = 전체 active.

### 3-B. §7 후보 대조표

| 후보 | 해당 여부 | 근거 |
|------|:---:|------|
| `SupplierProductOffer` | ✗ | 참조 컬럼 없음 |
| `OrganizationProductListing` | ✗ | 참조 컬럼 없음 |
| `ProductApproval` | ✗ | 참조 컬럼 없음 |
| `ProductMaster` | ✗ | 참조 컬럼 없음 |
| `StoreLocalProduct` | ✗ | 별개 테이블 |
| 서비스별 supplier offer | ✗ | 별개 축(3-D) |
| **legacy `glycopharm_products`** | **★** | 실측 확정 |

### 3-C. §7 필수 질문 답변

| 질문 | 답 |
|------|-----|
| 누가 공급자인가? | **식별 불가.** API 의 `supplierName` = `product.manufacturer` — `varchar(100)` **자유 텍스트**(제조사명). organization FK 아님. 값 없으면 `'Unknown'` 하드코딩 |
| 가격 source 는? | `glycopharm_products.price` / `sale_price` — **자체 컬럼**. 공급자 offer 가격(`price_general`/`price_gold`)이 아님 |
| 매장이 실제 주문 가능한 offer 인가? | **아님.** 공급 계약·유통유형·승인 게이트가 없는 상품 레코드 |
| supplier organization 식별 가능한가? | **불가** |
| serviceKey 유지되는가? | 테이블 자체가 glycopharm 전용이라 서비스 축은 유지되나, 공급 축이 없어 무의미 |

### 3-D. 저장소가 이미 legacy 로 명시하고 있다

[PharmacyB2BProducts.tsx:16-17](../../services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx#L16-L17):

```text
"레거시 약국 자체 상품(glycopharm_products / pharmacyApi.getProducts)은
 admin·b2b-order·storefront·파트너 모집이 계속 소비하므로 본 전환에서 제거하지 않는다."
```

→ `/store/b2b-order` 는 **저장소가 이미 legacy 소비처로 등재해 둔 화면**이다.

---

## 4. §8 StoreLocalProduct 경계 — resolve 불가 확정

WO §8 은 "표시 중인 상품이 실제 주문 가능한 supplier offer/listing 으로 어떻게 resolve 되는지 확인하고,
resolve 불가능하면 임의 주문 연결을 하지 않는다" 고 정한다.

`GlycopharmProduct` 엔티티 전 컬럼을 확인한 결과 **canonical 참조 컬럼 0건**:

```text
id · pharmacy_id · name · subtitle · sku · barcodes · images · category
description · short_description · price · sale_price · stock_quantity
manufacturer · origin_country · legal_category · certification_ids
usage_info · caution_info · status · is_featured · is_partner_recruiting
sort_order · created_by_* · updated_by_* · created_at · updated_at
```

- `master_id` / `offer_id` / `listing_id` / `supplier_id` — **전부 없음**
- `pharmacy_id` 는 `OrganizationStore` FK = **매장(구매자) 측**이며 공급자가 아니다

유일한 이론적 매칭 축은 `sku` · `barcodes` 문자열이지만, 이는 **휴리스틱**이지 canonical resolve 가 아니다.
WO §10("frontend 표시값을 신뢰해 supplier/price/ownership 을 write 하지 않는다")과 정면 충돌하므로 채택하지 않았다.

→ **§37 중지 조건 ① 성립.**

---

## 5. 가격 source 판정 (§14) — 확정 불가

| 분류 | 판정 |
|------|------|
| supplier offer price | ✗ (연결 없음) |
| service price | ✗ |
| manual price | **★ 해당** — legacy 테이블 자체 컬럼 |
| snapshot | ✗ |
| unknown | ✗ (source 자체는 확정, 다만 canonical 아님) |

canonical B2B 가격은 `supplier_product_offers.price_general` / `price_gold` / 서비스별 공급가에 있고,
`NetureB2BCartCheckoutService` 가 확정 시 **서버에서 offer 로부터 재조회**한다(§7-B).
legacy 가격을 canonical cart 에 넣으면 그 재검증 축과 어긋난 값이 원장에 남는다.

→ **§37 중지 조건 ② 성립.**

---

## 6. canonical cart 입력 계약 (§9) — 실측

`apps/api-server/src/entities/cart/StoreCartItem.entity.ts` (`store_cart_items`)

| 필드 | 컬럼 | 의미 |
|------|------|------|
| `buyerId` | `buyer_id` | 구매 주체(매장 경영자) — cart 소유자 |
| `organizationId` | `organization_id` | 매장. 주문 분할 시 `sellerOrganizationId` |
| `serviceKey` | `service_key` | 매장 소속 서비스 |
| `sourceType` | `source_type` | `regular\|operator_approved\|b2b\|event_offer\|seller_recruitment` |
| `supplierId` | `supplier_id` | **NetureSupplier.id** |
| `supplierProductOfferId` | `supplier_product_offer_id` | **SupplierProductOffer.id** — 가격·재고·정산 공통 앵커 |
| `organizationProductListingId` | `organization_product_listing_id` | OrganizationProductListing.id |
| `eventOfferId` | `event_offer_id` | 이벤트 오퍼 listing |
| `productMasterId` | `product_master_id` | ProductMaster.id |
| `productName` / `quantity` / `pricingSource` / `priceSnapshot` | — | 표시·수량·가격 |

API: `/api/v1/store/cart/:serviceKey/*` — `serviceKey` 는 **경로 파라미터에서만** 추출(CLAUDE.md §7 Guard #4),
`buyerId` 는 JWT, membership 은 DB `hasActiveServiceMembership` (§11 요구와 일치).

### 6-1. ⚠️ `add()` 는 참조 존재를 검증하지 않는다 (§10 관련 관찰)

`StoreCartService.add()` 의 검증은 `productName` 비어있지 않음 · `sourceType`/`pricingSource` enum ·
`quantity` 양의 정수 · `priceSnapshot` 음이 아닌 정수 · 의약품 차단(`assertNotDrug`) **뿐**이다.
`supplierId` / `supplierProductOfferId` 등 **참조 필드는 전부 optional 이며 존재 검증이 없고**,
`priceSnapshot` 은 클라이언트 body 값이 그대로 저장된다.

즉 **cart 단계에서는 legacy 상품도 물리적으로는 담긴다.** 막히는 곳은 그 다음 단계다(§7).
"담기니까 연결 가능" 으로 판단하면 안 되는 이유가 여기 있다.

---

## 7. canonical checkout 수용 여부 (§17) — **GlycoPharm 일반 B2B 경로 0개**

`store-cart.routes.ts` 가 제공하는 주문 확정은 2개다.

### 7-A. `POST /cart/:serviceKey/checkout-confirm` — event-offer 축

| 항목 | 값 |
|------|-----|
| 서비스 지원 | `kpa-society` · **`glycopharm`** · `k-cosmetics` (`CART_TO_EVENT_OFFER_SERVICE_KEY`) |
| 수용 sourceType | **`event_offer` 만** |
| 필수 앵커 | `eventOfferId` |
| 그 외 항목 처리 | `failedItems` 로 분리 (`UNSUPPORTED_CART_ITEM_SOURCE`) — hard throw 아님 |

→ GlycoPharm 을 지원하지만 **일반 B2B 항목은 확정 불가.**

### 7-B. `POST /cart/:serviceKey/checkout-confirm-b2b` — Neture B2B 축

| 항목 | 값 |
|------|-----|
| 서비스 지원 | **`neture` 전용** — `if (scope.serviceKey !== SERVICE_KEYS.NETURE) throw 'UNSUPPORTED_CART_SERVICE'` |
| 수용 sourceType | `b2b` · `regular` |
| 필수 앵커 | **`supplierProductOfferId`** |
| 가격 | 서버가 `supplier_product_offers` 에서 재조회 (서비스별 공급가 우선, 없으면 `price_general`) |

→ 필요한 형태이지만 **serviceKey 하드 제한으로 glycopharm 거부.**

### 7-C. 결론

```text
GlycoPharm 일반 B2B cart 항목을 주문으로 확정할 수 있는 경로 = 0
```

→ **§37 중지 조건 ③ 성립.**

---

## 8. 그러나 canonical 자산은 이미 둘 다 있다 (중요)

막힌 것은 배선이 아니라 **선행 결정**임을 보이는 실측이다.

### 8-A. canonical 공급 축은 GlycoPharm 에 이미 있다

`GET /api/v1/glycopharm/products/catalog` (공유 `o4o-store/pharmacy-products.controller`, KPA 와 동일 backend)

```sql
SELECT spo.id AS "id",  s.id AS "supplierId",  o.name AS "supplierName",
       spo.price_general AS "priceGeneral",  spo.price_gold AS "priceGold", ...
FROM supplier_product_offers spo
JOIN product_masters  pm ON pm.id = spo.master_id
JOIN neture_suppliers s  ON s.id  = spo.supplier_id
WHERE spo.is_active = true AND s.status = 'ACTIVE' ...
```

**canonical cart 가 요구하는 앵커와 정확히 일치한다:**

| cart 필요 | catalog 제공 |
|---|---|
| `supplierProductOfferId` | `id` = `spo.id` ✅ |
| `supplierId` (NetureSupplier.id) | `supplierId` = `s.id` ✅ |
| 가격 | `priceGeneral` / `priceGold` ✅ |
| `productMasterId` | `pm.id` (join 존재, 현재 미select) ✅ |

소비 화면: `/store/commerce/products` (`PharmacyB2BProducts` → 공통 `SupplyCatalogHub`).
단 그 화면의 액션은 **"내 약국에 추가" = 공급 상품 신청(ProductApproval PENDING) — 신청 ≠ 주문**이다.

### 8-B. canonical cart 인프라도 GlycoPharm 에 이미 있다

| 자산 | 경로 |
|------|------|
| cart API client | `services/web-glycopharm/src/api/storeCart.ts` — 공통 `createStoreCartApi` |
| cart 화면 | `pages/store-cart/StoreCartPage.tsx` — 공통 `useStoreCart` + `StoreCartView` (route `.../cart`) |
| cart 담기 사용처 | `pages/hub/HubEventOffersPage.tsx` — **event offer → canonical cart 이미 동작** |
| buyer-order read (§19) | `GET /api/v1/glycopharm/checkout/orders` · `/orders/:orderId` — 공통 `listBuyerOrders` 사용 ✅ |

`services/api.ts:295` 가 canonical 축을 명문화하고 있다:

```text
매장의 공급자 B2B 주문 canonical 축은
/api/v1/store/cart/glycopharm/* → checkout-confirm → /api/v1/glycopharm/checkout/orders 다.
```

즉 **GlycoPharm 의 canonical B2B 주문은 현재 "이벤트 오퍼" 축으로만 성립**하고,
`/store/b2b-order` 가 다루는 "일반 B2B" 축은 상품·확정 양쪽 모두 미성립 상태다.

---

## 9. buyer organization / serviceKey / authorization (§11·§12·§24)

조사만 수행(변경 0).

| 항목 | 현재 계약 | 판정 |
|------|-----------|------|
| serviceKey | 경로 파라미터에서만 추출, `getAllServiceKeys()` 검증 | 재사용 가능 ✅ |
| membership | `hasActiveServiceMembership` (DB `service_memberships`, JWT 스냅샷 금지) | §11 요구와 일치 ✅ |
| buyerId | JWT 인증 사용자 (body 신뢰 금지) | ✅ |
| organizationId | cart `add` 입력값으로 들어옴 — **서버 resolve 아님** | ⚠️ §12 관점에서 확인 필요(연결 시점에 재검토) |

`organizationId` 서버 resolve 여부는 이번에 연결을 수행하지 않았으므로 **UNJUDGED** 로 남긴다
(연결 결정이 내려질 때 §12 기준으로 판정해야 할 항목).

---

## 10. consumer commerce 재유입 (§25·§26) — 0건

코드 변경이 0 이므로 재유입 경로가 생길 수 없다. 현행 계약 실측:

| 확인 | 결과 |
|------|:----:|
| `POST /api/v1/glycopharm/checkout` | **410** `STORE_CONSUMER_ORDER_RETIRED` (유지) |
| glycopharm payment controller | **410** `RETIRED` (유지) |
| legacy event-offer 외부 route | **410 Gone** (유지) |
| consumer buyerId 기반 checkout 재활성화 | 0 |
| store seller order / platform seller | 0 |
| consumer payment / store-owner refund | 0 |
| PG 신규 | 0 |

`GET /checkout/orders*` 는 매장 경영자의 **구매/발주(B2B) 내역** 이므로 보존 대상이며 그대로다.

---

## 11. 수행하지 않은 것

| 항목 | 상태 |
|------|------|
| 수정 frontend | **0** |
| 수정 backend | **0** |
| 재사용한 Core/API | 조사만 — 실제 배선 0 |
| cart → checkout-confirm 결과 | **미실행** (연결 없음) |
| buyer-order read 연결 | 기존 그대로 (§8-B) |
| 실제 order write | **0** |
| 다른 서비스 회귀 (§28) | 코드 변경 0 → **회귀 없음**(KPA event-offer / Neture B2B / PharmacyHub / K-Cosmetics 전부 무접촉) |
| DF-3 (KPA 관심상품 작업대) | **미실행** (§29 준수) |
| tests | 신규 0 — 변경이 없어 검증 대상 없음 |
| typecheck / build | **미실행** — 코드 변경 0건이라 판정 대상 없음 |
| production smoke | **미실행** (배포 대상 없음) |
| production DB census | **`NO_PRODUCTION_DB_CENSUS`** — 본 WO 에 자격증명 미제공, secret 탐색 금지(§34). 중지 판정은 코드 계약만으로 성립하므로 census 없이도 결론이 바뀌지 않음 |

---

## 12. 진행하려면 필요한 결정 2건

§37 이 요구하는 "막힌 정확한 계약" 이다. 둘 다 **사업/계약 판단**이라 임의로 정하지 않았다.

### D1 — `/store/b2b-order` 는 무엇을 파는 화면인가

```text
현재: legacy glycopharm_products (공급자·offer·canonical 가격 없음)
canonical 로 가려면: supplier_product_offers 기반으로 상품 source 를 교체해야 함
```

부수 영향 (임의로 결정할 수 없는 이유):

- 현재 탭 `franchise`/`general` 은 legacy `is_featured` 기반이다. canonical 축의 구분자는
  `distribution_type`(PUBLIC/SERVICE/PRIVATE) 이라 **탭의 의미가 바뀐다.**
- canonical 카탈로그 화면(`/store/commerce/products`)이 **이미 존재**한다.
  b2b-order 를 canonical 로 바꾸면 두 화면이 같은 축을 보게 되어 §27("복제 금지")과 IA 중복을 검토해야 한다.
- 대안: `/store/b2b-order` 를 **은퇴**시키고 canonical 카탈로그 축으로 일원화하는 선택지도 있다.

### D2 — GlycoPharm 일반 B2B 주문 확정 경로를 어떻게 만들 것인가

```text
현재: checkout-confirm-b2b 가 serviceKey==='neture' 로 하드 제한
```

- 확장하면 Neture 이름의 공유 주문 확정 서비스가 glycopharm 주문을 만들게 된다.
  §17("새 주문 생성 controller/service 를 만들지 않는다")에는 부합하나,
  §4 OUT_OF_SCOPE 의 Neture B2B 축을 건드리므로 **명시 승인이 필요**하다.
- 확장 시 `checkout_orders` 저장 계약은 변경 불필요(§17 유지 가능)로 보이나, 실제 확장 시 재확인해야 한다.

---

## 13. 완료 기준 대조 (§38)

| 기준 | 결과 |
|------|:----:|
| current flow census 완료 | ✅ |
| UNKNOWN = 0 | ✅ |
| 주문 가능 product/offer source 확정 | ✅ 확정 — **"canonical 아님"** 으로 확정 |
| supplier 확정 | ✅ 확정 — **"식별 불가"** 로 확정 |
| 가격 source 확정 | ✅ 확정 — **"legacy manual, canonical 아님"** 으로 확정 |
| buyer organization 확정 | ⚠️ **UNJUDGED** (연결 미수행 — §9) |
| canonical cart 연결 | ❌ **미수행 (중지)** |
| checkout-confirm 재사용 | ❌ 미수행 |
| `checkout_orders` 계약 변경 없음 | ✅ (변경 0) |
| buyer-order read 연결 | ❌ 미수행 (기존 자산은 준비됨) |
| consumer commerce 재유입 = 0 | ✅ |
| consumer checkout 410 유지 | ✅ |
| 타 서비스 B2B 회귀 없음 | ✅ (무접촉) |
| DF-2 종결 | ❌ **미종결 — BLOCKED** |
| DF-3 미실행 | ✅ |
| CHECK 작성 / commit / push | ✅ |

---

## 14. UNKNOWN · UNJUDGED · DEFERRED

```text
UNKNOWN   = 0
            (/store/b2b-order 의 흐름·상품·가격·주문 동작 모두 실측 확정)

UNJUDGED  = 1
            canonical cart 의 organizationId 서버 resolve 여부 (§12)
            — 연결을 수행하지 않아 판정 시점이 오지 않았다

DEFERRED  = 3
            D1 /store/b2b-order 상품 source 결정 (§12)
            D2 GlycoPharm 일반 B2B checkout 경로 결정 (§12)
            DF-3 KPA 관심상품 작업대 → canonical cart (§29, 설계상 후속)
```

---

## 15. 최종 판정

```text
GLYCOPHARM_B2B_ORDER_TO_CANONICAL_CART = BLOCKED (연결 미수행)

/store/b2b-order 주문 leg          = 존재한 적 없음 (stub toast)
상품 source                        = legacy glycopharm_products (canonical 아님)
supplier                           = 식별 불가 (manufacturer 자유 텍스트)
가격 source                        = legacy manual (canonical 아님)
GlycoPharm 일반 B2B checkout 경로  = 0 개

canonical 공급 축 (supplier_product_offers)  = GlycoPharm 에 이미 존재
canonical cart 인프라 (storeCart/StoreCartPage) = GlycoPharm 에 이미 존재
canonical buyer-order read                    = GlycoPharm 에 이미 존재

→ 막힌 것은 배선이 아니라 D1·D2 선행 결정이다.
```

임의 연결(휴리스틱 sku 매칭 · supplier 상수 주입 · frontend 가격 신뢰)은
WO §8 · §10 · §13 · §14 가 명시적으로 금지하므로 수행하지 않았다.
