# IR-O4O-ORGANIZATION-PRODUCT-LISTINGS-SERVICEKEY-CROSSSERVICE-AUDIT-V1

**작성 일자**: 2026-05-31
**조사 환경**: HEAD (main) `a0c6dc5d2` 시점 정적 코드 (read-only)
**조사 도구**: Read / Grep / Glob
**작업 성격**: read-only 조사 — 코드 / DB / migration / seed / route / menu / guard / 결제 로직 수정 없음
**선행 IR/WO 체인**: cafe2aa31 → 8ccb79f55 → 95077c7b7 → 682ac6a85 → 05d73d661 → e3a458780 → 7efa1d2f9 → **a0c6dc5d2 (payment hook 'kpa' 잔재 fix)**

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **판정: NEEDS WORK — HIGH risk. 즉시 WO 필요.**
>
> `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts:379, 413` 및 `store.controller.ts:38(주석), 116, 153, 271` 의 hardcoded `opl.service_key = 'kpa-society'` 는 **의도된 shared registry 가 아니라 KPA copy 잔재** 다. **확정 근거 5건** (코드 정적 분석으로 100%):
>
> 1. **Write-site SSOT**: `apps/api-server/src/utils/auto-listing.utils.ts` 의 4개 함수 모두 `INSERT ... service_key = ose.service_code` (또는 함수 인자) 사용 — GlycoPharm 매장 등록 시 `ose.service_code = 'glycopharm'` → **OPL.service_key 는 항상 `'glycopharm'`** 으로 저장.
> 2. **Migration policy**: `20260411300000-NormalizeKpaServiceKeys.ts` line 6-8 명시 — *"표준 key: 'kpa-society' (organization_service_enrollments.service_code 기준)"*. 즉 **OPL.service_key 정책은 ose.service_code 와 정렬**.
> 3. **Cross-service alias 유틸**: `store-public-utils.ts:25-28` `resolveServiceKeys()` 가 **KPA 만** `['kpa', 'kpa-society']` alias 반환. 다른 서비스는 단일 키만 반환 — 즉 **GlycoPharm 의 OPL.service_key 는 platform 합의상 단일 `'glycopharm'`**.
> 4. **KPA self-service patterns 와의 비대칭**: `kpa-checkout.controller.ts:373` 만 `'kpa-society'` hardcoded — KPA 매장만 다루므로 정합. GlycoPharm controller 는 KPA copy 시 literal 도 같이 복사된 잔재.
> 5. **직전 fix (`a0c6dc5d2`) 와의 모순**: payment hook 은 `IN ('glycopharm', 'glycopharm-event-offer')` 로 정렬했는데 같은 GlycoPharm domain 의 checkout/storefront 는 `'kpa-society'` — 동일 거래 흐름에서 두 다른 serviceKey 로 OPL 조회 = 100% silent failure.
>
> **GlycoPharm checkout/storefront 가 production 에서 작동했다면**: ① 잘못된 historical 'kpa-society' OPL row 가 GlycoPharm 매장에 존재 (NormalizeKpaServiceKeys 후 잔존), 또는 ② GlycoPharm 매장이 production 에 거의 없음, 또는 ③ B2C 채널 등 다른 게이트가 항상 0 rows 만들어 영향 은폐. 셋 중 하나.
>
> → **fix 방향 = `'kpa-society'` → `IN ('glycopharm', 'glycopharm-event-offer')` (직전 payment hook fix 와 동일 Option β)**. backend 5 위치 (checkout 2 + store 3) 단순 literal 교체 + 정책 docstring 추가.
> 단 **production OPL 잔재 row** (잘못 저장된 'kpa-society' GlycoPharm row) 확인용 사용자 직접 SQL audit 필요.

---

## 1. 조사 대상 / 도구 / 범위

### 조사 파일 (read only)

| # | 파일 | 역할 |
|---|------|------|
| 1 | `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts` | **GlycoPharm checkout — Distribution + Channel mapping check** |
| 2 | `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts` | **GlycoPharm storefront — Visibility Gate 4중** |
| 3 | `apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts` | payment hook (직전 a0c6dc5d2 fix) |
| 4 | `apps/api-server/src/utils/auto-listing.utils.ts` | OPL **write site SSOT** (4 함수) |
| 5 | `apps/api-server/src/database/migrations/20260411300000-NormalizeKpaServiceKeys.ts` | KPA OPL normalize migration (정책 SSOT) |
| 6 | `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` | `resolveServiceKeys()` cross-service alias 유틸 |
| 7 | `apps/api-server/src/constants/service-keys.ts` | SERVICE_KEYS SSOT (KPA / GLYCOPHARM / KPA_SOCIETY / *_EVENT_OFFER) |
| 8 | `apps/api-server/src/constants/event-offer-service-mapping.ts` | target → event-offer key mapping |
| 9 | `apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts` | **KPA reference pattern** |
| 10 | `apps/api-server/src/routes/kpa/services/event-offer.service.ts` | KPA Event Offer service ($1 parameterized) |
| 11 | `apps/api-server/src/routes/platform/store-tablet.routes.ts` | platform OPL 사용 |
| 12 | `apps/api-server/src/routes/neture/controllers/supplier-event-offer-proposals.controller.ts` | Neture supplier-side OPL 조회 (ANY($2::text[])) |

