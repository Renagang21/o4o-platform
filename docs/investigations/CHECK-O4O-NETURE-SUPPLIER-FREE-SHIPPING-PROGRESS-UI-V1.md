# CHECK-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-V1

> WO-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-V1 검증 기록 — **KPA Society 단독 범위**.
> 공급자 배송 정책을 KPA 이벤트오퍼 detail buyer 화면에 표시(읽기 전용). 배송비 계산/주문/원장 무변경.

- **작업일**: 2026-06-08
- **커밋**: `810fab2cf`
- **배포**: Deploy API Server / Deploy Web Services — 둘 다 **success**
- **선행**: SHIPPING-SETTING-FOUNDATION-V1, SHIPPING-CALCULATION-V2

---

## 0. 범위 결정 (구조 검증 결과)
이벤트오퍼 buyer 화면 구조가 **균일하지 않음**을 실측:
- Glyco `HubEventOffersPage` ≈ KCos `HubEventOffersPage` (쌍둥이, 41줄 차이=주석+API명)
- **KPA** = 전용 `EventOfferDetailPage`(301) + `KpaEventOfferPage`(938) — 다른 구조
- web-neture `StoreCartPage` = B2B cart — 또 다른 구조

→ 사용자 결정: **이번 V1은 KPA 단독**. (다른 세션 공통화 진행 중 → @o4o 공유 패키지 무수정, Glyco/KCos/neture-cart 는 별도 WO.)

---

## 1. 변경 요약

| 파일 | 변경 |
|------|------|
| `apps/api-server/.../kpa/services/event-offer.service.ts` | `getGroupbuyDetail` 응답에 `shippingPolicy{baseShippingFee, freeShippingThreshold}` additive (이미 JOIN된 `neture_suppliers`에서 2컬럼 추가). **list/participate/계산 무변경** |
| `services/web-kpa-society/src/types/index.ts` | `EventOfferItem.shippingPolicy?` 추가 |
| `services/web-kpa-society/src/utils/freeShipping.ts` (신규) | 순수 helper `calcFreeShippingProgress()` + `formatWon()` (로컬 — 공유 패키지 회피) |
| `services/web-kpa-society/.../EventOfferDetailPage.tsx` | `FreeShippingNotice` — 무료배송 기준/현재 주문금액/남은 금액·충족·미설정 메시지 + "이벤트오퍼 상품도 같은 공급자 주문금액 포함" 안내 |

배송비 계산/주문 생성/checkout_orders/neture_orders/정산/송장/상태 **무변경**. migration 0. @o4o 공유 패키지·다른 세션 WIP **무접촉**.

---

## 2. 표시 정책 (helper)
```
freeShippingThreshold 없음 → "무료배송 기준 미설정" 안내 (배송비는 주문 시 계산)
subtotal >= threshold       → "무료배송 기준을 충족했습니다." (녹색)
subtotal < threshold        → "무료배송까지 N원 남았습니다." (보라)
```
- detail 화면은 수량 1 참여 → subtotal = unitPrice.
- 다른 공급자 상품 금액은 이 공급자 기준에 미포함을 명시. 배송비 재계산/덮어쓰기 없음.

---

## 3. 검증

| 항목 | 결과 |
|------|------|
| api-server `tsc` | PASS |
| web-kpa-society `tsc` | PASS |
| API deploy / Web deploy | success / success |
| `GET /api/v1/kpa/groupbuy/:id` (modified SQL) | random id → **404 graceful**(500 아님), 로그 SQL 에러 없음 → additive 컬럼 정상 |
| 기존 흐름 | list/participate 미변경, 타 서비스 무영향(additive 필드) |

- **한계**: 프로덕션에 현재 **active KPA 이벤트오퍼 0건**(list 빈 응답)이라 `shippingPolicy` 실데이터 채움 + 화면 무료배송 안내 렌더는 라이브로 시각 확인하지 못함. SQL 실행/응답 형태/타입/배포/계산 무변경은 검증. helper 는 순수·결정적. active offer 확보 시 행 표시 추가 확인 권장.
- read-only(detail 조회·표시 전용). 데이터 변경 없음.

---

## 4. 제외 / 후속
- 제외: GlycoPharm/K-Cosmetics 화면, web-neture cart, 배송비 계산/주문/원장/정산/송장 로직.
- 후속: Glyco/KCos(동일 구조 쌍) + web-neture cart — 공통화 세션 정리 후 별도 WO(가능하면 `@o4o/ui` 공통 컴포넌트로 일원화).

*KPA 단독 표시 작업 기록. 계산/구조 무변경.*
