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
> **확정 근거 5건** (코드 정적 분석으로 100%):
>
> 1. **Write-site SSOT**: `apps/api-server/src/utils/auto-listing.utils.ts` 의 4개 함수 모두 `INSERT..
> 2. **Migration policy**: `20260411300000-NormalizeKpaServiceKeys.ts` line 6-8 명시 — *"표준 key: 'kpa-society' (organization_service_enrollments.service_code 기준)"*. 즉 **OPL.service_key 정책은 ose.service_code 와 정렬**.
> 3. **Cross-service alias 유틸**: `store-public-utils.ts:25-28` `resolveServiceKeys()` 가 **KPA 만** `['kpa', 'kpa-society']` alias 반환.
> 4. **KPA self-service patterns 와의 비대칭**: `kpa-checkout.controller.ts:373` 만 `'kpa-society'` hardcoded — KPA 매장만 다루므로 정합.
> 5.
>
> 셋 중 하나.
>
> → **fix 방향 = `'kpa-society'` → `IN ` (직전 payment hook fix 와 동일 Option β)**. backend 5 위치 (checkout 2 + store 3) 단순 literal 교체 + 정책 docstring 추가.
> 단 **production OPL 잔재 row** 확인용 사용자 직접 SQL audit 필요.

---

## 1. 조사 대상 / 도구 / 범위

### 조사 파일 (read only)

| # | 파일 | 역할 |
|---|------|------|
| 1 | — | — |
| 2 | — | — |
| 3 | — | payment hook (직전 a0c6dc5d2 fix) |
| 4 | `apps/api-server/src/utils/auto-listing.utils.ts` | OPL **write site SSOT** (4 함수) |
| 5 | `apps/api-server/src/database/migrations/20260411300000-NormalizeKpaServiceKeys.ts` | KPA OPL normalize migration (정책 SSOT) |
| 6 | `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` | `resolveServiceKeys()` cross-service alias 유틸 |
| 7 | `apps/api-server/src/constants/service-keys.ts` | SERVICE_KEYS SSOT (KPA / KPA_SOCIETY / *_EVENT_OFFER) |
| 8 | `apps/api-server/src/constants/event-offer-service-mapping.ts` | target → event-offer key mapping |
| 9 | `apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts` | **KPA reference pattern** |
| 10 | `apps/api-server/src/routes/kpa/services/event-offer.service.ts` | KPA Event Offer service ($1 parameterized) |
| 11 | `apps/api-server/src/routes/platform/store-tablet.routes.ts` | platform OPL 사용 |
| 12 | `apps/api-server/src/routes/neture/controllers/supplier-event-offer-proposals.controller.ts` | Neture supplier-side OPL 조회 (ANY($2::text[])) |

### 비조사 영역 (범위 외 — 본 IR 명시 제외)

- production DB SELECT 직접 실행 — Cloud SQL 접속 제한으로 본 환경 미수행. 사후 사용자 직접 audit 후보 SQL 만 제시 (§ 7).
- frontend — OPL serviceKey 는 backend-only literal.
- KPA `kpa-groupbuy` Event Offer 의 사용 정합성
- (별도 메뉴/UI IR — 본 IR 과 영역 분리).

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
- `'k-cosmetics'` (K-Cosmetics 매장)
- `'neture'` (Neture)

### 3.3 결정적 추론

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

## 5. Service Key SSOT 매트릭스

### 5.1 `SERVICE_KEYS` SSOT (constants/service-keys.ts)

| Tier | Key | Code value | 용도 |
|------|-----|-----------|------|
| Product-level | KPA | `'kpa'` | KPA legacy product 도메인 (NormalizeKpaServiceKeys 후 OPL/PA 에서는 사용 안 함) |
| Product-level | KPA_GROUPBUY | `'kpa-groupbuy'` | KPA 공동구매 (Event Offer) |
| Product-level | COSMETICS | `'cosmetics'` | K-Cos legacy alias |
| Event Offer | EVENT_OFFER_NETURE | `'neture-event-offer'` | Neture 직접 Event Offer |
| Event Offer | K_COSMETICS_EVENT_OFFER | `'k-cosmetics-event-offer'` | K-Cos Event Offer flow |
| Platform-level | KPA_SOCIETY | `'kpa-society'` | **KPA Society 매장 listing** (NormalizeKpaServiceKeys 후 표준) |
| Platform-level | K_COSMETICS | `'k-cosmetics'` | K-Cos 매장 |
| Platform-level | NETURE | `'neture'` | Neture |

### 5.2 Target → Event Offer mapping (`constants/event-offer-service-mapping.ts`)

| Target service (매장) | Event Offer service (OPL row of EO flow) |
|----------------------|-------------------------------------------|
| KPA_SOCIETY (`'kpa-society'`) | KPA_GROUPBUY (`'kpa-groupbuy'`) |
| K_COSMETICS (`'k-cosmetics'`) | K_COSMETICS_EVENT_OFFER (`'k-cosmetics-event-offer'`) |

→ payment hook fix 의 `IN ` 는 이 SSOT 와 정합.

### 5.3 Cross-service alias 정책 (`store-public-utils.ts:25-28`)

```typescript
export function resolveServiceKeys(serviceKey: string): string[] {
  if (serviceKey === 'kpa') return ['kpa', 'kpa-society'];  // KPA 만 historical alias
  return [serviceKey];                                       // 다른 서비스는 단일 키
}
```

KPA 와 같은 alias 정책 없음.

### 5.4 서비스별 OPL service_key 사용 매트릭스

| 서비스 | Write site value (ose.service_code) | Read site value (정합) | Read site 잔재 (drift) |
|-------|-------------------------------------|------------------------|------------------------|
| **KPA** | `'kpa-society'` (NormalizeKpaServiceKeys 후) | `'kpa-society'` (kpa-checkout self) / `$1` (event-offer reusable) | (NormalizeKpaServiceKeys 가 `'kpa'` → `'kpa-society'` 정리 완료) |
| **K-Cosmetics** | OPL 미사용 (cosmetics 스키마 `cosmetics_products` 별도) | N/A | (해당 없음) |
| **Neture** | (supplier-side, OPL 의 supplier_product_offers 통한 간접 사용) | `ANY($2::text[])` parameterized | (해당 없음) |

---

## 6. Production 영향 시나리오 분석

### 6.1 가능한 production 상태

- **production 영향 가장 큼**

**시나리오 B** — 모두 `'kpa-society'` (잔재 상태)
- 과거 KPA copy 시 OPL.service_key 까지 'kpa-society' 로 잘못 저장 (또는 ose.service_code 가 historically 'kpa-society' 였음)
- 결과: 현재 controller 는 정상 작동하지만 SERVICE_KEYS SSOT 와 모순.

**시나리오 C** — 혼재 (`'kpa-society'` 양쪽 row 존재)
- 데이터 정합 위반. 일부 매장만 동작, 일부 매장 storefront empty.

### 6.2 실제 시나리오 추정 단서

`a0c6dc5d2` payment hook fix IR 의 발견:

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
  'k-cosmetics', 'k-cosmetics-event-offer', 'kpa-groupbuy',
  'neture', 'neture-event-offer'
)
GROUP BY service_key
ORDER BY listing_count DESC;
```
**판정 기준**: SSOT 외 값 → 잔재 또는 미정의 서비스. legacy `'kpa'` 잔재 발견 시 NormalizeKpaServiceKeys 누락 검토.