### 비조사 영역 (범위 외 — 본 IR 명시 제외)

- production DB SELECT 직접 실행 — Cloud SQL 접속 제한으로 본 환경 미수행. 사후 사용자 직접 audit 후보 SQL 만 제시 (§ 7).
- frontend (web-glycopharm / web-kpa-society / web-k-cosmetics / web-neture) — OPL serviceKey 는 backend-only literal.
- KPA `kpa-groupbuy` Event Offer 의 사용 정합성 (별도 IR — 본 IR 은 GlycoPharm 잔재 audit).
- IR-O4O-GLYCOPHARM-STORE-HUB-PRODUCT-CATALOG-ALIGNMENT-AUDIT-V1 (별도 메뉴/UI IR — 본 IR 과 영역 분리).

---

## 2. 의심 패턴 — GlycoPharm `'kpa-society'` literal 5 위치

### 2.1 `checkout.controller.ts:379` — PRIVATE distribution policy check (line 371-393)

WO-O4O-DISTRIBUTION-GAP-HARDENING-V1 의 PRIVATE 제품 검증:

```typescript
const privateDistProducts = await dataSource.query(
  `SELECT opl.offer_id::text AS product_id, spo.allowed_seller_ids
   FROM organization_product_listings opl
   JOIN supplier_product_offers spo ON spo.id = opl.offer_id
   WHERE opl.organization_id = $1
     AND opl.service_key = 'kpa-society'          -- ← HARDCODED 잔재
     AND opl.offer_id::text = ANY($2::text[])
     AND spo.distribution_type = 'PRIVATE'`,
  [pharmacy.id, productIds]
);
```

**영향**: GlycoPharm 매장 OPL 이 `'glycopharm'` 으로 저장된 경우 → 0 rows → `privateDistProducts` 0 → for 루프 미실행 → `allowed_seller_ids` 검증 **silent skip** → **PRIVATE 제품의 비허가 판매 차단 무력화 가능성**.

### 2.2 `checkout.controller.ts:413` — Channel mapping check (Phase D, line 398-431)

```typescript
const channelMappings = await dataSource.query(
  `SELECT opl.id AS product_listing_id, opl.offer_id::text AS product_id, opc.sales_limit
   FROM organization_product_channels opc
   JOIN organization_product_listings opl ON opl.id = opc.product_listing_id
   JOIN organization_channels oc ON oc.id = opc.channel_id
   WHERE opc.channel_id = $1
     AND opl.organization_id = $2
     AND opl.service_key = 'kpa-society'          -- ← HARDCODED 잔재
     AND opl.is_active = true
     AND opc.is_active = true
     AND oc.status = 'APPROVED'`,
  [b2cChannelId, pharmacy.id]
);

// Soft check: only enforce if mappings exist for this channel
if (channelMappings.length > 0) {                 // ← 0 rows → 검증 skip
  const mappedProductIds = new Set(channelMappings.map((m) => m.product_id));
  const unmappedProducts = productIds.filter((pid) => !mappedProductIds.has(pid));
  if (unmappedProducts.length > 0) { ... }        // PRODUCT_NOT_IN_CHANNEL 차단
}
```

**영향**: 0 rows → **모든 상품 검증 skip** (soft check) → 채널 미허가 상품 결제 차단 무력화 가능성. 또한 sales_limit 정보 누락.

### 2.3 `store.controller.ts:108-128` — Visibility Gate count (storefront 상품 총 개수)

```typescript
SELECT COUNT(DISTINCT spo.id)::int AS count
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers s ON s.id = spo.supplier_id
INNER JOIN organization_product_listings opl
  ON opl.offer_id = spo.id
  AND opl.organization_id = $1
  AND opl.service_key = 'kpa-society'             -- ← HARDCODED 잔재
  AND opl.is_active = true
INNER JOIN organization_product_channels opc ...
INNER JOIN organization_channels oc ...
```

