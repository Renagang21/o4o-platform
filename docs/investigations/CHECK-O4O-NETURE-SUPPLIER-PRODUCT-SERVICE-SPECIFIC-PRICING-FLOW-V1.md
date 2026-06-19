# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1 (옵션 C, Phase 1 backend)
> **유형:** backend + migration — 서비스별 공급가 SSOT(`offer_service_prices`) + 주문 단가/이벤트 검증 결합. price_general=fallback 불변.
> **결과(Phase 1 backend): PASS(코드/타입) — 신규 테이블 + 엔티티 + CRUD API + 주문 단가 우선순위(event_price > 서비스별가 > price_general > legacy opl.price) 결합(listing 주문·B2B·이벤트 검증). api-server tsc 0. migration은 main 배포 시 CI 실행. Phase 2(frontend 입력 UI)는 후속.**
> 선행: IR-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-V1 (옵션 C 확정) — 2026-06-19

---

## 0. 구현 중 확인 (사용자 지시 §)

- **service_code 어휘 = offer.service_keys와 정합**: `seller.service.resolveServiceKey`가 `service_code || 'kpa-society'`(full form) 반환, `auto-listing.utils`가 `ose.service_code = ANY(offer serviceKeys[kpa-society…])` 매칭 성공 → **매핑 함수 불필요.**
- **B2B restock checkout은 `serviceKey='neture'` 하드 제한**(P2a, `neture-b2b-cart-checkout:112`). → kpa/glyco/kcos 서비스별 가격의 **실효 경로는 listing 주문**(event-offer COALESCE, `opl.service_key`). B2B 결합은 **forward-compat**(neture 키 미설정 → price_general). 두 경로 모두 우선순위 공식대로 결합(설계 일치).

## 1. 변경 파일 (backend 8 + CHECK)

| 파일 | 변경 |
|------|------|
| `database/migrations/20261117000000-CreateOfferServicePrices.ts` | **신규** `offer_service_prices(offer_id, service_key, unit_price)` UNIQUE(offer_id, service_key) + index |
| `modules/neture/entities/OfferServicePrice.entity.ts` | **신규** 엔티티 |
| `modules/neture/entities/index.ts` | OfferServicePrice export |
| `modules/neture/services/offer-service-price.service.ts` | **신규** CRUD(getByOffer/getByOfferForSupplier/setPrices) — eligible 키·unitPrice>0 검증, replace 트랜잭션 |
| `modules/neture/neture.service.ts` | servicePriceService delegate(getServicePrices/setServicePrices) |
| `modules/neture/controllers/supplier-product.controller.ts` | **GET/PUT `/supplier/products/:id/service-prices`**(requireActiveSupplier) |
| `routes/kpa/services/event-offer.service.ts` | listing 주문 단가 2쿼리 COALESCE에 `osp.unit_price` 추가 + LEFT JOIN. 이벤트가 검증 base = 서비스별가 ?? price_general |
| `services/cart/neture-b2b-cart-checkout.service.ts` | offerRows에 scope.serviceKey 서비스가 서브쿼리 + `unitPrice = service_unit_price ?? price_general` |

## 2. 주문 단가 우선순위 (확정·구현)

```
1. event_price (opl.event_price)            — 기존
2. offer_service_prices.unit_price          — 신규(주문 serviceKey 기준)
3. price_general                            — fallback
4. legacy opl.price                         — 기존 최하위(listing 경로)
```
- listing 주문: `COALESCE(opl.event_price, osp.unit_price, spo.price_general, opl.price)` (osp JOIN on offer_id+service_key=opl.service_key).
- B2B restock: `service_unit_price(scope.serviceKey) ?? price_general` (현재 neture → 사실상 price_general).
- 이벤트가 검증: `eventPrice ≤ (서비스별가(targetServiceKey) ?? price_general)`.

## 3. 불변 (설계 §5)

- **정산**: order_items snapshot 합산 — 무변경. 기존 주문 영향 없음(snapshot).
- `price_gold`(서비스가)/`price_platinum`(스팟가): 참고용 유지(주문 미반영) — 미변경.
- 가격 변경 승인 워크플로 미도입. 계약별/매장별 가격 미도입.
- catalog 노출/공급 방식/cancelled 정책 무변경.

## 4. CRUD 계약

`GET /api/v1/neture/supplier/products/:id/service-prices` → `{ success, data: { priceGeneral, prices: [{serviceKey, unitPrice}] } }`
`PUT /api/v1/neture/supplier/products/:id/service-prices` body `{ prices: [{serviceKey, unitPrice}] }` (replace) — eligible 키(kpa-society/glycopharm/k-cosmetics)만, unitPrice 정수>0, 소유권 검증(NOT_OWNED 403).

## 5. 검증 (Phase 1)

- **api-server `tsc --noEmit`: EXIT 0.**
- migration 추가(additive CREATE TABLE) — main 배포 시 CI 자동 실행. 기존 데이터/주문 무변경.

### 배포 후 API smoke — 2026-06-19 **PASS** (renagang21 미네락 600, 인증 fetch, 비파괴·원복)
| 단계 | 결과 |
|------|------|
| GET 초기 | 200 `{priceGeneral:22000, prices:[]}` — **테이블 생성=migration 적용 확인** |
| PUT 설정(kpa-society=20000) | 200 `prices:[{kpa-society,20000}]` |
| GET 반영 | 200 `prices:[{kpa-society,20000}]`(영속) |
| PUT 잘못된가(-5) | **400 INVALID_PRICE**(검증) |
| PUT 원복(`[]`) | 200 `prices:[]` |
| GET 최종 | 200 `prices:[]`(순변화 0) |

→ **migration 적용 + CRUD(설정/조회/검증/해제) + 소유권 PASS.** prices 비었을 때 주문 단가 fallback=price_general 보장(COALESCE/checkout 로직).
> 주문 단가 우선순위(서비스가 적용 / event_price 최우선 / 정산 snapshot)는 **실주문=운영 데이터**라 typecheck + COALESCE/checkout 정적 결합으로 보증(실주문 smoke 비파괴 범위 외).

## 6. Phase 2 (frontend) — 후속

- 공급 방식 관리 모달(또는 상품 상세)에 **서비스별 공급가 입력**(serviceKey별 unitPrice) → `PUT /service-prices`. 표시: 서비스별 가격/미설정(=price_general). browser smoke.

## 7. 준수

- ✅ path-specific(backend 8 + CHECK). **다른 세션 WIP(MarketTrialApprovalDetailPage)·검증 png 미staging.**

---

*Date: 2026-06-19 · Phase 1 backend · offer_service_prices SSOT + 주문 단가 우선순위(event_price>서비스별가>price_general>opl.price) + 이벤트 검증 base 서비스가 · service_code 어휘 정합(매핑 불필요) · B2B=neture forward-compat·listing 주효 · 정산/price_gold/승인 불변 · api-server tsc 0 · migration CI · Phase 2 frontend 후속.*
