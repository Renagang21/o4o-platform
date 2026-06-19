# IR-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0. 공급자 상품 **가격 구조** 정밀 조사 + 서비스별/계약별 가격 확장 옵션.
> **핵심 결론: 주문에 실제 반영되는 가격은 `price_general` 단일(주문 시점 snapshot). `price_gold`(서비스가)·`price_platinum`(스팟가)·`consumer_reference_price`는 모두 참고용(주문 미반영). 진짜 per-serviceKey 가격 인프라는 없음 — 단일 "서비스가"(price_gold, 미배선)·legacy `opl.price`·이벤트 `opl.event_price` override·파트너 `commission_rate`(%, 가격 아님)만 존재. 서비스별 가격은 신규 구조(offer당 per-serviceKey 가격) 필요. 주문 단가 결합점은 2곳(B2B checkout `price_general` 직접 read / 이벤트·리스팅 주문 `COALESCE(event_price, price_general, opl.price)`). 정산·승인은 가격을 snapshot/스코어로만 사용 → 가격 변경에 둔감.**
> 선행: 공급자 상품 UX 축(분리/등록/이벤트) 마감 — 2026-06-19

---

## 1. 가격 컬럼 (SupplierProductOffer) — 기능 vs 참고

`supplier_product_offers`(`SupplierProductOffer.entity:91-105`):

| 컬럼 | 타입 | 의미(주석) | 주문 반영 |
|------|------|------|:--:|
| `price_general` | int, default 0 | 공급가 — 기본 B2B 공급 가격 | **✅ 기능(주문 단가)** |
| `price_gold` | int, nullable | 서비스가 — 서비스 채널용 특별 공급가 **(참고용, 주문 미반영)** | ❌ 참고 |
| `price_platinum` | int, nullable | 스팟가 — 특별 공급가 기록용 **(참고용, 주문 미반영)** | ❌ 참고 |
| `consumer_reference_price` | int, nullable | 소비자 참고가 | ❌ 참고/표시 |

- **3-tier 가격 정책**(WO-NETURE-B2B-PRICE-THREE-TIER-POLICY-ALIGNMENT-V1): 공급가/서비스가/스팟가 = general/gold/platinum. **단 gold/platinum은 주문 미반영(참고 기록)**. CSV `service_price`→`price_gold`, `spot_price`→`price_platinum`로 영속(`csv-import.service:680`, `product-import-common.service:86`)되나 주문에 안 쓰임.
- **drawer "가격 점검"**: 공급가(price_general)/소비자 참고가/서비스가(price_gold "미설정") 표시. **"서비스가"는 단일 값**(serviceKey별 아님).

## 2. 주문 단가 — 단일 출처 + snapshot

- **B2B 카트 체크아웃**: `const unitPrice = Number(offer.price_general)` (`neture-b2b-cart-checkout.service:226`) + `unitPrice > 0` hard check(INVALID_PRICE). **서비스별 분기 없음** — 항상 price_general.
- **이벤트/리스팅 주문**: `COALESCE(opl.event_price, spo.price_general, opl.price)::numeric AS unitPrice` (`event-offer.service:308,539`). → **이미 가격 계층 존재**(event_price override → price_general → legacy opl.price).
- **snapshot**: 주문 시점 단가가 `neture_order_items.unit_price`에 고정 저장(`checkout-fulfillment-bridge:151`). 이후 offer 가격 변경은 **기존 주문에 영향 없음**.

## 3. 정산 — 가격 독립

- `neture-settlement.service:153-180`: `neture_order_items.total_price`(=unit_price×qty) 합산 + 플랫폼 수수료/공급자 금액 계산. **offer 가격 컬럼 미참조.** → 정산은 주문 라인 snapshot 기반, offer 가격 변경에 둔감.

## 4. 승인 — 가격은 점수만

- `offer-service-approval.service:175-181,255`: `price_general > 0` → completeness score 20점(상세 10점). **권고 점수일 뿐 hard gate 아님** — price_general=0이어도 submitForApproval 통과(`offer.service:411-524` 가격 검증 없음).

## 5. 이벤트 오퍼 가격 — 별도 저장 + 검증

- 검증: `eventPrice > offer.price_general` 이면 거부("이벤트 가격은 일반 공급가 이하여야 합니다", `event-offer.service:1098-1103`).
- 저장: `event_price`는 **별도 컬럼**(`organization_product_listings.event_price`, `opl.entity:104`)에 저장 — **price_general 미덮어씀**. 주문 시 COALESCE로 우선 적용.

## 6. per-service / per-contract 가격 인프라 — 현황

| 후보 | 실체 | per-service 가격? |
|------|------|:--:|
| `price_gold`(서비스가) | 단일 값, 참고용, 주문 미반영 | ❌ (단일·미배선) |
| `organization_product_listings.price`(legacy) | nullable fallback, COALESCE 최하위 | ❌ (org-listing, 이벤트 외 미사용) |
| `organization_product_listings.event_price` | 이벤트 한정 override(주문 반영) | △ (이벤트 전용) |
| `NetureSellerPartnerContract.commission_rate` | 수수료율(%, 주문가치의 분배) | ❌ (가격 아님) |
| `spot_price_policies.spot_price` | 기간 한정 정책 entity, **주문 미배선** | ❌ (offer 단위, 주문 미반영) |
| CSV `service_price` | price_gold로 영속(참고용) | ❌ |