**영향**: 0 rows → totalCount 0 → **storefront pagination meta 도 0** → 상품 한 개도 표시 안 됨.

### 2.4 `store.controller.ts:133-167` — Visibility Gate data (storefront 상품 목록 본문)

위 count 와 동일 구조 (INNER JOIN OPL on `service_key = 'kpa-society'`). 0 rows → **empty list**.

### 2.5 `store.controller.ts:263-285` — Categories

위 동일 구조. 0 rows → **카테고리 목록 빈 결과** → 카테고리 탭 미표시.

### 2.6 `store.controller.ts:38` — 파일 헤더 주석 (문서적 정의)

```typescript
// 노출 필수 조건:
// 1. organization_channels.status = 'APPROVED' AND channel_type = 'B2C'
// 2. organization_product_listings.is_active = true AND service_key = 'kpa-society'  ← 주석에도 잔재
// 3. organization_product_channels.is_active = true
// 4. supplier_product_offers.is_active = true AND neture_suppliers.status = 'ACTIVE'
```

WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1 의 4중 게이트 정의 — 정책 주석 자체가 GlycoPharm 영역에 KPA literal 을 명시. **정책-구현 동시 drift**.

---

## 3. Write Site SSOT — OPL.service_key 는 항상 `ose.service_code` 기준

### 3.1 `auto-listing.utils.ts` 4 함수 (모든 OPL INSERT 경로)

| 함수 | 호출 시점 | service_key 출처 |
|------|----------|------------------|
| `autoExpandPublicProduct(executor, offerId, masterId)` | PUBLIC Offer 승인 시 모든 활성 조직에 listing 자동 생성 | `ose.service_code` (line 40) |
| `autoExpandServiceProduct(executor, offerId, masterId, approvedServiceKeys)` | SERVICE Offer 승인 시 승인된 service 만 | `ose.service_code` + `ANY($3)` filter (line 87, 96) |
| `autoListPublicProductsForOrg(dataSource, organizationId, serviceKey)` | 신규 조직 생성 시 모든 APPROVED PUBLIC | 함수 인자 `serviceKey` (line 121) |
| `autoListServiceProductsForOrg(dataSource, organizationId, serviceKey)` | 신규 조직 생성 시 해당 서비스 SERVICE Offer | 함수 인자 `serviceKey` (line 167) |

**모든 INSERT 의 UNIQUE 키**: `(organization_id, service_key, offer_id)` — service_key 가 PK 일부.

### 3.2 organization_service_enrollments (ose) → OPL.service_key 매핑

ose.service_code 가능 값 (확인된 것):
- `'kpa-society'` (KPA Society 매장)
- `'glycopharm'` (GlycoPharm 매장 — `store-network.service.ts:200`, `glycopharm-member.service.ts`, `2026020500002-SeedPlatformServices.ts:22` 등 12+ 위치 일관)
- `'k-cosmetics'` (K-Cosmetics 매장)
- `'neture'` (Neture)

### 3.3 결정적 추론

GlycoPharm 매장 → `ose.service_code = 'glycopharm'` → **`auto*ListingUtils` 가 OPL.service_key 에 항상 `'glycopharm'` 저장** → GlycoPharm OPL row 는 `'glycopharm'` 으로 존재.

→ GlycoPharm controller 의 `'kpa-society'` literal 은 **존재하지 않는 row 를 조회**.

---

## 4. KPA Reference Pattern — Hardcoded `'kpa-society'` 의 정합 vs 비정합

### 4.1 KPA self-service controller — Hardcoded 정합

`apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts:373`:
```sql
WHERE opc.channel_id = $1
  AND opl.organization_id = $2
  AND opl.service_key = 'kpa-society'  -- ← KPA controller 이므로 정합
  AND opl.is_active = true
```

KPA self-service controller 는 KPA 매장만 다루므로 (ose.service_code = 'kpa-society') hardcoded 가 **정합**.

### 4.2 KPA cross-service / reusable — Parameterized

| 파일 | 위치 | 패턴 |
|------|------|------|
| `routes/kpa/services/event-offer.service.ts` | line 140, 147, 225, 256, 330, 499, 564, 1213, 1258, 1286 | `opl.service_key = $1` (또는 $2) — 모두 parameterized |
| `routes/kpa/controllers/event-offer-operator.controller.ts:209` | parameterized $1 |
| `routes/kpa/controllers/supplier-offers.controller.ts:148, 204` | parameterized $2 |

→ **KPA 의 코드 컨벤션**: self-service hardcoded, reusable/cross-service parameterized.

### 4.3 Platform / Neture cross-service — Parameterized `ANY(text[])`

