# CHECK-O4O-STORE-CART-CHECKOUT-CONFIRMATION-POSITIVE-SMOKE-V1

> `WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1` Phase 1b 의 **정상 주문 생성(mutation) 경로**를
> 실제 active KPA 이벤트오퍼로 1회 검증하려는 smoke.
> **판정: DEFERRED (BLOCKED — 테스트 이벤트오퍼 확보 불가).** 운영 데이터를 억지로 만들지 않고
> WO §7 중단 조건에 따라 중단. — 2026-06-09

---

## 1. 목적
Phase 1b checkout-confirm 의 positive path(cart 담기 → 주문 확정 → checkout_order 생성 → event_offer
수량 차감 → cart item 제거 → order item metadata 보존)를 실제 active 이벤트오퍼로 실증.

## 2. 작업 성격
smoke CHECK (코드/스키마/마이그레이션/API/UI/설정 변경 금지). 테스트 데이터 생성·사용만 허용,
명백한 오류 발견 시 중단 후 FIX WO 분리.

## 3. 테스트 전제 확인 결과 (먼저 수행 — WO §4/§12)

배포 기준: `o4o-core-api-02068` (code `08e2a67a3`). 계정: `sohae2100@gmail.com` (kpa admin/operator).

| 확인 | 방법 | 결과 |
|------|------|------|
| 기존 KPA 이벤트오퍼(전 상태) | `GET /api/v1/kpa/groupbuy-admin/products` | **0건** (`data: []`) |
| 생성 가능 후보(APPROVED+active SPO, kpa-groupbuy 미등록) | `GET /api/v1/kpa/groupbuy-admin/available-offers` | **0건** (`offers: []`) |
| operator 조직 resolve | 위 응답 `organizationId` | OK (`c9beb4a2-…`) |
| 매장 경영자 buyer 화면 이벤트오퍼 목록 | 브라우저 `/store-hub/event-offers` 전 탭 | **0건** (empty) |

→ **Path A(기존 active 오퍼 사용)**: 불가 (0건).
→ **Path B(테스트 오퍼 생성)**: 불가 — 이벤트오퍼 OPL 은 `offer_id` 가 유효한 `supplier_product_offers`
   (APPROVED+active) 를 FK 로 요구하는데 해당 SPO 가 0건. 테스트 오퍼를 만들려면 그 앞단
   (ProductMaster + SupplierProductOffer 생성 + 공급자/운영자 승인) 부터 프로덕션에 깊게 생성해야 함.

## 4. 판정: DEFERRED (BLOCKED)

테스트 이벤트오퍼를 확보할 수 없다(WO §7 중단 조건: "active 테스트 이벤트오퍼 확보 불가").
positive smoke 를 강행하려면 product master → supplier offer → 승인 → event offer → 승인의 **광범위하고
되돌리기 어려운 운영 데이터 생성 체인**이 필요하다. 이는 smoke 범위를 벗어나며 WO §12 "억지로 운영
데이터를 건드리지 말 것" 에 반하므로 **생성하지 않고 중단**한다.

생성된 주문/차감 없음. 정리할 데이터 없음. 코드 변경 없음.

## 5. positive path 의 간접 커버리지 (현 상태에서 확보된 신뢰)

직접 mutation 실증은 못 했으나 다음으로 정상 경로가 간접 검증됨:

- **동일 helper 재사용**: checkout-confirm 의 reserve/createOrder 는 `participate()` 와 **같은**
  `reserveEventOfferListing` + `loadEventOfferContext` + `checkoutService.createOrder` 를 사용한다.
  `participate()` 는 프로덕션에서 실제 주문 생성·수량 차감을 수행해 온 검증된 경로다(동작·에러코드 보존 확인).
- **graceful/guard smoke PASS** (`CHECK-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1`): 인증/serviceKey
  매핑(kpa-society→kpa-groupbuy)/오케스트레이터/응답 형상/실패 시 cart 유지까지 prod 실증.
- **live 브라우저**: 주문 확정 버튼 → checkout-confirm 호출 → 결과 UI → cart 유지 end-to-end 확인.

미검증으로 남는 것은 "유효 OPL 통과 시점의 병합 createOrder 결과 + total_quantity 차감 + 성공 cart 제거"의
**live 1회 실측**뿐이다.

## 6. 권장 후속

1. **자연 발생 시 1회 실측**: 운영자가 실제 KPA 이벤트오퍼를 게시하면(SPO 승인 → event offer 승인),
   그 오퍼 1건으로 본 smoke(§5.1~5.6: cart 담기→확정→checkout_order→차감→cart 제거→metadata)를 수행.
2. 또는 사용자가 **명시적으로 승인**하면 테스트용 product/supplier offer/event offer 체인을 생성해 실측 후
   기록(단, checkout_order·수량 차감은 완전 원복 불가 → 테스트 표시 + CHECK 기록 전제).
   — 본 세션은 운영 데이터 보호를 위해 임의 생성하지 않음.

## 7. 산출물 / 위생
- 코드 변경 없음. 본 문서만 path-specific 커밋.
- 다른 세션 WIP 무접촉.

---

*Date: 2026-06-09 · Status: DEFERRED (BLOCKED — 테스트 이벤트오퍼 0건, 운영 데이터 강제 생성 회피). Phase 1b 기능 자체는 CHECK-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1 에서 PASS.*
