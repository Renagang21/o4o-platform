# CHECK-O4O-EVENT-OFFER-PARTICIPATE-ROUTE-RETIREMENT-V2

> 이벤트오퍼 buyer 주문 legacy 외부 route(`participate`) 4건을 **410 Gone 으로 비활성화**.
> canonical = Store Cart checkout-confirm. 검증/수량차감 helper·service.participate 는 보존.
> **결과: PASS** — api-server tsc 0 / FE 호출 0건 재확인 / controller 차단(주문생성·차감 미발생) 코드 검증 / live no-auth smoke 4 route 401(mount+auth 정상).
> 상위: `IR-O4O-SUPPLIER-ORDER-LEGACY-CODE-REMOVAL-AUDIT-V1` (P1) — 2026-06-11

---

## 1. 변경 파일 (4, backend controller-only)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/kpa/controllers/event-offer.controller.ts` | participate 핸들러 → 410. orphaned `EventOfferError` import 제거 |
| `apps/api-server/src/routes/glycopharm/controllers/event-offer.controller.ts` | 동일 |
| `apps/api-server/src/routes/cosmetics/controllers/event-offer.controller.ts` | 동일 (import 멀티라인에서 `EventOfferError` 제거, `EventOfferCreateError` 유지) |
| `apps/api-server/src/routes/neture/controllers/event-offer.controller.ts` | 동일 |

> **service / helper / cart / checkout-confirm / 배송비 / 결제 / 정산 / fulfillment / Neture B2B 무변경.** DB/migration 무변경.

## 2. 처리 방식 (안 A — controller 차단)
각 route 는 **mount 유지**하되 핸들러가 service.participate 를 호출하지 않고 **410** 반환:
```json
{ "success": false, "code": "EVENT_OFFER_PARTICIPATE_RETIRED",
  "message": "이벤트오퍼 주문은 장바구니를 통해 진행해 주세요.", "canonicalAction": "store_cart_checkout" }
```
- 410 선택: 404(route 누락 오해)·400(client 오류 오해) 대비 **의도적 종료된 legacy API** 를 명확히 표현.
- auth 미들웨어(authenticate/requireAuth) 유지 → no-auth 는 401 선응답, authenticated 는 410.
- **service.participate 미호출 → 주문 생성·`total_quantity` 차감 미발생.**

## 3. 조사 결과
- **route 전수 (4)**: kpa `/groupbuy/:id/participate`, glyco `/glycopharm/event-offers/:id/participate`, cosmetics `/cosmetics/event-offers/:id/participate`, neture `/neture/event-offers/:id/participate`.
- **frontend buyer 호출 0건 재확인**: services/web-* 전체에서 `.participate(` **컴포넌트/핸들러 호출 0건**. 잔존하는 것은 api client **method 정의**뿐(web-kpa/glyco/kcos/neture `api/eventOffer.ts`) — 410 이라 실사용 불가, 정의 제거는 V3.
- **helper 공유 확인 → 보존**: `loadEventOfferContext` / `reserveEventOfferListing` / `incrementListingQuantity` / `countStoreOrderedQuantity` 는 `event-offer-cart-checkout.service`(canonical cart-confirm)가 사용 → **KEEP**. service.participate 함수 자체도 미삭제(내부/테스트 호환).
- **EventOfferError**: 4 controller 모두 participate catch 에서만 사용 → 핸들러 제거에 따라 **import 정리**(unused 방지).

## 4. 검증
- **api-server tsc 0** ✅ (orphaned import/`sk`/`SK` unused 없음 — sk/SK 는 sibling route 가 계속 사용)
- **controller 차단 코드 검증**: 410 을 **무조건 반환**(auth 통과 후), service.participate 미호출 → checkout_orders 생성·수량 차감 경로 진입 불가 ✅
- **FE 0건 재확인** ✅ (§3)
- **API smoke (graceful, live)** — 배포 완료 후(`o4o-core-api` 신리비전) 4 route no-auth POST:
  - KPA `/api/v1/kpa/groupbuy/:id/participate` → **401** ✅
  - Neture `/api/v1/neture/event-offers/:id/participate` → **401** ✅
  - Glyco `/api/v1/glycopharm/event-offers/:id/participate` → **401** ✅
  - KCos `/api/v1/cosmetics/event-offers/:id/participate` → **401** ✅
  - → **4 route 모두 mount 유지 + auth 미들웨어 정상(auth-first 401)**, 500/route-누락 없음. authenticated 통과 시 핸들러가 **무조건 410** 반환(코드 검증 §4) → 주문 생성·차감 미발생. (authed 410 직접 실측은 토큰 필요 — 401+코드로 갈음, 회귀 위험 없음.)

## 5. 회귀 무영향
- Store Cart add / checkout-confirm / 배송비 preview / shipping snapshot / payment / settlement / fulfillment 무변경.
- event_offer 수량 검증·차감 helper 무변경(cart-confirm 정상).
- Neture B2B store cart(`/neture/seller/orders`) 무변경.
- event-offer 목록/상세 등 동일 controller 의 다른 route 무변경(service./sk/SK 계속 사용).

## 6. 완료 기준 체크 (WO §9)
1(4 route 전수) ✅. 2(FE 0건 재확인) ✅. 3(410 비활성화) ✅. 4(helper 보존) ✅. 5(주문생성·차감 미발생) ✅. 6(cart-add/checkout-confirm 유지) ✅. 7(tsc 0) ✅. 8(API smoke — live 4 route 401, mount+auth 정상) ✅. 9(buyer UI smoke — FE 0건·cart 흐름 유지로 갈음) ✅. 10(CHECK) ✅. 11(path-specific) ✅. 12(다른 세션 무접촉) ✅.

## 7. 남은 GAP/RISK · 후속
- **authed 410 직접 실측**: live no-auth 401 ×4 확인 완료(mount+auth 정상). authenticated 호출 410 직접 확인은 토큰 필요로 미수행(코드상 무조건 410, 저위험).
- **client method 정의 제거**: V3 `WO-O4O-EVENT-OFFER-PARTICIPATE-ROUTE-REMOVE-V3` 에서 route + api client method 완전 제거(일정 기간 호출 0건 확인 후).
- 후속(IR 로드맵 P2~): `IR/WO-O4O-NETURE-B2B-ORDER-TO-CANONICAL-CART-CHECKOUT-V1`, `IR/WO-O4O-ORDER-COLLECTION-STATUS-MODEL-V1`.

---

*Date: 2026-06-11 · Status: PASS (participate route ×4 → 410 retired, helper/service 보존. live 410 실측은 배포 완료 후).*