| 파일 | 위치 | 패턴 |
|------|------|------|
| `routes/platform/store-public/store-public-utils.ts:162, 199` | `opl.service_key = ANY($2::text[])` |
| `routes/platform/store-public/store-public-utils.ts:294, 330` | `opl.service_key = $2` |
| `routes/platform/store-public/store-public-product.handler.ts:148` | `ANY($2::text[])` |
| `routes/neture/controllers/supplier-event-offer-proposals.controller.ts:270` | `ANY($2::text[])` |

→ Platform / Neture 는 모두 dynamic. `resolveServiceKeys(serviceKey)` 결과를 `ANY($2::text[])` 로 전달.

### 4.4 비대칭 — GlycoPharm 만 hardcoded 잘못된 literal

| 서비스 | self-service controller | hardcoded? | 정합? |
|--------|------------------------|:---------:|:----:|
| KPA | `kpa-checkout.controller.ts:373` | ✅ `'kpa-society'` | ✅ KPA 매장 |
| **GlycoPharm checkout** | `checkout.controller.ts:379, 413` | ✅ **`'kpa-society'`** | ❌ **GlycoPharm 매장에 KPA literal** |
| **GlycoPharm storefront** | `store.controller.ts:116, 153, 271` | ✅ **`'kpa-society'`** | ❌ 동일 |
| GlycoPharm payment hook (직전 fix) | `GlycopharmPaymentEventHandler.ts:215` | ✅ `IN ('glycopharm', 'glycopharm-event-offer')` | ✅ |
| K-Cosmetics | (OPL 미사용 — 별도 `cosmetics.cosmetics_products` 스키마) | N/A | N/A |
| Neture | parameterized only | N/A | ✅ |

→ **GlycoPharm checkout/storefront 만 KPA copy 잔재**. 동일 GlycoPharm 도메인 안에서 **payment hook 은 `'glycopharm'` 기준 / checkout+store 는 `'kpa-society'` 기준** — 100% silent failure 패턴.

---

## 5. Service Key SSOT 매트릭스

### 5.1 `SERVICE_KEYS` SSOT (constants/service-keys.ts)

| Tier | Key | Code value | 용도 |
|------|-----|-----------|------|
| Product-level | KPA | `'kpa'` | KPA legacy product 도메인 (NormalizeKpaServiceKeys 후 OPL/PA 에서는 사용 안 함) |
| Product-level | KPA_GROUPBUY | `'kpa-groupbuy'` | KPA 공동구매 (Event Offer) |
| Product-level | COSMETICS | `'cosmetics'` | K-Cos legacy alias |
| Product-level | GLYCOPHARM | `'glycopharm'` | **GlycoPharm 매장 listing** |
| Event Offer | EVENT_OFFER_NETURE | `'neture-event-offer'` | Neture 직접 Event Offer |
| Event Offer | K_COSMETICS_EVENT_OFFER | `'k-cosmetics-event-offer'` | K-Cos Event Offer flow |
| Event Offer | GLYCOPHARM_EVENT_OFFER | `'glycopharm-event-offer'` | **GlycoPharm Event Offer flow** |
| Platform-level | KPA_SOCIETY | `'kpa-society'` | **KPA Society 매장 listing** (NormalizeKpaServiceKeys 후 표준) |
| Platform-level | K_COSMETICS | `'k-cosmetics'` | K-Cos 매장 |
| Platform-level | NETURE | `'neture'` | Neture |

### 5.2 Target → Event Offer mapping (`constants/event-offer-service-mapping.ts`)

| Target service (매장) | Event Offer service (OPL row of EO flow) |
|----------------------|-------------------------------------------|
| KPA_SOCIETY (`'kpa-society'`) | KPA_GROUPBUY (`'kpa-groupbuy'`) |
| K_COSMETICS (`'k-cosmetics'`) | K_COSMETICS_EVENT_OFFER (`'k-cosmetics-event-offer'`) |
| **GLYCOPHARM (`'glycopharm'`)** | **GLYCOPHARM_EVENT_OFFER (`'glycopharm-event-offer'`)** |

→ payment hook fix 의 `IN ('glycopharm', 'glycopharm-event-offer')` 는 이 SSOT 와 정합.

### 5.3 Cross-service alias 정책 (`store-public-utils.ts:25-28`)

```typescript
export function resolveServiceKeys(serviceKey: string): string[] {
  if (serviceKey === 'kpa') return ['kpa', 'kpa-society'];  // KPA 만 historical alias
  return [serviceKey];                                       // 다른 서비스는 단일 키
}
```

→ **GlycoPharm 의 OPL serviceKey 는 platform 합의상 단일 `'glycopharm'`**. KPA 와 같은 alias 정책 없음.