> **주의**: 이번 IR 본문에서는 위 SQL 을 실행하지 않았다 (Cloud SQL 접속 제한 — audit 시점에 확인됨). 직접 실행 채널은 사용자 환경 또는 Cloud Console Query Editor 권장.

---

## 8. 위험도 분류

| 영역 | 위험 | 메커니즘 | 등급 |
|------|------|----------|:----:|
| Cross-service leakage | — | 가능성 낮음 — UNIQUE PK `(organization_id, service_key, offer_id)` + organization_id filter | **LOW** |
| SSOT 위반 / 코드 일관성 | hardcoded literal — `SERVICE_KEYS` 상수 미사용 | maintainability + 재발 가능성 | **MEDIUM** |
| 정책 주석 drift (store.controller.ts:38) | WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1 정의 자체에 잔재 | 정책-구현 동시 drift, 검토 시 잘못된 정보 | **MEDIUM** |

**종합 위험**: **HIGH (CRITICAL 후보)** — production 시나리오에 따라 결제 검증 정책 무력화 가능 영역.

---

## 9. 후속 작업 권장안

### 9.1 즉시 권장 WO

#### (HIGH 우선)

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

- 또는 시나리오 A 일 경우: 조치 불필요 (코드 정렬만으로 회복)

### 9.5 조치 불필요 후보 (가능성 낮음)

