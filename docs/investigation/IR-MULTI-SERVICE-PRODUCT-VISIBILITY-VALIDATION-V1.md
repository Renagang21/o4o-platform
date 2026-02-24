# IR-MULTI-SERVICE-PRODUCT-VISIBILITY-VALIDATION-V1

> **Multi-Service Product Visibility 정합성 검증 보고서**
> 2026-02-24

---

## 검증 목적

O4O Marketplace 구조에서 공급자 상품의 서비스별 가시성이
정책대로 정확히 작동하는지 코드 레벨 전수 검증한다.

**본 검증은 코드 수정 없이 분석 및 보고만 수행한다.**

---

## 종합 판정

```
1. Distribution Model Integrity: PASS
2. HUB Visibility Enforcement:   PASS WITH NOTES
3. Storefront Isolation:          PASS
4. Checkout Isolation:            PASS WITH NOTES
5. KPI Isolation:                 ISSUE

Scenario Simulation:
- Scenario 1 (GLOBAL):           PASS
- Scenario 2 (SELECTED):         PASS
- Scenario 3 (Multi-Service):    PASS

종합 판정: CAUTION
```

**CAUTION 사유**: KPI 집계 쿼리에서 `metadata.serviceKey` 필터 부재로
동일 store_id를 공유하는 멀티서비스 매장에서 교차 집계 가능성 존재.

---

## 1. Distribution 데이터 구조 분석

**판정: PASS**

### 1.1 제품 엔티티 구조

O4O는 서비스별 **독립 제품 테이블**을 사용한다:

| 서비스 | 테이블 | 스키마 | 가시성 컬럼 |
|--------|--------|--------|-----------|
| GlycoPharm | `glycopharm_products` | public | `status` (active/draft/inactive/discontinued) |
| Cosmetics | `cosmetics_products` | cosmetics | `status` (visible/hidden/draft/sold_out) |
| Neture | `neture_supplier_products` | neture | `is_active` + `distribution_type` |
| StoreLocal | `store_local_products` | public | `is_active` (Display Domain only) |

### 1.2 Distribution Policy (Neture 공급자)

```typescript
enum DistributionType {
  PUBLIC = 'PUBLIC',    // 모든 운영자에게 노출
  PRIVATE = 'PRIVATE',  // allowed_seller_ids 한정
}
```

| 컬럼 | 타입 | 목적 |
|------|------|------|
| `distribution_type` | ENUM (PUBLIC/PRIVATE) | 공급 범위 결정 |
| `allowed_seller_ids` | TEXT[] | PRIVATE 제품의 허용 판매자 목록 |

Migration: `20260222100000-AddDistributionPolicyToNetureSupplierProducts.ts`
Partial Index: `IDX_nsp_distribution_private` (WHERE distribution_type='PRIVATE')

### 1.3 Visibility Chain (제품 → 소비자 노출)

```
NetureSupplierProduct (공급자 카탈로그)
  ↓ distribution_type (PUBLIC/PRIVATE) 필터
OrganizationProductApplication (승인 워크플로우)
  ↓ status='approved' 필터
OrganizationProductListing (매장별 리스팅)
  ↓ service_key + is_active 필터
OrganizationProductChannel (채널 매핑)
  ↓ is_active 필터
OrganizationChannel (B2C/TABLET/SIGNAGE)
  ↓ channel_type + status='APPROVED' 필터
Storefront (소비자 노출)
```

### 1.4 Service Key 격리

`organization_product_listings.service_key` — **Primary Distribution Control**:

| service_key | 서비스 |
|-------------|--------|
| `kpa` | KPA 약국 제품 |
| `kpa-groupbuy` | 공동구매 |
| `cosmetics` | K-Cosmetics |
| `glycopharm` | GlycoPharm |

**동일 제품을 여러 service_key로 독립 리스팅 가능.**
각 리스팅은 독립된 `is_active`, 가격, 채널 매핑을 가진다.

---

## 2. HUB Visibility Enforcement 검증

**판정: PASS WITH NOTES**

### 2.1 GlycoPharm/KPA 서비스 (4-Gate Pattern)

#### B2C Storefront (`store.controller.ts`)

