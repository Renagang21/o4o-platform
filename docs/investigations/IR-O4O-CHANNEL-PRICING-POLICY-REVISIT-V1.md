# IR-O4O-CHANNEL-PRICING-POLICY-REVISIT-V1

> **유형**: Policy IR (read-only) — 차등 가격(기본/B2B/서비스별/판매자모집) 요구를 현행 가격 동결 구조에서 어떻게 수용할지 결정. 코드/DB/route/UI **무변경**.
> **결정 질문**: 같은 제품의 채널/타깃별 가격 차등을 **(A) OPL per-org override 로만(현 freeze 유지)** / **(B) offer 다중가(서비스별 가격 필드)** / **(C) 명시적 가격 override 사이드 테이블(통제된 freeze 개정)** 중 어디로 수용할지.
> **권고: C(통제된 사이드 테이블) — 단, `WO-NETURE-PRICE-ARCHITECTURE-FREEZE-V1` 동결 정책 개정이므로 명시적 사용자 승인 + freeze 개정 WO 필요. 차등 요구가 "org별"로 충분하면 A.**
> **선행**: `IR-O4O-SUPPLIER-PRODUCT-SERVICE-REGISTRATION-TYPE-AUDIT-V1`(cab35f345) · 2026-06-15
> ⚠️ **가격 구조는 Frozen Baseline** — 본 IR 은 재검토 제안이며, 구조 변경은 별도 명시적 WO + 승인 필요(CLAUDE.md §14 Freeze 규칙).

---

## 1. 결정이 필요한 이유 (가장 먼저 해야 하는 이유)

공급자 요구가 명확하다: **같은 제품이라도 기본 / B2B / 서비스별 / 판매자모집 가격이 달라질 수 있다.** 그런데 현재 가격 구조는 **"Product 중심 단일가 + 분산 가격 제거"** 로 **동결**돼 있다. 제품 목록 action(B2B/서비스/모집)을 붙이기 전에 **가격이 어디에 붙는지**를 정하지 않으면, 나중에 전부 뒤집어야 한다.

## 2. 현재 상태 (근거)

- **동결 철학** (`20260228200001-NeturePriceArchitectureFreeze`): "Product 중심 B2B 가격 구조 확립 — Listing/Channel 분산 가격 컬럼 제거." `organization_product_listings.retail_price`, `organization_product_channels.channel_price` **삭제**됨.
- **현 가격 위치**:
  - `SupplierProductOffer.priceGeneral`(기본=B2B 공급가, **주문 적용**) + `priceGold`/`pricePlatinum`(참조, 주문 미적용) + `consumerReferencePrice`.
  - `OrganizationProductListing.price` / `event_price`(numeric 12,2, **org별 override** — 나중에 추가됨, 이벤트/마켓트라이얼용).
- **주문 가격**: `checkout.service.ts` `OrderItem.unitPrice` 를 **호출자(cart/listing resolver)가 결정**. 현재 우선순위: OPL.price(있으면) → offer.priceGeneral.
- **서비스별/판매자모집별 가격 필드 = 없음.** 차등은 현재 **org별 OPL.price** 로만 가능(공급자가 사전 설정 불가, 매장/운영자가 org 단위로 설정).

## 3. 옵션

### 옵션 A — freeze 유지 (OPL per-org override 로만)
- 서비스/모집 가격 차등을 **org별 OPL.price** 로 흡수. 공급자는 기본가만, 차등은 운영자/매장이 org 단위로 입력.
- 장점: **스키마 변경 0, freeze 정합, 주문 resolver 변경 없음.** 단점: 공급자가 "서비스별/모집별 가격"을 **사전 설정 불가**(요구 미충족). 동일 서비스 내 모든 매장에 같은 차등을 주려면 매장마다 반복 입력.

### 옵션 B — offer 다중가 (서비스별 가격 필드/맵)
- `offer` 에 serviceKey→price 맵 또는 컬럼 추가. 공급자가 서비스별 가격 직접 설정.
- 장점: 공급자 사전 설정 가능. 단점: **freeze 가 제거한 분산 가격을 offer 로 재도입** — 동결 철학 정면 위반, 주문 resolver 복잡(서비스 context 필요), 모집/B2B 까지 확장 시 컬럼 폭증.

### 옵션 C — 통제된 가격 override 사이드 테이블 (권장, 단 freeze 개정)
- 신규 `offer_channel_prices`(offer_id, target_type[`base`|`b2b`|`service`|`recruitment`], target_key[serviceKey/recruitmentId/null], price, 감사필드). `offer.priceGeneral` = SSOT 기본가, 사이드 테이블 = 명시적 override.
- 주문 resolver 우선순위 명문화: **recruitment > service > b2b > base(priceGeneral)** (+ OPL.price/event_price 는 org/이벤트 최종 override 로 유지).
- 장점: 공급자 사전 차등 설정 가능, 분산을 **단일 통제 테이블**로 제한(freeze 의 "분산 금지"를 "통제된 단일 출처"로 개정), 감사 가능. 단점: **freeze 개정 WO 필요**, resolver 변경, 복잡도 증가.

## 4. 권고

- **차등 요구가 "서비스/모집 단위로 공급자가 사전 설정"이어야 한다면 → 옵션 C** (단, freeze 개정 명시 승인 필수).
- **차등이 "org/매장 단위"로 충분하다면 → 옵션 A** (변경 0, 가장 안전).
- **옵션 B 는 비권장** (freeze 가 의도적으로 제거한 분산 가격을 컬럼으로 재도입 — 가장 충돌).

→ 핵심 확인 질문: **"서비스별/모집별 가격"을 공급자가 사전에 정하는가(=C), 아니면 매장/운영자가 org별로 정하는가(=A)?** 이 한 가지로 갈린다.

## 5. 결정 후 영향 (구현 WO 예고)
- C 채택: `WO-NETURE-PRICE-ARCHITECTURE-FREEZE-AMEND-V1`(동결 개정) → `WO-O4O-SUPPLIER-PRODUCT-CHANNEL-PRICING-V1`(사이드 테이블 + resolver + UI).
- A 채택: 가격 신규 WO 불요 — 제품 목록 action 정비만 진행(저위험).

## 6. 비목표 / 제약
- 본 IR 무변경. `checkout.service` OrderItem.unitPrice 계약·OPL price/event_price 의미 변경 금지. **가격 구조 변경은 freeze 개정 WO + 승인 없이는 금지.**

## 7. 결정 필요
> **① 차등 가격을 공급자 사전 설정(서비스/모집별)으로 둘지, org별 OPL override 로 둘지. ② 전자면 freeze 개정(옵션 C)을 승인할지.** (권고: 사전 설정 필요 시 C+freeze 개정, 아니면 A)

---

*Date: 2026-06-15 · Policy IR · 차등 가격 vs 가격 동결(분산 제거) 충돌. A(OPL org override 유지) / B(offer 다중가, 비권장) / C(통제된 사이드 테이블+freeze 개정, 권고). 핵심 분기: 공급자 사전 설정 여부. 코드 무변경, freeze 개정은 별도 승인 필요.*