본 IR 의 5 evidence 가 만장일치로 코드 잔재 — 조치 불필요 시나리오는 없음.

### 9.6 후속 작업 우선순위

| 순서 | 작업 | 우선 |
|:---:|------|:----:|
| 1 | IR-O4O-OPL-SERVICEKEY-PRODUCTION-DATA-AUDIT-V1 (사용자 직접 SQL) | HIGH |
| 2 | (5 위치 literal 교체) | HIGH |
| 3 | (조건부) WO-O4O-OPL-SERVICEKEY-RESIDUE-DATA-MIGRATION-V1 | audit 결과에 따라 |
| 4 | WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1 (재발 방지) | MEDIUM |
| 5 | (별도) (soft check 구조 검토) | MEDIUM |

---

## 10. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 적용 | 판정 |
|------|------|------|
| **serviceKey 는 서비스 경계 핵심 식별자** | — | ❌ **CONFLICT** |
| **Store capability 는 공통화, 서비스별 데이터 scope 는 혼동 금지** | OPL 자체는 공통 capability (organization_product_listings). 서비스별 scope filter (service_key) 의 정합성이 책임. → 본 잔재는 scope filter drift | ❌ **CONFLICT** |
| **결제/주문/상품 노출/판매제한은 silent failure 허용 금지** | checkout PRIVATE 검증 + channel mapping 검증 + storefront 노출 + sales_limit 모두 silent skip 가능 영역 | ❌ **CONFLICT** (CRITICAL) |
| **명시적 설계 근거 없이 cross-service literal 사용 금지** | `resolveServiceKeys` 같은 alias 유틸도 KPA-only | ❌ **CONFLICT** |
| **Boundary Policy (F6, CLAUDE.md §7)** Domain Primary Boundary 필터 필수 | OPL 의 service_key 가 Domain Primary Boundary 의 한 축 — 잘못된 literal = boundary filter 무효화 | ❌ **CONFLICT** |
| **NormalizeKpaServiceKeys 정책 (2026-04-11)** OPL.service_key = ose.service_code | KPA copy 시 정책 적용 누락 | ❌ **CONFLICT** |
| **a0c6dc5d2 (payment hook fix) 정합** | — | ❌ **CONFLICT** |
| **1인 개발 속도 / 최소 수정** | fix 범위 = 5 위치 literal 교체 + 정책 주석 1 위치. 단순 mechanical | ✅ 정렬 비용 작음 |
| **Twin Axis (KPA reference)** | KPA self-service 패턴은 정합. | ✅ Twin Axis 유지 가능 |

### 종합 판정 (Philosophy Conflict)

**다중 CONFLICT (HIGH)** — 경계 / silent failure / 정책 / 정합성 4개 차원 동시 위반. 정렬 비용은 작음 (5 위치 literal 교체).

### 최소 수정 방향

§ 9.1 단독 + § 9.2 사용자 SQL audit 병행.

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

> **상태**: read-only 조사 완료. 판정 = **NEEDS WORK — HIGH risk**. 직전 a0c6dc5d2 payment hook fix 와 동일 패턴 (Option β: `IN `). production 영향은 시나리오 A/B/C 중 사용자 SQL audit 으로 확정. fix 비용은 5 위치 literal 교체 + 정책 주석 1 위치 — 단순 mechanical.