```
Gate 1 (Product):  p.status = 'active'
Gate 2 (Listing):  opl.is_active = true AND opl.service_key = 'kpa'
Gate 3 (Channel):  opc.is_active = true
Gate 4 (Approval): oc.channel_type = 'B2C' AND oc.status = 'APPROVED'
```

**판정: PASS** — 4중 Gate 완전 구현. service_key = 'kpa' 하드코딩.

#### Tablet Channel (`tablet.controller.ts`)

```
Gate 1 (Product):  p.status = 'active'
Gate 2 (Listing):  opl.is_active = true AND opl.service_key = $serviceKey
Gate 3 (Channel):  opc.is_active = true
Gate 4 (Approval): oc.channel_type = 'TABLET' AND oc.status = 'APPROVED'
```

**판정: PASS** — 4중 Gate 완전 구현. service_key 파라미터화.

#### Unified Store B2C (`unified-store-public.routes.ts`)

```
Gate 1 (Product):  p.status = 'active'
Gate 2 (Listing):  opl.is_active = true AND opl.service_key = ANY($serviceKeys::text[])
Gate 3 (Channel):  opc.is_active = true
Gate 4 (Approval): oc.channel_type = 'B2C' AND oc.status = 'APPROVED'
```

**판정: PASS** — 4중 Gate 완전 구현. 멀티서비스 배열 지원 (WO-STORE-MULTI-SERVICE-GRID-V1).

#### Unified Store Tablet (`unified-store-public.routes.ts`)

```
Gate 1 (Product):  p.status = 'active'
Gate 2 (Listing):  opl.is_active = true AND opl.service_key = $serviceKey
Gate 3 (Channel):  opc.is_active = true
Gate 4 (Approval): oc.channel_type = 'TABLET' AND oc.status = 'APPROVED'
```

**판정: PASS** — 4중 Gate 완전 구현.

### 2.2 Cosmetics 서비스 (1-Gate Pattern)

#### Product Listing (`cosmetics.repository.ts:113-160`)

```
Gate 1 (Product):  product.status = 'VISIBLE'
Gate 2 (Org):      없음
Gate 3 (Channel):  없음
Gate 4 (Approval): 없음
```

**판정: NOTE** — Cosmetics는 독립 도메인 아키텍처를 사용한다.
`cosmetics_products`는 브랜드 카탈로그이며, `organization_product_listings`와 통합되지 않는다.

이는 **설계 의도**일 수 있다:
- Cosmetics 제품은 **글로벌 카탈로그** (모든 소비자에게 동일하게 노출)
- 매장별 격리는 `cosmetics_store_listings` 테이블에서 별도 처리
- B2C 스토어프론트 노출은 `cosmetics_store_listings.is_visible`로 제어

**그러나**: 순수 카탈로그 조회 API (`GET /cosmetics/products`)에는 매장 스코핑이 없다.

### 2.3 전체 쿼리 매트릭스

| 엔드포인트 | 서비스 | Gate 수 | service_key | distribution_type | 판정 |
|-----------|--------|:------:|:-----------:|:-----------------:|:----:|
| GET /stores/:slug/products (B2C) | glycopharm | 4 | YES (kpa) | NO | PASS |
| GET /stores/:slug/tablet/products | glycopharm | 4 | YES (param) | NO | PASS |
| GET /api/v1/stores/:slug/products | unified | 4 | YES (array) | NO | PASS |
| GET /api/v1/stores/:slug/tablet/products | unified | 4 | YES (param) | NO | PASS |
| GET /cosmetics/products | cosmetics | 1 | NO | NO | NOTE |
| GET /pharmacy-products/listings | kpa | 2 | YES (opt) | NO | PASS |
| GET /pharmacy-products/catalog | kpa | 2 | NO | YES (PUBLIC) | PASS |

---

## 3. Storefront Isolation 검증

**판정: PASS**

### 3.1 B2C Storefront

- `unified-store-public.routes.ts`: slug → `resolvePublicStore()` → 고정 storeId + serviceKey
- `serviceKey`는 slug에서 자동 결정됨, 소비자가 조작 불가
- `service_key = ANY($serviceKeys)` 필터로 해당 서비스 리스팅만 조회
- INNER JOIN 4중 Gate로 비인가 상품 노출 불가

### 3.2 Tablet Storefront

