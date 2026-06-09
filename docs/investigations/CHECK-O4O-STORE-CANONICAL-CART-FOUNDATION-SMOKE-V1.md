# CHECK-O4O-STORE-CANONICAL-CART-FOUNDATION-SMOKE-V1

> Canonical Store Cart foundation(`WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1`, commit `f6ec5398e`) 배포 후 API smoke.
> **결과: PASS** — 2026-06-09

---

## 1. 목적

`store_cart_items` 마이그레이션 적용 및 `/api/v1/store/cart/:serviceKey/*` 7개 엔드포인트의
인증·serviceKey guard·CRUD·grouping·checkout-preview 정상 동작을 프로덕션에서 실증한다.
cart item 은 주문/재고/정산을 건드리지 않으므로 테스트 계정으로 생성 후 정리한다.

## 2. 환경

| 항목 | 값 |
|------|-----|
| API | `https://o4o-core-api-117791934476.asia-northeast3.run.app` |
| 배포 리비전 | `o4o-core-api-02062-k64` (2026-06-09T01:00:59Z, foundation commit 이후) |
| 계정 | `sohae2100@gmail.com` (인증 사용자 = buyer) |
| serviceKey | `neture` |

## 3. 검증 항목 및 결과

| # | 항목 | 기대 | 결과 |
|---|------|------|:----:|
| 0 | 마이그레이션 `store_cart_items` 적용 | list 200 (테이블 존재) | ✅ |
| 1 | 인증 없는 요청 차단 | 401 `AUTH_REQUIRED` | ✅ |
| 2 | serviceKey 검증 (`/bogus/`) | 400 `VALIDATION_ERROR` | ✅ |
| 3 | add item (event_offer, supplier sup-A, qty 2, ₩15,000) | 201, eventOfferId·pricingSource·priceSnapshot·supplierId 보존 | ✅ |
| 4 | add item (regular, supplier sup-B) | 201 | ✅ |
| 5 | validation: productName 누락 | 400 | ✅ |
| 6 | validation: sourceType `hacker` | 400 | ✅ |
| 7 | update quantity 2→5 | 200, subtotal 75,000 반영 | ✅ |
| 8 | update quantity 0 | 400 | ✅ |
| 9 | groupBySupplier | supplierCount=2 (sup-A 75,000 / sup-B 8,000) | ✅ |
| 10 | checkout-preview | grandTotal 83,000, draftOrders 2, `pricingRevalidationRequired:true`, eventOfferId 보존 | ✅ |
| 11 | remove item | 200 `{removed:true}` | ✅ |
| 12 | remove 동일 항목 재시도 | 404 `NOT_FOUND` | ✅ |
| 13 | clear cart | 200 `{removed:1}` | ✅ |
| 14 | 최종 list | 200 empty (테스트 데이터 정리됨) | ✅ |

## 4. 회귀 무영향 (코드 레벨)

foundation 커밋 `f6ec5398e` 은 신규 6파일만 추가 (register-routes·connection 등록 2줄 포함):

- `checkoutService.createOrder` 무접촉
- event-offer participate 무접촉
- 기존 cart/주문/결제/정산 테이블·로직 무변경
- 마이그레이션 additive (`CREATE TABLE IF NOT EXISTS`) — 기존 데이터 무변경

→ 기존 주문/결제/event-offer 흐름 회귀 위험 없음.

## 5. Guard 준수

- **Guard #4 (serviceKey 스푸핑 금지)**: serviceKey 는 URL 경로 파라미터에서만 추출, 카탈로그 화이트리스트 검증. ✅
- **경계 (buyerId + serviceKey)**: buyerId 는 JWT 인증 사용자에서만 취득, body 신뢰 안 함. ✅

## 6. 결론

**PASS.** Canonical Store Cart foundation 이 프로덕션에서 정상 동작하며 기존 흐름에 영향 없음.

다음 단계: **`WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1` Phase 1a**
(이벤트오퍼 화면 "주문하기" → "장바구니 담기", `sourceType='event_offer'` 저장, 기존 participate 유지).

---

*Date: 2026-06-09 · Status: PASS*