### 5.4 서비스별 OPL service_key 사용 매트릭스

| 서비스 | Write site value (ose.service_code) | Read site value (정합) | Read site 잔재 (drift) |
|-------|-------------------------------------|------------------------|------------------------|
| **KPA** | `'kpa-society'` (NormalizeKpaServiceKeys 후) | `'kpa-society'` (kpa-checkout self) / `$1` (event-offer reusable) | (NormalizeKpaServiceKeys 가 `'kpa'` → `'kpa-society'` 정리 완료) |
| **GlycoPharm** | `'glycopharm'` (auto-listing.utils + ose) | `'glycopharm'` / `'glycopharm-event-offer'` (payment hook a0c6dc5d2) | **`'kpa-society'` (checkout.379, 413 / store.116, 153, 271 / store.38 주석)** |
| **K-Cosmetics** | OPL 미사용 (cosmetics 스키마 `cosmetics_products` 별도) | N/A | (해당 없음) |
| **Neture** | (supplier-side, OPL 의 supplier_product_offers 통한 간접 사용) | `ANY($2::text[])` parameterized | (해당 없음) |

---

## 6. Production 영향 시나리오 분석

### 6.1 가능한 production 상태

GlycoPharm production OPL row 의 service_key 분포 (SQL audit 미수행) 3 후보:

**시나리오 A** — 모두 `'glycopharm'` (이론적 정합 상태)
- write site (auto-listing.utils) 가 항상 ose.service_code = 'glycopharm' 저장
- 결과: GlycoPharm controller (kpa-society 조회) 가 항상 0 rows → **storefront 항상 empty / checkout PRIVATE+channel check silent skip**
- **production 영향 가장 큼**

**시나리오 B** — 모두 `'kpa-society'` (잔재 상태)
- 과거 KPA copy 시 OPL.service_key 까지 'kpa-society' 로 잘못 저장 (또는 ose.service_code 가 historically 'kpa-society' 였음)
- 결과: 현재 controller 는 정상 작동하지만 SERVICE_KEYS SSOT 와 모순. 새 GlycoPharm 매장 (현재 ose.service_code = 'glycopharm') 등록 시 OPL 은 `'glycopharm'` 으로 저장 → 신규 매장만 storefront 0 rows.

**시나리오 C** — 혼재 (`'glycopharm'` + `'kpa-society'` 양쪽 row 존재)
- 데이터 정합 위반. 일부 매장만 동작, 일부 매장 storefront empty.

### 6.2 실제 시나리오 추정 단서

`a0c6dc5d2` payment hook fix IR (IR-O4O-GLYCOPHARM-PAYMENT-HOOK-SERVICEKEY-AUDIT-V1) 의 발견:
- payment hook 의 잘못된 `'kpa'` literal 은 약 50일간 silent skip — 사용자가 인지 못 한 상태 = production GlycoPharm 결제·sales_limit 영향이 isolated 또는 미발생 데이터 패턴 가능성.

추정: production 에 **GlycoPharm 매장이 거의 없거나, B2C 채널 ⊥ OPL 게이트가 항상 0 rows 만들고 있어 storefront empty 가 노출되지 않음** (시나리오 A + 사용자-facing 영향 은폐).

또는: production OPL row 가 historically `'kpa-society'` 로 저장된 잔재 — checkout/store 만 작동, payment hook 만 silent skip (시나리오 B + payment hook 만 영향).

**확정은 production SQL audit 필요**.

### 6.3 영향 매트릭스

| 흐름 | 영향 (시나리오 A) | 영향 (시나리오 B) | 영향 (시나리오 C) |
|------|--------|--------|--------|
| Storefront 상품 노출 | ❌ 빈 결과 | ✅ 정상 | ⚠️ 매장별 불균등 |
| Storefront 카테고리 | ❌ 빈 결과 | ✅ 정상 | ⚠️ 매장별 불균등 |
| Checkout PRIVATE 검증 | ⚠️ silent skip | ✅ 정상 | ⚠️ 매장별 불균등 |
| Checkout channel mapping | ⚠️ silent skip (soft) | ✅ 정상 | ⚠️ 매장별 불균등 |
| Payment hook (a0c6dc5d2) | ✅ 정상 | ❌ silent skip | ⚠️ 매장별 불균등 |
| Cross-service leakage | 가능성 낮음 (KPA OPL 은 KPA 매장 organization_id 와 결합 — UNIQUE PK 가 isolation) | 동일 | 동일 |

→ **PRIVATE 검증 silent skip + sales_limit silent skip + (시나리오 A) storefront empty 가 위험 핵심**.