- 동일한 slug 기반 해석 + 4중 Gate
- `store_local_products`는 별도 쿼리 (DB UNION 없음, 앱 레벨 merge)
- WO-STORE-LOCAL-PRODUCT-HARDENING-V1 경계 유지

### 3.3 우회 경로

- Slug 조작: `resolvePublicStore()` DB 검증으로 차단
- service_key 변조: 서버 측에서 slug → serviceKey 매핑, 클라이언트 입력 무시
- 타 서비스 상품: INNER JOIN으로 service_key 불일치 시 결과 0건

---

## 4. Checkout Isolation 검증

**판정: PASS WITH NOTES**

### 4.1 GlycoPharm Checkout (`checkout.controller.ts`)

- **Product 조회**: `glycopharm_products` 테이블 전용 (line 327-329)
- **service_key**: metadata에 `'glycopharm'` 하드코딩 (line 515)
- **Distribution 검증**: YES — PRIVATE 제품에 대해 `allowed_seller_ids` 확인 (line 368-393)
- **교차 서비스 주문**: 불가능 — `glycopharm_products` UUID만 수용

### 4.2 Cosmetics Checkout (`cosmetics-order.controller.ts`)

- **Product 조회**: `cosmetics.cosmetics_products` + `cosmetics.cosmetics_store_listings` 전용 (line 474-511)
- **service_key**: metadata에 `'cosmetics'` 하드코딩 (line 519)
- **Distribution 검증**: NO — `distribution_type` 미확인
- **교차 서비스 주문**: 불가능 — cosmetics 스키마 격리

### 4.3 교차 서비스 ProductId 검증

| 시나리오 | 결과 |
|---------|------|
| Cosmetics UUID → GlycoPharm checkout | `PRODUCT_NOT_FOUND` (glycopharm_products에 없음) |
| GlycoPharm UUID → Cosmetics checkout | `PRODUCT_NOT_AVAILABLE` (cosmetics 스키마에 없음) |
| StoreLocalProduct UUID → 어느 checkout이든 | 구조적 거부 (별도 테이블) |

**교차 서비스 제품 주문은 구조적으로 불가능하다.**
(서비스별 독립 제품 테이블 + 독립 UUID 풀)

### 4.4 NOTE: Phase N-1 Generic Checkout

`apps/api-server/src/controllers/checkout/checkoutController.ts` — 테스트/MVP 코드.
서비스별 제품 테이블 검증 없음. 프로덕션 노출 시 위험.
**현재 상태**: 레거시로 확인되며, 실 서비스 checkout은 서비스별 컨트롤러 사용.

---

## 5. KPI Isolation 검증

**판정: ISSUE**

### 5.1 현재 KPI 쿼리 필터

| 서비스 | KPI 파일 | 필터 | serviceKey 필터 | orderType 필터 |
|--------|---------|------|:---------------:|:--------------:|
| GlycoPharm | `glycopharm-store-data.adapter.ts` | `store_id = $1` | **NO** | **NO** |
| Cosmetics | `cosmetics-store-summary.service.ts` | `store_id = $1` | **NO** | **NO** |
| Store Hub | `store-hub.controller.ts` | graceful degradation (0) | N/A | N/A |

### 5.2 문제 분석

`ecommerce_orders` 테이블은 **모든 서비스의 주문을 공유**한다.
각 주문에는 `metadata.serviceKey` (glycopharm/cosmetics)와 `orderType`이 기록된다.

그러나 KPI 집계 쿼리는 `store_id`만으로 필터링한다:

```sql
-- glycopharm-store-data.adapter.ts:39
SELECT COUNT(*) FROM ecommerce_orders WHERE store_id = $1

-- cosmetics-store-summary.service.ts:51
SELECT COUNT(*) FROM ecommerce_orders WHERE store_id = $1
```

### 5.3 교차 집계 시나리오

**조건**: 매장 X가 GlycoPharm과 Cosmetics 모두에서 주문을 받는 경우

- GlycoPharm KPI: `WHERE store_id = X` → Cosmetics 주문도 집계됨
- Cosmetics KPI: `WHERE store_id = X` → GlycoPharm 주문도 집계됨

**누락된 필터**:
```sql
-- 필요한 필터 (현재 없음)
AND metadata->>'serviceKey' = 'glycopharm'
```