→ **진짜 per-serviceKey 가격 컬럼/테이블은 없음.** offer당 단일 price_general이 유일 기능 가격.

## 7. 서비스별 가격 확장 옵션 (조사 결과)

> 결합점: **(a) B2B checkout `price_general` 직접 read(226)** + **(b) 이벤트/리스팅 COALESCE(308/539)**. 정산·승인은 변경 불필요(snapshot/score). 이벤트 검증은 비교 기준을 서비스별 base로 바꿔야 함.

| 옵션 | 저장 위치 | 결합 | 장점 | 단점/리스크 |
|------|------|------|------|------|
| **A. price_gold 배선(최소)** | 기존 price_gold(서비스가, 단일) | checkout에서 SERVICE 주문 시 price_gold ?? price_general | 스키마 0, 빠름 | **단일 서비스가**(serviceKey별 아님), "주문 미반영" 주석/정책 뒤집기, 3-tier 정책 재정의 |
| **B. offer per-service JSONB** | `supplier_product_offers.service_prices` JSONB `{serviceKey:price}` | checkout `service_prices[sk] ?? price_general` | 단일 row·마이그레이션 쉬움 | 인덱싱/검증 약함, 승인 completeness 재계산, JSONB 조회 |
| **C. per-service 가격 junction(권장 구조)** | 신규 `supplier_product_offer_service_prices(offer_id, service_key, unit_price, [approval])` unique(offer,service_key) | checkout JOIN, fallback price_general | 정규화·서비스별 승인/검증 가능·offer_service_approvals 패턴과 정합 | JOIN 추가, 승인 워크플로 확장 |
| **D. listing/org override** | `opl.service_unit_price`(event_price 패턴 확장) | 이벤트/리스팅 COALESCE 확장 | org/매장 협상가, 기존 패턴 | listing 선생성 필요, 이벤트/리스팅 주문 한정 |
| **E. 계약별 가격** | `NetureSellerPartnerContract.product_unit_price` 신규 | 파트너 주문 시 contract override | 수수료+가격 한 곳 | 파트너 주문 한정, 주문 라우팅에 contract 컨텍스트 필요 |

## 8. 결정 기준 (정책 질문)

1. **"서비스별 가격"의 범위**: serviceKey별(KPA/Glyco/KCos) 단일가 vs org/매장별 vs 계약(파트너)별 — 세 축이 다른 옵션(B/C vs D vs E).
2. **price_gold(서비스가) 재사용 vs 신규**: 기존 "서비스가" 컬럼을 주문 반영으로 승격(A)할지, 진짜 per-serviceKey 신규 구조(C)로 갈지. A는 단일가 한계, C는 정석.
3. **승인 결합**: 서비스별 가격도 운영자 승인 대상인가? (C는 offer_service_approvals처럼 per-service 가격 승인 가능; B는 어려움.)
4. **이벤트 검증 기준**: 서비스별 base가 생기면 `eventPrice ≤ 서비스별가` 로 검증 기준 변경 필요.
5. **마이그레이션 영향**: 기존 주문은 snapshot이라 무영향. 신규만 적용.

## 9. 권장 (조사 결론)

- **즉시 구현 비권장** — 가격은 주문 단가/이벤트 검증과 직접 결합(2 결합점). 정책 축(serviceKey별 vs org별 vs 계약별)을 먼저 확정해야 함.
- per-serviceKey 단일가가 목표라면 **옵션 C(junction table)** 가 정석: `offer_service_approvals`와 동일한 (offer_id, service_key) 패턴 → 서비스별 가격+승인 일관, checkout JOIN 1곳·이벤트 COALESCE 1곳 결합. 최소 시작은 **옵션 B(JSONB)** 도 가능하나 승인/검증 확장에서 C로 재이행 부담.
- **price_gold(서비스가) 승격(A)** 은 "단일 서비스가"만 필요할 때 최소 비용이나, 3-tier "주문 미반영" 정책을 뒤집으므로 정책 재선언 필요.
- 후속: 정책 확정 시 `WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1`(구조+checkout/이벤트 결합+승인+migration).

## 10. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정적 분석 + 사용처 추적만. 산출물 = 본 문서 1개(path-specific)
✅ 다른 세션 WIP(MarketTrialApprovalDetailPage)·검증 png 미접촉
```

---

*read-only IR · 기능 가격=price_general 단일(주문 snapshot) · gold/platinum/consumer_ref=참고용(주문 미반영) · 주문 결합점 2곳(B2B checkout 직접 read / 이벤트·리스팅 COALESCE) · 정산=order snapshot 독립 · 승인=price>0 score만 · 이벤트가=별도 opl.event_price+≤price_general 검증 · per-serviceKey 가격 인프라 없음 · 옵션 A(price_gold 승격)/B(JSONB)/C(junction 권장)/D(listing)/E(계약) · 정책 축 확정 후 구현 권장.*