---

## 7. Production SQL Audit 후보 (사용자 직접 실행 권장)

본 IR 은 read-only 정적 분석. production 데이터 분포는 사용자 직접 SQL audit 필요. Cloud SQL authorized networks 변경 / 직접 patch 금지.

### 후보 SQL 1 — 전체 OPL service_key 분포

```sql
SELECT service_key, COUNT(*) AS listing_count
FROM organization_product_listings
GROUP BY service_key
ORDER BY listing_count DESC;
```
**판정 기준**: GlycoPharm 매장 OPL 의 실제 service_key 가 어디에 분포하는지 광역 base line.

### 후보 SQL 2 — GlycoPharm active organization OPL 분포 (a0c6dc5d2 사후 audit 동일)

```sql
SELECT opl.service_key, COUNT(*) AS listing_count
FROM organization_product_listings opl
WHERE opl.organization_id IN (
  SELECT o.id
  FROM organizations o
  JOIN organization_service_enrollments ose
    ON ose.organization_id = o.id
   AND ose.service_code = 'glycopharm'
   AND ose.status = 'active'
)
GROUP BY opl.service_key
ORDER BY listing_count DESC;
```

### 후보 SQL 3 — KPA active organization OPL 분포

```sql
SELECT opl.service_key, COUNT(*) AS listing_count
FROM organization_product_listings opl
WHERE opl.organization_id IN (
  SELECT o.id
  FROM organizations o
  JOIN organization_service_enrollments ose
    ON ose.organization_id = o.id
   AND ose.service_code = 'kpa-society'
   AND ose.status = 'active'
)
GROUP BY opl.service_key
ORDER BY listing_count DESC;
```

### 후보 SQL 4 — K-Cosmetics active organization OPL 분포 (예상: 0 rows)

```sql
SELECT opl.service_key, COUNT(*) AS listing_count
FROM organization_product_listings opl
WHERE opl.organization_id IN (
  SELECT o.id
  FROM organizations o
  JOIN organization_service_enrollments ose
    ON ose.organization_id = o.id
   AND ose.service_code = 'k-cosmetics'
   AND ose.status = 'active'
)
GROUP BY opl.service_key
ORDER BY listing_count DESC;
```

### 후보 SQL 5 — service_key 누락/예상 외 값

```sql
SELECT service_key, COUNT(*) AS listing_count
FROM organization_product_listings
WHERE service_key NOT IN (
  'kpa-society', 'glycopharm', 'glycopharm-event-offer',
  'k-cosmetics', 'k-cosmetics-event-offer', 'kpa-groupbuy',
  'neture', 'neture-event-offer'
)
GROUP BY service_key
ORDER BY listing_count DESC;
```
**판정 기준**: SSOT 외 값 → 잔재 또는 미정의 서비스. legacy `'kpa'` 잔재 발견 시 NormalizeKpaServiceKeys 누락 검토.

> **주의**: 이번 IR 본문에서는 위 SQL 을 실행하지 않았다 (Cloud SQL 접속 제한 — IR-O4O-GLYCOPHARM-PAYMENT-HOOK-SERVICEKEY-AUDIT-V1 audit 시점에 확인됨). 직접 실행 채널은 사용자 환경 또는 Cloud Console Query Editor 권장.

---

## 8. 위험도 분류

| 영역 | 위험 | 메커니즘 | 등급 |
|------|------|----------|:----:|
| GlycoPharm storefront 상품 노출 | 매장 상품 0건 표시 (시나리오 A) | INNER JOIN OPL `'kpa-society'` → 0 rows | **HIGH** |
| GlycoPharm storefront 카테고리 | 카테고리 탭 빈 결과 (시나리오 A) | 동일 | **HIGH** |
| GlycoPharm checkout PRIVATE distribution | `allowed_seller_ids` 검증 silent skip | 0 rows → for 루프 미실행 | **HIGH** |
| GlycoPharm checkout channel mapping | 미허가 채널 상품 결제 차단 silent skip | 0 rows → `if (channelMappings.length > 0)` skip | **HIGH** |
| GlycoPharm payment hook sales_limit | a0c6dc5d2 로 fix 완료 | (해당 없음) | (FIXED) |
| Cross-service leakage | KPA OPL 이 GlycoPharm checkout 에 잘못 노출 | 가능성 낮음 — UNIQUE PK `(organization_id, service_key, offer_id)` + organization_id filter | **LOW** |
| SSOT 위반 / 코드 일관성 | hardcoded literal — `SERVICE_KEYS` 상수 미사용 | maintainability + 재발 가능성 | **MEDIUM** |
| 정책 주석 drift (store.controller.ts:38) | WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1 정의 자체에 잔재 | 정책-구현 동시 drift, 검토 시 잘못된 정보 | **MEDIUM** |