### 5.4 현재 위험 수준

| 조건 | 현재 상태 | 위험 |
|------|----------|------|
| 동일 매장이 멀티서비스 운영 | 현재 GlycoPharm 위주 | 낮음 (현시점) |
| Cosmetics 주문 활성화 시 | 교차 집계 발생 가능 | **중간** (향후) |
| store_id = organization_id? | 동일 값 사용 시 교차 | 확인 필요 |

### 5.5 Cosmetics Admin Summary

`cosmetics-store-summary.service.ts:208-227`:
```sql
WHERE store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
```

Cosmetics 매장 ID 기반 필터링이지만, `metadata.serviceKey` 미확인.
GlycoPharm 주문이 동일 store_id로 생성되면 Cosmetics KPI에 포함될 수 있다.

---

## 6. 시나리오 기반 검증

### Scenario 1: GLOBAL Supply 상품

> Product A: distribution_type = PUBLIC, status = active
> → 모든 서비스 HUB에서 노출되어야 한다.

**검증 결과: PASS**

경로:
1. `GET /pharmacy-products/catalog`: `distribution_type = 'PUBLIC'` → 조회 가능
2. 약국이 Apply → `organization_product_applications` (service_key='glycopharm') → 승인
3. Listing 생성: `organization_product_listings` (service_key='glycopharm', is_active=true)
4. Channel 매핑: `organization_product_channels` (is_active=true)
5. `GET /stores/:slug/products`: 4중 Gate 통과 → **노출**

**동일 제품을 다른 서비스에서도 리스팅하려면**:
- 별도 `organization_product_applications` (service_key='cosmetics') 생성
- 별도 `organization_product_listings` 생성
- 독립적으로 관리

**구조적으로 가능하다.** 각 서비스별 독립 리스팅으로 GLOBAL 노출 달성.

### Scenario 2: SELECTED Supply 상품

> Product B: distribution_type = PRIVATE, allowed_seller_ids = [pharmacy_1]
> → pharmacy_1의 GlycoPharm HUB에만 노출
> → 다른 매장, 다른 서비스에서는 절대 노출 금지

**검증 결과: PASS**

경로:
1. `GET /pharmacy-products/catalog` (pharmacy_1):
   - `distribution_type = 'PUBLIC'` 필터에 걸림 → **카탈로그에서 비노출**
   - PRIVATE 제품은 별도 경로로 접근 (직접 할당 또는 초대)
2. Checkout 시 검증: `checkout.controller.ts:368-393`
   - `neture_supplier_products.distribution_type = 'PRIVATE'`
   - `allowed_seller_ids`에 pharmacy_1.id 포함 여부 확인
   - 미포함 시 `DISTRIBUTION_RESTRICTED` 에러
3. 다른 매장(pharmacy_2): `allowed_seller_ids`에 없으므로 거부

**service_key 격리**: pharmacy_1이 GlycoPharm에만 리스팅 → Cosmetics에는 리스팅 자체가 없음

**구조적으로 보장된다.** Listing + Distribution 이중 격리.

### Scenario 3: Multi-Service Selected 상품

> Product C: distribution_type = PUBLIC (모든 운영자 가능)
> pharmacy_1이 cosmetics와 glycopharm 모두에 리스팅

**검증 결과: PASS**

경로:
1. pharmacy_1이 두 번 Apply:
   - `organization_product_applications` (service_key='cosmetics')
   - `organization_product_applications` (service_key='glycopharm')
2. 승인 후 두 개의 독립 리스팅 생성:
   - `organization_product_listings` (service_key='cosmetics', is_active=true)
   - `organization_product_listings` (service_key='glycopharm', is_active=true)
3. 각 리스팅에 독립 채널 매핑
4. B2C 조회 시:
   - GlycoPharm slug 접근: `service_key = 'glycopharm'` → glycopharm 리스팅만 노출
   - Cosmetics slug 접근: `service_key = 'cosmetics'` → cosmetics 리스팅만 노출
5. 다른 서비스(tourism 등): 리스팅 자체 없음 → 노출 없음

**구조적으로 보장된다.** service_key 기반 리스팅 격리가 완벽하게 작동.

---

## 7. 위험 분석