**종합 위험**: **HIGH (CRITICAL 후보)** — production 시나리오에 따라 결제 검증 정책 무력화 가능 영역.

---

## 9. 후속 작업 권장안

### 9.1 즉시 권장 WO

#### WO-O4O-GLYCOPHARM-OPL-SERVICEKEY-ALIGNMENT-V1 (HIGH 우선)

- **대상 파일 (1)**: `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts`
  - line 379, 413: `opl.service_key = 'kpa-society'` → `opl.service_key IN ('glycopharm', 'glycopharm-event-offer')` (Option β 통일)
- **대상 파일 (2)**: `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts`
  - line 116, 153, 271: 동일 교체
  - line 38: 정책 주석 정렬 ("`service_key IN ('glycopharm', 'glycopharm-event-offer')`" 명시)
- **유지**: 다른 조건 (organization_id, is_active, channel.status, B2C 등) / 직전 payment hook fix 패턴 유지
- **범위 외**:
  - migration / seed / DB 변경 / 잔재 row 데이터 정리 — 별도 WO 후보
  - SERVICE_KEYS 상수화 — 별도 WO 후보 (§ 9.3)
- **위험**: production 시나리오 A 일 경우 storefront 가 fix 후 갑자기 표시되기 시작 — 의도된 회복. PUBLIC distribution 검증 + channel mapping 검증 + sales_limit 검증 활성화. 운영자에게 사전 알림 권장.

### 9.2 후속 IR (SQL audit 우선)

#### IR-O4O-OPL-SERVICEKEY-PRODUCTION-DATA-AUDIT-V1

- § 7 의 5 SQL 사용자 직접 실행 + 결과 텍스트 첨부
- 시나리오 A/B/C 확정
- 잔재 row 발견 시 데이터 보정 WO 조건 결정

### 9.3 중기 정렬 WO (선택)

#### WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1

- **목적**: 모든 OPL serviceKey literal 을 `SERVICE_KEYS.*` 상수 import 로 교체.
- **범위**: 본 IR 식별 5 위치 + KPA hardcoded self-service 위치 + 본 분석 grep 의 모든 hardcoded literal.
- **효과**: 재발 방지, IDE refactor 가능, type-checked.

### 9.4 데이터 정리 WO (조건부)

#### WO-O4O-OPL-SERVICEKEY-RESIDUE-DATA-MIGRATION-V1 (사용자 audit 결과에 따라)

- 시나리오 B/C 일 경우: GlycoPharm 매장의 `'kpa-society'` row → `'glycopharm'` 으로 보정 migration
- 또는 시나리오 A 일 경우: 조치 불필요 (코드 정렬만으로 회복)

### 9.5 조치 불필요 후보 (가능성 낮음)

본 IR 의 5 evidence 가 만장일치로 코드 잔재 — 조치 불필요 시나리오는 없음.

### 9.6 후속 작업 우선순위

| 순서 | 작업 | 우선 |
|:---:|------|:----:|
| 1 | IR-O4O-OPL-SERVICEKEY-PRODUCTION-DATA-AUDIT-V1 (사용자 직접 SQL) | HIGH |
| 2 | WO-O4O-GLYCOPHARM-OPL-SERVICEKEY-ALIGNMENT-V1 (5 위치 literal 교체) | HIGH |
| 3 | (조건부) WO-O4O-OPL-SERVICEKEY-RESIDUE-DATA-MIGRATION-V1 | audit 결과에 따라 |
| 4 | WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1 (재발 방지) | MEDIUM |
| 5 | (별도) IR-O4O-GLYCOPHARM-CHECKOUT-CHANNEL-MAPPING-SILENT-SKIP-HARDENING-V1 (soft check 구조 검토) | MEDIUM |

---

## 10. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 적용 | 판정 |
|------|------|------|
| **serviceKey 는 서비스 경계 핵심 식별자** | GlycoPharm 코드가 KPA serviceKey 로 OPL 조회 = **서비스 경계 위반 + drift** | ❌ **CONFLICT** |
| **Store capability 는 공통화, 서비스별 데이터 scope 는 혼동 금지** | OPL 자체는 공통 capability (organization_product_listings). 서비스별 scope filter (service_key) 의 정합성이 책임. → 본 잔재는 scope filter drift | ❌ **CONFLICT** |
| **결제/주문/상품 노출/판매제한은 silent failure 허용 금지** | checkout PRIVATE 검증 + channel mapping 검증 + storefront 노출 + sales_limit 모두 silent skip 가능 영역 | ❌ **CONFLICT** (CRITICAL) |
| **KPA-GlycoPharm 유사 구조 — 서비스 경계 명확화** | KPA copy 후 hardcoded literal 교체 누락 → 경계 위반. 본 IR 의 5 위치 모두 동일 패턴 (KPA copy 잔재) | ❌ **CONFLICT** |
| **명시적 설계 근거 없이 cross-service literal 사용 금지** | `'kpa-society'` 사용 근거가 GlycoPharm 영역 어디에도 없음. `resolveServiceKeys` 같은 alias 유틸도 KPA-only | ❌ **CONFLICT** |
| **Boundary Policy (F6, CLAUDE.md §7)** Domain Primary Boundary 필터 필수 | OPL 의 service_key 가 Domain Primary Boundary 의 한 축 — 잘못된 literal = boundary filter 무효화 | ❌ **CONFLICT** |
| **NormalizeKpaServiceKeys 정책 (2026-04-11)** OPL.service_key = ose.service_code | GlycoPharm 매장 ose.service_code = 'glycopharm' → OPL 도 'glycopharm'. KPA copy 시 정책 적용 누락 | ❌ **CONFLICT** |
| **a0c6dc5d2 (payment hook fix) 정합** | payment hook 은 `IN ('glycopharm', 'glycopharm-event-offer')` 인데 같은 GlycoPharm 의 checkout+store 는 'kpa-society' — 동일 도메인 내부 inconsistency | ❌ **CONFLICT** |
| **1인 개발 속도 / 최소 수정** | fix 범위 = 5 위치 literal 교체 + 정책 주석 1 위치. 단순 mechanical | ✅ 정렬 비용 작음 |
| **Twin Axis (KPA reference)** | KPA self-service 패턴은 정합. GlycoPharm 만 정렬 (KPA 무변경) | ✅ Twin Axis 유지 가능 |

### 종합 판정 (Philosophy Conflict)

**다중 CONFLICT (HIGH)** — 경계 / silent failure / 정책 / 정합성 4개 차원 동시 위반. 정렬 비용은 작음 (5 위치 literal 교체).

### 최소 수정 방향

§ 9.1 WO-O4O-GLYCOPHARM-OPL-SERVICEKEY-ALIGNMENT-V1 단독 + § 9.2 사용자 SQL audit 병행.

### 중기 정렬 방향

- § 9.3 SERVICE_KEYS 상수화 (재발 방지)
- § 9.5 checkout 의 channel mapping soft check 를 hardening (`if (channelMappings.length === 0)` 시 명시 차단 또는 경고 로그)
- payment hook 의 silent skip 구조 (line 214 `channelMappings.length === 0 → return null`) 동일 패턴 hardening — 별도 후속

---

## 11. Working tree 격리 / commit 정책

- 조사 시작 시점 워킹트리 clean (`git status --short` empty). 직전 push 후 다른 세션 KPA dashboard 작업 정리됨.
- 본 IR 문서 1개만 생성. **read-only — 코드 / DB / migration / seed / route / menu / guard / 결제 로직 미변경.**
- commit 시 본 IR 문서 1개만 path-restricted. `git add .` 금지, `git commit -am` 금지.
- staged 파일 가드: `git diff --cached --name-only` 결과가 정확히 `docs/investigations/IR-O4O-ORGANIZATION-PRODUCT-LISTINGS-SERVICEKEY-CROSSSERVICE-AUDIT-V1.md` 1개와 일치해야만 commit 진행. 다른 파일 staged 시 즉시 `git reset HEAD` + 보고.

---

> **상태**: read-only 조사 완료. 판정 = **NEEDS WORK — HIGH risk**. 5 evidence 로 **GlycoPharm checkout/storefront 의 hardcoded `'kpa-society'` literal 이 의도된 shared registry 가 아니라 KPA copy 잔재** 확정. 직전 a0c6dc5d2 payment hook fix 와 동일 패턴 (Option β: `IN ('glycopharm', 'glycopharm-event-offer')`). production 영향은 시나리오 A/B/C 중 사용자 SQL audit 으로 확정. fix 비용은 5 위치 literal 교체 + 정책 주석 1 위치 — 단순 mechanical. 후속 = (1) IR-OPL-SERVICEKEY-PRODUCTION-DATA-AUDIT-V1 (사용자 직접 SQL) + (2) WO-GLYCOPHARM-OPL-SERVICEKEY-ALIGNMENT-V1 (5 위치 literal 교체) + (선택 조건부) 데이터 보정 / SERVICE_KEYS 상수화.