### ISSUE (수정 필요)

| # | 위치 | 문제 | 영향 | 등급 |
|---|------|------|------|:----:|
| I-1 | `glycopharm-store-data.adapter.ts` 전체 | 모든 KPI 쿼리가 `store_id`만 필터. `metadata->>'serviceKey'` 미사용 | 멀티서비스 매장에서 Cosmetics 주문이 GlycoPharm KPI에 포함 | **MEDIUM** |
| I-2 | `cosmetics-store-summary.service.ts` 전체 | 동일 — `store_id`만 필터 | 멀티서비스 매장에서 GlycoPharm 주문이 Cosmetics KPI에 포함 | **MEDIUM** |

### NOTE (설계 의도 확인 필요)

| # | 위치 | 문제 | 영향 | 등급 |
|---|------|------|------|:----:|
| N-1 | `cosmetics.repository.ts:113-160` | Cosmetics 카탈로그 조회에 매장 스코핑 없음 | 글로벌 카탈로그 설계 의도면 OK | **LOW** |
| N-2 | `cosmetics-order.controller.ts:459-511` | Cosmetics checkout에 `distribution_type` 검증 없음 | Cosmetics에 distribution 정책이 불필요하면 OK | **LOW** |
| N-3 | `checkoutController.ts` (Phase N-1) | 레거시 generic checkout에 서비스 검증 없음 | 프로덕션 비노출 확인 필요 | **LOW** |

### SAFE (정상)

- GlycoPharm 4중 Gate: 모든 B2C/Tablet 엔드포인트에서 적용
- Unified Store 4중 Gate: service_key 파라미터화 완전
- 서비스별 독립 제품 테이블: UUID 교차 불가
- Checkout 서비스 격리: 구조적 거부
- Neture Distribution PRIVATE/PUBLIC: 정상 동작
- StoreLocalProduct 격리: 5-Layer 보호 유지

---

## 8. 개선 권고 사항

### R-1: KPI 서비스 키 필터 추가 (Priority: HIGH)

모든 KPI 집계 쿼리에 `metadata->>'serviceKey'` 조건 추가:

**glycopharm-store-data.adapter.ts** — 모든 쿼리에:
```sql
AND metadata->>'serviceKey' = 'glycopharm'
```

**cosmetics-store-summary.service.ts** — 모든 쿼리에:
```sql
AND metadata->>'serviceKey' = 'cosmetics'
```

현재는 단일 서비스 매장이 대부분이므로 즉시 문제 없으나,
멀티서비스 매장 확장 시 반드시 필요.

### R-2: Cosmetics 카탈로그 가시성 정책 문서화 (Priority: LOW)

`GET /cosmetics/products`가 글로벌 카탈로그인지, 매장 스코핑이 필요한지 명시.
설계 의도대로면 문서화만 필요.

### R-3: Phase N-1 Checkout 비활성 확인 (Priority: LOW)

`checkoutController.ts`가 프로덕션 라우트에서 비활성 상태인지 확인.

---

## 결론

### Distribution Model

O4O Marketplace의 제품 가시성은 **3-Layer Gate**로 제어된다:

| Layer | Gate | 제어 수단 |
|-------|------|----------|
| **Supplier** | Distribution Policy | PUBLIC/PRIVATE + allowed_seller_ids |
| **Listing** | Service Isolation | `service_key` + `is_active` |
| **Channel** | Channel Approval | `channel_type` + `status='APPROVED'` |

### Storefront (B2C/Tablet)

**4중 Visibility Gate**가 모든 GlycoPharm/KPA 엔드포인트에서 일관 적용:
1. Product status = active
2. Listing is_active = true + service_key 일치
3. Channel mapping is_active = true
4. Channel status = APPROVED

교차 서비스 상품 노출은 **구조적으로 불가능**.

### KPI

`ecommerce_orders` 공유 테이블에서 `store_id`만 필터하는 패턴은
현재 단일 서비스 매장에서는 문제없으나,
**멀티서비스 매장 확장 시 교차 집계 위험이 존재**한다.

`metadata->>'serviceKey'` 필터 추가를 권고한다.

---

*Generated: 2026-02-24*
*Status: Validation Complete — Read Only*
*Classification: Investigation Report*
